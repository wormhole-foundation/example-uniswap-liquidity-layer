import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentPoly } from "../util/block";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Portico, Portico__factory } from "../typechain-types";
import { DeployContract } from "../util/deploy";

let portico: Portico

const polySwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const polyTokenBridge = "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE"//
const polyRelayerAddress = ethers.constants.AddressZero//"0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

const opSwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const opTokenBridge = "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b"//
const opRelayerAddress = ethers.constants.AddressZero//"0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

let swapRouter: string
let tokenBridge: string
let relayer: string

const deploy = async (deployer: SignerWithAddress) => {
  portico = await DeployContract(
    new Portico__factory(deployer),
    deployer,
    swapRouter,
    tokenBridge,
    relayer
  )

  await portico.deployed()

  console.log("Portico Deployed: ", portico.address)
  console.log("swapRouter : ", swapRouter)
  console.log("TokenBridge: ", tokenBridge)
  console.log("Relayer    : ", relayer)
}

async function main() {
  //check for test network
  const networkName = hre.network.name
  if (networkName == "hardhat" || networkName == "localhost") {
    await network.provider.send("evm_setAutomine", [true])
    await resetCurrentPoly()
    console.log("TEST DEPLOYMENT @ ", await (await currentBlock()).number)

    swapRouter = polySwapRouter
    tokenBridge = polyTokenBridge
    relayer = polyRelayerAddress

  } else {
    console.log("DEPLOYING TO: ", networkName)

    if (networkName == "op") {
      swapRouter = opSwapRouter
      tokenBridge = opTokenBridge
      relayer = opRelayerAddress
    } else {
      swapRouter = polySwapRouter
      tokenBridge = polyTokenBridge
      relayer = polyRelayerAddress
    }
  }


  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log("Deployer: ", deployer.address)

  await deploy(deployer)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
OP: 
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0x5739082F906aCC9967e2B23Ed5A718B49580133a
swapRouter :  0xE592427A0AEce92De3Edee1F18E0157C05861564
TokenBridge:  0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b
Relayer    :  0x0000000000000000000000000000000000000000


hh verify --network op 0x5739082F906aCC9967e2B23Ed5A718B49580133a "0xE592427A0AEce92De3Edee1F18E0157C05861564" "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b" "0x0000000000000000000000000000000000000000"


POLY: 
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0xd3bd7a8777c042De830965de1C1BCC9784135DD2
swapRouter :  0xE592427A0AEce92De3Edee1F18E0157C05861564
TokenBridge:  0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE
Relayer    :  0x0000000000000000000000000000000000000000

hh verify --network polygon 0xd3bd7a8777c042De830965de1C1BCC9784135DD2 "0xE592427A0AEce92De3Edee1F18E0157C05861564" "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE" "0x0000000000000000000000000000000000000000"


 */