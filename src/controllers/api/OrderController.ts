import {Controller} from "@tsed/di";
import { BodyParams, PathParams } from "@tsed/platform-params";
import {Get, Pattern, Post, Returns} from "@tsed/schema";
import { OrderModel } from "src/models";
import { CreateOrderRequest, CreateOrderResponse} from "src/types";

@Controller("/order")
export class OrderController {
  @Get("/status/:chainId/:transactionHash")
  @Returns(200, OrderModel)
  status(
    @PathParams("chainId") chainId: number,
    @PathParams("transactionHash") @Pattern(/0x[a-f0-9]{64}/) transactionHash: string
  ) {
  }

  @Post("/create")
  @Returns(200, CreateOrderResponse)
  create(@BodyParams() req: CreateOrderRequest) {
    return {
    }
  }
}
