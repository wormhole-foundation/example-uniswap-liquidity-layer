import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { e, o, p } from "../util/addresser"
import { IERC20__factory, ITokenBridge__factory, IWETH__factory, IWormhole, IWormhole__factory, Portico, Portico__factory } from "../typechain-types";
import { DeployContract } from "../util/deploy";
import { DecodedVAA, Signatures, TradeParameters, VM, s } from "../test/scope";
import { adddr2Bytes, encodeFlagSet, getEvent, getGas } from "../util/msc";
import { ceaseImpersonation, impersonateAccount } from "../util/impersonator";
import { BN } from "../util/number";
import { stealMoney } from "../util/money";
import { showBodyCyan } from "../util/format";
import { Signer } from "ethers";
import { AbiCoder } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import { signedVAA } from "./receiveData"
import { encode } from "punycode";

const abi = new AbiCoder()

let portico: Portico

/**
 * In this example, we send weth
 * from polygon => optimism
 * and then swapping for USDC on optimism
 */

const amount = BN("20000000000")
const relayerFee = BN("80000000")

const send = async (user: SignerWithAddress) => {
    //check for test network
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentPoly()
        console.log("TESTING ON POLYGON @ ", (await currentBlock()).number)

        const polyWhale = "0x62ac55b745F9B08F1a81DCbbE630277095Cf4Be1"
        await stealMoney(polyWhale, user.address, p.wethAddress, amount)

    } else {
        console.log("SENDING TX ON: ", networkName)
    }
    portico = Portico__factory.connect(p.polyPortico, user)
    const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
    const wormWeth = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))
    //console.log(wormWeth)
    const flags = encodeFlagSet(24, 1, 500, 3000, 300, 300, false, false)
    //console.log(flags)
    //0x1800fbee2cc5b80b00b80b002c012c0100000000000000000000000000000000
    //0x1800fbee2cc5b80b00b80b00c800c80000000000000000000000000000000000
    const inputData: TradeParameters = {
        flags: flags,//"0x1800fbee2cc5b80b00b80b00c800c80000000000000000000000000000000000",
        startTokenAddress: p.wethAddress,
        canonAssetAddress: p.wormWeth,
        finalTokenAddress: o.wormWeth,
        recipientAddress: user.address,
        recipientPorticoAddress: o.opPortico,
        amountSpecified: amount,
        relayerFee: relayerFee
    }
    const WETH = IERC20__factory.connect(p.wethAddress, user)
    const approve = await WETH.connect(user).approve(portico.address, amount)
    await approve.wait()
    console.log("Sending...")
    const result = await portico.connect(user).start(inputData)
    const gas = await getGas(result)
    showBodyCyan("Gas: ", gas)
    const event = await getEvent(result, "PorticoSwapStart")
    console.log("Sent: ", (await result.wait()).transactionHash)
    console.log("Sequence: ", event.args.sequence.toNumber())
}

const sendOpToPoly = async (user: SignerWithAddress) => {
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentOP()
        console.log("SWITCHED TO OP @ ", (await currentBlock()).number)

        const whale = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
        await stealMoney(whale, user.address, o.wethAddress, amount)

    } else {
        console.log("SENDING TX ON: ", networkName)
    }


    portico = Portico__factory.connect(o.opPortico, user)

    const flags = encodeFlagSet(5, new Date().valueOf()/1000, 100, 3000, 300, 300, false, false)
    //0x1800fbee2cc5b80b00b80b002c012c0100000000000000000000000000000000
    //0x1800fbee2cc5b80b00b80b00c800c80000000000000000000000000000000000
    const inputData: TradeParameters = {
        flags: flags,
        startTokenAddress: o.wethAddress,
        canonAssetAddress: o.wormWeth,
        finalTokenAddress: p.wormWeth,
        recipientAddress: user.address,
        recipientPorticoAddress: p.polyPortico,
        amountSpecified: amount,
        relayerFee: relayerFee
    }

    const WETH = IERC20__factory.connect(o.wethAddress, user)
    const approve = await WETH.connect(user).approve(portico.address, amount)
    await approve.wait()
    console.log("Sending...")
    const result = await portico.connect(user).start(inputData)
    const gas = await getGas(result)
    showBodyCyan("Gas: ", gas)
    const event = await getEvent(result, "PorticoSwapStart")
    console.log("Sent: ", (await result.wait()).transactionHash)
    console.log("Sequence: ", event.args.sequence.toNumber())
}



async function main() {

    const accounts = await ethers.getSigners();
    const user = accounts[0];
    console.log("User: ", user.address)

   // await send(user)
    await sendOpToPoly(user)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

