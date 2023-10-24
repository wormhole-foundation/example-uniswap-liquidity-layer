
import { s } from "./scope"
import { currentBlock, resetCurrent } from "../util/block"
import { DeployContract } from "../util/deploy"
import { stealMoney } from "../util/money"
import { ethers, network } from "hardhat";
import { IERC20__factory, PorticoReceiver__factory, PorticoStart__factory, TokenBridge__factory } from "../typechain-types";
import { expect } from "chai";

describe("Deploy", function () {

  it("Setup", async () => {
    await resetCurrent()
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
    s.Receiver = await DeployContract(
      new PorticoReceiver__factory(s.Frank),
      s.Frank
    )

    s.Start = await DeployContract(
      new PorticoStart__factory(s.Frank),
      s.Frank
    )

    expect(s.Receiver.address).to.not.eq("0x0000000000000000000000000000000000000000", "Receiver Deployed")
    expect(s.Start.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {

    await stealMoney(s.Bank, s.Bob.address, s.e.wethAddress, s.WETH_AMOUNT)

  })

})
