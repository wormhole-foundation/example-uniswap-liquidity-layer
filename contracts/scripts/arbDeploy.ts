import { formatEther, parseEther, zeroAddress } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentArb, resetCurrentPoly } from "../util/block";
import { a, o, p } from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Portico, Portico__factory } from "../typechain-types";
import { DeployContract } from "../util/deploy";

let portico: Portico


let swapRouter: string
let tokenBridge: string
let weth: string

const deploy = async (deployer: SignerWithAddress) => {

  portico = await DeployContract(
    new Portico__factory(deployer),
    deployer,
    swapRouter,
    tokenBridge,
    weth,
    zeroAddress,
  )


  console.log("Portico Deployed: ", portico.address)
  console.log("swapRouter : ", swapRouter)
  console.log("TokenBridge: ", tokenBridge)
  console.log("Local weth : ", weth)


  await portico.deployed()
  await portico.deployTransaction.wait(10)
  console.log("deployed, now verifying")
  await hre.run("verify:verify", {
    address: portico.address,
    constructorArguments: [
      swapRouter,
      tokenBridge,
      weth
    ],
  });

  console.log("verified")

}

async function main() {
  //check for test network
  const networkName = hre.network.name
  if (networkName == "hardhat" || networkName == "localhost") {
    await network.provider.send("evm_setAutomine", [true])
    await resetCurrentArb()
    console.log("TEST DEPLOYMENT @ ", await (await currentBlock()).number)

  } else {
    console.log("DEPLOYING TO: ", networkName)
  }

  weth = a.wethAddress
  swapRouter = a.swapRouter
  tokenBridge = a.tokenBridge


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
Deployer:  0x085909388fc0cE9E5761ac8608aF8f2F52cb8B89
Portico Deployed:  0x2dB08783F13c4225A1963b2437f0D459a5BCB4D8
swapRouter :  0xE592427A0AEce92De3Edee1F18E0157C05861564
TokenBridge:  0x0b2402144Bb366A632D14B83F244D2e0e21bD39c
Local weth :  0x82aF49447D8a07e3bd95BD0d56f35241523fBab1

hh verify --network arbitrum 0x2dB08783F13c4225A1963b2437f0D459a5BCB4D8 "0xE592427A0AEce92De3Edee1F18E0157C05861564" "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c" "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"

 */
