import { network } from "hardhat";
import * as dotenv from "dotenv";
import { BigNumber, utils, Event, BytesLike } from "ethers";
import { BN } from "../util/number"

export const toNumber = async (bigboi: BigNumber) => {
    return Number(utils.formatEther(bigboi.toString()))
}

export const getGasCost = async (gas: BigNumber, gasPrice: number, ethPrice: BigNumber) => {
    return await toNumber((gas.mul(gasPrice).mul(ethPrice)).div(BN("1e18")))
}

export const getEvent = async (result: any, event: string) => {
    const receipt = await result.wait()
    let parsedEvent = receipt.events?.filter((x: Event) => {
        return x.event == event
    }).pop()//?.event//get just event name
    return parsedEvent
}


export const getGas = async (result: any) => {
    const receipt = await result.wait()
    return receipt.gasUsed
}