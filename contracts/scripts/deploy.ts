import { deployContract } from "@nomiclabs/hardhat-ethers/types";
import hre from "hardhat";
import { Portico__factory } from "../typechain-types";

async function main() {
  const signer = (await hre.ethers.getSigners())[0]
  const factory = new Portico__factory()

  factory.deploy()

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
