import { Signer, ContractFactory } from "ethers";
import { mineBlock } from "./block";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TransparentUpgradeableProxy__factory } from "../typechain-types";
//import { TenderlyContract } from "@tenderly/hardhat-tenderly/dist/tenderly/types";

//pass implementation if re-using an existing one, or pass undefined to deploy a new one
export const DeployNewProxyContract = async (
    factory: ContractFactory,
    deployer: SignerWithAddress,
    admin: string,
    implementation?: string,
    ...args: any[]
): Promise<any> => {
    if (implementation ==  undefined) {
        //deploy new implementation
        const newImp = await factory.connect(deployer).deploy()
        await newImp.deployed()
        implementation = newImp.address
        console.log("New Implementation Deployed: ", implementation)
    }


    const newProxy = await new TransparentUpgradeableProxy__factory(deployer).deploy(
        implementation,
        admin,
        "0x"
    )
    await newProxy.deployed()

    const contract = factory.attach(newProxy.address)
    const initialize = await contract.initialize(...args)
    await initialize.wait()
    return contract
}
export const DeployContract = async (factory: ContractFactory, deployer: Signer, ...args: any[]): Promise<any> => {
    const uVC = await factory.connect(deployer).deploy(...args)
    await uVC.deployed()
    return uVC
}
