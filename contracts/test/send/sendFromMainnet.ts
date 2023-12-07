
import { showBody, showBodyCyan } from "../../util/format"
import { expect } from "chai";
import { BN } from "../../util/number";
import { adddr2Bytes, encodeFlagSet, getGas, toNumber } from "../../util/msc"
import { start } from "repl";
import { stealMoney } from "../../util/money";
import { DecodedVAA, TokenReceived, TradeParameters, TransferWithPayload, s } from "../scope"
import { currentBlock, resetCurrent } from "../../util/block";
import { ethers } from "hardhat";
import { IERC20__factory, ITokenBridge__factory, IWormhole__factory, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";
import { w, o, e, p } from "../../util/addresser";
import { zeroAddress } from "viem";

describe("Deploy", function () {

  it("Setup", async () => {
    await resetCurrent()
    console.log("Testing on MAINNET @ block ", (await currentBlock())!.number)

    //connect to signers
    let accounts = await ethers.getSigners();
    s.Frank = accounts[0];//Frank is acting as the treasury address
    s.Eric = accounts[5];
    s.Andy = accounts[6];
    s.Bob = accounts[7]; //Bob has wETH and wants to borrow MATTIC
    s.Carol = accounts[8]; //Carol has MATTIC and will lend to Bob
    s.Dave = accounts[9];
    s.Gus = accounts[10];

  })

  it("Connect to contracts", async () => {
    s.WETH = IERC20__factory.connect(e.wethAddress, s.Frank)
    s.USDC = IERC20__factory.connect(e.usdcAddress, s.Frank)

    s.TokenBridge = ITokenBridge__factory.connect(s.mainnetTokenBridge, s.Frank)
    s.WH = IWormhole__factory.connect(await s.TokenBridge.wormhole(), s.Frank)

  })

  it("Deploy the things", async () => {

    s.Portico = await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      e.uniRouter, s.tokenBridgeAddr, e.wethAddress, zeroAddress,
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {

    await stealMoney(s.Bank, s.Bob.address, e.wethAddress, s.WETH_AMOUNT)

  })
})

describe("Send from mainnet", function () {


  it("send mainnet tx => op with weth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, s.slippage, s.slippage, false, false),
      startTokenAddress: e.wethAddress,
      canonAssetAddress: e.wethAddress,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: o.opPortico,
      amountSpecified: s.WETH_AMOUNT,
      relayerFee: s.ethRelayerFee
    }

    //confirm starting balances
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)

    expect(startPorticoWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(s.WETH_AMOUNT, "Porticoing wETH is correct")

    await s.WETH.connect(s.Bob).approve(s.Portico.address, s.WETH_AMOUNT)
    const result = await s.Portico.connect(s.Bob).start(params)
    const gas = await getGas(result)
    showBodyCyan("GAS TO START: ", gas)

    //check ending balances
    const endPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const endBobWeth = await s.WETH.balanceOf(s.Bob.address)

    //ending balances should be 0 because the xAsset is sent to the tokenbridge
    expect(endPorticoWeth).to.eq(0, "No weth left on portico, sent to bridge")
    expect(endBobWeth).to.eq(0, "Ending wETH is correct")

  })

  it("Send mainnet tx => polygon with a swap happening first", async () => {

    const USDC_AMOUNT = BN("500e6")

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.polygon, 2, 3000, 100, s.slippage, s.slippage, false, false),
      startTokenAddress: e.usdcAddress,
      canonAssetAddress: e.wethAddress,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: USDC_AMOUNT,
      relayerFee: s.ethRelayerFee
    }



    //fund
    await stealMoney(s.Bank, s.Bob.address, e.usdcAddress, USDC_AMOUNT)

    //approve
    await s.USDC.connect(s.Bob).approve(s.Portico.address, USDC_AMOUNT)

    //send
    await s.Portico.connect(s.Bob).start(params)

    //console.log("End Bob Weth: ", await toNumber(await s.WETH.balanceOf(s.Bob.address)))
    //console.log("End Ptc Weth: ", await toNumber(await s.WETH.balanceOf(s.Portico.address)))


  })

  it("Invert the swap from the previous test", async () => {
    //this test proves that the slippage works as intended in both directions

    const ethAmount = BN("25e16")

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.polygon, 3, 3000, 100, s.slippage, s.slippage, true, false),
      startTokenAddress: e.wethAddress,
      canonAssetAddress: e.usdcAddress,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: ethAmount,
      relayerFee: s.ethRelayerFee
    }

    const startBobEther = await ethers.provider.getBalance(s.Bob.address)
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)

    expect(startBobWeth).to.eq(0, "Bob has no and weth")
    expect(startPorticoWeth).to.be.lt(BN("1e10"), "Wormhole txs round to 1e8")
    expect(await ethers.provider.getBalance(s.Bob.address)).to.be.gt(ethAmount, "Bob has enough ETH")
    const gas = await getGas(await s.Portico.connect(s.Bob).start(params, { value: ethAmount }))
    showBodyCyan("Gas to start + wrap: ", gas)

    const endBobEther = await ethers.provider.getBalance(s.Bob.address)
    const etherDelta = startBobEther.sub(endBobEther)
    expect(await toNumber(etherDelta)).to.be.closeTo(await toNumber(ethAmount), 0.02, "ETHER sent is correct + gas")

  })

  it("weth => usdc slippage too low", async () => {
    const ethAmount = BN("25e16")

    const tooLowSlippage = 1

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.polygon, 3, 3000, 100, tooLowSlippage, s.slippage, true, false),
      startTokenAddress: e.wethAddress,
      canonAssetAddress: e.usdcAddress,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: ethAmount,
      relayerFee: s.ethRelayerFee
    }
  })

  it("Send mainnet tx => op wrapping native eth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 4, 100, 100, s.slippage, s.slippage, true, true),
      startTokenAddress: e.wethAddress,
      canonAssetAddress: e.wethAddress,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: o.opPortico,
      amountSpecified: s.WETH_AMOUNT,
      relayerFee: s.ethRelayerFee
    }

    const startBobEther = await ethers.provider.getBalance(s.Bob.address)
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)


    expect(startBobWeth).to.eq(0, "Bob has no and weth")
    expect(startPorticoWeth).to.be.lt(BN("1e10"), "Wormhole txs round to 1e8")
    expect(await ethers.provider.getBalance(s.Bob.address)).to.be.gt(s.WETH_AMOUNT, "Bob has enough ETH")

    const gas = await getGas(await s.Portico.connect(s.Bob).start(params, { value: s.WETH_AMOUNT }))
    showBodyCyan("Gas to start + wrap: ", gas)

    const endBobEther = await ethers.provider.getBalance(s.Bob.address)
    const etherDelta = startBobEther.sub(endBobEther)
    expect(await toNumber(etherDelta)).to.be.closeTo(await toNumber(s.WETH_AMOUNT), 0.005, "ETHER sent is correct + gas")
  })
})

/**

describe("Receive", () => {

  //this is the amount of USDC received from the first swap as of the pinned block
  const usdcAmount = BN("1783362958")



  it("Steal USDC to the Portico to simulate tokenbridge sending it", async () => {
    await stealMoney(s.Bank, s.Portico.address, s.USDC.address, usdcAmount)
  })





  it("Recieve xChain tx", async () => {

    const params: DecodedVAA = {
      flags: s.noWrapData,
      canonAssetAddress: e.usdcAddress,
      finalTokenAddress: e.wethAddress,
      recipientAddress: s.Carol.address,
      canonAssetAmount: usdcAmount,
      relayerFee: ethRelayerFee
    }

    const startPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    const startCarolWETH = await s.WETH.balanceOf(s.Carol.address)
    expect(startPorticoUSDC).to.eq(usdcAmount, "Portico has USDC")
    expect(startCarolUSDC).to.eq(0, "Carol has 0 USDC")
    expect(startCarolWETH).to.eq(0, "Carol has 0 WETH")

    const gas = await getGas(await s.Portico.testSwap(params))
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

 */

/**
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
      tokenAddress: e.usdcAddress,
      amount: usdcAmount
    }
    const params: DecodedVAA = {
      flags: s.noWrapData,
      canonAssetAddress: e.usdcAddress,
      finalTokenAddress: e.usdcAddress,
      recipientAddress: s.Carol.address,
      canonAssetAmount: usdcAmount,
      relayerFee: s.usdcRelayerFee
    }

    const startPorticoUSDC = await s.USDC.balanceOf(s.Portico.address)
    const startCarolUSDC = await s.USDC.balanceOf(s.Carol.address)
    expect(startPorticoUSDC).to.eq(usdcAmount, "Portico has USDC")
    expect(startCarolUSDC).to.eq(0, "Carol has 0 USDC")
    //expect(startCarolWETH).to.eq(0, "Carol has 0 WETH")
    const gas = await getGas(await s.Portico.testSwap(params))
    showBodyCyan("GAS TO RECEIVE: ", gas)
    //expect(await s.USDC.balanceOf(s.Carol.address)).to.eq(usdcAmount, "Carol received USDC")

  })
})
 */

