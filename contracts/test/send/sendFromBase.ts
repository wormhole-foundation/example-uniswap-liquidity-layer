
import { showBody, showBodyCyan } from "../../util/format"
import { expect } from "chai";
import { BN } from "../../util/number";
import { adddr2Bytes, encodeFlagSet, getGas, toNumber } from "../../util/msc"
import { start } from "repl";
import { stealMoney } from "../../util/money";
import { DecodedVAA, TokenReceived, TradeParameters, TransferWithPayload, s } from "../scope"
import { currentBlock, resetCurrent, resetCurrentBase, resetCurrentOP } from "../../util/block";
import { ethers } from "hardhat";
import { IERC20__factory, ITokenBridge__factory, IWormhole__factory, PorticoUniRouter__factory, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";
import { w, b, e, p } from "../../util/addresser";

/**
 * Send from OP to Polygon
 */
describe("Deploy", function () {

  it("Setup", async () => {
    await resetCurrentBase()
    console.log("Testing on BASE @ block ", (await currentBlock())!.number)

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
    s.WETH = IERC20__factory.connect(b.wethAddress, s.Frank)
    s.TokenBridge = ITokenBridge__factory.connect(b.tokenBridge, s.Frank)
  })

  it("Deploy the things", async () => {

    s.Portico = await DeployContract(
      new PorticoUniRouter__factory(s.Frank),
      s.Frank,
      b.uniRouter, b.tokenBridge, b.wethAddress
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {
    const whale = "0x428AB2BA90Eba0a4Be7aF34C9Ac451ab061AC010"

    await stealMoney(whale, s.Bob.address, b.wethAddress, s.L2WETH_AMOUNT)

  })
})

describe("Send", function () {

  it("Slippage too low", async () => {
    const lowSlippageBips = 1
    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.polygon, 1, 100, 100, lowSlippageBips, 321, false, false),
      startTokenAddress: b.wethAddress,
      canonAssetAddress: b.wormWeth,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    }

    await s.WETH.connect(s.Bob).approve(s.Portico.address, s.L2WETH_AMOUNT)
    expect(s.Portico.connect(s.Bob).start(params)).to.be.revertedWith("Too little received")
  })

  it("send base tx => polygon with weth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.polygon, 1, 100, 100, s.slippage, s.slippage, false, false),
      startTokenAddress: b.wethAddress,
      canonAssetAddress: b.wormWeth,
      finalTokenAddress: p.wethAddress,
      recipientAddress: s.Carol.address,
      recipientPorticoAddress: p.polyPortico,
      amountSpecified: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    } 

    console.log("Checking balances")

    console.log("WETH :", s.WETH.address)
    console.log("TEST: ", await s.WETH.decimals())

    //confirm starting balances
    const startPorticoWeth = await s.WETH.balanceOf(s.Portico.address)
    const startBobWeth = await s.WETH.balanceOf(s.Bob.address)

    console.log("Checked balances")


    expect(startPorticoWeth).to.eq(0, "No weth at start")
    expect(startBobWeth).to.eq(s.L2WETH_AMOUNT, "Bob wETH is correct")

    console.log("Approving...")

    await s.WETH.connect(s.Bob).approve(s.Portico.address, s.L2WETH_AMOUNT)
    console.log("Sending...")
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

  

  it("Send mainnet tx => base wrapping native eth", async () => {

    const params: TradeParameters = {
      flags: encodeFlagSet(w.CID.optimism, 2, 100, 100, s.slippage, s.slippage, true, false),
      startTokenAddress: b.wethAddress,
      canonAssetAddress: b.wormWeth,
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

})
