
import { showBody, showBodyCyan } from "../../util/format"
import { expect } from "chai";
import { BN } from "../../util/number";
import { adddr2Bytes, encodeFlagSet, getGas, toNumber } from "../../util/msc"
import { start } from "repl";
import { stealMoney } from "../../util/money";
import { DecodedVAA, TokenReceived, TradeParameters, TransferWithPayload, s } from "../scope"
import { AbiCoder } from "ethers/lib/utils";
import { currentBlock, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../../util/block";
import { ethers } from "hardhat";
import { IERC20, IERC20__factory, ITokenBridge__factory, IWormhole__factory, Portico__factory } from "../../typechain-types";
import { smock } from "@defi-wonderland/smock";
import { DeployContract } from "../../util/deploy"
import { o, p, w } from "../../util/addresser";
const abi = new AbiCoder()


/**
 * polygon => op
 * swap xeth to weth and unwrap
 */
describe("Receive On L2", () => {

  const xEthHolder = "0x66B101C1EC482d807B9c920390a00aC797175951"
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
      o.opSwapRouter, s.fakeTokenBridge.address, o.wethAddress
    )

    expect(s.Portico.address).to.not.eq("0x0000000000000000000000000000000000000000", "Start Deployed")

    s.L2WETH_AMOUNT = await s.xETH.balanceOf(xEthHolder)
    await stealMoney(xEthHolder, s.Portico.address, o.wormWeth, s.L2WETH_AMOUNT)

    //completeTransferWithPayload just needs to not revert
    await s.fakeTokenBridge.completeTransferWithPayload.returns("0x")

    console.log("Before Each Done")

  })


  it("receipt of xchain tx", async () => {
    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, 300, 300, false, true),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    }

    //config fake returns
    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: s.L2WETH_AMOUNT,
      tokenAddress: adddr2Bytes(o.wormWeth),
      tokenChain: w.CID.polygon,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(p.polyPortico),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 relayerFee)"],
        [expectedVAA]
      )
    })

    //wrappedAsset should return the xeth
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    const startEthBalance = await ethers.provider.getBalance(s.Bob.address)
    expect(await ethers.provider.getBalance(s.Portico.address)).to.eq(0, "0 ETH on Portico")

    console.log("Sending")
    //input data doesn't matter, we spoof the returns
    await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x")
    console.log("Sent")

    expect(await s.xETH.balanceOf(s.Portico.address)).to.eq(0, "0 XETH on Portico after swap")
    expect(await s.WETH.balanceOf(s.Portico.address)).to.eq(0, "0 WETH on Portico after swap")
    expect(await ethers.provider.getBalance(s.Portico.address)).to.eq(0, "0 ETH on Portico after swap")
    const endEthBalance = await ethers.provider.getBalance(s.Bob.address)
    const ethDelta = await toNumber(endEthBalance.sub(startEthBalance))
    expect(ethDelta).to.be.closeTo(await toNumber(s.L2WETH_AMOUNT), 0.001, "Eth received")
  })


  it("Failed swap, pool doesn't exist", async () => {

    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 12345, 300, 300, false, true),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    }

    //config fake returns
    //wrappedAsset should return the xeth
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: s.L2WETH_AMOUNT,
      tokenAddress: adddr2Bytes(o.wormWeth),
      tokenChain: w.CID.polygon,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(p.polyPortico),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 relayerFee)"],
        [expectedVAA]
      )
    })


    //input data doesn't matter, we spoof the returns
    const gas = await getGas(await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x"))
    showBodyCyan("Gas, failed swap: ", gas)
    const bobXeth = await s.xETH.balanceOf(s.Bob.address)
    expect(bobXeth).to.eq(s.L2WETH_AMOUNT, "Bob received the xETH")

    expect(await s.xETH.balanceOf(s.Portico.address)).to.eq(0, "No xETH remaining on Portico")

  })


  it("Slippage Test", async () => {

    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, 300, 500, false, true),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: s.L2WETH_AMOUNT,
      relayerFee: s.L2relayerFee
    }

    //config fake returns
    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: s.L2WETH_AMOUNT,
      tokenAddress: adddr2Bytes(o.wormWeth),
      tokenChain: w.CID.polygon,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(p.polyPortico),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 relayerFee)"],
        [expectedVAA]
      )
    })

    //wrappedAsset should return the xeth
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    //input data doesn't matter, we spoof the returns
    await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x")

  })

})

