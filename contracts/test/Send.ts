
import { DecodedVAA, s, TradeParameters } from "./scope"
import { currentBlock, resetCurrent } from "../util/block"
import { DeployContract } from "../util/deploy"
import { showBody, showBodyCyan } from "../util/format"
import { ethers, network } from "hardhat";
import { PorticoReceiver__factory, PorticoStart__factory, TokenBridge__factory } from "../typechain-types";
import { expect } from "chai";
import { BN } from "../util/number";
import { getGas, toNumber } from "../util/msc"
import { start } from "repl";
import { stealMoney } from "../util/money";


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
      amountSpecified: s.WETH_AMOUNT,
      maxSlippage: 5
    }

    //confirm starting balances
    const startStartWeth = await s.WETH.balanceOf(s.Start.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)
    const startStartUSDC = await s.USDC.balanceOf(s.Start.address)
    const startBobUSDC = await s.USDC.balanceOf(s.Bob.address)

    expect(startStartWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(s.WETH_AMOUNT, "Starting wETH is correct")
    expect(startStartUSDC).to.eq(0, "No USDC at start")
    expect(startBobUSDC).to.eq(0, "Starting USDC is correct")

    await s.WETH.connect(s.Bob).approve(s.Start.address, s.WETH_AMOUNT)
    const result = await s.Start.connect(s.Bob).start(params)
    const gas = await getGas(result)
    showBodyCyan("GAS TO START: ", gas)

    //check ending balances
    const endStartWeth = await s.WETH.balanceOf(s.Start.address)
    const endBobWeth = await s.WETH.balanceOf(s.Bob.address)
    const endStartUSDC = await s.USDC.balanceOf(s.Start.address)
    const endBobUSDC = await s.USDC.balanceOf(s.Bob.address)

    //ending balances should be 0 because the xAsset is sent to the tokenbridge
    expect(endStartWeth).to.eq(0, "No weth at start")
    expect(endBobWeth).to.eq(0, "Ending wETH is correct")
    expect(endStartUSDC).to.eq(0, "No USDC at start")
    expect(endBobUSDC).to.eq(0, "Ending USDC is correct")

  })
})

describe("Receive", () => {

  //this is the amount of USDC received from the first swap as of the pinned block
  const usdcAmount = BN("1783362958")

  it("Steal USDC to the Receiver to simulate tokenbridge sending it", async () => {
    await stealMoney(s.Bank, s.Receiver.address, s.USDC.address, usdcAmount)
  })

  it("Recieve xChain tx", async () => {

    //todo determine what these should actually be set to
    //boiler plate data
    const params: DecodedVAA = {
      bridgeRecipient: s.Receiver.address,
      emitterAddress: s.Receiver.address,
      pool: s.e.usdcWethPool,
      shouldUnwrapNative: false,
      tokenAddress: s.WETH.address,
      xAssetAddress: s.USDC.address,
      xAssetAmount: usdcAmount,
      tokenBridge: s.tokenBridgeAddr,
      originChain: BN(1),
      recipientChain: BN(1),
      recipientAddress: s.Carol.address,
      porticoVersion: BN(1),
      messageNonce: BN(1),
      bridgeNonce: BN(1),
      bridgeSequence: BN(1),
      maxSlippage: 5
    }

    const startReceiverUSDC = await s.USDC.balanceOf(s.Receiver.address)
    const startCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const startCarolWETH = await s.WETH.balanceOf(s.Carol.address)
    expect(startReceiverUSDC).to.eq(usdcAmount, "Receiver has USDC")
    expect(startCarolUSDC).to.eq(0, "Carol has 0 USDC")
    expect(startCarolWETH).to.eq(0, "Carol has 0 WETH")

    const gas = await getGas(await s.Receiver.testSwap(params))
    showBodyCyan("Gas to do reciving swap: ", gas)

    const endReceiverUSDC = await s.USDC.balanceOf(s.Receiver.address)
    const endCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const endCarolWETH = await s.WETH.balanceOf(s.Carol.address)

    expect(endReceiverUSDC).to.eq(0, "Receiver no longer has USDC")
    expect(endCarolUSDC).to.eq(0, "Carol has 0 USDC")
    expect(endCarolWETH).to.be.gt(0, "Carol has received WETH")

    showBodyCyan("Received wETH: ", await toNumber(endCarolWETH))

    expect(await toNumber(endCarolWETH)).to.be.closeTo(await toNumber(s.WETH_AMOUNT), 0.02, "Swap completed")

  })
})
