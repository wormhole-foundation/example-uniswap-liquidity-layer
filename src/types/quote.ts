import {  Any, Default, Example, Integer, Optional, Pattern, Property, Required } from "@tsed/schema";

export class CreateQuoteRequest {

  @Required()
  @Example('10000000000')
  startingTokenAmount: string

  @Integer()
  @Required()
  @Example(1)
  startingChainId: number

  @Integer()
  @Required()
  @Example(10)
  destinationChainId: number

  @Integer()
  @Required()
  @Example(1)
  bridgeNonce: number

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

}

