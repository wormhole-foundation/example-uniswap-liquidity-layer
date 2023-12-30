// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./PorticoStructs.sol";
import "./ITokenBridge.sol";
import "./IWormhole.sol";
import "./IERC20.sol";
import "./IWETH.sol";

//uniswap
import "./uniswap/TickMath.sol";
import "./uniswap/ISwapRouter02.sol";
import "./uniswap/IV3Pool.sol";
import "./uniswap/PoolAddress.sol";

//oz
import "./oz/Ownable.sol";
import "./oz/ReentrancyGuard.sol";
import "./oz/SafeERC20.sol";

contract PorticoBase is Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  ISwapRouter02 public immutable ROUTERV3;
  ITokenBridge public immutable TOKENBRIDGE;
  IWETH public immutable WETH;
  IWormhole public immutable wormhole;
  uint16 public immutable wormholeChainId;

  address public FEE_RECIPIENT;

  constructor(ISwapRouter02 _routerV3, ITokenBridge _bridge, IWETH _weth, address _feeRecipient) Ownable(_msgSender()) {
    ROUTERV3 = _routerV3;
    TOKENBRIDGE = _bridge;
    wormhole = _bridge.wormhole();
    WETH = _weth;
    wormholeChainId = wormhole.chainId();
    FEE_RECIPIENT = _feeRecipient;
  }

  function version() external pure returns (uint32) {
    return 1;
  }

  ///@notice config recipient for relayer fees
  function setFeeRecipient(address newFeeRecipient) external onlyOwner {
    FEE_RECIPIENT = newFeeRecipient;
  }

  ///@notice if current approval is insufficient, approve max
  ///@notice if current approval is insufficient but > 0, approve 0 first
  function updateApproval(address spender, IERC20 token, uint256 amount) internal {
    //get current allowance
    uint256 currentAllowance = token.allowance(address(this), spender);

    if (currentAllowance < amount) {
      //reset approval if allowance greater than 0 but less than amount
      if (currentAllowance != 0) {
        token.safeIncreaseAllowance(spender, 0);
      }
      //approve maximum
      token.safeIncreaseAllowance(spender, 2 ** 256 - 1);
    }
  }
}

abstract contract PorticoStart is PorticoBase {
  using PorticoFlagSetAccess for PorticoFlagSet;
  using SafeERC20 for IERC20;

  function padAddress(address addr) internal pure returns (bytes32) {
    return bytes32(uint256(uint160(addr)));
  }

  function _start_v3swap(PorticoStructs.TradeParameters memory params, uint256 actualAmount) internal returns (uint256 amount) {
    updateApproval(address(ROUTERV3), params.startTokenAddress, params.startTokenAddress.balanceOf(address(this)));

    ROUTERV3.exactInputSingle(
      ISwapRouter02.ExactInputSingleParams(
        address(params.startTokenAddress), // tokenIn
        address(params.canonAssetAddress), //tokenOut
        params.flags.feeTierStart(), //fee
        address(this), //recipient
        actualAmount, //amountIn
        params.minAmountStart, //minAmountReceived
        0
      )
    );

    amount = params.canonAssetAddress.balanceOf(address(this));
  }

  event PorticoSwapStart(uint64 indexed sequence, uint16 indexed chainId);

  function start(
    PorticoStructs.TradeParameters memory params
  ) external payable nonReentrant returns (address emitterAddress, uint16 chainId, uint64 sequence) {
    uint256 amount;
    uint256 whMessageFee = wormhole.messageFee();
    uint256 value = msg.value;
    // always check for native wrapping logic
    if (address(params.startTokenAddress) == address(WETH) && params.flags.shouldWrapNative()) {
      //if wrapping, msg.value should be exactly amountSpecified + wormhole message fee
      require(value == params.amountSpecified + whMessageFee, "msg.value incorrect");

      // if we are wrapping a token, we call deposit for the user, assuming we have been send what we need.
      WETH.deposit{ value: params.amountSpecified }();

      //Because wormhole rounds to 1e8, some dust may exist from previous txs
      //we use balanceOf to lump this in with future txs
      amount = WETH.balanceOf(address(this));
    } else {
      //ensure no eth needs to be refunded
      require(value == whMessageFee, "msg.value incorrect");
      // otherwise, just get the token we need to do the swap (if we are swapping, or just the token itself)
      params.startTokenAddress.safeTransferFrom(_msgSender(), address(this), params.amountSpecified);
      //Because wormhole rounds to 1e8, some dust may exist from previous txs
      //we use balanceOf to lump this in with future txs
      amount = params.startTokenAddress.balanceOf(address(this));
      //ensure we received enough
      require(amount >= params.amountSpecified, "transfer insufficient");
    }

    // if the start token is the canon token, we don't need to swap
    if (params.startTokenAddress != params.canonAssetAddress) {
      // do the swap, and amount is now the amount that we received from the swap
      amount = _start_v3swap(params, amount);
    }

    // allow the token bridge to do its token bridge things
    updateApproval(address(TOKENBRIDGE), params.canonAssetAddress, amount);

    // now we need to produce the payload we are sending
    PorticoStructs.DecodedVAA memory decodedVAA = PorticoStructs.DecodedVAA(
      params.flags,
      params.finalTokenAddress,
      params.recipientAddress,
      amount,
      params.minAmountFinish,
      params.relayerFee
    );

    sequence = TOKENBRIDGE.transferTokensWithPayload{ value: whMessageFee }(
      address(params.canonAssetAddress),
      amount,
      params.flags.recipientChain(),
      padAddress(params.recipientPorticoAddress),
      params.flags.bridgeNonce(),
      abi.encode(decodedVAA)
    );

    chainId = wormholeChainId;
    emitterAddress = address(TOKENBRIDGE);
    emit PorticoSwapStart(sequence, chainId);
  }
}

abstract contract PorticoFinish is PorticoBase {
  using PorticoFlagSetAccess for PorticoFlagSet;
  using SafeERC20 for IERC20;

  event PorticoSwapFinish(bool swapCompleted, uint256 finaluserAmount, uint256 relayerFeeAmount, PorticoStructs.DecodedVAA data);

  receive() external payable {}

  function isContract(address _addr) internal view returns (bool value) {
    uint32 size;
    assembly {
      size := extcodesize(_addr)
    }
    return (size > 0);
  }

  ///@dev https://github.com/wormhole-foundation/wormhole-solidity-sdk/blob/main/src/Utils.sol#L10-L15
  function unpadAddress(bytes32 whFormatAddress) internal pure returns (address) {
    //require(uint256(whFormatAddress) >> 160 != 0, "Not EVM Addr");//todo
    return address(uint160(uint256(whFormatAddress)));
  }

  // receiveMessageAndSwap is the entrypoint for finishing the swap
  function receiveMessageAndSwap(bytes calldata encodedTransferMessage) external nonReentrant {
    // start by calling _completeTransfer, submitting the VAA to the token bridge
    (PorticoStructs.DecodedVAA memory message, PorticoStructs.BridgeInfo memory bridgeInfo) = _completeTransfer(encodedTransferMessage);
    // we modify the message to set the relayerFee to 0 if the msgSender is the fee recipient.
    bridgeInfo.relayerFeeAmount = (_msgSender() == message.recipientAddress) ? 0 : message.relayerFee;

    //now process
    (bool swapCompleted, uint256 finalUserAmount) = finish(message, bridgeInfo);

    // simply emit the raw data bytes. it should be trivial to parse.
    emit PorticoSwapFinish(swapCompleted, finalUserAmount, bridgeInfo.relayerFeeAmount, message);
  }

  // _completeTransfer takes the vaa for a payload3 token transfer, redeems it with the token bridge, and returns the decoded vaa payload
  function _completeTransfer(
    bytes calldata encodedTransferMessage
  ) internal returns (PorticoStructs.DecodedVAA memory message, PorticoStructs.BridgeInfo memory bridgeInfo) {
    /**
     * Call `completeTransferWithPayload` on the token bridge. This
     * method acts as a reentrancy protection since it does not allow
     * transfers to be redeemed more than once.
     */
    bytes memory transferPayload = TOKENBRIDGE.completeTransferWithPayload(encodedTransferMessage);

    // parse the wormhole message payload into the `TransferWithPayload` struct, a payload3 token transfer
    ITokenBridge.TransferWithPayload memory transfer = TOKENBRIDGE.parseTransferWithPayload(transferPayload);

    // ensure that the to address is this address
    require(unpadAddress(transfer.to) == address(this) && transfer.toChain == wormholeChainId, "Token was not sent to this address");

    // decode the payload3 we originally sent into the decodedVAA struct.
    message = abi.decode(transfer.payload, (PorticoStructs.DecodedVAA));
    // get the address for the token on this address.
    bridgeInfo.tokenReceived = IERC20(
      transfer.tokenChain == wormholeChainId
        ? unpadAddress(transfer.tokenAddress)
        : TOKENBRIDGE.wrappedAsset(transfer.tokenChain, transfer.tokenAddress)
    );

    // put the transfer amount into amountReceived, knowing we may need to change it in a sec
    bridgeInfo.amountReceived = transfer.amount;

    // if there are more than 8 decimals, we need to denormalize. wormhole token bridge truncates tokens of more than 8 decimals to 8 decimals.
    uint8 decimals = bridgeInfo.tokenReceived.decimals();
    if (decimals > 8) {
      bridgeInfo.amountReceived *= uint256(10) ** (decimals - 8);
    }
  }

  ///@notice determines we need to swap and/or unwrap, does those things if needed, and sends tokens to user & pays relayer fee
  function finish(
    PorticoStructs.DecodedVAA memory params,
    PorticoStructs.BridgeInfo memory bridgeInfo
  ) internal returns (bool swapCompleted, uint256 finalUserAmount) {
    // see if the unwrap flag is set, and that the finalTokenAddress is the address we have set on deploy as our native weth9 address
    bool shouldUnwrap = params.flags.shouldUnwrapNative() && address(params.finalTokenAddress) == address(WETH);
    if ((params.finalTokenAddress) == bridgeInfo.tokenReceived) {
      // this means that we don't need to do a swap, aka, we received the canon asset.
      finalUserAmount = payOut(shouldUnwrap, params.finalTokenAddress, params.recipientAddress, bridgeInfo.relayerFeeAmount);
      return (false, finalUserAmount);
    }
    //if we are here, if means we need to do the swap, resulting aset is sent to this address
    swapCompleted = _finish_v3swap(params, bridgeInfo);

    // if the swap fails, we just transfer the amount we received from the token bridge to the recipientAddress.
    if (!swapCompleted) {
      bridgeInfo.tokenReceived.transfer(params.recipientAddress, bridgeInfo.amountReceived);
      // we also mark swapCompleted to be false for PorticoSwapFinish event
      return (swapCompleted, bridgeInfo.amountReceived);
    }
    // we must call payout if the swap was completed
    finalUserAmount = payOut(shouldUnwrap, params.finalTokenAddress, params.recipientAddress, bridgeInfo.relayerFeeAmount);
  }

  // if swap fails, we don't pay fees to the relayer
  // the reason is because that typically, the swap fails because of bad market conditions
  // in this case, it is in the best interest of the mev/relayer to NOT relay this message until conditions are good
  // the user of course, who if they self relay, does not pay a fee, does not have this problem, so they can force this if they wish
  // swap failed - return canon asset to recipient
  // it will return true if the swap was completed, indicating that funds need to be sent from this contract to the recipient
  function _finish_v3swap(
    PorticoStructs.DecodedVAA memory params,
    PorticoStructs.BridgeInfo memory bridgeInfo
  ) internal returns (bool swapCompleted) {
    //verify pool exists, catch won't work for this for some reason
    if (
      !isContract(
        PoolAddress.computeAddress(
          ROUTERV3.factory(),
          PoolAddress.getPoolKey(address(bridgeInfo.tokenReceived), address(params.finalTokenAddress), params.flags.feeTierFinish())
        )
      )
    ) {
      return false;
    }

    // set swap options with user params
    ISwapRouter02.ExactInputSingleParams memory swapParams = ISwapRouter02.ExactInputSingleParams({
      tokenIn: address(bridgeInfo.tokenReceived),
      tokenOut: address(params.finalTokenAddress),
      fee: params.flags.feeTierFinish(),
      recipient: address(this), // we need to receive the token in order to correctly split the fee. tragic.
      amountIn: bridgeInfo.amountReceived,
      amountOutMinimum: params.minAmountFinish,
      sqrtPriceLimitX96: 0 //sqrtPriceLimit
    });

    updateApproval(address(ROUTERV3), bridgeInfo.tokenReceived, bridgeInfo.amountReceived);
    // try to do the swap
    try ROUTERV3.exactInputSingle(swapParams) {
      swapCompleted = true;
    } catch Error(string memory /**e*/) {
      swapCompleted = false;
    }
  }

  ///@notice pay out to user and relayer
  ///@notice this should always be called UNLESS swap fails, in which case payouts happen there
  function payOut(bool unwrap, IERC20 finalToken, address recipient, uint256 relayerFeeAmount) internal returns (uint256 finalUserAmount) {
    uint256 totalBalance = finalToken.balanceOf(address(this));

    //square up balances with what we actually have, don't trust reporting from the bridge
    if (relayerFeeAmount > totalBalance) {
      //control for underflow
      finalUserAmount = 0;
      relayerFeeAmount = totalBalance;
    } else {
      //user gets total - relayer fee
      finalUserAmount = totalBalance - relayerFeeAmount;
    }

    address feeRecipient = FEE_RECIPIENT == address(0x0) ? _msgSender() : FEE_RECIPIENT;

    if (unwrap) {
      WETH.withdraw(WETH.balanceOf(address(this)));
      //send to user
      if (finalUserAmount > 0) {
        (bool sentToUser, ) = recipient.call{ value: finalUserAmount }("");
        require(sentToUser, "Failed to send Ether");
      }
      if (relayerFeeAmount > 0) {
        //pay relayer fee
        (bool sentToRelayer, ) = feeRecipient.call{ value: relayerFeeAmount }("");
        require(sentToRelayer, "Failed to send Ether");
      }
    } else {
      //pay recipient
      if (finalUserAmount > 0) {
        finalToken.safeTransfer(recipient, finalUserAmount);
      }
      if (relayerFeeAmount > 0) {
        //pay relayer
        finalToken.safeTransfer(feeRecipient, relayerFeeAmount);
      }
    }
  }
}

contract Portico is PorticoFinish, PorticoStart {
  constructor(
    ISwapRouter02 _routerV3,
    ITokenBridge _bridge,
    IWETH _weth,
    address _feeRecipient
  ) PorticoBase(_routerV3, _bridge, _weth, _feeRecipient) {}
}
