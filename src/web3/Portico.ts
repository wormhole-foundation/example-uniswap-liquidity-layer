import { Address, Hex, encodeFunctionData, parseAbi } from "viem";

const tradeParameterAbi = parseAbi([
  `function start((bytes32,address,address,address,address,address,uint256,uint256,uint256,uint256)) returns (address,uint16,uint64)` as const,
])

export const porticoEventsAbi = parseAbi([
  `event PorticoSwapStart(uint64 indexed sequence, uint16 indexed chainId)`,
  `event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)`,
  `event TransferRedeemed(uint16 indexed emitterChainId, bytes32 indexed emitterAddress, uint64 indexed sequence)`,
])

export const encodeStartData = (
flagSet: Hex,
startTokenAddress: Address,
canonTokenAddress: Address,
finalTokenAddress: Address,
recipientAddress: Address,
destinationPorticoAddress: Address,
amountSpecified: bigint,
minAmountStart: bigint,
minAmountFinish: bigint,
relayerFee: bigint,
) => {
  return encodeFunctionData({
    abi: tradeParameterAbi,
    functionName: "start",
    args: [[
      flagSet,
      startTokenAddress,
      canonTokenAddress,
      finalTokenAddress,
      recipientAddress,
      destinationPorticoAddress,
      amountSpecified,
      minAmountStart,
      minAmountFinish,
      relayerFee,
    ]]})
}


export const encodeFlagSet = (
  recipientChain: number,
  bridgeNonce: number,
  feeTierStart: number,
  feeTierFinish: number,
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
    + "0".repeat(19*2) // 16-30, so 15*2 zeros
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
