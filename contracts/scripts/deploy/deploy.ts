import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentBase, resetCurrentPoly } from "../../util/block";
import { a, b, e, o, p } from "../../util/addresser"
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
    weth
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
        weth
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

    /**
    await resetCurrentPoly()
    mainnet = false
    console.log("TEST DEPLOYMENT ON POLYGON @ ", await (await currentBlock()).number)

    swapRouter = p.uniRouter
    tokenBridge = p.polyTokenBridge
    weth = p.wethAddress
     */

    await resetCurrentArb()
    mainnet = false
    console.log("TEST DEPLOYMENT @ ", await (await currentBlock()).number)
    swapRouter = a.uniRouter
    tokenBridge = a.tokenBridge
    weth = a.wethAddress

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
    } else {
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
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0x0fe9a1cd02B6633A2c2084Ff87E3Ee75D3e2081d
swapRouter :  0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
TokenBridge:  0x3ee18B2214AFF97000D974cf647E7C347E8fa585
Local weth :  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

hh verify --network mainnet 0x0fe9a1cd02B6633A2c2084Ff87E3Ee75D3e2081d "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" "0x3ee18B2214AFF97000D974cf647E7C347E8fa585" "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"


 */
