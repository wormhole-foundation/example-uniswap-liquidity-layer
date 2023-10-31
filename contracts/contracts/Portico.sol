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

  ///@notice if tokenIn == token0 then slippage is in the negative, and vice versa
  ///@param maxSlippage is in BIPS
  function calculateSlippage(IV3Pool pool, uint16 maxSlippage, address tokenIn) internal view returns (uint160 sqrtPriceLimitX96) {
    //get current tick via slot0
    (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();

    uint160 buffer = (maxSlippage * sqrtPriceX96) / 10000;

    tokenIn == pool.token0() ? sqrtPriceLimitX96 = sqrtPriceX96 - buffer : sqrtPriceLimitX96 = sqrtPriceX96 + buffer;
  }

  ///@param maxSlippage is in BIPS
  function calculateMinPrice(uint256 amount, int16 maxSlippage) internal pure returns (uint256 minAmount) {

    console.log("Calculate Slippage, ", amount);

    
    if(maxSlippage == 0){
      console.log("0");
      return 0;
    }
    
    //get current tick via slot0
    uint16 maxSlippageAbs = maxSlippage > 0 ? uint16(maxSlippage) : uint16(-maxSlippage);
    uint256 buffer = uint256((maxSlippageAbs * amount) / 10000);

    minAmount = maxSlippage > 0 ? amount - buffer : amount + buffer;
    
    console.log("minAmount: ", minAmount);
  }
}
using PorticoFlagSetAccess for PorticoFlagSet;

abstract contract PorticoStart is PorticoBase {
  function _start_v3swap(PorticoStructs.TradeParameters memory params) internal returns (uint256 amount) {
    if (address(params.startTokenAddress) == address(TOKENBRIDGE.WETH()) && params.flags.shouldWrapNative()) {
      TOKENBRIDGE.WETH().deposit{ value: uint256(params.amountSpecified) }();
      require(params.startTokenAddress.balanceOf(address(this)) == uint256(params.amountSpecified));
    } else {
      require(params.startTokenAddress.transferFrom(msg.sender, address(this), uint256(params.amountSpecified)), "transfer fail");
    }
    // TODO: need sanity checks for token balances?
    require(params.startTokenAddress.approve(address(ROUTERV3), uint256(params.amountSpecified)), "Approve fail");
    
    console.log("Fee: ", params.flags.feeTierStart());

    
    amount = ROUTERV3.exactInputSingle(
      ISwapRouter.ExactInputSingleParams(
        address(params.startTokenAddress), // tokenIn
        address(params.xAssetAddress), //tokenOut
        params.flags.feeTierStart(), //fee
        address(this), //recipient
        block.timestamp + 10, //deadline
        params.amountSpecified, //amountIn
        0,//calculateMinPrice(params.amountSpecified, params.flags.maxSlippageStart()), //minAmountOut
        0//calculateSlippage()
      )
    );

    // TODO: do we need sanity checks for token balances (feeOnTransfer tokens?)
    // TODO: we technically dont need to do this. maybe worth the gas saving to be mean to the network :)
    //params.tokenAddress.approve(params.pool, 0);
  }

  function start(
    PorticoStructs.TradeParameters memory params
  ) public payable returns (address emitterAddress, uint16 chainId, uint64 sequence) {
    uint256 amount = 0;
    if (params.startTokenAddress == params.xAssetAddress) {
      // skip the v3 swap, and set amount to the amountSpeciified
      amount = uint256(params.amountSpecified);
    } else {
      amount = _start_v3swap(params);
    }
    // allow the token bridge to do its token bridge things
    IERC20(params.xAssetAddress).approve(address(TOKENBRIDGE), amount);
    // now we need to produce the payload we are sending
    PorticoStructs.DecodedVAA memory decodedVAA = PorticoStructs.DecodedVAA(
      params.flags,
      params.xAssetAddress,
      params.finalTokenAddress,
      params.recipientAddress,
      amount
    );
    // TODO: what happens when the asset is not an xasset. will this just fail?
    sequence = TOKENBRIDGE.transferTokensWithPayload{ value: wormhole.messageFee() }(
      address(params.xAssetAddress),
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
  event ProcessedMessage(bytes data);

  //https://github.com/wormhole-foundation/wormhole-solidity-sdk/blob/main/src/WormholeRelayerSDK.sol#L177
  //https://docs.wormhole.com/wormhole/quick-start/tutorials/hello-token#receiving-a-token
  struct TokenReceived {
    bytes32 tokenHomeAddress;
    uint16 tokenHomeChain;
    address tokenAddress;
    uint256 amount;
  }

  function receiveWormholeMessages(
    bytes memory payload,
    bytes[] memory additionalVaas,
    bytes32 sourceAddress,
    uint16 sourceChain,
    bytes32 deliveryHash
  ) external payable {
    TokenReceived[] memory receivedTokens = new TokenReceived[](additionalVaas.length);
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

      // get the address for the token on this addres
      address thisChainTokenAddress = transfer.tokenChain == wormhole.chainId()
        ? unpadAddress(transfer.tokenAddress)
        : TOKENBRIDGE.wrappedAsset(transfer.tokenChain, transfer.tokenAddress);
      uint8 decimals = IERC20(thisChainTokenAddress).decimals();
      uint256 denormalizedAmount = transfer.amount;
      if (decimals > 8) denormalizedAmount *= uint256(10) ** (decimals - 8);

      // receive the token
      receivedTokens[i] = TokenReceived({
        tokenHomeAddress: transfer.tokenAddress,
        tokenHomeChain: transfer.tokenChain,
        tokenAddress: thisChainTokenAddress,
        amount: denormalizedAmount
      });
    }
    // call into overriden method
    receivePayloadAndTokens(payload, receivedTokens, sourceAddress, sourceChain, deliveryHash);
  }

  function receivePayloadAndTokens(
    bytes memory payload,
    TokenReceived[] memory receivedTokens,
    bytes32 sourceAddress,
    uint16 sourceChain,
    bytes32 deliveryHash
  ) internal {
    // make sure the sender is the relayer
    require(_msgSender() == WORMHOLE_RELAYER);
    // make sure there is only one transfer received
    require(receivedTokens.length == 1, "only 1 transfer allowed");
    // require(sourceAddress == address(0)) - we don't actually care about the source address.
    // what matters more is what coin did we recv, and does it match up with the data?
    // grab the coin
    TokenReceived memory recv = receivedTokens[0];
    // decode the message
    PorticoStructs.DecodedVAA memory message = abi.decode(payload, (PorticoStructs.DecodedVAA));

    // we must have received the xAsset address
    require(recv.tokenAddress == address(message.xAssetAddress));
    // we must have received the amount expected
    require(recv.amount == message.xAssetAmount);

    // now process
    finish(message);
    // simply emit the raw data bytes. it should be trivial to parse.
    // TODO: consider what fields to index here
    emit ProcessedMessage(payload);
  }

  /// @notice function to allow testing of finishing swap
  function testSwap(PorticoStructs.DecodedVAA memory params) public payable {
    finish(params);
  }

  function finish(PorticoStructs.DecodedVAA memory params) internal {
    uint256 amount = 0;
    if (params.finalTokenAddress == params.xAssetAddress) {
      amount = params.xAssetAmount;
    } else {
      // TODO: check if the coins have actually been received from the bridge
      amount = _finish_v3swap(params);
    }
    if (params.flags.shouldUnwrapNative() && address(params.finalTokenAddress) == address(TOKENBRIDGE.WETH())) {
      TOKENBRIDGE.WETH().withdraw(amount);
      (bool sent /*bytes memory data*/, ) = params.recipientAddress.call{ value: amount }("");
      require(sent, "Failed to send Ether");
    } else {
      require(params.finalTokenAddress.transfer(params.recipientAddress, amount), "transfer failed");
    }
  }

  function _finish_v3swap(PorticoStructs.DecodedVAA memory params) internal returns (uint128 amount) {
    params.xAssetAddress.approve(address(ROUTERV3), params.xAssetAmount);
    uint256 amountOut = ROUTERV3.exactInputSingle(
      ISwapRouter.ExactInputSingleParams(
        address(params.xAssetAddress),
        address(params.finalTokenAddress),
        params.flags.feeTierFinish(), // fee tier
        address(this), //todo send to reciever?
        block.timestamp + 10,
        params.xAssetAmount, // amountin
        calculateMinPrice(params.xAssetAmount, params.flags.maxSlippageStart()), //minamount out
        0
      )
    );

    return uint128(amountOut);
  }
}

contract Portico is PorticoFinish, PorticoStart {
  constructor(ISwapRouter _routerV3, ITokenBridge _bridge, address _relayer) PorticoBase(_routerV3, _bridge, _relayer) {}
}
