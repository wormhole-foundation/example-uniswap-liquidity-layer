import {Any, DateTime, Enum, Example, Format, Integer, Optional, Pattern, Property, Required, string} from "@tsed/schema";
import { TxnData} from "src/types";
import { Hex } from "viem";

export enum OrderStatus {
  NOTFOUND = "notfound", // txn is not found in mempool
  INFLIGHT = "inflight", // txn is not confirmed
  PENDING = "pending", // txn confirmed, bridge not done
  WORKING = "working", // bridge is done, waiting for vaa txn
  CONFIRMED = "confirmed", // txn on receiving chain confirmed
  REVERTED = "reverted", // if the first txn reverted
  LEGGED = "legged", // if the first txn doesnt revert but the second reverts/doesn't ever happen
  CANCELLED = "cancelled", // unknown how this can happen yet
}


export class OrderMetadata {
  @Integer()
  wormholeOriginChain?: number;

  @Required()
  sequence: string;

  @Integer()
  wormholeTargetChain?: number;
}

export class BridgeStatus {
  @Pattern(/0x[a-f0-9]*/)
  @Any("string")
  @Optional()
  VAA?: Hex

  @Pattern(/0x[a-f0-9]{40}/)
  @Any("string")
  @Optional()
  target: Hex

  @Required()
  targetChainId: number
}


export class OriginTxn {
  @Required()
  hash: string;

  @Integer()
  chainId: number;

  @Integer()
  wormholeChainId?: number;

  @Required()
  data: Partial<TxnData>
}

export class OrderModel {
  @Pattern(/0x[a-f0-9]{64}_[0-9]{1,5}/)
  @Example("0x0000000000000000000000000000000000000000000000000000000000000000_1")
  @Required()
  id: string;

  @Enum(OrderStatus)
  @Required()
  status: OrderStatus

  @Optional()
  metadata?: OrderMetadata

  @Property()
  originTxnData?: OriginTxn

  @Property()
  bridgeStatus?: BridgeStatus

  @Property()
  receipientTxnData?: Partial<TxnData>

  @Optional()
  reason?: string


}
