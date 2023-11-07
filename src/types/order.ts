import {  Any, Default, Example, Integer, Optional, Pattern, Property, Required } from "@tsed/schema";
import { Address, Hex } from "viem";

export class CreateOrderRequest {

  @Integer()
  @Required()
  @Example(1)
  startingChainId: number

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Example("0xd8369c2eda18dd6518eabb1f85bd60606deb39ec")
  @Required()
  startingToken: Address

  @Required()
  @Example('10000000000')
  startingTokenAmount: string

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Example("0x4200000000000000000000000000000000000006")
  @Required()
  destinationToken: Address

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  destinationAddress: Address

  @Integer()
  @Required()
  @Example(10)
  destinationChainId: number

  @Integer()
  @Required()
  @Example(1)
  bridgeNonce: number

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
  @Default(10)
  slippageStart: number = 10

  @Integer()
  @Default(10)
  slippageEnd: number = 10

  @Property()
  @Default(false)
  shouldWrapNative?: boolean = false

  @Property()
  @Default(false)
  shouldUnwrapNative? : boolean = false


  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  porticoAddress? : Address
}

export class CreateOrderResponse {
  @Pattern(/0x[a-f0-9]*/)
  @Any("string")
  @Required()
  transactionData: Hex

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  transactionTarget: Address

  @Pattern(/0x[a-f0-9]{0,64}/)
  @Any("string")
  @Required()
  transactionValue: Hex
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
