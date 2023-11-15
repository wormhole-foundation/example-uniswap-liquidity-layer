import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { a, e, o, p } from "../util/addresser"
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
        await resetCurrentArb()
        console.log("TESTING ON ARB @ ", (await currentBlock()).number)

        const whale = "0xEeBe760354F5dcBa195EDe0a3B93901441D0968F"

        await stealMoney(whale, user.address, a.wethAddress, amount)

    } else {
        console.log("SENDING TX ON: ", networkName)
    }
    portico = Portico__factory.connect(a.portico, user)
    const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
    const wormWeth = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))
    console.log(wormWeth)
    const flags = encodeFlagSet(24, 1, 100, 100, 300, 300, true, true)

    const inputData: TradeParameters = {
        flags: flags,//"0x1800fbee2cc5b80b00b80b00c800c80000000000000000000000000000000000",
        startTokenAddress: a.wethAddress,
        canonAssetAddress: wormWeth,
        finalTokenAddress: o.wethAddress,
        recipientAddress: user.address,
        recipientPorticoAddress: o.opPortico,
        amountSpecified: amount,
        relayerFee: relayerFee
    }

    const WETH = IERC20__factory.connect(a.wethAddress, user)
    const approve = await WETH.connect(user).approve(portico.address, amount)
    await approve.wait()

    console.log("Sending...")
    const result = await portico.connect(user).start(inputData, {value: amount})//, {value: amount}
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

    await send(user)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

/**
 * arb => poly WRAP ON ARB ONLY
Sent:  0xcb97e0e6b89b616e2ce20bcdd09c97393537c17f21577784f6842a4701b57b70
Sequence:  21099
 * arb => POLY NO WRAP
Sent:  0x58889cffaa77ff375f85d7d340e52ae0d907b886123fa3bcbca5e35852f61f3d
Sequence:  21098

 * arb => op WRAP
Sent:  0xea2a5aff3e48719bae1f91d37977dcf3e6882426e092f3a43e1dad52c8e849f2
Sequence:  21102

 */

