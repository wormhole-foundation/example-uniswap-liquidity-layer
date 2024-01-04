
import { showBody, showBodyCyan } from "../../util/format";
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
import { e, o, p, w } from "../../util/addresser";
import { zeroAddress } from "viem";
const abi = new AbiCoder()

const xwethHolder = "0x00917c372Fa5e0C7FE8eCc04CeEa2670E18D3786"

/**
 * polygon => OP
 * swap xeth to weth on OP and unwrap to eth
 */
describe("Receive On OP", () => {

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

    //fund with xweth
    s.WETH_AMOUNT = BN("2e12")//very low liquidity
    s.ethRelayerFee = BN("1e8")
    await stealMoney(xwethHolder, s.Portico.address, o.wormWeth, s.WETH_AMOUNT)
  })

  it("receipt of xchain tx", async () => {


    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, 5000, 5000, true, true),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: s.WETH_AMOUNT,
      minAmountFinish: s.WETH_AMOUNT.div(2),
      relayerFee: s.ethRelayerFee
    }
    //config fake returns
    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: s.WETH_AMOUNT.div(BN("1e10")),//modify for scale
      tokenAddress: adddr2Bytes(e.wethAddress),
      tokenChain: w.CID.ethereum,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(p.portico02),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 minAmountFinish, uint256 relayerFee)"],
        [expectedVAA]
      )
    })

    //wrappedAsset should return the xeth if not native chain
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    const startEthBalance = await ethers.provider.getBalance(s.Bob.address)
    expect(await ethers.provider.getBalance(s.Portico.address)).to.eq(0, "0 ETH on Portico")

    //input data doesn't matter, we spoof the returns
    await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x1234")

    expect(await s.WETH.balanceOf(s.Portico.address)).to.eq(0, "0 WETH on Portico after swap")
    expect(await ethers.provider.getBalance(s.Portico.address)).to.eq(0, "0 ETH on Portico after swap")
    const endEthBalance = await ethers.provider.getBalance(s.Bob.address)
    const ethDelta = await toNumber(endEthBalance.sub(startEthBalance))
    expect(ethDelta).to.be.closeTo(await toNumber(s.WETH_AMOUNT), 0.01, "Eth received")
  })

  //in this test, Frank acts as the relayer
  it("Verify Relayer Fee", async () => {

    //set fee recipient
    await s.Portico.connect(s.Frank).setFeeRecipient(s.Frank.address)

    //verify initial balance
    expect(await s.WETH.balanceOf(s.Frank.address)).to.eq(0, "Frank holds 0 WETH")

    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, true, false),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: s.WETH_AMOUNT,
      minAmountFinish: s.WETH_AMOUNT.div(2),
      relayerFee: s.ethRelayerFee
    }
    //config fake returns
    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: s.WETH_AMOUNT.div(BN("1e10")),//modify for scale
      tokenAddress: adddr2Bytes(e.wethAddress),
      tokenChain: w.CID.ethereum,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(p.portico02),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 minAmountFinish, uint256 relayerFee)"],
        [expectedVAA]
      )
    })

    //wrappedAsset should return the xeth if not native chain
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    const startEthBalance = await ethers.provider.getBalance(s.Bob.address)
    expect(await ethers.provider.getBalance(s.Portico.address)).to.eq(0, "0 ETH on Portico")

    //input data doesn't matter, we spoof the returns
    //Bob initiated the tx, so Frank is acting as the relayer here
    await s.Portico.connect(s.Frank).receiveMessageAndSwap("0x1234")

    //relayer received the fee
    expect(await s.WETH.balanceOf(s.Frank.address)).to.eq(s.ethRelayerFee, "Relayer Fee Paid")

    expect(await s.WETH.balanceOf(s.Portico.address)).to.eq(0, "0 WETH on Portico after swap")
    expect(await ethers.provider.getBalance(s.Portico.address)).to.eq(0, "0 ETH on Portico after swap")
    const endEthBalance = await ethers.provider.getBalance(s.Bob.address)
    const ethDelta = await toNumber(endEthBalance.sub(startEthBalance))
    expect(ethDelta).to.be.closeTo(await toNumber(s.WETH_AMOUNT), 0.01, "Eth received")
  })

  it("Failed swap, pool doesn't exist", async () => {

    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 231, 123, false, true),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: s.WETH_AMOUNT,
      minAmountFinish: s.WETH_AMOUNT.div(2),
      relayerFee: s.L2relayerFee
    }

    //config fake returns
    //wrappedAsset should return the xeth
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 4,
      amount: s.WETH_AMOUNT.div(BN("1e10")),//modify for scale
      tokenAddress: adddr2Bytes(e.wethAddress),
      tokenChain: w.CID.ethereum,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(p.portico02),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 minAmountFinish, uint256 relayerFee)"],
        [expectedVAA]
      )
    })


    //input data doesn't matter, we spoof the returns
    const gas = await getGas(await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x"))
    showBodyCyan("Failed Swap, pool does not exist: ", gas)
    expect(await s.xETH.balanceOf(s.Portico.address)).to.eq(0, "No xETH remaining on Portico")

    const bobXeth = await s.xETH.balanceOf(s.Bob.address)
    expect(bobXeth).to.eq(s.WETH_AMOUNT, "Bob received the xETH")
  })

  it("Slippage too low for amount", async () => {

    const pool = "0xaC85eaf55E9C60eD40a683DE7e549d23FDfbEb33"
    const amount = (await s.WETH.balanceOf(pool))

    await stealMoney(xwethHolder, s.Portico.address, s.xETH.address, (BN(amount).sub(await s.xETH.balanceOf(s.Portico.address))))
    expect(await s.xETH.balanceOf(s.Portico.address)).to.eq(amount, "Portico Balance Correct")


    expectedVAA = {
      flags: encodeFlagSet(w.CID.optimism, 1, 100, 100, false, true),
      finalTokenAddress: o.wethAddress,
      recipientAddress: s.Bob.address,
      canonAssetAmount: amount,
      minAmountFinish: s.WETH_AMOUNT.mul(2),//min amount received too high
      relayerFee: s.L2relayerFee
    }

    //config fake returns
    //parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: amount.div(BN("1e10")),//modify for scale
      tokenAddress: adddr2Bytes(o.wormWeth),
      tokenChain: w.CID.polygon,
      to: adddr2Bytes(s.Portico.address),
      toChain: w.CID.optimism,
      fromAddress: adddr2Bytes(o.portico02),
      payload: abi.encode(
        ["tuple(bytes32 flags, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 minAmountFinish, uint256 relayerFee)"],
        [expectedVAA]
      )
    })

    //wrappedAsset should return the xeth
    await s.fakeTokenBridge.wrappedAsset.returns(o.wormWeth)

    expect(await s.xETH.balanceOf(s.Bob.address)).to.eq(0, "Bob holds 0 xAsset")

    //input data doesn't matter, we spoof the returns
    showBodyCyan("Sending tx, this can take a while...")
    const gas = await getGas(await s.Portico.connect(s.Bob).receiveMessageAndSwap("0x"))
    showBodyCyan("Failed receive swap: ", gas)

    expect(await s.xETH.balanceOf(s.Bob.address)).to.be.gt(0, "Bob received xAsset")



  }).timeout(10000000)
})



