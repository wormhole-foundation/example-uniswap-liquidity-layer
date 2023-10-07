import {DateTime, Enum, Format, Integer, Property} from "@tsed/schema";
import {Entity, IdColumn} from "@tsed/objection";
import { Model } from "objection";

export enum OrderStatus {
  INFLIGHT = "inflight",
  PENDING = "pending",
  WORKING = "working",
  CANCELLED = "cancelled",
  LEGGED = "legged",
  CONFIRMED = "confirmed",
}

@Entity("orders")
export class OrderModel extends Model{
  @Format("uuid")
  @IdColumn()
  id: string;

  @Enum(OrderStatus)
  status: OrderStatus

  @Integer()
  origin: number

  @Integer()
  destination: number

  @DateTime()
  created: Date

}
