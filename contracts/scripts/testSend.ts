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
        recipientPorticoAddress: o.consolePortico,
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
        console.log("SWITCHED TO OP @ ", await (await currentBlock()).number)

        const whale = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
        await stealMoney(whale, user.address, o.wethAddress, amount)

    } else {
        console.log("SENDING TX ON: ", networkName)
    }


    portico = Portico__factory.connect(o.opPortico, user)

    const flags = encodeFlagSet(24, 1, 100, 3000, 300, 300, false, false)
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

    //check for test network
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentPoly()
        console.log("TESTING ON POLYGON @ ", await (await currentBlock()).number)

        const polyWhale = "0x62ac55b745F9B08F1a81DCbbE630277095Cf4Be1"
        await stealMoney(polyWhale, user.address, p.wethAddress, amount)

    } else {
        console.log("SENDING TX ON: ", networkName)
    }

    await send(user)
    //await sendOpToPoly(user)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


/**
Sent:  0xe3d71681ca283c66f8432d6d07d1e85692e1d911d13a74b5ca94465aa3e1bb97
Sequence:  130980
 */

/**
 * consoles: 
Sent:  0xf7d833c65ab4cebd18e1dd39e9c7b30198059b8d515175188a3f7b8c474a9542
Sequence:  130982
 */

/**
 * No swap: 
Sent:  0xa2259478bdf4380eddca85f35e1489eea2dc3799e834d6b5b89837dcb12f6d8e
Sequence:  131050
 */
/**
 * op => polygon
Sent:  0xc94b24d69a10cb4aded5fb3fcdb3a4086f2400eb5106ffd7f57c1b904bb6bc63
Sequence:  6558

 * op => polygon with ID 24 in flagset
Sent:  0xe83b60bc9f6b467e2341946b8be4b2c05ee61e9c54e100728df96e5b128ba7ed
Sequence:  6559

Sent:  0xadc05c8ed59dd282e26683e1b5744467fd67b2a4ab57c26166133623b53e4bea
Sequence:  6560
 */
/**
 * polygon => op with wormweth
Sent:  0xf7261d6897d9ccd90160068d891636a11a54036ab115cae3ade2efb14605c48f
Sequence:  131106

 * op => poly with wormweth
Sent:  0x312f8d73beb8648c41c15bdb96938af25819b4c45db2cd5fe3b613ba9738ee13
Sequence:  6566

 * poly => op console
Sent:  0x355b0e7df3abca2dda2656cf9040c020bbf7fbf781d3614826f4568f306ff89e
Sequence:  131114
Sent:  0x0fe677c93512ef4a2a9e890c8408df937fa51bd4a8ecaf9ff7ef89b3e6db74df
Sequence:  131118

 * Verbose console
Sent:  0x11ce9dfe3438ffa59db2869d9ee77287c86f6ccb239a21195e5f07fe45ebce59
Sequence:  131124

 */