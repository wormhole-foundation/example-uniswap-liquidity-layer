
import { showBody, showBodyCyan } from "../../util/format"
import { expect } from "chai";
import { BN } from "../../util/number";
import { getGas, toNumber } from "../../util/msc"
import { start } from "repl";
import { stealMoney } from "../../util/money";
import { DecodedVAA, TokenReceived, TradeParameters, s } from "../scope"

/**
 * In this example,
 * Both the sender and receiver are on the same chain
 * We are swapping wETH => USDC
 */
describe("Send", function () {

  it("send transaction", async () => {

    const params: TradeParameters = {
      flags: s.noWrapData,
      startTokenAddress: s.e.wethAddress,
      canonAssetAddress: s.e.usdcAddress,
      finalTokenAddress: s.e.wethAddress,
      recipientAddress: s.Carol.address,
      amountSpecified: s.WETH_AMOUNT
    }


    //confirm starting balances
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)
    const startPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startBobUSDC = await s.USDC.balanceOf(s.Bob.address)

    expect(startPorticoWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(s.WETH_AMOUNT, "Porticoing wETH is correct")
    expect(startPorticoUSDC).to.eq(0, "No USDC at start")
    expect(startBobUSDC).to.eq(0, "Porticoing USDC is correct")

    await s.WETH.connect(s.Bob).approve(s.Portico.address, s.WETH_AMOUNT)
    const result = await s.Portico.connect(s.Bob).start(params)
    const gas = await getGas(result)
    showBodyCyan("GAS TO START: ", gas)

    //check ending balances
    const endPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const endBobWeth = await s.WETH.balanceOf(s.Bob.address)
    const endPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const endBobUSDC = await s.USDC.balanceOf(s.Bob.address)

    //ending balances should be 0 because the xAsset is sent to the tokenbridge
    expect(endPorticoWeth).to.eq(0, "No weth at start")
    expect(endBobWeth).to.eq(0, "Ending wETH is correct")
    expect(endPorticoUSDC).to.eq(0, "No USDC at start")
    expect(endBobUSDC).to.eq(0, "Ending USDC is correct")

  })
})


describe("Receive", () => {

  //this is the amount of USDC received from the first swap as of the pinned block
  const usdcAmount = BN("1783362958")

  it("Steal USDC to the Portico to simulate tokenbridge sending it", async () => {
    await stealMoney(s.Bank, s.Portico.address, s.USDC.address, usdcAmount)
  })

  it("Recieve xChain tx", async () => {

    const TokenReceived: TokenReceived = {
      tokenHomeAddress: s.noWrapData,//not used for testing
      tokenHomeChain: 1,
      tokenAddress: s.e.usdcAddress,
      amount: usdcAmount
    }
    const params: DecodedVAA = {
      flags: s.noWrapData,
      canonAssetAddress: s.e.usdcAddress,
      finalTokenAddress: s.e.wethAddress,
      recipientAddress: s.Carol.address,
      canonAssetAmount: usdcAmount
    }

    const startPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const startCarolWETH = await s.WETH.balanceOf(s.Carol.address)
    expect(startPorticoUSDC).to.eq(usdcAmount, "Portico has USDC")
    expect(startCarolUSDC).to.eq(0, "Carol has 0 USDC")
    expect(startCarolWETH).to.eq(0, "Carol has 0 WETH")

    const gas = await getGas(await s.Portico.testSwap(params, TokenReceived))
    showBodyCyan("GAS TO RECEIVE: ", gas)

    const endPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const endCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const endCarolWETH = await s.WETH.balanceOf(s.Carol.address)

    expect(endPorticoUSDC).to.eq(0, "Portico no longer has USDC")
    expect(endCarolUSDC).to.eq(0, "Carol has 0 USDC")
    expect(endCarolWETH).to.be.gt(0, "Carol has received WETH")

    showBodyCyan("Received wETH: ", await toNumber(endCarolWETH))

    expect(await toNumber(endCarolWETH)).to.be.closeTo(await toNumber(s.WETH_AMOUNT), 0.02, "Swap completed")

  })

})

describe("Receive where xAsset == finalAsset", () => {

  //this is the amount of USDC received from the first swap as of the pinned block
  const usdcAmount = BN("1783362958")

  it("Steal USDC to the Portico to simulate tokenbridge sending it", async () => {
    await stealMoney(s.Bank, s.Portico.address, s.USDC.address, usdcAmount)
  })

  it("Recieve xChain tx where xAsset == finalAssets", async () => {
    const TokenReceived: TokenReceived = {
      tokenHomeAddress: s.noWrapData,//not used for testing
      tokenHomeChain: 1,
      tokenAddress: s.e.usdcAddress,
      amount: usdcAmount
    }
    const params: DecodedVAA = {
      flags: s.noWrapData,
      canonAssetAddress: s.e.usdcAddress,
      finalTokenAddress: s.e.usdcAddress,
      recipientAddress: s.Carol.address,
      canonAssetAmount: usdcAmount
    }

    const startPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    expect(startPorticoUSDC).to.eq(usdcAmount, "Portico has USDC")
    expect(startCarolUSDC).to.eq(0, "Carol has 0 USDC")
    //expect(startCarolWETH).to.eq(0, "Carol has 0 WETH")
    const gas = await getGas(await s.Portico.testSwap(params, TokenReceived))
    showBodyCyan("GAS TO RECEIVE: ", gas)
    expect(await s.USDC.balanceOf(s.Carol.address)).to.eq(usdcAmount, "Carol received USDC")

  })
})