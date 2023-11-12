
import { showBody, showBodyCyan } from "../../util/format"
import { expect } from "chai";
import { BN } from "../../util/number";
import { adddr2Bytes, getGas, toNumber } from "../../util/msc"
import { start } from "repl";
import { stealMoney } from "../../util/money";
import { DecodedVAA, TokenReceived, TradeParameters, TransferWithPayload, s } from "../scope"
import { AbiCoder } from "ethers/lib/utils";

describe("Receive", () => {

  //this is the amount of USDC received from the first swap as of the pinned block
  const usdcAmount = BN("1783362958")

  it("Steal USDC to the Portico to simulate tokenbridge sending it", async () => {
    await stealMoney(s.Bank, s.Portico.address, s.USDC.address, usdcAmount)
  })

  it("Spoof receipt of xchain tx", async () => {

    const params: DecodedVAA = {
      flags: s.noWrapData,
      canonAssetAddress: s.e.usdcAddress,
      finalTokenAddress: s.e.wethAddress,
      recipientAddress: s.Carol.address,
      canonAssetAmount: usdcAmount,
      relayerFee: s.ethRelayerFee
    }

    const abi = new AbiCoder()
    const data = abi.encode(
      ["tuple(bytes32 flags, address canonAssetAddress, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 relayerFee)"],
      [{
        flags: params.flags,
        canonAssetAddress: params.canonAssetAddress,
        finalTokenAddress: params.finalTokenAddress,
        recipientAddress: params.recipientAddress,
        canonAssetAmount: params.canonAssetAmount,
        relayerFee: params.relayerFee
      }]
    )

    const transferData = abi.encode(
      ["tuple(uint8 payloadID, uint256 amount, bytes32 tokenAddress, uint16 tokenChain, bytes32 to, uint16 toChain, bytes32 fromAddress, bytes payload)"],
      [{
        payloadID: 1,
        amount: usdcAmount,
        tokenAddress: adddr2Bytes(s.e.usdcAddress),
        tokenChain: await s.WH.chainId(),
        to: adddr2Bytes(s.Portico.address),
        toChain: await s.WH.chainId(),
        fromAddress: adddr2Bytes(s.Portico.address),
        payload: data
      }]
    )

    const bytes32Addr = adddr2Bytes(s.tokenBridgeAddr)

    //config return for parseVM
    await s.fakeWormHole.parseVM.returns({
      version: 1,
      timestamp: 696969,
      nonce: 1,
      emitterChainId: 2,
      emitterAddress: bytes32Addr,
      sequence: 132724,
      consistencyLevel: 1,
      payload: data,
      guardianSetIndex: 9696,
      signatures: [{ r: bytes32Addr, s: bytes32Addr, v: 1, guardianIndex: 1 }],
      hash: bytes32Addr
    })

    //config return for tokenbridge.bridgeContracts
    await s.fakeTokenBridge.bridgeContracts.returns(bytes32Addr)

    //config completeTransferWithPayload to default return
    await s.fakeTokenBridge.completeTransferWithPayload.returns();

    //config tokenbridge.parseTransferWithPayload
    await s.fakeTokenBridge.parseTransferWithPayload.returns({
      payloadID: 3,
      amount: usdcAmount,
      tokenAddress: adddr2Bytes(s.USDC.address),
      tokenChain: 2,
      to: adddr2Bytes(s.Portico.address),
      toChain: 2,
      fromAddress: adddr2Bytes(s.Portico.address),
      payload: "0x"
    })

    //config tokenBridge.wrappedAsset
    await s.fakeTokenBridge.wrappedAsset.returns(s.USDC.address)

    const startingWeth = await s.WETH.balanceOf(s.Carol.address)

    const gas = await getGas(await s.Portico.receiveMessageAndSwap(transferData))
    showBodyCyan("Gas to receive xchain tx: ", gas)

    const wethDelta = (await s.WETH.balanceOf(s.Carol.address)).sub(startingWeth)
    expect(await toNumber(wethDelta)).to.be.closeTo(1, 0.03, "WETH received")
    showBodyCyan("WETH RECEIVED: ", await toNumber(wethDelta))

  })
})
