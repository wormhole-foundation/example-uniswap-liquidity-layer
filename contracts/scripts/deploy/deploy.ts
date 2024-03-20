import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentBase } from "../../util/block";
import { a, av, b, bsc, e, o, p } from "../../util/addresser";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Portico, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";

let portico: Portico
let swapRouter: string
let tokenBridge: string
let weth: string
const feeRecpient = "0x53207E216540125e322CdA8A693b0b89576DEb46"//zeroAddress

const deploy = async (deployer: SignerWithAddress, mainnet: boolean) => {

  portico = await DeployContract(
    new Portico__factory(deployer),
    deployer,
    swapRouter,
    tokenBridge,
    weth,
    feeRecpient//"0x53207E216540125e322CdA8A693b0b89576DEb46"//zeroAddress,
  )


  console.log("Portico Deployed: ", portico.address)
  console.log("swapRouter : ", swapRouter)
  console.log("TokenBridge: ", tokenBridge)
  console.log("Local weth : ", weth)


  await portico.deployed()

  if (mainnet) {
    await portico.deployTransaction.wait(10)
    console.log("deployed, now verifying")
    await hre.run("verify:verify", {
      address: portico.address,
      constructorArguments: [
        swapRouter,
        tokenBridge,
        weth,
        feeRecpient,
      ],
    })
    console.log("verified")

  }
}

async function main() {
  //check for test network
  const networkName = hre.network.name
  let mainnet = true
  if (networkName == "hardhat" || networkName == "localhost") {
    await network.provider.send("evm_setAutomine", [true])

    await resetCurrent()
    mainnet = false
    console.log("TEST DEPLOYMENT @ ", await (await currentBlock()).number)
    swapRouter = e.pcsSwapRouter
    tokenBridge = e.tokenBridge
    weth = e.wethAddress

  } else {
    console.log("DEPLOYING TO: ", networkName)

    if (networkName == "op") {
      swapRouter = o.uniRouter
      tokenBridge = o.opTokenBridge
      weth = o.wethAddress
    } else if (networkName == "polygon") {
      swapRouter = p.uniRouter
      tokenBridge = p.polyTokenBridge
      weth = p.wethAddress
    } else if (networkName == "arbitrum") {
      swapRouter = a.pcsSwapRouter
      tokenBridge = a.tokenBridge
      weth = a.wethAddress
    }else if (networkName == "base") {
      swapRouter = b.pcsSwapRouter//b.uniRouter
      tokenBridge = b.tokenBridge
      weth = b.wethAddress
    }else if (networkName == "bsc") {
      swapRouter = bsc.pcsSwapRouter//bsc.uniRouter
      tokenBridge = bsc.tokenBridge
      weth = bsc.wethAddress
    } else if (networkName == "avax") {
      swapRouter = av.uniRouter
      tokenBridge = av.tokenBridge
      weth = bsc.wethAddress
    }else {
      //mainnet
      swapRouter = e.pcsSwapRouter
      tokenBridge = e.tokenBridge
      weth = e.wethAddress
    }
  }

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log("Deployer: ", deployer.address)

  await deploy(deployer, mainnet)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
DEPLOYING TO:  base
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0x9128bA6B88a3851d6aa856aadE7dA0Bb694560Db
swapRouter :  0x1b81D678ffb9C0263b24A97847620C99d213eB14
TokenBridge:  0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627
Local weth :  0x4200000000000000000000000000000000000006

hh verify --network base 0x9128bA6B88a3851d6aa856aadE7dA0Bb694560Db "0x1b81D678ffb9C0263b24A97847620C99d213eB14" "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627" "0x4200000000000000000000000000000000000006" "0x53207E216540125e322CdA8A693b0b89576DEb46"

 */
