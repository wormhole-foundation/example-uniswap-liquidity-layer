import {DateTime, Enum, Example, Format, Integer, Pattern, Property, Required} from "@tsed/schema";
import { TxnData} from "src/types";

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

export class OrderModel {
  @Pattern(/0x[a-f0-9]{64}_[0-9]{1,5}/)
  @Example("0x0000000000000000000000000000000000000000000000000000000000000000_1")
  @Required()
  id: string;

  @Enum(OrderStatus)
  @Required()
  status: OrderStatus

  @Property()
  originTxnData?: TxnData

  @Property()
  bridgeStatus?: any

  @Property()
  receipientTxnData?: TxnData
}

