import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentAvax, resetCurrentBase, resetCurrentBsc, resetCurrentOP, resetCurrentPoly } from "../../util/block";
import { a, av, b, bsc, e, o, p, w } from "../../util/addresser";
import { IERC20, IERC20__factory, ITokenBridge__factory, Portico, Portico__factory, } from "../../typechain-types";
import { TradeParameters } from "../../test/scope";
import { adddr2Bytes, encodeFlagSet, getEvent } from "../../util/msc";
import { BN } from "../../util/number";
import { stealMoney } from "../../util/money";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { DeployContract } from "../../util/deploy";
import { ceaseImpersonation, impersonateAccount } from "../../util/impersonator";


//change these
const tokenToSend = p.usdtAddress
const mainnetTokenAddr = e.usdtAddress
const finalTokenAddress = o.usdtAddress
const whale = p.usdtWhale//token holder for testing only
const destChainID = w.CID.optimism
const feeIn = 100
const feeOut = 100
const wrapIn = false//always false for non eth
const wrapOut = false//always false for non eth
const amount = BN("5e4")
const relayerFee = BN("0")

//which network to send from when testing
const testNetwork = "polygon"
const testNetworks = [
    "polygon",
    "op",
    "arbitrum",
    "base",
    "mainnet",
    "bsc",
    "avax"
]

let portico: Portico//Portico
let networkName: string
let TOKEN: IERC20
let localCannonAsset: string

const send = async (user: SignerWithAddress) => {

    let recipientPortico: string = ""
    //set dest addrs
    if (destChainID == w.CID.polygon) {
        recipientPortico = p.portico03
    }
    if (destChainID == w.CID.optimism) {
        recipientPortico = o.portico03
    }
    if (destChainID == w.CID.arbitrum) {
        recipientPortico = a.pancakePortico
    }
    if (destChainID == w.CID.ethereum) {
        recipientPortico = e.pancakePortico
    }
    if (destChainID == w.CID.base) {
        recipientPortico = b.pancakePortico
    }
    if (destChainID == w.CID.bsc) {
        recipientPortico = bsc.pancakePortico
    }
    if (destChainID == w.CID.avax) {
        recipientPortico = av.portico03
    }

    const inputData: TradeParameters = {
        flags: encodeFlagSet(destChainID, 1, feeIn, feeOut, wrapIn, wrapOut),
        startTokenAddress: tokenToSend,
        canonAssetAddress: localCannonAsset,
        finalTokenAddress: finalTokenAddress,
        recipientAddress: user.address,
        recipientPorticoAddress: recipientPortico,
        amountSpecified: amount,
        minAmountStart: amount.div(2),
        minAmountFinish: amount.div(2),
        relayerFee: relayerFee
    }

    console.log("Sending to Portico: ", portico.address)
    console.log("Input Data: ")
    console.log(inputData)

    let result: ContractTransaction
    if (!wrapIn) {
        console.log("Sending w/o wrap...")

        //0x58c3beC55C0F744f93DB7A4633aA7DD9a1C4D033

        //const approveData = await TOKEN.connect(user).populateTransaction.approve(portico.address, amount)
        //console.log("Approve Data: ", approveData)


        const approval = await TOKEN.connect(user).approve(portico.address, amount)
        await approval.wait()
        console.log("APPROVED")

        //const sendData = await portico.connect(user).populateTransaction.start(inputData)
        //console.log("Send Data: ", sendData)
        result = await portico.connect(user).start(inputData)



    } else {

        console.log("Sending with wrap...")

        result = await portico.connect(user).start(inputData, { value: amount })
    }


    const event = await getEvent(result, "PorticoSwapStart")
    console.log("Sent: ", (await result.wait()).transactionHash)
    console.log("Sequence: ", event.args.sequence.toNumber())


}


async function main() {

    const accounts = await ethers.getSigners();
    const user = accounts[0];

    //check for test network
    networkName = hre.network.name

    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])

        if (testNetwork == testNetworks[0]) {

            await resetCurrentPoly()

            //set chain specifics
            portico = Portico__factory.connect(p.portico03, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

            //fund 
            //const whale = "0x2b44d9764fbbd2B07fbc48212aee4Da331806062"
            await stealMoney(whale, user.address, TOKEN.address, amount)



            console.log("TEST TX ON POLYGON @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[1]) {

            await resetCurrentOP()

            //set chain specifics
            portico = Portico__factory.connect(o.portico03, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(o.opTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

            //fund 
            //const whale = "0x916792f7734089470de27297903BED8a4630b26D"
            await stealMoney(whale, user.address, TOKEN.address, amount)



            console.log("TEST TX ON OP @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[2]) {
            await resetCurrentArb()
            console.log("Reset to arb")

            //set chain specifics
            portico = Portico__factory.connect(a.pancakePortico, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

            //fund 
            const whale = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
            await stealMoney(whale, user.address, TOKEN.address, amount)
            console.log("TEST TX ON ARB @ ", await (await currentBlock()).number)


        } else if (testNetwork == testNetworks[3]) {

            await resetCurrentBase()

            //set chain specifics
            portico = Portico__factory.connect(b.pancakePortico, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

            //fund 
            //const whale = "0x428AB2BA90Eba0a4Be7aF34C9Ac451ab061AC010"
            await stealMoney(whale, user.address, TOKEN.address, amount)



            console.log("TEST TX ON BASE @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[4]) {

            await resetCurrent()

            //set chain specifics
            portico = Portico__factory.connect(e.pancakePortico, user)
            TOKEN = IERC20__factory.connect(mainnetTokenAddr, user)
            localCannonAsset = mainnetTokenAddr

            //fund 
            //const whale = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
            await stealMoney(whale, user.address, TOKEN.address, amount)



            console.log("TEST TX ON MAINNET @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[5]) {

            await resetCurrentBsc()

            //set chain specifics
            portico = Portico__factory.connect(bsc.pancakePortico, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(bsc.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

            console.log("Stealing USDT: ", TOKEN.address)
            console.log("From: ", whale)
            //fund 
            //const whale = bsc.bscBank
            await stealMoney(whale, user.address, TOKEN.address, amount)

            console.log("TEST TX ON BSC  @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[6]) {

            await resetCurrentAvax()

            //set chain specifics
            portico = Portico__factory.connect(av.portico03, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(av.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

            console.log("Stealing: ", TOKEN.address)
            console.log("From: ", whale)
            //fund 
            //const whale = bsc.bscBank
            await stealMoney(whale, user.address, TOKEN.address, amount)

            console.log("TEST TX ON BSC  @ ", await (await currentBlock()).number)

        }


    } else {
        console.log("SENDING FROM: ", networkName)
        console.log("USER ADDR: ", user.address)

        if (networkName == "op") {
            portico = Portico__factory.connect(o.portico03, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(o.opTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

        } else if (networkName == "polygon") {
            portico = Portico__factory.connect(p.portico03, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))


        } else if (networkName == "arbitrum") {
            portico = Portico__factory.connect(a.pancakePortico, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))


        } else if (networkName == "base") {
            portico = Portico__factory.connect(b.pancakePortico, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

        } else if (networkName == "bsc") {
            portico = Portico__factory.connect(bsc.pancakePortico, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(bsc.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

        } else if (networkName == "avax") {
            portico = Portico__factory.connect(av.portico03, user)
            TOKEN = IERC20__factory.connect(tokenToSend, user)
            const tb = ITokenBridge__factory.connect(av.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(mainnetTokenAddr))

        } else {
            //mainnet
            portico = Portico__factory.connect(e.pancakePortico, user)
            TOKEN = IERC20__factory.connect(mainnetTokenAddr, user)
            localCannonAsset = mainnetTokenAddr
        }
    }

    console.log("Local xAsset: ", localCannonAsset)
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

