import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import { BigNumber, utils, Event, BytesLike } from "ethers";
import { BN } from "../util/number"
import { Hex } from "viem";
import { VM } from "../test/scope";
import { AbiCoder, zeroPad } from "ethers/lib/utils";

export const toNumber = async (bigboi: BigNumber) => {
  return Number(utils.formatEther(bigboi.toString()))
}

//convert an address to bytes32
export const adddr2Bytes = (address: string) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(address, 32))
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

export const encodeTransferMessage = (data: VM): Hex => {
  let bitset = 0
  let ans = "0x"
    + leSize(data.version, 1)
    + leSize(data.timestamp, 4)
    + leSize(data.nonce, 4)
    + leSize(data.emitterChainId, 2)
    + sizeHex(data.emitterAddress.toString(), 32)



  return "0x"
}

// https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/test/bridge.js#L1523
export const encodeVM = (vm: VM): string => {
  const abi = new AbiCoder()

  const body = [
    //abi.encode(["uint8"],[vm.version]).substring(2 + (64 - 2))
    abi.encode(["uint32"], [vm.timestamp]).substring(2 + (64 - 8)),
    abi.encode(["uint32"], [vm.nonce]).substring(2 + (64 - 8)),
    abi.encode(["uint16"], [vm.emitterChainId]).substring(2 + (64 - 4)),
    abi.encode(["bytes32"], [vm.emitterAddress]).substring(2),
    abi.encode(["uint64"], [vm.sequence]).substring(2 + (64 - 16)),
    abi.encode(["uint8"], [vm.consistencyLevel]).substring(2 + (64 - 2)),
    vm.payload.toString().substring(2)
  ]

  let signatures: any = ""
  for (let i in vm.signatures) {
    let sig = vm.signatures[i].signature
    sig = sig.toString().substring(2, sig.toString().length)//remove 0x - change this once data is fixed
    console.log("g:", abi.encode(["uint8"], [vm.signatures[i].index]).substring(2 + (64 - 2)))
    console.log("r:", zeroPadBytes(sig.toString().substring(0, 65), 32))
    console.log("s:", zeroPadBytes(sig.toString().substring(65, sig.length), 32))
    console.log("v:", abi.encode(["uint8"], [28]).substring(2 + (64 - 2)))
    const packedSig = [
      abi.encode(["uint8"], [vm.signatures[i].index]).substring(2 + (64 - 2)),
      zeroPadBytes(sig.toString().substring(0, 65), 32),
      zeroPadBytes(sig.toString().substring(65, sig.length), 32),
      abi.encode(["uint8"], [28]).substring(2 + (64 - 2)),
    ]
    console.log(packedSig.join("").length)
    signatures += packedSig.join("")
  }

  let encodedVm = [
    abi.encode(["uint8"], [vm.version]).substring(2 + (64 - 2)),
    abi.encode(["uint32"], [vm.guardianSetIndex]).substring(2 + (64 - 8)),
    abi.encode(["uint8"], [vm.signatures.length]).substring(2 + (64 - 2)),
    signatures,
    body.join("")
  ].join("")

  return "0x" + encodedVm
}

function zeroPadBytes(value: any, length: number) {
  while (value.length < 2 * length) {
    value = "0" + value;
  }
  return value;
}



export const encodeFlagSet = (
  recipientChain: number,
  bridgeNonce: number,
  feeTierStart: number,
  feeTierFinish: number,
  maxSlippageStart: number,
  maxSlippageFinish: number,
  shouldWrapNative: boolean,
  shouldUnwrapNative: boolean,
): Hex => {
  let bitSet = 0
  if (shouldWrapNative) {
    bitSet |= 0b1
  }
  if (shouldUnwrapNative) {
    bitSet |= 0b10
  }
  let ans = "0x"
    + leSize(recipientChain, 2) // first two bytes recipient chain
    + leSize(bridgeNonce, 4) // next four bridge nonce
    + leSize(feeTierStart, 3) // fee tier 3
    + leSize(feeTierFinish, 3)
    + leSize(maxSlippageFinish, 2)
    + leSize(maxSlippageStart, 2) // slippage 2
    + "0".repeat(15 * 2) // 16-30, so 15*2 zeros
    + leSize(bitSet, 1)
  return ans as Hex
}

let leSize = (n: number, sz: number): string => {
  return sizeHex(leHex(n), sz)
}

let leHex = (n: number): string => {
  let matches = (n + 2 ** 32).toString(16).match(/\B../g)
  if (matches) {
    return matches.reverse().join("")
  }
  return ""
}

let sizeHex = (x: string, n: number): string => {
  n = n * 2
  if (x.length == n) {
    return x
  }
  if (x.length > n) {
    return x.slice(0, n)
  }
  return x + "0".repeat(x.length - n)
}
