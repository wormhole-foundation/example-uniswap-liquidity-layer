import { s } from "../scope"
import { currentBlock, reset, resetCurrent } from "../../util/block"
import { DeployContract } from "../../util/deploy"
import { stealMoney } from "../../util/money"
import { ethers } from "hardhat";
import { IERC20__factory, Portico__factory, TokenBridge__factory } from "../../typechain-types";
import { expect } from "chai";
import { encodeFlagSet } from "../../util/msc";

describe("Deploy", function () {

  it("Setup", async () => {
    await reset(18429933)
    console.log("Testing @ block ", (await currentBlock())!.number)

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

  it("Deploy the things", async () => {

    s.Portico = await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      s.swapRouterAddr, s.tokenBridgeAddr, s.relayerAddr, s.e.wethAddress
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {

    await stealMoney(s.Bank, s.Bob.address, s.e.wethAddress, s.WETH_AMOUNT)

  })

  it("encode flags", async () => {
    s.noSippage = await encodeFlagSet(1, 1, 3000, 3000, 0, 0, false, false)
    s.wrapData = await encodeFlagSet(1, 1, 3000, 3000, s.slippage, s.slippage, true, true)
    s.noWrapData = await encodeFlagSet(1, 1, 3000, 3000, s.slippage, s.slippage, false, false)
  })
})

