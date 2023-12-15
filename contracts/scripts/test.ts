import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentBase, resetCurrentBsc, resetCurrentOP, resetCurrentPoly } from "../util/block";
import { bsc, e, o, p } from "../util/addresser"
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

    await resetCurrentBsc()

    const tb = ITokenBridge__factory.connect(bsc.tokenBridge, user)
    const localCannonAsset = await tb.wrappedAsset(2, adddr2Bytes(e.wethAddress))
    console.log(localCannonAsset)

}


async function main() {

    const accounts = await ethers.getSigners();
    const user = accounts[0];
    console.log("User: ", user.address)

    await getxAsset(user)

    //portico = Portico__factory.connect("0x9816d7C448f79CdD4aF18c4Ae1726A14299E8C75", user)

    //await portico.connect(user).transferOwnership("0x47D13C1731947155CfF96c14B93176A8b5671725")

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

