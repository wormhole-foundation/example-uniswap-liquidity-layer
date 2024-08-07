import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentAvax, resetCurrentBase, resetCurrentBsc, resetCurrentOP, resetCurrentPoly } from "../../util/block";
import { a, av, b, bsc, e, o, p, w } from "../../util/addresser";
import { Portico, Portico__factory } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
//const abi = new AbiCoder()

const axios = require('axios')
//const receiveer = "0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89"

const MAINNET_GUARDIAN_RPC: string[] = [
    "https://wormhole-v2-mainnet-api.certus.one",
    "https://wormhole.inotel.ro",
    "https://wormhole-v2-mainnet-api.mcf.rocks",
    "https://wormhole-v2-mainnet-api.chainlayer.network",
    "https://wormhole-v2-mainnet-api.staking.fund",
    "https://wormhole-v2-mainnet.01node.com",
]

//change these
const emittingChainid = 30
const emitter = "0000000000000000000000008d2de8d2f73f1f4cab472ac9a881c9b123c79627"
const sequence = 54576
//which network on which to receive when testing
const testNetwork = "avax"
const testNetworks = [
    "polygon",
    "op",
    "arbitrum",
    "base",
    "mainnet",
    "bsc",//todo
    "avax"
]


const url = `${MAINNET_GUARDIAN_RPC[1]}/v1/signed_vaa/${emittingChainid}/${emitter}/${sequence}`

let portico: Portico
let networkName: string


const receive = async (user: SignerWithAddress, mainnet: boolean) => {
    console.log("Receiving Portico: ", portico.address)

    const response = await axios.get(url)
    const vaa = Buffer.from(response.data.vaaBytes, "base64").toString("hex");
    console.log("0x" + vaa.toString())

    if (mainnet) {
        console.log("Receiving...")
        const result = await portico.connect(user).receiveMessageAndSwap("0x" + vaa.toString())
        console.log("Received: ", (await result.wait()).transactionHash)
    }
}

async function main() {


    const accounts = await ethers.getSigners();
    const user = accounts[0];

    //check for test network
    networkName = hre.network.name
    let mainnet = true
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        console.log("Test Network: ", testNetwork)

        if (testNetwork == testNetworks[0]) {

            await resetCurrentPoly()

            portico = Portico__factory.connect(p.portico03, user)

            console.log("TEST TX ON POLYGON @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[1]) {
            await resetCurrentOP()

            portico = Portico__factory.connect(o.portico03, user)

            console.log("TEST TX ON OP @ ", await (await currentBlock()).number)


        } else if (testNetwork == testNetworks[2]) {
            await resetCurrentArb()

            portico = Portico__factory.connect(a.pancakePortico, user)

            console.log("TEST TX ON ARB @ ", await (await currentBlock()).number)


        } else if (testNetwork == testNetworks[3]) {
            await resetCurrentBase()

            portico = Portico__factory.connect(b.pancakePortico, user)

            console.log("TEST TX ON BASE @ ", await (await currentBlock()).number)


        } else if (testNetwork == testNetworks[4]) {
            await resetCurrent()

            portico = Portico__factory.connect(e.pancakePortico, user)

            console.log("TEST TX ON MAINNET @ ", await (await currentBlock()).number)

        } else if (testNetwork == testNetworks[5]) {

            await resetCurrentBsc()

            portico = Portico__factory.connect(bsc.pancakePortico, user)

            console.log("TEST TX ON BSC @ ", await (await currentBlock()).number)

        }else if (testNetwork == testNetworks[6]) {

            await resetCurrentAvax()

            portico = Portico__factory.connect(av.portico03, user)

            console.log("TEST TX ON AVAX @ ", await (await currentBlock()).number)

        }

        mainnet = false


    } else {
        console.log("RECEIVING @: ", networkName)
        console.log("USER ADDR: ", user.address)

        if (networkName == "op") {
            portico = Portico__factory.connect(o.portico03, user)
        } else if (networkName == "polygon") {
            portico = Portico__factory.connect(p.portico03, user)
        } else if (networkName == "arbitrum") {
            portico = Portico__factory.connect(a.pancakePortico, user)
        } else if (networkName == "base") {
            portico = Portico__factory.connect(b.pancakePortico, user)
        } else if (networkName == "bsc") {
            portico = Portico__factory.connect(bsc.pancakePortico, user)
        } else if (networkName == "avax") {
            portico = Portico__factory.connect(av.portico03, user)
        }else {//mainnet
            portico = Portico__factory.connect(e.pancakePortico, user)
        }
    }

    await receive(user, mainnet)


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

