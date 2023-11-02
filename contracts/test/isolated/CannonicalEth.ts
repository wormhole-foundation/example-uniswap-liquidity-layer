import { TradeParameters, s } from "../scope"
import { currentBlock, reset, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../../util/block"
import { DeployContract } from "../../util/deploy"
import { stealMoney } from "../../util/money"
import { ethers } from "hardhat";
import { IERC20__factory, Portico__factory, TokenBridge__factory } from "../../typechain-types";
import { expect } from "chai";
import { encodeFlagSet, getGas } from "../../util/msc";
import { showBody, showBodyCyan } from "../../util/format";


//transfer Mainnet-Canonical-Eth on polygon -> mainnet-canonica-eth on optimism without any univ3 swaps
describe("Setup", function () {
  const recipientChainId = 10//optimism
  it("Setup", async () => {
    await resetCurrentPoly()
    console.log("Testing on polygon @ block ", (await currentBlock())!.number)

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
    s.WETH = IERC20__factory.connect(s.e.wethAddress, s.Frank)
    s.USDC = IERC20__factory.connect(s.e.usdcAddress, s.Frank)
  })

  it("Deploy", async () => {

    s.Portico = await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      s.polySwapRouter, s.polyTokenBridge, s.polyRelayerAddress
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("encode flags", async () => {
    s.wrapData = await encodeFlagSet(recipientChainId, 1, 3000, 3000, s.slippage, s.slippage, true, true)
  })
})

describe("Direct eth xchain transfer", () => {

  it("Transfer eth", async () => {
    const params: TradeParameters = {
      flags: s.wrapData,
      startTokenAddress: s.p.wethAddress,
      canonAssetAddress: s.p.wethAddress,
      finalTokenAddress: s.o.wethAddress,
      recipientAddress: s.Bob.address,
      amountSpecified: s.WETH_AMOUNT
    }

    const result = await s.Portico.connect(s.Bob).start(params, { value: s.WETH_AMOUNT })
    const gas = await getGas(result)
    showBodyCyan("GAS TO START + WRAP: ", gas)

  })

})

