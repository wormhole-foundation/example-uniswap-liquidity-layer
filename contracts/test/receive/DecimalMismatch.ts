
import { showBodyCyan } from "../../util/format";
import { expect } from "chai";
import { BN } from "../../util/number";
import { adddr2Bytes, encodeFlagSet, getGas, toNumber } from "../../util/msc";
import { stealMoney } from "../../util/money";
import { DecodedVAA, s } from "../scope";
import { AbiCoder } from "ethers/lib/utils";
import { currentBlock, resetCurrentOP } from "../../util/block";
import { ethers } from "hardhat";
import { IERC20__factory, ITokenBridge__factory, IWormhole__factory, Portico__factory } from "../../typechain-types";
import { smock } from "@defi-wonderland/smock";
import { DeployContract } from "../../util/deploy";
import { bsc, e, o, p, w } from "../../util/addresser";
import { zeroAddress } from "viem";
const abi = new AbiCoder()

const xUsdcHolder = "0x235dDde932B0F035bAf2aCAdad81bCDC40fCE6AA"

/**
 * bsc => op
 */
describe("Receive On OP - Decimal Mismatch", () => {

  let expectedVAA: DecodedVAA

  //Deploy fresh Portico and fund with xeth
  beforeEach(async () => {

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

    s.WETH = IERC20__factory.connect(o.wethAddress, s.Frank)
    s.USDC = IERC20__factory.connect(o.usdcAddress, s.Frank)
    s.xETH = IERC20__factory.connect(o.wormWeth, s.Frank)

    //fake wormhole and token bridge
    s.fakeWormHole = await smock.fake(IWormhole__factory)
    s.fakeTokenBridge = await smock.fake(ITokenBridge__factory, { address: w.WHaddrs.op })

    //config fake tokenbridge WH() to return fakeWormHole addr
    await s.fakeTokenBridge.wormhole.returns(s.fakeWormHole.address)

    //config fake wormhole.chainID to return the correct chain id
    await s.fakeWormHole.chainId.returns(w.CID.optimism)

    s.Portico = await DeployContract(
      new Portico__factory(s.Frank),
      s.Frank,
      o.uniRouter, s.fakeTokenBridge.address, o.wethAddress, zeroAddress,
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")


    //completeTransferWithPayload just needs to not revert
    await s.fakeTokenBridge.completeTransferWithPayload.returns("0x")



  })

  it("receipt of xchain tx where decimal of xChain and final asset don't match", async () => {
    //fund with xweth
    const usdcAmount = BN("50e6")
    const relayerFee = BN("10")//10 bips
    await stealMoney(xUsdcHolder, s.Portico.address, o.wormUSDC, usdcAmount)

    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, 5000, 5000, true, false),
      finalTokenAddress: o.wormUSDC,//no swap for this test as there are no pools atm
      recipientAddress: s.Bob.address,
      canonAssetAmount: usdcAmount,
      relayerFee: relayerFee
    }

    //config fake returns
    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: usdcAmount,//amount not modified as token decimals are >=6
      tokenAddress: adddr2Bytes(e.usdcAddress),
      tokenChain: w.CID.ethereum,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(bsc.portico02),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 relayerFee)"],
        [expectedVAA]
      )
    })

    //wrappedAsset should return the xeth if not native chain
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormUSDC)

    //input data doesn't matter, we spoof the returns
    await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x1234")

  })
})