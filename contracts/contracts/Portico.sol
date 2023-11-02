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

//testing
import "hardhat/console.sol";

contract PorticoBase {
  using PorticoFlagSetAccess for PorticoFlagSet;

  ISwapRouter public immutable ROUTERV3;
  ITokenBridge public immutable TOKENBRIDGE;
  address public immutable WORMHOLE_RELAYER;

  IWormhole public immutable wormhole;

  constructor(ISwapRouter _routerV3, ITokenBridge _bridge, address _relayer) {
    ROUTERV3 = _routerV3;
    WORMHOLE_RELAYER = _relayer;
    TOKENBRIDGE = _bridge;
    wormhole = _bridge.wormhole();
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
using PorticoFlagSetAccess for PorticoFlagSet;

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

  function start(
    PorticoStructs.TradeParameters memory params
  ) public payable returns (address emitterAddress, uint16 chainId, uint64 sequence) {
    // always check for native wrapping logic
    if (address(params.startTokenAddress) == address(TOKENBRIDGE.WETH()) && params.flags.shouldWrapNative()) {
      // if we are wrap9ing a token, we call deposit for the user, assuming we have been send what we need.
      TOKENBRIDGE.WETH().deposit{ value: uint256(params.amountSpecified) }();
      // ensure that we now have the wrap9 asset
      require(params.startTokenAddress.balanceOf(address(this)) == uint256(params.amountSpecified));
    } else {
      // otherwise, just get the token we need to do the swap (if we are swapping, or just the token itself)
      require(params.startTokenAddress.transferFrom(msg.sender, address(this), uint256(params.amountSpecified)), "transfer fail");
    }

    uint256 amount = 0;
    // if the start token is equal to the x token, then we don't need to swap. this is the case for most native eth assets i believe
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
      amount
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
    chainId = wormhole.chainId();
    emitterAddress = address(TOKENBRIDGE);
  }
}

abstract contract PorticoFinish is PorticoBase {
  
  event ProcessedMessage(PorticoStructs.DecodedVAA data, PorticoStructs.TokenReceived recv);

  

  function receiveWormholeMessages(
    bytes memory payload,
    bytes[] memory additionalVaas,
    bytes32 sourceAddress,
    uint16 sourceChain,
    bytes32 deliveryHash
  ) external payable {
    PorticoStructs.TokenReceived[] memory receivedTokens = new PorticoStructs.TokenReceived[](additionalVaas.length);
    IWormhole wormhole = wormhole;
    for (uint256 i = 0; i < additionalVaas.length; ++i) {
      IWormhole.VM memory parsed = wormhole.parseVM(additionalVaas[i]);
      // make sure its coming from a proper bridge contract
      require(parsed.emitterAddress == TOKENBRIDGE.bridgeContracts(parsed.emitterChainId), "Not a Token Bridge VAA");
      // get the transfer payload
      ITokenBridge.TransferWithPayload memory transfer = TOKENBRIDGE.parseTransferWithPayload(parsed.payload);

      // ensure that the to address is this address
      require(transfer.to == padAddress(address(this)) && transfer.toChain == wormhole.chainId(), "Token was not sent to this address");

      // complete the transfer
      TOKENBRIDGE.completeTransferWithPayload(additionalVaas[i]);

      // get the address for the token on this address
      address thisChainTokenAddress = transfer.tokenChain == wormhole.chainId()
        ? unpadAddress(transfer.tokenAddress)
        : TOKENBRIDGE.wrappedAsset(transfer.tokenChain, transfer.tokenAddress);
      uint8 decimals = IERC20(thisChainTokenAddress).decimals();
      uint256 denormalizedAmount = transfer.amount;
      if (decimals > 8) denormalizedAmount *= uint256(10) ** (decimals - 8);

      // receive the token
      receivedTokens[i] = PorticoStructs.TokenReceived({
        tokenHomeAddress: transfer.tokenAddress,
        tokenHomeChain: transfer.tokenChain,
        tokenAddress: IERC20(thisChainTokenAddress),
        amount: denormalizedAmount
      });
    }
    // call into overriden method
    receivePayloadAndTokens(payload, receivedTokens, sourceAddress, sourceChain, deliveryHash);
  }

  function receivePayloadAndTokens(
    bytes memory payload,
    PorticoStructs.TokenReceived[] memory receivedTokens,
    bytes32 sourceAddress,
    uint16 sourceChain,
    bytes32 deliveryHash
  ) internal {
    // make sure the sender is the relayer
    if (WORMHOLE_RELAYER != address(0x0)) {
      require(_msgSender() == WORMHOLE_RELAYER);
    }
    // make sure there is only one transfer received
    require(receivedTokens.length == 1, "only 1 transfer allowed");
    // require(sourceAddress == address(0)) - we don't actually care about the source address.
    // what matters more is what coin did we recv, and does it match up with the data?
    // grab the coin
    PorticoStructs.TokenReceived memory recv = receivedTokens[0];
    // decode the message
    PorticoStructs.DecodedVAA memory message = abi.decode(payload, (PorticoStructs.DecodedVAA));

    // we must have received the xAsset address
    require(recv.tokenHomeAddress == padAddress(address(message.canonAssetAddress)));
    // we must have received the amount expected
    require(recv.amount == message.xAssetAmount);

    // now process
    finish(message, recv);
    // simply emit the raw data bytes. it should be trivial to parse.
    // TODO: consider what fields to index here
    emit ProcessedMessage(message, recv);
  }

  /// @notice function to allow testing of finishing swap
  function testSwap(PorticoStructs.DecodedVAA memory params, PorticoStructs.TokenReceived memory recv) public payable {
    finish(params, recv);
  }

  function finish(PorticoStructs.DecodedVAA memory params, PorticoStructs.TokenReceived memory recv) internal {
    uint256 amount = 0;
    bool shouldUnwrap = params.flags.shouldUnwrapNative() && address(params.finalTokenAddress) == address(TOKENBRIDGE.WETH());
    if (params.finalTokenAddress == recv.tokenAddress) {
      // the person wanted the bridge token, so we will skip the swap
      amount = params.xAssetAmount;
      // if ther is no unwrapping step, we need to send the tokens
      if (!shouldUnwrap) {
        require(params.finalTokenAddress.transfer(params.recipientAddress, amount), "transfer failed");
      }
    } else {
      // if we are not unwrapping, we can send the result of the swap straight to the user.
      address receiver = shouldUnwrap ? address(this) : params.recipientAddress;
      amount = _finish_v3swap(params, recv, receiver);
    }
    if (shouldUnwrap) {
      TOKENBRIDGE.WETH().withdraw(amount);
      (bool sent /*bytes memory data*/, ) = params.recipientAddress.call{ value: amount }("");
      require(sent, "Failed to send Ether");
    }
  }

  function _finish_v3swap(
    PorticoStructs.DecodedVAA memory params,
    PorticoStructs.TokenReceived memory recv,
    address receiver
  ) internal returns (uint128 amount) {
    recv.tokenAddress.approve(address(ROUTERV3), params.xAssetAmount);
    amount = uint128(
      ROUTERV3.exactInputSingle(
        ISwapRouter.ExactInputSingleParams(
          address(recv.tokenAddress),
          address(params.finalTokenAddress),
          params.flags.feeTierFinish(), // fee tier
          receiver,
          block.timestamp + 10,
          params.xAssetAmount, // amountin
          0, //no min amount, slippage instead
          calculateSlippage(
            uint16(params.flags.maxSlippageFinish()),
            address(recv.tokenAddress),
            address(params.finalTokenAddress),
            params.flags.feeTierFinish()
          )
        )
      )
    );
  }
}

contract Portico is PorticoFinish, PorticoStart {
  constructor(ISwapRouter _routerV3, ITokenBridge _bridge, address _relayer) PorticoBase(_routerV3, _bridge, _relayer) {}
}
