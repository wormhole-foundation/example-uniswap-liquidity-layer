
import { expect } from "chai";
import { TradeParameters, s } from "../scope";
import { currentBlock, resetCurrentBsc } from "../../util/block";
import { ethers } from "hardhat";
import { IERC20__factory, ITokenBridge__factory, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";
import { o, bsc, w } from "../../util/addresser";
import { zeroAddress } from "viem";
import { stealMoney } from "../../util/money";
import { BN } from "../../util/number";
import { encodeFlagSet, getGas, toNumber } from "../../util/msc";
import { showBody, showBodyCyan } from "../../util/format";


/**
 * pancake swap
 * 0x5c8F8d3496D5Ac9B8dBF9422A0183b93cB93291D
 */
const testAmount = BN("1e16")
describe("setup", function () {

  it("Setup", async () => {
    await resetCurrentBsc()
    console.log("Testing on BSDC @ block ", (await currentBlock())!.number)

    //connect to signers
    const accounts = await ethers.getSigners();
    s.Frank = accounts[0];//Frank is acting as the treasury address
    s.Eric = accounts[5];
    s.Andy = accounts[6];
    s.Bob = accounts[7]; //Bob has wETH and wants to borrow MATTIC
    s.Carol = accounts[8]; //Carol has MATTIC and will lend to Bob
    s.Dave = accounts[9];
    s.Gus = accounts[10];

  })

  it("Connect to contracts", async () => {
    s.WETH = IERC20__factory.connect(bsc.wethAddress, s.Frank)
    s.USDC = IERC20__factory.connect(bsc.usdcAddress, s.Frank)
    s.TokenBridge = ITokenBridge__factory.connect(bsc.tokenBridge, s.Frank)
  })

  it("Deploy the things", async () => {

    s.Portico = await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      bsc.pancakeRouter, bsc.tokenBridge, bsc.wethAddress, zeroAddress,
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {

    await stealMoney(bsc.bscBank, s.Bob.address, bsc.wethAddress, testAmount.mul(2))

  })
})


describe("Send and pancake swap", function () {
  it("send with weth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, false, false),
      startTokenAddress: bsc.wethAddress,
      canonAssetAddress: bsc.wormWeth,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: o.portico03,
      amountSpecified: testAmount,
      minAmountStart: testAmount.div(2),
      minAmountFinish: testAmount.div(2),
      relayerFee: s.L2relayerFee
    }

    //confirm starting balances
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)

    expect(startPorticoWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(testAmount.mul(2), "Bob wETH is correct")

    await s.WETH.connect(s.Bob).approve(s.Portico.address, testAmount)
    const result = await s.Portico.connect(s.Bob).start(params)
    const gas = await getGas(result)
    showBodyCyan("GAS TO START: ", gas)

    //check ending balances
    const endPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const endBobWeth = await s.WETH.balanceOf(s.Bob.address)

    //ending balances should be 0 because the xAsset is sent to the tokenbridge
    expect(endPorticoWeth).to.eq(0, "No weth left on portico, sent to bridge")
    expect(endBobWeth).to.eq(testAmount, "Ending wETH is correct")

  })
  //todo update min amounts
  it("Slippage too low", async () => {
    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, false, false),
      startTokenAddress: o.wethAddress,
      canonAssetAddress: o.wormWeth,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: o.portico03,
      amountSpecified: testAmount,
      minAmountStart: BN("700000000000000"),//min amount too high
      minAmountFinish: testAmount.div(2),
      relayerFee: s.L2relayerFee
    }
    await s.WETH.connect(s.Bob).approve(s.Portico.address, testAmount)
    expect(s.Portico.connect(s.Bob).start(params)).to.be.revertedWith("Too little received")
  })

  it("Pool does not exist", async () => {
    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 1, 123, 100, false, false),
      startTokenAddress: bsc.wethAddress,
      canonAssetAddress: bsc.wormWeth,
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: o.portico03,
      amountSpecified: testAmount,
      minAmountStart: testAmount.div(2),
      minAmountFinish: testAmount.div(2),
      relayerFee: s.L2relayerFee
    }

    await s.WETH.connect(s.Bob).approve(s.Portico.address, testAmount)
    expect(s.Portico.connect(s.Bob).start(params)).to.be.reverted
  })
})

