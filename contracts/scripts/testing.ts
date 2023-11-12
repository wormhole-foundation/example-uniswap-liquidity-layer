import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { o, p } from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IERC20__factory, ITokenBridge__factory, IWormhole, IWormhole__factory, Portico, Portico__factory } from "../typechain-types";
import { DeployContract } from "../util/deploy";
import { DecodedVAA, Signatures, TradeParameters, VM, s } from "../test/scope";
import { adddr2Bytes, encodeFlagSet, getEvent, getGas } from "../util/msc";
import { BN } from "../util/number";
import { stealMoney } from "../util/money";
import { showBodyCyan } from "../util/format";
import { Signer } from "ethers";
import { AbiCoder } from "ethers/lib/utils";

let portico: Portico

/**
 * In this example, we send 5 USDC
 * from Polygon => Optimism
 */

const usdcAmount = BN("1e10")
const relayerFee = BN("5e5")
const polyWhale = "0xf89d7b9c864f589bbF53a82105107622B35EaA40"
const polygonChainId = 5
const opChainId = 24

const send = async (user: SignerWithAddress) => {

    portico = Portico__factory.connect(p.polyPortico, user)


    //connect to USDC
    const USDC = IERC20__factory.connect(p.wethAddress, user)

    const params: TradeParameters = {
        flags: s.noWrapData,
        startTokenAddress: p.wethAddress,
        canonAssetAddress: p.wethAddress,
        finalTokenAddress: o.usdcAddress,
        recipientAddress: user.address,
        recipientPorticoAddress: o.opPortico,
        amountSpecified: usdcAmount,
        relayerFee: relayerFee
    }

    //const approve = await USDC.connect(user).approve(portico.address, BN("1e26"))
  //  await approve.wait()
    console.log("Sending...")
    const result = await portico.connect(user).start(params)
    const gas = await getGas(result)
    showBodyCyan("Gas: ", gas)
    const event = await getEvent(result, "PorticoSwapStart")
    console.log("Sent: ", (await result.wait()).transactionHash)
    console.log("Sequence: ", event.args.sequence.toNumber())


}

async function receive(user: SignerWithAddress) {

    console.log("Receive")


    const sequence = 130824
    const nonce = 9876
    const consistencyLevel = 15
    const VAA_ID = "5/0000000000000000000000005a58505a96d1dbf8df91cb21b54419fc36e93fde/130824"

    portico = Portico__factory.connect(o.opPortico, user)

    const tokenBridge = ITokenBridge__factory.connect(o.opTokenBridge, user)
    console.log("Got tokenbridge")
    const opWH = IWormhole__factory.connect(await tokenBridge.wormhole(), user)
    console.log("Got wh")

    const opChainId = await opWH.chainId()
    console.log("ChainID: ", opChainId)

    const params: DecodedVAA = {
        flags: s.noWrapData,
        canonAssetAddress: p.wethAddress,
        finalTokenAddress: o.usdcAddress,
        recipientAddress: o.opPortico,
        canonAssetAmount: usdcAmount,
        relayerFee: relayerFee
    }

    const abi = new AbiCoder()
    const data = abi.encode(
        ["tuple(bytes32 flags, address canonAssetAddress, address finalTokenAddress, address recipientAddress, uint256 canonAssetAmount, uint256 relayerFee)"],
        [params]
    )

    const ptb32 = adddr2Bytes(p.polyTokenBridge)
    const signatures: Signatures[] = [
        {
            r: ptb32,
            s: ptb32,
            v: 1,
            guardianIndex: 1
        }
    ]
    console.log("Made sigs")

    //VM struct
    const vm: VM = {
        version: 1,
        timestamp: 1699653160,
        nonce: nonce,
        emitterChainId: 5,
        emitterAddress: ptb32,
        sequence: sequence,
        consistencyLevel: 15,
        payload: data,
        guardianSetIndex: 3,
        signatures: signatures,
        hash: "0x5bd82936f50ce47c30ca7177d881e3f5747f4de3d70889fbec179df2d44dc418"
    }
    console.log("Made vm")


    const transferData = abi.encode(
        ["tuple(uint8 version, uint32 timestamp, uint32 nonce, uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint8 consistencyLevel, bytes payload, uint32 guardianSetIndex, tuple(bytes32 r, bytes32 s, uint8 v, uint8 guardianIndex)[] signatures, bytes32 hash)"],
        [vm]
    )
    /**
    const transferData = abi.encode(
        ["tuple(uint8 payloadID, uint256 amount, bytes32 tokenAddress, uint16 tokenChain, bytes32 to, uint16 toChain, bytes32 fromAddress, bytes payload)"],
        [{
            payloadID: 9,
            amount: usdcAmount,
            tokenAddress: adddr2Bytes(p.usdcAddress),
            tokenChain: polygonChainId,
            to: adddr2Bytes(user.address),
            toChain: opChainId,
            fromAddress: adddr2Bytes(p.polyPortico),
            payload: data
        }]
    )
     */

    console.log("Receiving...")
    const result = await portico.connect(user).receiveMessageAndSwap(transferData)
}

async function resetOp() {

    const accounts = await ethers.getSigners();
    const user = accounts[0];
    console.log("User: ", user.address)

    //check for test network
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentOP()
        console.log("Reset to OP @ ", await (await currentBlock()).number)

        await stealMoney(polyWhale, user.address, p.usdcAddress, usdcAmount)

    } else {
        console.log("SENDING ON: ", networkName)
    }

    return user

}

async function main() {

    const accounts = await ethers.getSigners();
    const user = accounts[0];
    console.log("User: ", user.address)

    //check for test network
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentPoly()
        console.log("TESTING @ ", await (await currentBlock()).number)

        await stealMoney(polyWhale, user.address, p.usdcAddress, usdcAmount)

    } else {
        console.log("SENDING ON: ", networkName)
    }

    //recipientChain
    s.noWrapData = encodeFlagSet(opChainId, new Date().valueOf(), 3000, 3000, s.slippage, s.slippage, false, false)
    console.log(s.noWrapData)

    await send(user)
    //await receive(await resetOp())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

