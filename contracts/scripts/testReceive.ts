import { formatEther, parseEther } from "viem";
import hre, { network } from "hardhat";
const { ethers } = require("hardhat")
import { currentBlock, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { e, o, p } from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { IERC20__factory, ITokenBridge__factory, IWormhole, IWormhole__factory, Portico, Portico__factory } from "../typechain-types";
import { DeployContract } from "../util/deploy";
import { DecodedVAA, Signatures, TradeParameters, VM, s } from "../test/scope";
import { adddr2Bytes, encodeFlagSet, encodeTransferMessage, encodeVM, getEvent, getGas } from "../util/msc";
import { ceaseImpersonation, impersonateAccount } from "../util/impersonator";
import { BN } from "../util/number";
import { stealMoney } from "../util/money";
import { showBodyCyan } from "../util/format";
import { Signer } from "ethers";
import { AbiCoder, zeroPad } from "ethers/lib/utils";

import { testVAA, consoleVAA } from "./receiveData"
import { encode } from "punycode";
/**
 * 130982 - console
 * 130997 - standard
 */
const axios = require('axios')
const sender = "0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89"

const MAINNET_GUARDIAN_RPC: string[] = [
    "https://wormhole-v2-mainnet-api.certus.one",
    "https://wormhole.inotel.ro",
    "https://wormhole-v2-mainnet-api.mcf.rocks",
    "https://wormhole-v2-mainnet-api.chainlayer.network",
    "https://wormhole-v2-mainnet-api.staking.fund",
    "https://wormhole-v2-mainnet.01node.com",
]

const abi = new AbiCoder()

let portico: Portico

async function receive(user: SignerWithAddress) {

    const tb = ITokenBridge__factory.connect("0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b", user)
    const xasset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))
    //console.log("Test: ", xasset)



    console.log("Receive")
    portico = Portico__factory.connect(o.consolePortico, user)

    const chainId = 5 //emitting chain
    const emitter = "0000000000000000000000005a58505a96d1dbf8df91cb21b54419fc36e93fde"//address.slice(2).padStart(64, "0"); // 32-byte padded//adddr2Bytes(p.polyPortico)
    const sequence = 131124//131050//130982//130980//130997
    const url = `${MAINNET_GUARDIAN_RPC[0]}/v1/signed_vaa/${chainId}/${emitter}/${sequence}`
    const response = await axios.get(url)
    const vaa = Buffer.from(response.data.vaaBytes, "base64").toString("hex");

    console.log(vaa)

    await portico.connect(user).receiveMessageAndSwap("0x" + vaa, {
        gasPrice: 174089539,
        gasLimit: 400000
    })

}

async function receiveFromOp(user: SignerWithAddress) {
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentPoly()
        console.log("SWITCHED TO POLY @ ", await (await currentBlock()).number)
        await impersonateAccount(sender)
        user = ethers.provider.getSigner(sender)

    } else {
        console.log("SENDING TX ON: ", networkName)
    }

    portico = Portico__factory.connect(p.polyPortico, user)

    const chainId = 24 //emitting chain
    const emitter = "0000000000000000000000001d68124e65fafc907325e3edbf8c4d84499daa8b"//address.slice(2).padStart(64, "0"); // 32-byte padded//adddr2Bytes(p.polyPortico)
    const sequence = 6566//6559 recipient chain = 24//6558 recipient chain = 5
    const url = `${MAINNET_GUARDIAN_RPC[0]}/v1/signed_vaa/${chainId}/${emitter}/${sequence}`
    const response = await axios.get(url)
    const vaa = Buffer.from(response.data.vaaBytes, "base64").toString("hex");

    console.log(vaa)

    await portico.connect(user).receiveMessageAndSwap("0x" + vaa, {
        gasPrice: 60000000000,
        gasLimit: 400000
    })


}

async function test(user: SignerWithAddress) {

    const testPortico = await DeployContract(
        new Portico__factory(user),
        user,
        o.opSwapRouter,
        o.opTokenBridge,
        o.opRelayerAddress,
        o.wethAddress
    )

    const chainId = 5 //emitting chain
    const emitter = "0000000000000000000000005a58505a96d1dbf8df91cb21b54419fc36e93fde"//address.slice(2).padStart(64, "0"); // 32-byte padded//adddr2Bytes(p.polyPortico)
    const sequence = 131049//130980//130997
    const url = `${MAINNET_GUARDIAN_RPC[0]}/v1/signed_vaa/${chainId}/${emitter}/${sequence}`
    const response = await axios.get(url)
    const vaa = "0x" + (Buffer.from(response.data.vaaBytes, "base64").toString("hex")).toString();

    //await testPortico.receiveMessageAndSwap(vaa)

    //await testPortico.testGetToken("0x0000000000000000000000005a58505a96d1dbf8df91cb21b54419fc36e93fde")


}



async function main() {

    let user: SignerWithAddress
    //check for test network
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentOP()//112206197 
        await impersonateAccount(sender)
        user = ethers.provider.getSigner(sender)
        console.log("TEST ON OP @: ", await (await currentBlock()).number)


    } else {
        console.log("SENDING TX ON: ", networkName)
        const accounts = await ethers.getSigners();
        user = accounts[0]
        console.log("User: ", user.address)

    }


    //await receiveFromOp(user)
    await receive(user)
    //await test(user)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

