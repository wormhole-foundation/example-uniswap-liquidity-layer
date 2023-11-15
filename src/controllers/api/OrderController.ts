import {Controller} from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { BodyParams, PathParams } from "@tsed/platform-params";
import {Get, Pattern, Post, Returns} from "@tsed/schema";
import { OrderModel, OrderStatus } from "src/models";
import { OrderService, RolodexService } from "src/services";
import { CreateOrderRequest, CreateOrderResponse, CreateQuoteRequest} from "src/types";
import { encodeFlagSet, encodeStartData } from "src/web3";
import { Address, isAddress, toHex } from "viem";

@Controller("/order")
export class OrderController {

  constructor(
    private readonly rolodexService: RolodexService,
    private readonly orderService: OrderService,
  ) {
  }

  @Get("/status/:chainId/:transactionHash")
  @Returns(200, OrderModel)
  status(
    @PathParams("chainId") chainId: number, /* the evm chain id*/
    @PathParams("transactionHash") @Pattern(/0x[a-f0-9]{64}/) transactionHash: string
  ) {


    const orderId = `${chainId}_${transactionHash}`
    const orderStatus = OrderStatus.NOTFOUND

    return {
      id: orderId,
      status: orderStatus,
    }

  }

  @Post("/create")
  @Returns(200, CreateOrderResponse)
  create(@BodyParams() req: CreateOrderRequest) {
    const canonToken = this.rolodexService.getCanonTokenForToken(req.startingChainId, req.destinationToken)
    if(!canonToken) {
      throw new BadRequest("no route found")
    }

    let destinationPorticoAddress = this.rolodexService.getPortico(req.destinationChainId)
    if(req.destinationPorticoAddress && req.destinationPorticoAddress.length == 42) {
      destinationPorticoAddress = req.destinationPorticoAddress
    }
    if(!destinationPorticoAddress) {
      throw new BadRequest("no destination portico found for chain")
    }

    const startDataParams: Parameters<typeof encodeStartData> = [
     encodeFlagSet(
        req.destinationChainId,
        req.bridgeNonce,
        req.feeTierStart,
        req.feeTierEnd,
        req.slippageStart,
        req.slippageEnd,
        req.shouldWrapNative ||  false,
        req.shouldUnwrapNative || false,
      ),
      req.startingToken,
      canonToken as Address,
      req.destinationToken,
      req.destinationAddress,
      destinationPorticoAddress,
      BigInt(req.startingTokenAmount),
      BigInt(req.relayerFee),
    ]

    let transactionData = encodeStartData(
      ...startDataParams
    )
    let porticoAddress = this.rolodexService.getPortico(req.startingChainId)
    if(req.porticoAddress && req.porticoAddress.length == 42) {
      porticoAddress = req.porticoAddress
    }
    if(!porticoAddress) {
      throw new BadRequest("no portico found for chain")
    }

    return {
      transactionData,
      transactionTarget: porticoAddress,
      transactionValue: req.shouldWrapNative ? toHex(BigInt(req.startingTokenAmount)) : undefined,
      startParameters: startDataParams.map(x=>x.toString()),
    }
  }

}
