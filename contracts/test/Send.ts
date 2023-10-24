
import { s, TradeParameters } from "./scope"
import { currentBlock, resetCurrent } from "../util/block"
import { DeployContract } from "../util/deploy"
import { ethers, network } from "hardhat";
import { PorticoReceiver__factory, PorticoStart__factory, TokenBridge__factory } from "../typechain-types";
import { expect } from "chai";
import { BN } from "../util/number";


/**
 * In this example,
 * Both the sender and receiver are on the same chain
 * We are swapping wETH => USDC
 */
describe("Send", function () {

  it("send transaction", async () => {

    const params: TradeParameters = {
      pool: s.e.usdcWethPool,
      shouldWrapNative: false,
      shouldUnwrapNative: false,
      tokenAddress: s.e.wethAddress,
      xAssetAddress: s.e.usdcAddress,
      recipientChain: 1,
      recipientAddress: s.Carol.address,
      recipientPool: s.e.usdcWethPool,
      emitterAddress: s.Bank,
      tokenBridge: s.tokenBridgeAddr,
      bridgeRecipient: "0x8EB8a3b98659Cce290402893d0123abb75E3ab28000000000000000000000000",
      arbiterFee: BN("0"),
      bridgeNonce: 0,
      messageNonce: 0,
      consistencyLevel: 0,
      zeroForOne: false,
      amountSpecified: s.WETH_AMOUNT
    }

    /**
     * 0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8
     * zero for 1 == false
     * token0 == USDC
     * token1 == wETH
     */

    await s.WETH.connect(s.Bob).approve(s.Start.address, s.WETH_AMOUNT)
    console.log("SENDING")
    await s.Start.connect(s.Bob).start(params)



  })

})
