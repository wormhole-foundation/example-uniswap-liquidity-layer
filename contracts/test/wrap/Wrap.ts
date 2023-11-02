
import { DecodedVAA, s, TradeParameters } from "../scope";
import { showBody, showBodyCyan } from "../../util/format";
import { ethers } from "hardhat";
import { expect } from "chai";
import { BN } from "../../util/number";
import { getGas, toNumber } from "../../util/msc";
import { stealMoney } from "../../util/money";


/**
 * In this example,
 * Both the sender and receiver are on the same chain
 * We are swapping wETH => USDC
 */
describe("Wrap", function () {

  it("send transaction with native ether and wrap", async () => {

    const params: TradeParameters = {
      flags: s.wrapData,
      startTokenAddress: s.e.wethAddress,
      canonAssetAddress: s.e.usdcAddress,
      finalTokenAddress: s.e.wethAddress,
      recipientAddress: s.Carol.address,
      amountSpecified: s.WETH_AMOUNT
    }

    //confirm starting balances
    const startBobEther = await ethers.provider.getBalance(s.Bob.address)
    const startStartWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)
    const startStartUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startBobUSDC = await s.USDC.balanceOf(s.Bob.address)

    expect(startStartWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(s.WETH_AMOUNT, "Starting wETH is correct")
    expect(startStartUSDC).to.eq(0, "No USDC at start")
    expect(startBobUSDC).to.eq(0, "Starting USDC is correct")

    //await s.WETH.connect(s.Bob).approve(s.Start.address, s.WETH_AMOUNT)
    const result = await s.Portico.connect(s.Bob).start(params, {value: s.WETH_AMOUNT})
    const gas = await getGas(result)
    showBodyCyan("GAS TO START + WRAP: ", gas)

    //check ending balances
    const endStartWeth = await s.WETH.balanceOf(s.Portico.address)
    const endBobWeth = await s.WETH.balanceOf(s.Bob.address)
    const endStartUSDC = await s.USDC.balanceOf(s.Portico.address)
    const endBobUSDC = await s.USDC.balanceOf(s.Bob.address)

    //ending balances should be 0 because the xAsset is sent to the tokenbridge
    expect(endStartWeth).to.eq(0, "No weth at start")
    //expect(endBobWeth).to.eq(0, "Ending wETH is correct")
    expect(endStartUSDC).to.eq(0, "No USDC at start")
    expect(endBobUSDC).to.eq(0, "Ending USDC is correct")

  })
})


describe("Receive", () => {

  //this is the amount of USDC received from the first swap as of the pinned block
  const usdcAmount = BN("1783362958")

  it("Steal USDC to the Receiver to simulate tokenbridge sending it", async () => {
    await stealMoney(s.Bank, s.Portico.address, s.USDC.address, usdcAmount)
  })

  
  it("Recieve xChain tx", async () => {

    //todo determine what these should actually be set to
    //boiler plate data
    const params: DecodedVAA = {
      flags: s.wrapData,
      canonAssetAddress: s.e.usdcAddress,
      finalTokenAddress: s.e.wethAddress,
      recipientAddress: s.Carol.address,
      xAssetAmount: usdcAmount
    }

    const startReceiverUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const startCarolWETH = await s.WETH.balanceOf(s.Carol.address)
    expect(startReceiverUSDC).to.eq(usdcAmount, "Receiver has USDC")
    expect(startCarolUSDC).to.eq(0, "Carol has 0 USDC")
    expect(startCarolWETH).to.eq(0, "Carol has 0 WETH")

    const startEth = await ethers.provider.getBalance(s.Carol.address)
    showBody("StartEth: ", await toNumber(startEth))
    const gas = await getGas(await s.Portico.testSwap(params))
    showBodyCyan("GAS TO RECEIVE AND UNWRAP: ", gas)
    const endEth = await ethers.provider.getBalance(s.Carol.address)

    showBody("Eth Netted: ", await toNumber(endEth.sub(startEth)))

    const endReceiverUSDC = await s.USDC.balanceOf(s.Portico.address)
    const endCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const endCarolWETH = await s.WETH.balanceOf(s.Carol.address)

    //expect(endReceiverUSDC).to.eq(0, "Receiver no longer has USDC")
    //expect(endCarolUSDC).to.eq(0, "Carol has 0 USDC")
    //expect(endCarolWETH).to.be.gt(0, "Carol has received WETH")

    //showBodyCyan("Received wETH: ", await toNumber(endCarolWETH))

    //expect(await toNumber(endCarolWETH)).to.be.closeTo(await toNumber(s.WETH_AMOUNT), 0.02, "Swap completed")

  })
   
})
 
