import { formatEther, parseEther } from "viem";
import hre, { network } from "hardhat";
const { ethers } = require("hardhat")
import { currentBlock, resetCurrent, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { o, p } from "../util/addresser"
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

const abi = new AbiCoder()

let portico: Portico

//https://polygonscan.com/tx/0x2afb3eba52c63ec67c1cecb512b160fafa9cffa4885e64a26e27897458c00625
//0x01000000030d002a0ac1d0d307e86032897535d179553c1793a237ef1e52690b01d2b4878cfefe1c251500f25073fdd0f04daa22fdb29266392867b999047429ad8116855e2d1201028d6d08be9bdc6a066a3b0054b2eceb77ab70401ec05fa049c8b8356dab7b1c8a410c3cc8bccd58a51c8e04a46ad218fc1903edff2f74f117d6e66bae69caf3fa0103894e0c0ef7656deff88c5bcac054d3ed4b8e020b1af1e4a8ca68ef5483aa43d2688da756a2c04acfacec6395008afc8a8c06296ca482b9e20e329b836d0634c0000412c9ed8ba4386801bde57b2dc6de10cdd16905e7b5fac0c3c3489f8909d60849496180cf95c5bf9a83f4001b8e5088d3122dd60e4dd3d7b8456ada2ab6ded46d00075236f03a7cde8186c87051efe7698cade04c2448630a0d3ac291ca2d05ffe9d72d5d229bdfc2a9451f5e4e2e6880fa71c31d4fe4f3f409297c76e53fa2533ce2000832e3d6e397c13e86f38bc0540b3f3371269003482fcbc1d43abc7c67a673aff1690a553d7c665dae1232a493dd7f5548148677ad3d09296ff5b2db944057f28b01095268d0f7ce414177146983d26f90e848624e0845853d9cd40c4440ee676775374d109bf7b62b7b0b671990033aa37c64ac2ef7cf83e19eafa48b8ad33890a58b000cb41fd62224022ae96be2612dbfb6a102ea24b54b61708673df98c263a665837a56de2d97ccb53762d40f3df3ee54c99e58e73c96677db20ce8ba4fcbe5271008010e601ca0ea00c1c1b922af63c6752309ccc0bfe60dc87a7d522e0e865b3ae1062d62b5eaae860841c280614cb12b2a67bd7eca75e6e5f691d1ab853e80bbaaf22d010fb222d6329f2caba2e0e7820b7e00095fdda7814bacb01af803bc7bef405ebca74bb81ca9e6c1cb4365bb1ce9b5901b6c73d4f95f4dea275ca8d561710735e2f50110da95fc483875e71a311d32ff091f7698248e4ccbb2ffc9381e8fe097b2f3c7ec4926496ec3fb4ab4499373a74f5e7e6a6485b9428d8b0295c1635ee09e3b66c000112ddee382f413734b3bdb510d1863d99b066a26fdf60b8dc955139719220115de0d70c822001acb1ce06059cc6f5db97395ccd59af5c8813eb3309bd4874fd4840012cf2b08dac56e610c020fa848ca863bd8775352d75c3d5e6a9118cc2babac20f761e45d7613d47529a97fa98dfb6961659ad847acd430820209838491097f430800655191b6921e01000004000000000000000000000000b6f6d86a8f9879a9c87f643768d9efc38c1da6e70000000000044b010f0100000000000000000000000000000000000000000000000000000001aabf9e44010000000000000000000000000000000000000000000000000000007575736400030000000000000000000000005329822410461d6a4586f2707130bd3f8fa8260300050000000000000000000000000000000000000000000000000000000000000000

const testEncodedData = "0x01000000030d002a0ac1d0d307e86032897535d179553c1793a237ef1e52690b01d2b4878cfefe1c251500f25073fdd0f04daa22fdb29266392867b999047429ad8116855e2d1201028d6d08be9bdc6a066a3b0054b2eceb77ab70401ec05fa049c8b8356dab7b1c8a410c3cc8bccd58a51c8e04a46ad218fc1903edff2f74f117d6e66bae69caf3fa0103894e0c0ef7656deff88c5bcac054d3ed4b8e020b1af1e4a8ca68ef5483aa43d2688da756a2c04acfacec6395008afc8a8c06296ca482b9e20e329b836d0634c0000412c9ed8ba4386801bde57b2dc6de10cdd16905e7b5fac0c3c3489f8909d60849496180cf95c5bf9a83f4001b8e5088d3122dd60e4dd3d7b8456ada2ab6ded46d00075236f03a7cde8186c87051efe7698cade04c2448630a0d3ac291ca2d05ffe9d72d5d229bdfc2a9451f5e4e2e6880fa71c31d4fe4f3f409297c76e53fa2533ce2000832e3d6e397c13e86f38bc0540b3f3371269003482fcbc1d43abc7c67a673aff1690a553d7c665dae1232a493dd7f5548148677ad3d09296ff5b2db944057f28b01095268d0f7ce414177146983d26f90e848624e0845853d9cd40c4440ee676775374d109bf7b62b7b0b671990033aa37c64ac2ef7cf83e19eafa48b8ad33890a58b000cb41fd62224022ae96be2612dbfb6a102ea24b54b61708673df98c263a665837a56de2d97ccb53762d40f3df3ee54c99e58e73c96677db20ce8ba4fcbe5271008010e601ca0ea00c1c1b922af63c6752309ccc0bfe60dc87a7d522e0e865b3ae1062d62b5eaae860841c280614cb12b2a67bd7eca75e6e5f691d1ab853e80bbaaf22d010fb222d6329f2caba2e0e7820b7e00095fdda7814bacb01af803bc7bef405ebca74bb81ca9e6c1cb4365bb1ce9b5901b6c73d4f95f4dea275ca8d561710735e2f50110da95fc483875e71a311d32ff091f7698248e4ccbb2ffc9381e8fe097b2f3c7ec4926496ec3fb4ab4499373a74f5e7e6a6485b9428d8b0295c1635ee09e3b66c000112ddee382f413734b3bdb510d1863d99b066a26fdf60b8dc955139719220115de0d70c822001acb1ce06059cc6f5db97395ccd59af5c8813eb3309bd4874fd4840012cf2b08dac56e610c020fa848ca863bd8775352d75c3d5e6a9118cc2babac20f761e45d7613d47529a97fa98dfb6961659ad847acd430820209838491097f430800655191b6921e01000004000000000000000000000000b6f6d86a8f9879a9c87f643768d9efc38c1da6e70000000000044b010f0100000000000000000000000000000000000000000000000000000001aabf9e44010000000000000000000000000000000000000000000000000000007575736400030000000000000000000000005329822410461d6a4586f2707130bd3f8fa8260300050000000000000000000000000000000000000000000000000000000000000000"
async function receive(user: SignerWithAddress) {

    console.log("Receive")
    portico = Portico__factory.connect(o.opPortico, user)



    const signedVaaVerbose: VM = {
        version: testVAA.version,
        timestamp: testVAA.timestamp,
        nonce: testVAA.nonce,
        emitterChainId: testVAA.emitterChain,
        emitterAddress: testVAA.emitterAddress,
        sequence: testVAA.sequence,
        consistencyLevel: testVAA.consistencyLevel,
        payload: testVAA.payload,
        guardianSetIndex: testVAA.guardianSetIndex,
        signatures: testVAA.guardianSignatures,
        hash: testVAA.hash
    }

    const encodedTransferMessage = abi.encode(
        ["tuple(uint8 version, uint32 timestamp, uint32 nonce, uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint8 consistencyLevel, bytes payload, uint32 guardianSetIndex, tuple(uint8 index, bytes signature, string name)[] signatures, bytes32 hash)"],
        [signedVaaVerbose]
    )



    console.log("Encoded")
    //todo pass raw vaa
    //encodedMessage is the raw vaa encoded as binary
    console.log("Receiving...")
    //await portico.connect(user).receiveMessageAndSwap(data)



}

async function receiveConsole(user: SignerWithAddress) {
    console.log("Receive Console")
    portico = Portico__factory.connect(o.consolePortico, user)
    console.log("Portico: ", portico.address)

    const vm: VM = {
        version: consoleVAA.version,
        timestamp: consoleVAA.timestamp,
        nonce: consoleVAA.nonce,
        emitterChainId: consoleVAA.emitterChain,
        emitterAddress: consoleVAA.emitterAddress,
        sequence: consoleVAA.sequence,
        consistencyLevel: consoleVAA.consistencyLevel,
        payload: consoleVAA.payload,
        guardianSetIndex: consoleVAA.guardianSetIndex,
        signatures: consoleVAA.guardianSignatures,
        hash: consoleVAA.hash
    }

    const encodedTransferMessage = abi.encode(
        ["tuple(uint8 version, uint32 timestamp, uint32 nonce, uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint8 consistencyLevel, bytes payload, uint32 guardianSetIndex, tuple(uint8 index, bytes signature, string name)[] signatures, bytes32 hash)"],
        [vm]
    )

    console.log("Encoded: ", encodedTransferMessage)
    //todo pass raw vaa
    //encodedMessage is the raw vaa encoded as binary
    console.log("Receiving...")
    await portico.connect(user).receiveMessageAndSwap(encodedTransferMessage)
}

async function encodeTest(user: SignerWithAddress) {

    portico = await DeployContract(
        new Portico__factory(user),
        user,
        o.opSwapRouter,
        o.opTokenBridge,
        o.opRelayerAddress,
        o.wethAddress
    )
    await portico.deployed()

    const vm: VM = {
        version: consoleVAA.version,
        timestamp: consoleVAA.timestamp,
        nonce: consoleVAA.nonce,
        emitterChainId: consoleVAA.emitterChain,
        emitterAddress: consoleVAA.emitterAddress,
        sequence: consoleVAA.sequence,
        consistencyLevel: consoleVAA.consistencyLevel,
        payload: consoleVAA.payload,
        guardianSetIndex: consoleVAA.guardianSetIndex,
        signatures: consoleVAA.guardianSignatures,
        hash: consoleVAA.hash
    }

    const encodedVm = encodeVM(vm)

    //console.log(encodedVm)

    //const data = await portico.decodeTest(encodedVm)
    //console.log(data)


}



async function main() {

    let user: SignerWithAddress
    const sender = "0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89"
    //check for test network
    const networkName = hre.network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        await network.provider.send("evm_setAutomine", [true])
        await resetCurrentOP()
        await impersonateAccount(sender)
        user = ethers.provider.getSigner(sender)
        console.log("TEST ON OP @: ", await (await currentBlock()).number)


    } else {
        console.log("SENDING TX ON: ", networkName)
        const accounts = await ethers.getSigners();
        user = accounts[0]
        console.log("User: ", user.address)

    }


    //await receive(user)
    // await receiveConsole(user)
    await encodeTest(user)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

