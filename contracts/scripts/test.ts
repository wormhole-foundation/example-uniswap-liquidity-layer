import { formatEther, parseEther, zeroAddress } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentBase, resetCurrentBsc, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { b, bsc, e, o, p } from "../util/addresser"
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

///0x0000000000000000000000007f39c581f595b53c5cb19bd0b3f8da6c935e2ca0
async function getxAsset(user: SignerWithAddress) {

    await resetCurrentBase()

    const tb = ITokenBridge__factory.connect(b.tokenBridge, user)
    const localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.usdcAddress))
    console.log(localCannonAsset)
    const lca = IERC20__factory.connect(localCannonAsset, user)
    console.log("Decimals: ", await lca.decimals())
}

async function abiEncodeParams() {

    const Deployer = "0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89"
    const Portico = "0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889"
    const swapRouter = "0x2626664c2603336E57B271c5C0b26F421741e481"
    const TokenBridge = "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627"
    const weth = "0x4200000000000000000000000000000000000006"

    const result = abi.encode(
        ["address","address","address","address"],
        [swapRouter, TokenBridge, weth, zeroAddress]
    )

    console.log(result)

}


async function main() {

    const accounts = await ethers.getSigners();
    const user = accounts[0];
    console.log("User: ", user.address)

    await abiEncodeParams()

    //await getxAsset(user)

    //portico = Portico__factory.connect("0x9816d7C448f79CdD4aF18c4Ae1726A14299E8C75", user)

    //await portico.connect(user).transferOwnership("0x47D13C1731947155CfF96c14B93176A8b5671725")

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

