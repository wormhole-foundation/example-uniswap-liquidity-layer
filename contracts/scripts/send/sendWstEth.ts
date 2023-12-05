import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentBase, resetCurrentOP, resetCurrentPoly } from "../../util/block";
import { a, b, e, o, p, w } from "../../util/addresser";
import { IERC20, IERC20__factory, ITokenBridge__factory, Portico, Portico__factory } from "../../typechain-types";
import { TradeParameters } from "../../test/scope";
import { adddr2Bytes, encodeFlagSet, getEvent } from "../../util/msc";
import { BN } from "../../util/number";
import { stealMoney } from "../../util/money";
import { AbiCoder } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
const abi = new AbiCoder()


//change these
const destChainID = w.CID.optimism
const feeIn = 100
const feeOut = 100
const slippage = 5000
const wrapIn = false//always false for non eth
const wrapOut = false//always false for non eth
const amount = BN("1000000000000000")//BN("20000000000")
const relayerFee = BN("80000000")

//which network to send from when testing
const testNetwork = "arbitrum"
const testNetworks = [
    "polygon",
    "op",
    "arbitrum",
    "base",
    "mainnet"
]

let portico: Portico//Portico
let networkName: string
let WSTETH: IERC20
let localCannonAsset: string


const send = async (user: SignerWithAddress, mainnet: boolean) => {

    let inputData: TradeParameters = {
        flags: "0x",
        startTokenAddress: WSTETH.address,
        canonAssetAddress: localCannonAsset,
        finalTokenAddress: "",
        recipientAddress: user.address,
        recipientPorticoAddress: "",
        amountSpecified: amount,
        relayerFee: relayerFee
    }

    //encode flags
    inputData.flags = encodeFlagSet(destChainID, 1, feeIn, feeOut, slippage, slippage, wrapIn, wrapOut)

    //set dest addrs
    if (destChainID == w.CID.polygon) {
        inputData.finalTokenAddress = p.wstethAddress
        inputData.recipientPorticoAddress = p.portico02
    }
    if (destChainID == w.CID.optimism) {
        inputData.finalTokenAddress = o.wstethAddress
        inputData.recipientPorticoAddress = o.portico02
    }
    if (destChainID == w.CID.arbitrum) {
        inputData.finalTokenAddress = a.wstethAddress
        inputData.recipientPorticoAddress = a.portico02
    }
    if (destChainID == w.CID.ethereum) {
        inputData.finalTokenAddress = e.wstethAddress
        inputData.recipientPorticoAddress = e.portico02
    }
    if (destChainID == w.CID.base) {
        inputData.finalTokenAddress = b.wstethAddress
        inputData.recipientPorticoAddress = b.portico02
    }
    
    console.log("Sending to Portico: ", portico.address)
    console.log("Input Data: ")
    console.log(inputData)

    let result: any
    if (!wrapIn) {
        console.log("Sending w/o wrap...")

        const approval = await WSTETH.connect(user).approve(portico.address, amount)
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
            WSTETH = IERC20__factory.connect(p.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))

            //fund 
            const whale = "0x2b44d9764fbbd2B07fbc48212aee4Da331806062"
            await stealMoney(whale, user.address, WSTETH.address, amount)



            console.log("TEST TX ON POLYGON @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[1]) {

            await resetCurrentOP()

            //set chain specifics
            portico = Portico__factory.connect(o.portico02, user)
            WSTETH = IERC20__factory.connect(o.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(o.opTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))

            //fund 
            const whale = "0x916792f7734089470de27297903BED8a4630b26D"
            await stealMoney(whale, user.address, WSTETH.address, amount)



            console.log("TEST TX ON OP @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[2]) {
            await resetCurrentArb()

            //set chain specifics
            portico = Portico__factory.connect(a.portico02, user)
            WSTETH = IERC20__factory.connect(a.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))

            //fund 
            const whale = "0x916792f7734089470de27297903BED8a4630b26D"
            await stealMoney(whale, user.address, WSTETH.address, amount)

            console.log("TEST TX ON ARB @ ", await (await currentBlock()).number)


        } else if (testNetwork == testNetworks[3]) {

            await resetCurrentBase()

            //set chain specifics
            portico = Portico__factory.connect(b.portico02, user)
            WSTETH = IERC20__factory.connect(b.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))

            //fund 
            const whale = "0x428AB2BA90Eba0a4Be7aF34C9Ac451ab061AC010"
            await stealMoney(whale, user.address, WSTETH.address, amount)



            console.log("TEST TX ON BASE @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[4]) {

            await resetCurrent()

            //set chain specifics
            portico = Portico__factory.connect(e.portico02, user)
            WSTETH = IERC20__factory.connect(e.wstethAddress, user)
            localCannonAsset = e.wstethAddress

            //fund 
            const whale = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
            await stealMoney(whale, user.address, WSTETH.address, amount)



            console.log("TEST TX ON MAINNET @ ", await (await currentBlock()).number)

        }




        mainnet = false


    } else {
        console.log("SENDING FROM: ", networkName)
        console.log("USER ADDR: ", user.address)

        if (networkName == "op") {
            portico = Portico__factory.connect(o.portico02, user)
            WSTETH = IERC20__factory.connect(o.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(o.opTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))

        } else if (networkName == "polygon") {
            portico = Portico__factory.connect(p.portico02, user)
            WSTETH = IERC20__factory.connect(p.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(p.polyTokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))


        } else if (networkName == "arbitrum") {
            portico = Portico__factory.connect(a.portico02, user)
            WSTETH = IERC20__factory.connect(a.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(a.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))


        } else if (networkName == "base") {
            portico = Portico__factory.connect(b.portico02, user)
            WSTETH = IERC20__factory.connect(b.wstethAddress, user)
            const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
            localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wstethAddress))

        } else {
            //mainnet
            portico = Portico__factory.connect(e.portico02, user)
            WSTETH = IERC20__factory.connect(e.wstethAddress, user)
            localCannonAsset = e.wstethAddress
        }
    }


    console.log("Local xAsset: ", localCannonAsset)
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

