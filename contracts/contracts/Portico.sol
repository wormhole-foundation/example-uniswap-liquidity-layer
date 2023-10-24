// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./ITokenBridge.sol";
import "./IWormhole.sol";
import "./IERC20.sol";

import "./uniswap/TickMath.sol";

//testing
import "hardhat/console.sol";

interface V3Pool {
  function swap(
    address recipient,
    bool zeroForOne,
    int256 amountSpecified,
    uint160 sqrtPriceLimitX96,
    bytes calldata data
  ) external returns (int256 amount0, int256 amount1);

  function token0() external view returns (address);

  function token1() external view returns (address);

  function slot0()
    external
    view
    returns (
      uint160 sqrtPriceX96,
      int24 tick,
      uint16 observationIndex,
      uint16 observationCardinality,
      uint16 observationCardinalityNext,
      uint8 feeProtocol,
      bool unlocked
    );
}

contract PorticoBase {
  struct DecodedVAA {
    // doubles as the message recipient
    address bridgeRecipient;
    address emitterAddress;
    // instructions for the trade
    V3Pool pool;
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
  }

  function version() external pure returns (uint32) {
    return 1;
  }

  function _msgSender() private view returns (address) {
    return msg.sender;
  }
}

contract PorticoStart is PorticoBase {
  struct TradeParameters {
    V3Pool pool;
    bool shouldWrapNative;
    bool shouldUnwrapNative;
    IERC20 tokenAddress;
    IERC20 xAssetAddress;
    // the recipient chain id
    uint16 recipientChain;
    // address of the recipient on the recipientChain
    address recipientAddress;
    // the pool to trade with on the other side
    V3Pool recipientPool;
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
    // passed to swap
    bool zeroForOne;
    int256 amountSpecified;
  }

  fallback() external payable {
    console.log("Fallback function is executed!");
    console.log("USDC bal: ", IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48).balanceOf(address(this)));
    console.log("wETH bal: ", IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2).balanceOf(address(this)));
    console.log("Balance: ", address(this).balance);
  }

  function _start_v3swap(TradeParameters memory params) internal returns (uint128 amount) {
    console.log("_start");

    // we check that this is the correct pool for the swap
    if (params.zeroForOne) {
      // if zero for one, then make sure that token 0 is native and token 1 is xAsset
      require(
        address(params.tokenAddress) == params.pool.token0() && address(params.xAssetAddress) == params.pool.token1(),
        "wrong token addresses"
      );
    } else {
      // else its flipped
      require(
        address(params.tokenAddress) == params.pool.token1() && address(params.xAssetAddress) == params.pool.token0(),
        "wrong token addresses"
      );
    }

    // TODO: need sanity checks for token balances?
    require(params.tokenAddress.approve(address(params.pool), uint256(params.amountSpecified)), "approve fail");

    console.log("SWAPPING");

    console.log("zf1: ", params.zeroForOne);
    console.log("amt: ", uint256(params.amountSpecified));
    console.log("Pool: ", address(params.pool));
    console.log("USDC bal: ", IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48).balanceOf(address(this)));
    console.log("wETH bal: ", IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2).balanceOf(address(this)));
    console.log("Balance: ", address(this).balance);

    uint160 slippage = calculateSlippage(params.pool);
    console.log("Calced Slippage: ", uint256(slippage));
    (int256 amount0, int256 amount1) = params.pool.swap(
      address(this), // the recipient is this address, beacuse it needs to then send the xAsset
      params.zeroForOne,
      -int256(params.amountSpecified),
      // TODO: calculate this number somehow.
      1975598269232646599021403868960619,//1461446703485210103287273052203988822378723970342 - 1, //tickmath.MAX_SQRT_RATIO
      abi.encode("0x")
    );
    console.log("SWAP DONE");
    // TODO: do we need sanity checks for token balances (feeOnTransfer tokens?)
    // TODO: we technically dont need to do this. maybe worth the gas saving to be mean to the network :)
    //params.tokenAddress.approve(params.pool, 0);

    int256 amount = params.zeroForOne ? -amount1 : -amount0;
    require(amount > 0, "bad amount");
    return uint128(uint256(amount));
  }

  function calculateSlippage(V3Pool pool) internal view returns (uint160 sqrtPriceLimitX96) {
    //get current tick via slot0
    (uint160 sqrtPriceX96, int24 tick, , , , , ) = pool.slot0();

    sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tick);

    console.log("sqrtPriceX96: ", sqrtPriceX96);
    
  }

  function start(TradeParameters memory params) public payable returns (uint64 sequence) {
    console.log("START");
    // TODO: add payable functionality
    // use the weth9 address in params.tokenBridge.WETH() to wrap weth if value is sent instead of performing the balance transfer
    // if(params.shouldWrapNative) {
    //} else {
    require(params.tokenAddress.transferFrom(msg.sender, address(this), uint256(params.amountSpecified)), "transfer fail");
    //}

    int256 amount = int256(uint256(_start_v3swap(params)));

    // now transfer the tokens cross chain, obtaining a sequence id.
    // TODO: what happens when the asset is not an xasset. will this just fail?
    sequence = params.tokenBridge.transferTokens(
      address(params.xAssetAddress),
      uint256(amount),
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
      uint128(uint256(amount)),
      params.tokenBridge,
      uint16(block.chainid),
      params.recipientChain,
      params.recipientAddress,
      this.version(),
      params.messageNonce,
      params.bridgeNonce,
      sequence
    );

    bytes memory encodedData = abi.encode(decodedVAA);
    sequence = params.tokenBridge.wormhole().publishMessage(params.messageNonce, encodedData, params.consistencyLevel);
    return sequence;
  }
}

contract PorticoReceiver is PorticoBase {
  ITokenBridge public tokenBridge;

  mapping(bytes32 => bool) public nonces;

  event ProcessedMessage(bytes data);

  constructor() /**ITokenBridge _tokenBridge */ {
    //tokenBridge = _tokenBridge;
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
    // we want to trade the xAsset for the token
    bool zeroForOne = params.pool.token0() == address(params.xAssetAddress);
    // check that this is the correct pool for the swap
    if (zeroForOne) {
      // if zero for one, then make sure that token 0 is xAsset and token 1 is the token
      require(
        address(params.tokenAddress) == params.pool.token1() && address(params.xAssetAddress) == params.pool.token0(),
        "wrong token addresses"
      );
    } else {
      // else its flipped
      require(
        address(params.tokenAddress) == params.pool.token0() && address(params.xAssetAddress) == params.pool.token1(),
        "wrong token addresses"
      );
    }

    // TODO: need sanity checks for token balances?
    //require(params.xAssetAddress.approve(params.pool, uint256(params.amountSpecified)), "approve fail");//todo no amount specified on DecodedVAA

    (int256 amount0, int256 amount1) = params.pool.swap(
      address(this), // the recipient is this address, beacuse it needs to then send the token to the user
      zeroForOne,
      int256(uint256(params.xAssetAmount)),
      // TODO: calculate this number somehow.
      1461446703485210103287273052203988822378723970342, //tickMath.MAX_SQRT_RATIO todo
      "0x"
    );
    // TODO: do we need sanity checks for token balances (feeOnTransfer tokens?)

    // TODO: we technically dont need to do this. maybe worth the gas saving to be mean to the network :)
    // require(params.tokenAddress.approve(params.pool, 0), "approve fail");

    // get the correct amount
    int256 amount = zeroForOne ? -amount1 : -amount0;
    require(amount > 0, "bad amount");
    return uint128(uint256(amount));
  }
}

// Portico
/**PorticoEvents, */ contract Portico is PorticoStart, PorticoReceiver {
  constructor() {}
}
