import { formatEther, parseEther } from "viem";
import hre, { ethers, network } from "hardhat";
import { currentBlock, resetCurrent, resetCurrentBase, resetCurrentPoly } from "../../util/block";
import { a, b, e, o, p } from "../../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Portico, Portico__factory } from "../../typechain-types";
import { DeployContract } from "../../util/deploy";
import { PorticoBase__factory } from "../../typechain-types/factories/PorticoBase.sol";

let portico: Portico
let swapRouter: string
let tokenBridge: string
let weth: string

const deploy = async (deployer: SignerWithAddress, mainnet: boolean) => {

  portico = await DeployContract(
    new PorticoBase__factory(deployer),
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

    await resetCurrentBase()
    mainnet = false
    console.log("TEST DEPLOYMENT ON BASE @ ", await (await currentBlock()).number)
    swapRouter = b.swapRouter
    tokenBridge = b.tokenBridge
    weth = b.wethAddress

  } else {
    console.log("DEPLOYING TO: ", networkName)
    swapRouter = b.swapRouter
    tokenBridge = b.tokenBridge
    weth = b.wethAddress
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
Portico Deployed:  0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85
swapRouter :  0x2626664c2603336E57B271c5C0b26F421741e481
TokenBridge:  0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627
Local weth :  0x4200000000000000000000000000000000000006

hh verify --network base 0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85 "0x2626664c2603336E57B271c5C0b26F421741e481" "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627" "0x4200000000000000000000000000000000000006"


 */
