import { Any, Enum, Integer, Pattern, Property, Required } from "@tsed/schema"
import { Address, Hash, Hex } from "viem"

export class Log {
  @Pattern(/0x[a-f0-9]*/)
  @Any("string")
  @Required()
  data: Hex

  @Property()
  topics: [string, ...string[]]

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  address: Address
}


export class TxnData{
  @Pattern(/0x[a-f0-9]{64}/)
  @Any("string")
  @Required()
  transactionHash: Hash

  @Enum(["success","reverted"])
  @Required()
  status: string

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  to?: Address

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Required()
  from: Address

  @Pattern(/0x[a-f0-9]*/)
  @Any("string")
  @Required()
  data: Hex

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  contractAddress?: Address

  @Integer()
  @Required()
  blockNumber: number

  @Property()
  @Required()
  logs: Log[]
}
