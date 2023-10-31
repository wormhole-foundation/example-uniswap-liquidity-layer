import { network } from "hardhat";
import * as dotenv from "dotenv";
import { BigNumber, utils, Event, BytesLike } from "ethers";
import { BN } from "../util/number"
import { Hex } from "viem";

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

export const encodeFlagSet = (
    recipientChain: number,
    bridgeNonce: number,
    feeTierStart: number,
    feeTierFinish: number,
    maxSlippageStart:number,
    maxSlippageFinish:number,
    shouldWrapNative: boolean,
    shouldUnwrapNative: boolean,
  ):Hex => {
    let bitSet = 0
    if(shouldWrapNative) {
      bitSet |= 0b1
    }
    if(shouldUnwrapNative) {
      bitSet |= 0b10
    }
    let ans = "0x"
      + leSize(recipientChain, 2) // first two bytes recipient chain
      + leSize(bridgeNonce, 4) // next four bridge nonce
      + leSize(feeTierStart, 3) // fee tier 3
      + leSize(feeTierFinish, 3)
      + leSize(maxSlippageStart, 2) // slippage 2
      + leSize(maxSlippageFinish, 2)
      + "0".repeat(15*2) // 16-30, so 15*2 zeros
      + leSize(bitSet, 1)
    return ans as Hex
  }
  
  let leSize = (n:number, sz:number):string => {
    return sizeHex(leHex(n),sz)
  }
  
  let leHex = (n:number):string=>{
    let matches = (n+2**32).toString(16).match(/\B../g)
    if(matches){
      return matches.reverse().join("")
    }
    return ""
  }
  
  let sizeHex = (x:string,n:number):string=>{
    n = n * 2
    if(x.length == n) {
      return x
    }
    if(x.length > n) {
      return x.slice(0,n)
    }
    return x + "0".repeat(x.length - n)
  }
  