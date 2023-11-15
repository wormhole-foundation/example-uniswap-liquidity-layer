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

  @Integer()
  wormholeTargetChain?: number;
}

export class BridgeStatus {
  @Required()
  hash: string;

  @Required()
  id: string;

  @Integer()
  sigsRequired: number;

  @Integer()
  sigsObtained: number;

  @Pattern(/0x[a-f0-9]*/)
  @Any("string")
  @Optional()
  VAA?: Hex
}


export class OriginTxn {
  @Required()
  hash: string;

  @Integer()
  chainId: number;

  @Integer()
  wormholeChainId: number;

  @Required()
  data: TxnData
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
  receipientTxnData?: TxnData


}
