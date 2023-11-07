import {Controller} from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { BodyParams, PathParams } from "@tsed/platform-params";
import {Get, Pattern, Post, Returns} from "@tsed/schema";
import { OrderModel } from "src/models";
import { RolodexService } from "src/services";
import { CreateOrderRequest, CreateOrderResponse} from "src/types";
import { encodeFlagSet, encodeStartData } from "src/web3";
import { Address, toHex } from "viem";

@Controller("/order")
export class OrderController {

  constructor(
    private readonly rolodexService: RolodexService,
  ) {
  }

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
    const canonToken = this.rolodexService.getCanonTokenForToken(req.startingChainId, req.startingToken)
    if(!canonToken) {
      throw new BadRequest("no route found")
    }
    let transactionData = encodeStartData(
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
      BigInt(req.startingTokenAmount),
      BigInt(req.relayerFee),
    )
    let porticoAddress = this.rolodexService.getPortico(req.startingChainId)
    if(req.porticoAddress) {
      porticoAddress = req.porticoAddress
    }
    if(!porticoAddress) {
      throw new BadRequest("no portico found for chain")
    }
    return {
      transactionData,
      transactionTarget: req.porticoAddress,
      transactionValue: req.shouldWrapNative ? toHex(BigInt(req.startingTokenAmount)) : undefined,
    }
  }
}
