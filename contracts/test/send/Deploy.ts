import { s } from "../scope"
import { currentBlock, reset, resetCurrent } from "../../util/block"
import { DeployContract } from "../../util/deploy"
import { stealMoney } from "../../util/money"
import { ethers } from "hardhat";
import { IERC20__factory, Portico__factory, TokenBridge__factory } from "../../typechain-types";
import { expect } from "chai";

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

    s.Portico= await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      s.swapRouterAddr, s.tokenBridgeAddr, s.relayerAddr
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

  })

  it("Fund participants", async () => {

    await stealMoney(s.Bank, s.Bob.address, s.e.wethAddress, s.WETH_AMOUNT)

  })
})

describe ("test flags", () => {

  it("Test flags", async () => {

    //0x0100000000000000000000000000000000000000000000000000000000000000
    //------------------------------------10------------------20------------------303132
    //----------------- 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 
    const flags01 = "0x0100010000000000000000000000000000000000000000000000000000000000"
    const flags02 = "0x000100000001000bb8000bb8012c012c00000000000000000000000000000000"

    //data packed into a normal struct is 
    //16 + 32 + 24 + 24 + 16 + 16 + 8 + 8 == 144

    const data = await s.Portico.testFlags(flags02)
    console.log(data)

  })

})
