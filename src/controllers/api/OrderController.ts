import {Controller} from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { BodyParams, PathParams } from "@tsed/platform-params";
import {Get, Pattern, Post, Returns} from "@tsed/schema";
import { OrderModel, OrderStatus } from "src/models";
import { OrderService, RolodexService } from "src/services";
import { CreateOrderRequest, CreateOrderResponse, CreateQuoteRequest} from "src/types";
import { encodeFlagSet, encodeStartData } from "src/web3";
import { Address, Hex, checksumAddress, getAddress, isAddress, toHex } from "viem";

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
    return this.orderService.getOrder(transactionHash as Hex, chainId)
  }

  @Post("/create")
  @Returns(200, CreateOrderResponse)
  async create(@BodyParams() req: CreateOrderRequest) {
    const canonToken = this.rolodexService.getCanonTokenForToken(req.startingChainId, req.startingToken)

    const wormholeDestinationChainId = this.rolodexService.getWormholeChainId(req.destinationChainId)

    let destinationPorticoAddress = this.rolodexService.getPortico(req.destinationChainId)
    if(req.destinationPorticoAddress && req.destinationPorticoAddress.length == 42) {
      destinationPorticoAddress = req.destinationPorticoAddress
    }
    const startDataParams: Parameters<typeof encodeStartData> = [
     encodeFlagSet(
        wormholeDestinationChainId,
        req.bridgeNonce || new Date().valueOf(),
        req.feeTierStart,
        req.feeTierEnd,
        req.shouldWrapNative ||  false,
        req.shouldUnwrapNative || false,
      ),
      getAddress(req.startingToken),
      getAddress(canonToken),
      getAddress(req.destinationToken),
      getAddress(req.destinationAddress),
      getAddress(destinationPorticoAddress),
      BigInt(req.startingTokenAmount),
      BigInt(req.minAmountStart),
      BigInt(req.minAmountEnd),
      BigInt(req.relayerFee),
    ]

    let transactionData = encodeStartData(
      ...startDataParams
    )
    let porticoAddress = this.rolodexService.getPortico(req.startingChainId)
    if(req.porticoAddress && req.porticoAddress.length == 42) {
      porticoAddress = req.porticoAddress
    }
    // quoting logic

    let estimatedAmountOut = 0n

    try {
      // first try to quote from the start asset to the canon asset
      const firstQuote = await this.orderService.quoteTrade(req.startingChainId, getAddress(req.startingToken), getAddress(canonToken), BigInt(req.startingTokenAmount), req.feeTierStart)
      // now find the canon asset on the destination chain
      const destinationCanonAsset = this.rolodexService.getCanonTokenForToken(req.destinationChainId, req.destinationToken)
      const secondQuote = await this.orderService.quoteTrade(req.destinationChainId, getAddress(destinationCanonAsset), getAddress(req.destinationToken), firstQuote ,req.feeTierEnd)
      estimatedAmountOut = secondQuote
    }catch {
      estimatedAmountOut = 0n
    }

    return {
      transactionData,
      transactionTarget: getAddress(porticoAddress),
      transactionValue: req.shouldWrapNative ? toHex(BigInt(req.startingTokenAmount)) : undefined,
      startParameters: startDataParams.map(x=>x.toString()),
      estimatedAmountOut: estimatedAmountOut.toString(10),
    }
  }

}
