import {  Any, Default, Example, Integer, Optional, Pattern, Property, Required } from "@tsed/schema";
import { Address, Hex } from "viem";

export class CreateOrderRequest {

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  startingToken: Address

  @Required()
  @Example(1.0)
  startingTokenHumanAmount: number

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  destinationToken: Address

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  destinationAddress: Address

  @Integer()
  @Required()
  @Example(1)
  destinationChainId: number

  @Integer()
  @Default(10)
  slippage: number = 10

  @Property()
  @Default(false)
  shouldWrapNative?: boolean = false

  @Property()
  @Default(false)
  shouldUnwrapNative? : boolean = false

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
