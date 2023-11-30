
import { showBody, showBodyCyan } from "../../util/format";
import { expect } from "chai";
import { BN } from "../../util/number";
import { encodeFlagSet, getGas } from "../../util/msc";
import { stealMoney } from "../../util/money";
import { TradeParameters, s } from "../scope";
import { currentBlock, resetCurrentOP } from "../../util/block";
import { ethers } from "hardhat";
import { IERC20__factory, ITokenBridge__factory, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";
import { w, o, p } from "../../util/addresser";
import { zeroAddress } from "viem";

/**
 * Send from OP to Polygon
 */
describe("Deploy", function () {

  it("Setup", async () => {
    await resetCurrentOP()
    console.log("Testing on OP @ block ", (await currentBlock())!.number)

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
    s.WETH = IERC20__factory.connect(o.wethAddress, s.Frank)
    s.USDC = IERC20__factory.connect(o.usdcAddress, s.Frank)
    s.TokenBridge = ITokenBridge__factory.connect(o.opTokenBridge, s.Frank)
  })

  it("Deploy the things", async () => {

    s.Portico = await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      o.uniRouter, o.opTokenBridge, o.wethAddress, zeroAddress,
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {

    await stealMoney(s.OpBank, s.Bob.address, o.wethAddress, s.L2WETH_AMOUNT)

  })
})

describe("Send", function () {

  const testSlippage = 1000 //10%

  it("send op tx => polygon with weth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.polygon, 1, 100, 100, testSlippage, s.slippage, false, false),
      startTokenAddress: o.wethAddress,
      canonAssetAddress: o.wormWeth,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    }

    //confirm starting balances
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)

    expect(startPorticoWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(s.L2WETH_AMOUNT, "Bob wETH is correct")

    await s.WETH.connect(s.Bob).approve(s.Portico.address, s.L2WETH_AMOUNT)
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

  it("Swap USDC for wETH", async () => {

    const usdcAmount = BN("1000e6")
    s.USDC = IERC20__factory.connect(o.usdcAddress, s.Frank)
    await stealMoney(s.OpBank, s.Bob.address, o.usdcAddress, usdcAmount)    

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 2, 3000, 100, testSlippage, s.slippage, true, false),
      startTokenAddress: o.usdcAddress,
      canonAssetAddress: o.wethAddress,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: usdcAmount,
      relayerFee: s.L2relayerFee
    }

    showBody("Swap usdc => weth")
    await s.USDC.connect(s.Bob).approve(s.Portico.address, usdcAmount)
    showBodyCyan("Gas: ", await getGas(await s.Portico.connect(s.Bob).start(params)))

  })

  it("Swap wETH for USDC", async () => {
    const wethAmount = BN("1e18")
    await stealMoney(s.OpBank, s.Bob.address, o.wethAddress, wethAmount)

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 2, 3000, 100, testSlippage, s.slippage, false, false),
      startTokenAddress: o.wethAddress,
      canonAssetAddress: o.usdcAddress,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: wethAmount,
      relayerFee: s.L2relayerFee
    }

    showBody("Swap weth => usdc")
    await s.WETH.connect(s.Bob).approve(s.Portico.address, wethAmount)
    showBodyCyan("Gas: ", await getGas(await s.Portico.connect(s.Bob).start(params)))

  })

  
  it("Swap wBTC for USDC", async () => {
    const wbtcAmount = BN("5e7")
    const wbtcHolder = "0x30F1d1fFAD34b24Bb8310Ad9DD237B854b4DAEa7"
    await stealMoney(wbtcHolder, s.Bob.address, o.wbtcAddress, wbtcAmount)
    const WBTC = IERC20__factory.connect(o.wbtcAddress, s.Frank)

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 2, 3000, 100, testSlippage, s.slippage, false, false),
      startTokenAddress: o.wbtcAddress,
      canonAssetAddress: o.usdcAddress,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: wbtcAmount,
      relayerFee: s.L2relayerFee
    }

    showBody("Swap wbtc => usdc")
    await WBTC.connect(s.Bob).approve(s.Portico.address, wbtcAmount)
    showBodyCyan("Gas: ", await getGas(await s.Portico.connect(s.Bob).start(params)))

  })



  /**
  it("Send mainnet tx => op wrapping native eth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 2, 100, 100, s.slippage, s.slippage, true, false),
      startTokenAddress: o.wethAddress,
      canonAssetAddress: o.wormWeth,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    }

    const startBobEther = await ethers.provider.getBalance(s.Bob.address)
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)


    expect(startBobWeth).to.eq(0, "Bob has no and weth")
    expect(await toNumber(startPorticoWeth)).to.be.lt(await toNumber(BN("1e10")), "Wormhole txs round to 1e8")
    expect(await toNumber(await ethers.provider.getBalance(s.Bob.address))).to.be.gt(await toNumber(s.L2WETH_AMOUNT), "Bob has enough ETH")

    const gas = await getGas(await s.Portico.connect(s.Bob).start(params, { value: s.L2WETH_AMOUNT }))
    showBodyCyan("Gas to start + wrap: ", gas)

    const endBobEther = await ethers.provider.getBalance(s.Bob.address)
    const etherDelta = startBobEther.sub(endBobEther)
    expect(await toNumber(etherDelta)).to.be.closeTo(await toNumber(s.L2WETH_AMOUNT), 0.003, "ETHER sent is correct + gas")
  })
   */

})
