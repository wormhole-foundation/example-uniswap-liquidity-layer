import {  Any, AnyOf, Default, Example, Integer, Optional, Pattern, Property, Required } from "@tsed/schema";
import { encodeStartData } from "src/web3";
import { Address, Hex } from "viem";


export class CreateOrderRequest {

  @Integer()
  @Required()
  @Example(137)
  startingChainId: number

  @Any("string")
  @Example("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619")
  @Required()
  startingToken: string

  @Required()
  @Example('10000000000')
  startingTokenAmount: string

  @Any("string")
  @Example("0x4200000000000000000000000000000000000006")
  @Required()
  destinationToken: string

  @Pattern(/0x[a-fA-F0-9]{40}/)
  @Any("string")
  @Required()
  destinationAddress: Address

  @Integer()
  @Required()
  @Example(10)
  destinationChainId: number

  @Required()
  @Example('0')
  relayerFee: string

  @Integer()
  @Default(100)
  feeTierStart: number = 100

  @Integer()
  @Default(100)
  feeTierEnd: number = 100

  @Integer()
  @Default("0")
  minAmountStart: string = "0"

  @Integer()
  @Default("0")
  minAmountEnd: string = "0"

  @Integer()
  @Example(1)
  bridgeNonce?: number = (new Date().valueOf())

  @Property()
  @Default(false)
  shouldWrapNative?: boolean = false

  @Property()
  @Default(false)
  shouldUnwrapNative? : boolean = false


  @Any("string")
  @Example("")
  porticoAddress? : Address = undefined

  @Any("string")
  @Example("")
  destinationPorticoAddress? : Address = undefined
}



export class CreateOrderResponse {
  @Pattern(/0x[a-fA-F0-9]*/)
  @Any("string")
  @Required()
  transactionData: Hex

  @Pattern(/0x[a-fA-F0-9]{40}/)
  @Any("string")
  @Required()
  transactionTarget: Address

  @Pattern(/0x[a-fA-F0-9]{0,64}/)
  @Any("string")
  @Required()
  transactionValue: Hex

  @Required()
  startParameters: Array<string>

  @Required()
  estimatedAmountOut: string
}

export class GetOrderRequest {

  @Pattern(/0x[a-f0-9]{64}/)
  @Any("string")
  @Required()
  transactionHash: string

  @Integer()
  @Required()
  @Example(1)
  chainId: number
}
