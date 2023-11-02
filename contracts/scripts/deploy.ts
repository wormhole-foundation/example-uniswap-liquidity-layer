import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentPoly } from "../util/block";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Portico, Portico__factory } from "../typechain-types";
import { DeployContract } from "../util/deploy";

let portico: Portico

const polySwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const polyTokenBridge = "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE"//
const polyRelayerAddress = "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

const opSwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const opTokenBridge = "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b"//
const opRelayerAddress = "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

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
Portico Deployed:  0x8415011818C398dC40258f699a7cb58C85953F43
swapRouter :  0xE592427A0AEce92De3Edee1F18E0157C05861564
TokenBridge:  0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b
Relayer    :  0x27428DD2d3DD32A4D7f7C497eAaa23130d894911


hh verify --network op 0x8415011818C398dC40258f699a7cb58C85953F43 "0xE592427A0AEce92De3Edee1F18E0157C05861564" "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b" "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"


POLY: 
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85
swapRouter :  0xE592427A0AEce92De3Edee1F18E0157C05861564
TokenBridge:  0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE
Relayer    :  0x27428DD2d3DD32A4D7f7C497eAaa23130d894911

hh verify --network polygon 0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85 "0xE592427A0AEce92De3Edee1F18E0157C05861564" "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE" "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"


 */