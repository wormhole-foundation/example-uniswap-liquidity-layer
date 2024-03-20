import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentBase, resetCurrentBsc, resetCurrentOP, resetCurrentPoly } from "../../util/block";
import { a, b, bsc, e, o, p, w } from "../../util/addresser";
import { IERC20, IERC20__factory, ITokenBridge__factory, Portico, Portico__factory } from "../../typechain-types";
import { TradeParameters } from "../../test/scope";
import { adddr2Bytes, encodeFlagSet, getEvent } from "../../util/msc";
import { BN } from "../../util/number";
import { stealMoney } from "../../util/money";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


//change these
const destChainID = w.CID.polygon
const feeIn = 100
const feeOut = 100
const wrapIn = false
const wrapOut = false
const amount = BN("100000000000000")
const relayerFee = BN("0")

//which network to send from when testing
const testNetwork = "bsc"
const testNetworks = [
    "polygon",
    "op",
    "arbitrum",
    "base",
    "mainnet",
    "bsc"
]

let portico: Portico//Portico
let networkName: string
let WETH: IERC20
let localCannonAsset: string


const send = async (user: SignerWithAddress, mainnet: boolean) => {

    let inputData: TradeParameters = {
        flags: "0x",
        startTokenAddress: WETH.address,//local weth already set
        canonAssetAddress: localCannonAsset,
        finalTokenAddress: "",
        recipientAddress: user.address,
        recipientPorticoAddress: "",
        amountSpecified: amount,
        minAmountStart: amount.div(2),
        minAmountFinish: amount.div(2),
        relayerFee: relayerFee
    }

    //encode flags
    inputData.flags = encodeFlagSet(destChainID, 1, feeIn, feeOut, wrapIn, wrapOut)

    //set dest addrs
    if (destChainID == w.CID.polygon) {
        inputData.finalTokenAddress = p.wormWeth//p.wethAddress
        inputData.recipientPorticoAddress = p.portico02
    }
    if (destChainID == w.CID.optimism) {
        inputData.finalTokenAddress = o.wethAddress
        inputData.recipientPorticoAddress = o.portico02
    }
    if (destChainID == w.CID.arbitrum) {
        inputData.finalTokenAddress = a.wethAddress
        inputData.recipientPorticoAddress = a.portico02
    }
    if (destChainID == w.CID.ethereum) {
        inputData.finalTokenAddress = e.wethAddress
        inputData.recipientPorticoAddress = e.portico02
    }
    if (destChainID == w.CID.base) {
        inputData.finalTokenAddress = b.wethAddress
        inputData.recipientPorticoAddress = b.portico02
    }

    console.log("Sending to Portico: ", portico.address)
    console.log("Input Data: ")
    console.log(inputData)

    let result: any
    if (!wrapIn) {
        console.log("Sending w/o wrap...")

        const approval = await WETH.connect(user).approve(portico.address, amount)
        await approval.wait()
        console.log("APPROVED")
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
    let mainnet = true
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])


        if (testNetwork == testNetworks[0]) {

            await resetCurrentPoly()

            //set chain specifics
            portico = Portico__factory.connect(p.portico02, user)
            WETH = IERC20__factory.connect(p.wethAddress, user)
            const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

            //fund 
            const whale = "0xdeD8C5159CA3673f543D0F72043E4c655b35b96A"
            await stealMoney(whale, user.address, WETH.address, amount)



            console.log("TEST TX ON POLYGON @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[1]) {

            await resetCurrentOP()

            //set chain specifics
            portico = Portico__factory.connect(o.portico02, user)
            WETH = IERC20__factory.connect(o.wethAddress, user)
            const tb = ITokenBridge__factory.connect(o.opTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

            //fund 
            const whale = "0xeD80E4ccA763De95000D915Dd4b89d7092640128"
            await stealMoney(whale, user.address, WETH.address, amount)



            console.log("TEST TX ON OP @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[2]) {
            await resetCurrentArb()

            //set chain specifics
            portico = Portico__factory.connect(a.portico02, user)
            WETH = IERC20__factory.connect(a.wethAddress, user)
            const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

            //fund 
            const whale = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621"
            await stealMoney(whale, user.address, WETH.address, amount)

            console.log("TEST TX ON ARB @ ", await (await currentBlock()).number)


        } else if (testNetwork == testNetworks[3]) {

            await resetCurrentBase()

            //set chain specifics
            portico = Portico__factory.connect(b.portico02, user)
            WETH = IERC20__factory.connect(b.wethAddress, user)
            const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

            //fund 
            const whale = "0x428AB2BA90Eba0a4Be7aF34C9Ac451ab061AC010"
            await stealMoney(whale, user.address, WETH.address, amount)



            console.log("TEST TX ON BASE @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[4]) {

            await resetCurrent()

            //set chain specifics
            portico = Portico__factory.connect(e.portico02, user)
            WETH = IERC20__factory.connect(e.wethAddress, user)
            localCannonAsset = e.wethAddress

            //fund 
            const whale = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
            await stealMoney(whale, user.address, WETH.address, amount)



            console.log("TEST TX ON MAINNET @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[5]) {

            await resetCurrentBsc()

            //set chain specifics
            portico = Portico__factory.connect(bsc.porticoPancake, user)
            WETH = IERC20__factory.connect(bsc.wethAddress, user)
            localCannonAsset = bsc.wormWeth

            //fund 
            const whale = bsc.bscBank
            await stealMoney(whale, user.address, WETH.address, amount)



            console.log("TEST TX ON BSC  @ ", await (await currentBlock()).number)

        }
        mainnet = false

    } else {
        console.log("SENDING FROM: ", networkName)
        console.log("USER ADDR: ", user.address)

        if (networkName == "op") {
            portico = Portico__factory.connect(o.portico02, user)
            WETH = IERC20__factory.connect(o.wethAddress, user)
            const tb = ITokenBridge__factory.connect(o.opTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

        } else if (networkName == "polygon") {
            portico = Portico__factory.connect(p.portico02, user)
            WETH = IERC20__factory.connect(p.wethAddress, user)
            const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))


        } else if (networkName == "arbitrum") {
            portico = Portico__factory.connect(a.portico02, user)
            WETH = IERC20__factory.connect(a.wethAddress, user)
            const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))


        } else if (networkName == "base") {
            portico = Portico__factory.connect(b.portico02, user)
            WETH = IERC20__factory.connect(b.wethAddress, user)
            const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

        } else if (networkName == "bsc") {
            portico = Portico__factory.connect(bsc.porticoPancake, user)
            WETH = IERC20__factory.connect(bsc.wethAddress, user)
            const tb = ITokenBridge__factory.connect(bsc.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))

        } else {
            //mainnet
            portico = Portico__factory.connect(e.portico02, user)
            WETH = IERC20__factory.connect(e.wethAddress, user)
            localCannonAsset = e.wethAddress
        }
    }

    await send(user, mainnet)




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

