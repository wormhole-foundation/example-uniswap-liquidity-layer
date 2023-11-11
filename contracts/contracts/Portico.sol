// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./PorticoStructs.sol";
import "./ITokenBridge.sol";
import "./IWormhole.sol";
import "./IERC20.sol";
import "./IWETH.sol";

//uniswap
import "./uniswap/TickMath.sol";
import "./uniswap/ISwapRouter.sol";
import "./uniswap/IV3Pool.sol";
import "./uniswap/PoolAddress.sol";

using PorticoFlagSetAccess for PorticoFlagSet;

contract PorticoBase {
  using PorticoFlagSetAccess for PorticoFlagSet;

  ISwapRouter public immutable ROUTERV3;
  ITokenBridge public immutable TOKENBRIDGE;
  address public immutable FEE_RECIPIENT;
  IWETH public immutable WETH;

  IWormhole public immutable wormhole;

  uint16 public immutable wormholeChainId;

  constructor(ISwapRouter _routerV3, ITokenBridge _bridge, address _relayer, IWETH _weth) {
    ROUTERV3 = _routerV3;
    FEE_RECIPIENT = _relayer;
    TOKENBRIDGE = _bridge;
    wormhole = _bridge.wormhole();
    WETH = _weth;
    wormholeChainId = wormhole.chainId();
  }

  receive() external payable {}

  function version() external pure returns (uint32) {
    return 1;
  }

  function _msgSender() internal view returns (address) {
    return msg.sender;
  }

  function padAddress(address addr) internal pure returns (bytes32) {
    return bytes32(uint256(uint160(addr)));
  }

  function unpadAddress(bytes32 whFormatAddress) internal pure returns (address) {
    return address(uint160(uint256(whFormatAddress)));
  }

  //248,424
  //247,893
  ///@notice if tokenIn == token0 then slippage is in the negative, and vice versa
  ///@param maxSlippage is in BIPS
  function calculateSlippage(
    uint16 maxSlippage,
    address tokenIn,
    address tokenOut,
    uint24 fee
  ) internal view returns (uint160 sqrtPriceLimitX96) {
    //compute pool key
    PoolAddress.PoolKey memory key = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);

    //compute pool
    IV3Pool pool = IV3Pool(PoolAddress.computeAddress(ROUTERV3.factory(), key));

    //get current tick via slot0
    (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();

    uint160 buffer = (maxSlippage * sqrtPriceX96) / 10000;

    tokenIn == key.token0 ? sqrtPriceLimitX96 = sqrtPriceX96 - buffer : sqrtPriceLimitX96 = sqrtPriceX96 + buffer;
  }
}

abstract contract PorticoStart is PorticoBase {
  function _start_v3swap(PorticoStructs.TradeParameters memory params) internal returns (uint256 amount) {
    // TODO: need sanity checks for token balances?
    require(params.startTokenAddress.approve(address(ROUTERV3), uint256(params.amountSpecified)), "Approve fail");
    amount = ROUTERV3.exactInputSingle(
      ISwapRouter.ExactInputSingleParams(
        address(params.startTokenAddress), // tokenIn
        address(params.canonAssetAddress), //tokenOut
        params.flags.feeTierStart(), //fee
        address(this), //recipient
        block.timestamp + 10, //deadline
        params.amountSpecified, //amountIn
        0, //use slippage instead of minAmountReceived
        calculateSlippage(
          uint16(params.flags.maxSlippageStart()),
          address(params.startTokenAddress),
          address(params.canonAssetAddress),
          params.flags.feeTierStart()
        )
      )
    );
  }

  event PorticoSwapStart(uint64 indexed sequence, uint16 indexed chainId);

  function start(
    PorticoStructs.TradeParameters memory params
  ) public payable returns (address emitterAddress, uint16 chainId, uint64 sequence) {
    // always check for native wrapping logic
    if (address(params.startTokenAddress) == address(WETH) && params.flags.shouldWrapNative()) {
      // if we are wrap9ing a token, we call deposit for the user, assuming we have been send what we need.
      WETH.deposit{ value: uint256(params.amountSpecified) }();
      // ensure that we now have the wrap9 asset
      require(params.startTokenAddress.balanceOf(address(this)) == uint256(params.amountSpecified));
    } else {
      // otherwise, just get the token we need to do the swap (if we are swapping, or just the token itself)
      require(params.startTokenAddress.transferFrom(msg.sender, address(this), uint256(params.amountSpecified)), "transfer fail");
    }
    uint256 amount = 0;
    // if the start token is the canon token, we don't need to swap
    if (params.startTokenAddress == params.canonAssetAddress) {
      // skip the v3 swap, and set amount to the amountSpecified, assuming that either the transfer or unwrap above worked
      amount = uint256(params.amountSpecified);
    } else {
      // do the swap, and amount is now the amount that we received from the swap
      amount = _start_v3swap(params);
    }
    // allow the token bridge to do its token bridge things
    IERC20(params.canonAssetAddress).approve(address(TOKENBRIDGE), amount);
    // now we need to produce the payload we are sending
    PorticoStructs.DecodedVAA memory decodedVAA = PorticoStructs.DecodedVAA(
      params.flags,
      params.canonAssetAddress,
      params.finalTokenAddress,
      params.recipientAddress,
      amount,
      params.relayerFee
    );
    // TODO: what happens when the asset is not an xasset. will this just fail?
    sequence = TOKENBRIDGE.transferTokensWithPayload{ value: wormhole.messageFee() }(
      address(params.canonAssetAddress),
      amount,
      params.flags.recipientChain(),
      padAddress(params.recipientAddress),
      params.flags.bridgeNonce(),
      abi.encode(decodedVAA)
    );
    chainId = wormholeChainId;
    emitterAddress = address(TOKENBRIDGE);
    emit PorticoSwapStart(sequence, chainId);
  }
}

abstract contract PorticoFinish is PorticoBase {
  event PorticoSwapFinish(uint64 indexed sequence, uint16 indexed emitterChain, bool swapCompleted, PorticoStructs.DecodedVAA data);

  function _completeTransfer(
    bytes calldata encodedTransferMessage
  ) internal returns (PorticoStructs.DecodedVAA memory message, IWormhole.VM memory parsed, uint256 amountReceived) {
    parsed = wormhole.parseVM(encodedTransferMessage);

    // make sure its coming from a proper bridge contract
    require(parsed.emitterAddress == TOKENBRIDGE.bridgeContracts(parsed.emitterChainId), "Not a Token Bridge VAA");

    /**
     * Call `completeTransferWithPayload` on the token bridge. This
     * method acts as a reentrancy protection since it does not allow
     * transfers to be redeemed more than once.
     */
    bytes memory transferPayload = TOKENBRIDGE.completeTransferWithPayload(parsed.payload);


    // amountReceived == total balance always, so erouious transfers will just be forwarded to the next recipient of this token
    amountReceived = message.canonAssetAddress.balanceOf(address(this));

    //parseTransferWithPayload
    ITokenBridge.TransferWithPayload memory transfer = TOKENBRIDGE.parseTransferWithPayload(transferPayload);

    // parse payload - question is parsed.payload our DecodedVAA? Or is it transfer.payload below?
    message = abi.decode(transfer.payload, (PorticoStructs.DecodedVAA));

    //todo confirm this logic is correct
    // get the address for the token on this address
    address thisChainTokenAddress = transfer.tokenChain == wormholeChainId
      ? unpadAddress(transfer.tokenAddress)
      : TOKENBRIDGE.wrappedAsset(transfer.tokenChain, transfer.tokenAddress);
    uint8 decimals = IERC20(thisChainTokenAddress).decimals();
    uint256 denormalizedAmount = transfer.amount;
    if (decimals > 8) denormalizedAmount *= uint256(10) ** (decimals - 8);

    // ensure that the to address is this address
    require(unpadAddress(transfer.to) == address(this) && transfer.toChain == wormholeChainId, "Token was not sent to this address");
  }

  //https://github.com/wormhole-foundation/example-token-bridge-relayer/blob/8132e8cc0589cd5cf739bae012c42321879cfd4e/evm/src/token-bridge-relayer/TokenBridgeRelayer.sol#L496
  function receiveMessageAndSwap(bytes calldata encodedTransferMessage) external payable {
    (PorticoStructs.DecodedVAA memory message, IWormhole.VM memory parsed, uint256 amountReceived) = _completeTransfer(
      encodedTransferMessage
    );

    // we must have received the amount expected
    require(amountReceived == message.canonAssetAmount);

    //now process
    bool swapCompleted = finish(message);

    // simply emit the raw data bytes. it should be trivial to parse.
    // TODO: consider what fields to index here
    emit PorticoSwapFinish(parsed.sequence, parsed.emitterChainId, swapCompleted, message);
  }

  ///@notice determines we need to swap and/or unwrap, does those things if needed, and sends tokens to user & pays relayer fee
  function finish(PorticoStructs.DecodedVAA memory params) internal returns (bool swapCompleted) {
    bool shouldUnwrap = params.flags.shouldUnwrapNative() && address(params.finalTokenAddress) == address(WETH);
    uint256 finalUserAmount;
    uint256 relayerFeeAmount;

    if ((params.finalTokenAddress) == params.canonAssetAddress) {
      // this means that we don't need to do a swap, aka, we received the canon asset
      finalUserAmount = params.canonAssetAmount - params.relayerFee;
      payOut(shouldUnwrap, params.finalTokenAddress, params.recipientAddress, finalUserAmount, params.relayerFee);
      //todo return false for accounting as no swap was actually completed?
      return true;
    } else {
      //do the swap, resulting aset is sent to this address
      (finalUserAmount, relayerFeeAmount, swapCompleted) = _finish_v3swap(params);
      //if swap fails, relayer and user have already been paid in canon asset, so we are done
      if (!swapCompleted) {
        return swapCompleted;
      }
      payOut(shouldUnwrap, params.finalTokenAddress, params.recipientAddress, finalUserAmount, relayerFeeAmount);
    }
  }

  //https://github.com/wormhole-foundation/example-nativeswap-usdc/blob/ff9a0bd73ddba0cd7b377f57f13aac63a747f881/contracts/contracts/CrossChainSwapV3.sol#L228
  function _finish_v3swap(
    PorticoStructs.DecodedVAA memory params
  ) internal returns (uint256 finalUserAmount, uint256 relayerFeeAmount, bool swapCompleted) {
    params.canonAssetAddress.approve(address(ROUTERV3), params.canonAssetAmount);

    // set swap options with user params
    ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
      tokenIn: address(params.canonAssetAddress),
      tokenOut: address(params.finalTokenAddress),
      fee: params.flags.feeTierFinish(),
      recipient: address(this), // we need to receive the token in order to correctly split the fee. tragic.
      deadline: block.timestamp + 10,
      amountIn: params.canonAssetAmount,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: calculateSlippage(
        uint16(params.flags.maxSlippageFinish()),
        address(params.canonAssetAddress),
        address(params.finalTokenAddress),
        params.flags.feeTierFinish()
      )
    });

    uint256 relayerFee = (_msgSender() == params.recipientAddress) ? 0 : params.relayerFee;

    try ROUTERV3.exactInputSingle(swapParams) returns (uint256 amountOut) {
      //calculate how much to pay the relayer in the native token
      if (relayerFee > 0) {
        relayerFeeAmount = relayerFee;
      }
      finalUserAmount = amountOut - relayerFeeAmount;
      swapCompleted = true;
    } catch {
      // if swap fails, we don't pay fees to the relayer
      // the reason is because that typically, the swap fails because of bad market conditions
      // in this case, it is in the best interest of the mev/relayer to NOT relay this message until conditions are good
      // the user of course, who if they self relay, does not pay a fee, does not have this problem, so they can force this if they wish
      // swap failed - return canon asset to recipient
      params.canonAssetAddress.transfer(params.recipientAddress, params.canonAssetAmount);
      //set allowance to 0
      params.canonAssetAddress.approve(address(ROUTERV3), 0);
      // TODO: should we emit a special event here?
      swapCompleted = false;
    }
  }

  ///@notice pay out to user and relayer
  ///@notice this should always be called UNLESS swap fails, in which case payouts happen there
  function payOut(bool unwrap, IERC20 finalToken, address recipient, uint256 finalUserAmount, uint256 relayerFeeAmount) internal {
    if (unwrap) {
      WETH.withdraw(IERC20(address(WETH)).balanceOf(address(this)));
      //send to user
      (bool sentToUser, ) = recipient.call{ value: finalUserAmount }("");
      require(sentToUser, "Failed to send Ether");
      if (relayerFeeAmount > 0) {
        //pay relayer fee
        (bool sentToRelayer, ) = _msgSender().call{ value: relayerFeeAmount }("");
        require(sentToRelayer, "Failed to send Ether");
      }
    } else {
      //pay recipient
      if (finalUserAmount > 0) {
        require(finalToken.transfer(recipient, finalUserAmount), "STF");
      }
      if (relayerFeeAmount > 0) {
        //pay relayer
        require(finalToken.transfer(FEE_RECIPIENT, relayerFeeAmount), "STF");
      }
    }
  }

  //https://github.com/wormhole-foundation/example-token-bridge-relayer/blob/8132e8cc0589cd5cf739bae012c42321879cfd4e/evm/src/token-bridge-relayer/TokenBridgeRelayer.sol#L714C5-L717C6
  function bytes32ToAddress(bytes32 address_) internal pure returns (address) {
    require(bytes12(address_) == 0, "invalid EVM address");
    return address(uint160(uint256(address_)));
  }

  //https://github.com/wormhole-foundation/example-token-bridge-relayer/blob/8132e8cc0589cd5cf739bae012c42321879cfd4e/evm/src/libraries/BytesLib.sol#L385C5-L394C6
  function toBytes32(bytes memory _bytes, uint256 _start) internal pure returns (bytes32) {
    require(_bytes.length >= _start + 32, "toBytes32_outOfBounds");
    bytes32 tempBytes32;

    assembly {
      tempBytes32 := mload(add(add(_bytes, 0x20), _start))
    }

    return tempBytes32;
  }

  //https://github.com/wormhole-foundation/example-token-bridge-relayer/blob/8132e8cc0589cd5cf739bae012c42321879cfd4e/evm/src/libraries/BytesLib.sol#L319C5-L328C6
  function toUint16(bytes memory _bytes, uint256 _start) internal pure returns (uint16) {
    require(_bytes.length >= _start + 2, "toUint16_outOfBounds");
    uint16 tempUint;

    assembly {
      tempUint := mload(add(add(_bytes, 0x2), _start))
    }

    return tempUint;
  }

  /// @notice function to allow testing of finishing swap
  //todo remove PorticoStructs.TokenReceived
  function testSwap(PorticoStructs.DecodedVAA memory params) public payable {
    finish(params);
  }
}

contract Portico is PorticoFinish, PorticoStart {
  constructor(
    ISwapRouter _routerV3,
    ITokenBridge _bridge,
    address _relayer,
    IWETH _weth
  ) PorticoBase(_routerV3, _bridge, _relayer, _weth) {}
}
