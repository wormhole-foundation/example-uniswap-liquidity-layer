import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { o, p } from "../util/addresser"
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

const amount = BN("10000000000")
const relayerFee = BN("500000")

const send = async (user: SignerWithAddress) => {

    portico = Portico__factory.connect(p.polyPortico, user)

    const inputData: TradeParameters = {
        flags: "0x1800fbee2cc5b80b00b80b00c800c80000000000000000000000000000000000",
        startTokenAddress: p.wethAddress,
        canonAssetAddress: p.wethAddress,
        finalTokenAddress: o.usdcAddress,
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
