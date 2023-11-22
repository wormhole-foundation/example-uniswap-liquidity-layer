import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentBase, resetCurrentPoly } from "../../util/block";
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

    await resetCurrentBase()
    mainnet = false
    console.log("TEST DEPLOYMENT ON BASE @ ", await (await currentBlock()).number)
    swapRouter = b.uniRouter
    tokenBridge = b.tokenBridge
    weth = b.wethAddress

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
Portico Deployed:  0x69F3d75Fa1eaA2a46005D566Ec784FE9059bb04B
swapRouter :  0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
TokenBridge:  0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE
Local weth :  0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619

hh verify --network polygon 0x69F3d75Fa1eaA2a46005D566Ec784FE9059bb04B "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE" "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"


 */
