// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./ITokenBridge.sol";
import "./IWormhole.sol";
import "./IERC20.sol";

//uniswap
import "./uniswap/TickMath.sol";
import "./uniswap/ISwapRouter.sol";
import "./uniswap/IV3Pool.sol";

//testing
import "hardhat/console.sol";

contract PorticoBase {
  ISwapRouter public immutable ROUTERV3;

  struct DecodedVAA {
    // doubles as the message recipient
    address bridgeRecipient;
    address emitterAddress;
    // instructions for the trade
    IV3Pool pool;
    bool shouldUnwrapNative;
    IERC20 tokenAddress;
    IERC20 xAssetAddress;
    uint128 xAssetAmount;
    ITokenBridge tokenBridge;
    // TODO: check that this combination of fields (chains + nonces) is enough to serve as a secure nonce
    uint16 originChain;
    uint16 recipientChain;
    address recipientAddress;
    uint32 porticoVersion;
    uint32 messageNonce;
    uint32 bridgeNonce;
    uint64 bridgeSequence;
    uint16 maxSlippage; //in BIPS - 100 = 1% slippage
  }

  constructor(ISwapRouter _routerV3) {
    ROUTERV3 = _routerV3;
  }

  function version() external pure returns (uint32) {
    return 1;
  }

  function _msgSender() private view returns (address) {
    return msg.sender;
  }

  ///@notice if tokenIn == token0 then slippage is in the negative, and vice versa
  ///@param maxSlippage is in BIPS
  function calculateSlippage(IV3Pool pool, uint16 maxSlippage, address tokenIn) internal view returns (uint160 sqrtPriceLimitX96) {
    //get current tick via slot0
    (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();

    uint160 buffer = (maxSlippage * sqrtPriceX96) / 10000;

    tokenIn == pool.token0() ? sqrtPriceLimitX96 = sqrtPriceX96 - buffer : sqrtPriceLimitX96 = sqrtPriceX96 + buffer;
  }

  function deduceTokens(bool zf1, IV3Pool pool) internal returns (address tokenIn, address tokenOut) {
    if (zf1) {
      tokenIn = pool.token0();
      tokenOut = pool.token1();
    } else {
      tokenIn = pool.token1();
      tokenOut = pool.token0();
    }
  }
}

contract PorticoStart is PorticoBase {
  struct TradeParameters {
    IV3Pool pool;
    bool zeroForOne;
    bool shouldWrapNative;
    bool shouldUnwrapNative;
    IERC20 tokenAddress;
    IERC20 xAssetAddress;
    // the recipient chain id
    uint16 recipientChain;
    // address of the recipient on the recipientChain
    address recipientAddress;
    // the pool to trade with on the other side
    IV3Pool recipientPool;
    // TODO: is it secure to allow this to be user defined? i believe the answer is yes
    address emitterAddress;
    // for bridging
    ITokenBridge tokenBridge;
    bytes32 bridgeRecipient;
    uint256 arbiterFee;
    uint32 bridgeNonce;
    // for sending the message
    uint32 messageNonce;
    uint8 consistencyLevel;
    int256 amountSpecified;
    uint16 maxSlippage; //in BIPS - 100 = 1% slippage
  }

  constructor(ISwapRouter _localRouter) PorticoBase(_localRouter) {}

  function _start_v3swap(TradeParameters memory params) internal returns (uint256 amount, address tokenIn, address xAsset) {
    // TODO: need sanity checks for token balances?
    require(params.tokenAddress.approve(address(params.pool), uint256(params.amountSpecified)), "approve fail");

    (tokenIn, xAsset) = deduceTokens(params.zeroForOne, params.pool);

    params.tokenAddress.approve(address(ROUTERV3), uint256(params.amountSpecified));
    amount = ROUTERV3.exactInputSingle(
      ISwapRouter.ExactInputSingleParams(
        tokenIn, //tokenIn
        xAsset, //tokenOut
        params.pool.fee(), //fee
        address(this), //recipient
        block.timestamp + 10, //deadline
        uint256(params.amountSpecified), //amountIn
        0, //amountOutMin //todo might be easier to calc slippage off chain and then pass amountOutMin to enfoce it
        calculateSlippage(params.pool, params.maxSlippage, address(params.tokenAddress)) //sqrtPriceLimitX96 (slippage) //todo, determine if we prefer to calc slippage with this or amountOutMin
        //if sqrtPriceLimitX96 == 0, then the min/max SQRT RATIO is used
      )
    );

    // TODO: do we need sanity checks for token balances (feeOnTransfer tokens?)
    // TODO: we technically dont need to do this. maybe worth the gas saving to be mean to the network :)
    //params.tokenAddress.approve(params.pool, 0);
  }

  function start(TradeParameters memory params) public payable returns (uint64 sequence) {
    // TODO: add payable functionality
    // use the weth9 address in params.tokenBridge.WETH() to wrap weth if value is sent instead of performing the balance transfer
    // if(params.shouldWrapNative) {
    //} else {
    require(params.tokenAddress.transferFrom(msg.sender, address(this), uint256(params.amountSpecified)), "transfer fail");
    //}

    (uint256 amount, address tokenIn, address xAsset) = _start_v3swap(params);

    // now transfer the tokens cross chain, obtaining a sequence id.
    params.xAssetAddress.approve(address(params.tokenBridge), uint256(amount));

    // TODO: what happens when the asset is not an xasset. will this just fail?
    sequence = params.tokenBridge.transferTokens(
      address(params.xAssetAddress),
      amount,
      params.recipientChain,
      params.bridgeRecipient,
      params.arbiterFee,
      params.bridgeNonce
    );

    // now we need to produce a VAA
    DecodedVAA memory decodedVAA = DecodedVAA(
      address(uint160(uint256(params.bridgeRecipient))),
      params.emitterAddress,
      params.recipientPool,
      params.shouldUnwrapNative,
      params.tokenAddress,
      params.xAssetAddress,
      uint128(amount),
      params.tokenBridge,
      uint16(block.chainid),
      params.recipientChain,
      params.recipientAddress,
      this.version(),
      params.messageNonce,
      params.bridgeNonce,
      sequence,
      params.maxSlippage
    );

    bytes memory encodedData = abi.encode(decodedVAA);

    sequence = params.tokenBridge.wormhole().publishMessage(params.messageNonce, encodedData, params.consistencyLevel);
  }
}

contract PorticoReceiver is PorticoBase {
  ITokenBridge public tokenBridge;

  mapping(bytes32 => bool) public nonces;

  event ProcessedMessage(bytes data);

  constructor(ISwapRouter _localRouter, ITokenBridge _tokenBridge) PorticoBase(_localRouter) {
    tokenBridge = _tokenBridge;
  }

  //https://docs.wormhole.com/wormhole/quick-start/tutorials/hello-token#receiving-a-token
  //https://github.com/wormhole-foundation/wormhole-solidity-sdk/blob/main/src/WormholeRelayerSDK.sol#L177
  function receivePayload3(
    bytes memory payload,
    bytes[] memory additionalVaas,
    bytes32 sourceAddress,
    uint16 sourceChain,
    bytes32 deliveryHash
  ) public payable returns (DecodedVAA memory) {
    //return abi.decode(tokenBridge.completeTransferWithPayload(encodedVm), (DecodedVAA));
  }

  function receiveWormholeMessages(bytes[] memory signedVaas, bytes[] memory _unknown) public payable {
    //todo don't hard code this addr 0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B
    (IWormhole.VM memory parsed, bool valid, string memory reason) = tokenBridge.wormhole().parseAndVerifyVM(signedVaas[0]);

    require(valid, reason);

    require(!nonces[parsed.hash]);
    DecodedVAA memory message = abi.decode(parsed.payload, (DecodedVAA));
    // make sure we are the recipient!
    require(message.bridgeRecipient == address(this));
    // make sure that the message is coming from the emitter that we trusted on the other side of this trade
    require(message.emitterAddress == address(uint160(uint256(parsed.emitterAddress))), "wrong emitter address");
    require(message.recipientChain == block.chainid, "wrong chain id");
    // as a reentrancy guard, put it above the processing
    nonces[parsed.hash] = true;
    // now process
    finish(message);

    // simply emit the raw data bytes. it should be trivial to parse.
    // TODO: consider what fields to index here
    emit ProcessedMessage(parsed.payload);
  }

  /// @notice function to allow testing of finishing swap
  function testSwap(DecodedVAA memory params) public payable {
    finish(params);
  }

  function finish(DecodedVAA memory params) internal {
    // version must match
    require(this.version() == params.porticoVersion, "version mismatch");

    // TODO: check if the coins have actually been received from the bridge

    uint256 amount = _finish_v3swap(params);
    //TODO: implement shouldUnwrapNative
    //    should check if weth9
    //    if is weth9, should wrap that and send that instead
    //if(shouldUnwrapNative) {
    //} else {
    // send the token
    require(params.tokenAddress.transfer(params.recipientAddress, amount), "transfer failed");
    //}
  }

  function _finish_v3swap(DecodedVAA memory params) internal returns (uint128 amount) {
    params.xAssetAddress.approve(address(ROUTERV3), params.xAssetAmount);

    uint256 amountOut = ROUTERV3.exactInputSingle(
      ISwapRouter.ExactInputSingleParams(
        address(params.xAssetAddress),
        address(params.tokenAddress),
        3000, //todo get from xchain pool
        address(this), //todo send to reciever?
        block.timestamp + 10,
        params.xAssetAmount,
        0, //amountOutMin todo specify this? or calc sqrtPriceLimitX96
        calculateSlippage(params.pool, params.maxSlippage, address(params.xAssetAddress)) //sqrtPriceLimitX96 (slippage) //todo, determine if we prefer to calc slippage with this or amountOutMin
      )
    );

    return uint128(amountOut);
  }
}
