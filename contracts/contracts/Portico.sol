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

import "./lib/PRBMathSD59x18.sol";

//testing
import "hardhat/console.sol";

using PorticoFlagSetAccess for PorticoFlagSet;

contract PorticoBase {
  using PorticoFlagSetAccess for PorticoFlagSet;
  using PRBMathSD59x18 for *;

  ISwapRouter public immutable ROUTERV3;
  ITokenBridge public immutable TOKENBRIDGE;
  IWETH public immutable WETH;

  IWormhole public immutable wormhole;

  uint16 public immutable wormholeChainId;

  constructor(ISwapRouter _routerV3, ITokenBridge _bridge, IWETH _weth) {
    ROUTERV3 = _routerV3;
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

  function isContract(address _addr) private view returns (bool value) {
    uint32 size;
    assembly {
      size := extcodesize(_addr)
    }
    return (size > 0);
  }

  ///@notice if tokenIn == token0 then slippage is in the negative, and vice versa
  ///@param maxSlippage is in BIPS
  function calculateSlippage(
    uint16 maxSlippage,
    address tokenIn,
    address tokenOut,
    uint24 fee
  ) internal view returns (uint160 sqrtPriceLimitX96) {
    //console.log("CalculateSlippage: ", maxSlippage);
    PoolAddress.PoolKey memory key = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);
    //compute pool
    IV3Pool pool = IV3Pool(PoolAddress.computeAddress(ROUTERV3.factory(), key));
    if (!isContract(address(pool))) {
      return 0;
    }
    //console.log("Pool: ", address(pool));

    //get current tick via slot0
    uint160 sqrtPriceX96 = sqrtPrice(pool);
    uint160 buffer = (maxSlippage * sqrtPriceX96) / 10000;
    if (tokenIn == key.token0) {
      if (sqrtPriceX96 > buffer) {
        sqrtPriceLimitX96 = sqrtPriceX96 + buffer;
      }
    } else {
      sqrtPriceLimitX96 = sqrtPriceX96 - buffer;
    }
  }

  function calcMinAmount(
    uint256 amountIn,
    uint16 maxSlippage,
    address tokenIn,
    address tokenOut,
    uint24 fee
  ) internal view returns (uint256 minAmoutReceived) {
    console.log("calcMinAmount");
    PoolAddress.PoolKey memory key = PoolAddress.getPoolKey(tokenIn, tokenOut, fee);
    
    //compute pool
    IV3Pool pool = IV3Pool(PoolAddress.computeAddress(ROUTERV3.factory(), key));
    if (!isContract(address(pool))) {
      return 0;
    }

    //10000 bips == 100% slippage is allowed
    uint16 MAX_BIPS = 10000;
    if(maxSlippage >= MAX_BIPS){
      return 0;
    }

    //get exchange rate
    uint256 exchangeRate = getExchangeRate(sqrtPrice(pool));

    //invert exchange rate if needed
    if (tokenIn != key.token0) {//todo is this right?
      exchangeRate = divide(1e18, exchangeRate, 18);
    }

    //compute expected amount received with no slippage
    uint256 expectedAmount = (amountIn * exchangeRate) / 1e18;

    maxSlippage = MAX_BIPS - maxSlippage;

    minAmoutReceived = (expectedAmount * maxSlippage) / MAX_BIPS;

  }

  //price == (sqrtPriceX96 / 2**96) ** 2
  ///@dev this works as of block 18594975
  function getExchangeRate(uint160 sqrtPriceX96) internal pure returns (uint256 exchangeRate) {
    console.log("Get exchange rate: ", sqrtPriceX96);
    //return (uint256(sqrtPriceX96) * (uint256(sqrtPriceX96)) * (1e18)) >> (96 * 2);
    //return (mul(mul(uint256(sqrtPriceX96),uint256(sqrtPriceX96)), 1e18)) >> (96 * 2);
    /**
    int256 intSqrtPrice = int256(uint256(sqrtPriceX96));
    int256 data = intSqrtPrice.div(2**96) ** 2;
    uint256 result = uint256(data) / 1e18;
     */

    //todo adjust for decimals?

    int256 intSqrtPrice = int256(uint256(sqrtPriceX96));
    exchangeRate = uint256(intSqrtPrice.div(2 ** 96) ** 2) / 1e18;
  }

  ///@notice get the percent deviation from a => b as a decimal e18
  function percentChange(uint256 a, uint256 b) public pure returns (uint256 delta) {
    uint256 max = a > b ? a : b;
    uint256 min = b != max ? b : a;
    delta = divide((max - min), min, 18);
  }

  ///@notice floating point division at @param factor scale
  function divide(uint256 numerator, uint256 denominator, uint256 factor) internal pure returns (uint256 result) {
    uint256 q = (numerator / denominator) * 10 ** factor;
    uint256 r = ((numerator * 10 ** factor) / denominator) % 10 ** factor;

    return q + r;
  }

  function sqrtPrice(IV3Pool pool) internal view returns (uint160) {
    //get current tick via slot0
    try pool.slot0() returns (
      uint160 sqrtPriceX96,
      int24 /*tick*/,
      uint16 /*observationIndex*/,
      uint16 /*observationCardinality*/,
      uint16 /*observationCardinalityNext*/,
      uint8 /*feeProtocol*/,
      bool /*unlocked*/
    ) {
      return sqrtPriceX96;
    } catch {
      return 0;
    }
  }
}

abstract contract PorticoStart is PorticoBase {
  function _start_v3swap(PorticoStructs.TradeParameters memory params, uint256 actualAmount) internal returns (uint256 amount) {
    // TODO: need sanity checks for token balances?
    require(params.startTokenAddress.approve(address(ROUTERV3), uint256(params.amountSpecified)), "Approve fail");

    uint256 minAmountOut = calcMinAmount(
      uint256(params.amountSpecified),
      uint16(params.flags.maxSlippageFinish()),
      address(params.startTokenAddress),
      address(params.canonAssetAddress),
      params.flags.feeTierStart()
    );

    ROUTERV3.exactInputSingle(
      ISwapRouter.ExactInputSingleParams(
        address(params.startTokenAddress), // tokenIn
        address(params.canonAssetAddress), //tokenOut
        params.flags.feeTierStart(), //fee
        address(this), //recipient
        block.timestamp + 10, //deadline
        actualAmount, //amountIn
        minAmountOut, //minAmountReceived
        0
      )
    );
    amount = params.canonAssetAddress.balanceOf(address(this));
    console.log("ACTUAL AMOUNT RECEIVED: ", amount);
  }

  event PorticoSwapStart(uint64 indexed sequence, uint16 indexed chainId);

  function start(
    PorticoStructs.TradeParameters memory params
  ) public payable returns (address emitterAddress, uint16 chainId, uint64 sequence) {
    // always check for native wrapping logic
    if (address(params.startTokenAddress) == address(WETH) && params.flags.shouldWrapNative()) {
      // if we are wrapping a token, we call deposit for the user, assuming we have been send what we need.
      WETH.deposit{ value: uint256(params.amountSpecified) }();
    } else {
      // otherwise, just get the token we need to do the swap (if we are swapping, or just the token itself)
      require(params.startTokenAddress.transferFrom(_msgSender(), address(this), uint256(params.amountSpecified)), "transfer fail");
    }

    //Because wormhole rounds to 1e8, some dust may exist from previous txs
    //we use balanceOf to lump this in with future txs
    uint256 amount = params.startTokenAddress.balanceOf(address(this));

    //ensure we received enough
    require(amount >= uint256(params.amountSpecified), "transfer insufficient");

    // if the start token is the canon token, we don't need to swap
    if (params.startTokenAddress != params.canonAssetAddress) {
      // do the swap, and amount is now the amount that we received from the swap
      amount = _start_v3swap(params, amount);
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
    bytes memory encodedVaa = abi.encode(decodedVAA);

    // question: what happens when the asset is not an xasset. will this just fail? ans - nope
    sequence = TOKENBRIDGE.transferTokensWithPayload{ value: wormhole.messageFee() }(
      address(params.canonAssetAddress),
      amount,
      params.flags.recipientChain(),
      padAddress(params.recipientPorticoAddress),
      params.flags.bridgeNonce(),
      encodedVaa
    );
    chainId = wormholeChainId;
    emitterAddress = address(TOKENBRIDGE);
    emit PorticoSwapStart(sequence, chainId);
  }
}

abstract contract PorticoFinish is PorticoBase {
  event PorticoSwapFinish(bool swapCompleted, PorticoStructs.DecodedVAA data);

  function _completeTransfer(
    bytes calldata encodedTransferMessage
  ) internal returns (PorticoStructs.DecodedVAA memory message, PorticoStructs.BridgeInfo memory bridgeInfo) {
    /**
     * Call `completeTransferWithPayload` on the token bridge. This
     * method acts as a reentrancy protection since it does not allow
     * transfers to be redeemed more than once.
     */
    bytes memory transferPayload = TOKENBRIDGE.completeTransferWithPayload(encodedTransferMessage);

    // parse the wormhole message payload into the `TransferWithPayload` struct
    ITokenBridge.TransferWithPayload memory transfer = TOKENBRIDGE.parseTransferWithPayload(transferPayload);

    // decode the payload3 we sent into the decodedVAA struct
    message = abi.decode(transfer.payload, (PorticoStructs.DecodedVAA));

    //todo confirm this logic is correct
    // get the address for the token on this address
    bridgeInfo.tokenReceived = IERC20(
      transfer.tokenChain == wormholeChainId
        ? unpadAddress(transfer.tokenAddress)
        : TOKENBRIDGE.wrappedAsset(transfer.tokenChain, transfer.tokenAddress)
    );
    bridgeInfo.amountReceived = transfer.amount;

    /**
    //todo this is wrong
     // if there are more than 8 decimals, we need to denormalize
    uint8 decimals = bridgeInfo.tokenReceived.decimals();
    if (decimals > 8) {
      bridgeInfo.amountReceived *= uint256(10) ** (decimals - 8);
    }
     */

    // ensure that the to address is this address
    require(unpadAddress(transfer.to) == address(this) && transfer.toChain == wormholeChainId, "Token was not sent to this address");
  }

  //https://github.com/wormhole-foundation/example-token-bridge-relayer/blob/8132e8cc0589cd5cf739bae012c42321879cfd4e/evm/src/token-bridge-relayer/TokenBridgeRelayer.sol#L496
  function receiveMessageAndSwap(bytes calldata encodedTransferMessage) external payable {
    (PorticoStructs.DecodedVAA memory message, PorticoStructs.BridgeInfo memory bridgeInfo) = _completeTransfer(encodedTransferMessage);
    bridgeInfo.relayerFeeAmount = (_msgSender() == message.recipientAddress) ? 0 : message.relayerFee;

    //now process
    bool swapCompleted = finish(message, bridgeInfo);

    // simply emit the raw data bytes. it should be trivial to parse.
    // TODO: consider what fields to index here
    emit PorticoSwapFinish(swapCompleted, message);
  }

  ///@notice determines we need to swap and/or unwrap, does those things if needed, and sends tokens to user & pays relayer fee
  function finish(
    PorticoStructs.DecodedVAA memory params,
    PorticoStructs.BridgeInfo memory bridgeInfo
  ) internal returns (bool swapCompleted) {
    bool shouldUnwrap = params.flags.shouldUnwrapNative() && address(params.finalTokenAddress) == address(WETH);
    if ((params.finalTokenAddress) == bridgeInfo.tokenReceived) {
      // this means that we don't need to do a swap, aka, we received the canon asset.
      payOut(shouldUnwrap, params.finalTokenAddress, params.recipientAddress, bridgeInfo.relayerFeeAmount);
      //question return false for accounting as no swap was actually completed?
      return true;
    } else {
      //do the swap, resulting aset is sent to this address
      swapCompleted = _finish_v3swap(params, bridgeInfo);
      //if swap fails, relayer and user have already been paid in canon asset, so we are done
      if (!swapCompleted) {
        return swapCompleted;
      }
      payOut(shouldUnwrap, params.finalTokenAddress, params.recipientAddress, bridgeInfo.relayerFeeAmount);
    }
  }

  //https://github.com/wormhole-foundation/example-nativeswap-usdc/blob/ff9a0bd73ddba0cd7b377f57f13aac63a747f881/contracts/contracts/CrossChainSwapV3.sol#L228
  // if swap fails, we don't pay fees to the relayer
  // the reason is because that typically, the swap fails because of bad market conditions
  // in this case, it is in the best interest of the mev/relayer to NOT relay this message until conditions are good
  // the user of course, who if they self relay, does not pay a fee, does not have this problem, so they can force this if they wish
  // swap failed - return canon asset to recipient
  function _finish_v3swap(
    PorticoStructs.DecodedVAA memory params,
    PorticoStructs.BridgeInfo memory bridgeInfo
  ) internal returns (bool swapCompleted) {
    bridgeInfo.tokenReceived.approve(address(ROUTERV3), bridgeInfo.amountReceived);

    uint256 minAmountOut = calcMinAmount(
      bridgeInfo.amountReceived,
      uint16(params.flags.maxSlippageFinish()),
      address(bridgeInfo.tokenReceived),
      address(params.finalTokenAddress),
      params.flags.feeTierFinish()
    );

    // set swap options with user params
    ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
      tokenIn: address(bridgeInfo.tokenReceived),
      tokenOut: address(params.finalTokenAddress),
      fee: params.flags.feeTierFinish(),
      recipient: address(this), // we need to receive the token in order to correctly split the fee. tragic.
      deadline: block.timestamp + 10,
      amountIn: bridgeInfo.amountReceived,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0 //sqrtPriceLimit
    });

    try ROUTERV3.exactInputSingle(swapParams) returns (uint256 /*amountOut*/) {
      swapCompleted = true;
      console.log(swapCompleted);
    } catch /**Error(string memory e) */ {
      bridgeInfo.tokenReceived.transfer(params.recipientAddress, bridgeInfo.amountReceived);
      swapCompleted = false;
    }
  }

  ///@notice pay out to user and relayer
  ///@notice this should always be called UNLESS swap fails, in which case payouts happen there
  function payOut(bool unwrap, IERC20 finalToken, address recipient, uint256 relayerFeeAmount) internal {
    //square up balances with what we actually have, don't trust reporting from the bridge
    //prioritize relayer fee?
    uint256 finalUserAmount = finalToken.balanceOf(address(this)) - relayerFeeAmount;

    if (unwrap) {
      WETH.withdraw(IERC20(address(WETH)).balanceOf(address(this)));
      //send to user
      if (finalUserAmount > 0) {
        (bool sentToUser, ) = recipient.call{ value: finalUserAmount }("");
        require(sentToUser, "Failed to send Ether");
      }
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
        require(finalToken.transfer(_msgSender(), relayerFeeAmount), "STF");
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
}

contract Portico is PorticoFinish, PorticoStart {
  constructor(ISwapRouter _routerV3, ITokenBridge _bridge, IWETH _weth) PorticoBase(_routerV3, _bridge, _weth) {}
}
