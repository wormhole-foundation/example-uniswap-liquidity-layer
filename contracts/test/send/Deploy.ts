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

    s.Portico = await DeployContract(
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

describe("test flags", () => {

  it("Test flags", async () => {

    /**
    uint16 rChain = 1;
    uint32 bridgeNonce = 1;
    uint24 startFee = 3000;
    uint24 endFee = 3000;
    int16 slipStart = 300;
    int16 slipEnd = 300;
    bool wrap = false;
    bool unwrap = false;

    bytes memory data = abi.encodePacked(rChain, bridgeNonce, startFee, endFee, slipStart, slipEnd, wrap, unwrap);

    compressed = bytes32(data)

    This results in compressed = 0x000100000001000bb8000bb8012c012c00000000000000000000000000000000

    which doesn't work currently, can't get data back based on the library


     */

    //0x010001000000b80b00b80b000000000000000000000000000000000000000000/both fees correct
    //--------------------------------10-------------------20-----------------303132
    //-------------- 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 
    //-------------- 0001020304050607080910111213141516171819202122232425262728293031
    const flags = "0x010001000000b80b00b80b002c012c0100000000000000000000000000000000"
    //                          |fee1||fee2|
    //data packed into a normal struct is
    //16 + 32 + 24 + 24 + 16 + 16 + 8 + 8 == 144

    const data = await s.Portico.testFlags(s.noSippage)

  })

})
