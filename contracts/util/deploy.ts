import { Signer, ContractFactory } from "ethers";
import { mineBlock } from "./block";
//import { TenderlyContract } from "@tenderly/hardhat-tenderly/dist/tenderly/types";


export const DeployContract = async (factory: ContractFactory, deployer: Signer, ...args: any[]): Promise<any> => {
    
    const uContract = await factory.connect(deployer).deploy(...args)
    await uContract.deployed()
    return uContract


    /**
    const uVC = await factory.connect(deployer).deploy(...args)
    await uVC.deployed()
    return uVC
     */
}


