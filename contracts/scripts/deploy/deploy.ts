import { zeroAddress } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrentBsc } from "../../util/block";
import { a, av, b, bsc, e, o, p } from "../../util/addresser";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Portico, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";

let portico: Portico
let swapRouter: string
let tokenBridge: string
let weth: string

const deploy = async (deployer: SignerWithAddress, mainnet: boolean) => {

  portico = await DeployContract(
    new Portico__factory(deployer),
    deployer,
    swapRouter,
    tokenBridge,
    weth,
    "0x53207E216540125e322CdA8A693b0b89576DEb46"//zeroAddress,
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
        zeroAddress,
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

    await resetCurrentBsc()
    mainnet = false
    console.log("TEST DEPLOYMENT @ ", await (await currentBlock()).number)
    swapRouter = bsc.uniRouter
    tokenBridge = bsc.tokenBridge
    weth = bsc.wethAddress

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
      swapRouter = a.uniRouter
      tokenBridge = a.tokenBridge
      weth = a.wethAddress
    }else if (networkName == "base") {
      swapRouter = b.uniRouter
      tokenBridge = b.tokenBridge
      weth = b.wethAddress
    }else if (networkName == "bsc") {
      swapRouter = bsc.uniRouter
      tokenBridge = bsc.tokenBridge
      weth = bsc.wethAddress
    } else if (networkName == "avax") {
      console.log("DEPLOYING TO AVAX")
      swapRouter = av.uniRouter
      tokenBridge = av.tokenBridge
      weth = bsc.wethAddress
    }else {
      //mainnet
      swapRouter = e.uniRouter
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
DEPLOYING TO AVAX
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0xE565E118e75304dD3cF83dff409c90034b7EA18a
swapRouter :  0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE
TokenBridge:  0x0e082F06FF657D94310cB8cE8B0D9a04541d8052
Local weth :  0x2170Ed0880ac9A755fd29B2688956BD959F933F8

hh verify --network avax 0xE565E118e75304dD3cF83dff409c90034b7EA18a "0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE" "0x0e082F06FF657D94310cB8cE8B0D9a04541d8052" "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" "0x53207E216540125e322CdA8A693b0b89576DEb46"


 */
