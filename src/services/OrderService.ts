import { Service } from "@tsed/di";
import { MultiRpcService } from "./RpcServices";
import { BadRequest } from "@tsed/exceptions";
import { OrderModel, OrderStatus } from "src/models";
import { Hex, decodeEventLog, encodeEventTopics, getAddress, toHex } from "viem";
import { TxnData } from "src/types";
import { RedisService } from "./RedisService";
import { RolodexService } from "./RolodexService";
import { porticoEventsAbi } from "src/web3";
import { parseTokenTransferPayload, parseVaa } from "@certusone/wormhole-sdk";
import { WormholeService } from "./WormholeService";
import { quoterAbi } from "src/web3/SwapRouter";

@Service()
export class OrderService {

  constructor(
    private readonly rpcService: MultiRpcService,
    private readonly redisService: RedisService,
    private readonly rolodexService: RolodexService,
    private readonly wormholeService: WormholeService,
  ) {
  }

  public async quoteTrade(chainId:number, startToken:Hex, endToken:Hex, amount: bigint, fee: number):Promise<bigint> {
    if(startToken==endToken) {
      return amount
    }
    const provider = this.rpcService.getProvider(chainId)
    const quoter = this.rolodexService.getQuoterV2(startToken, endToken, chainId)
    const result = await provider.readContract({
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      address: quoter,
      args: [
        [
          startToken,
          endToken,
          amount,
          fee,
          0n
        ]
      ],
    })
    return result[0]
  }
  private async getTxData(transactionHash:Hex, chainId: number):Promise<Partial<TxnData> | undefined> {
    const provider = this.rpcService.getProvider(chainId)
    const txData: Partial<TxnData> = {}
    try {
      const m = await provider.getTransaction({hash:transactionHash})
      txData.data =  m.input
      txData.to =  m.to || undefined
    } catch {
      return undefined
    }
    try {
      const r = await provider.getTransactionReceipt({hash:transactionHash})
      txData.transactionHash =  r.transactionHash
      txData.contractAddress =  r.contractAddress || undefined
      txData.logs = r.logs as any
      txData.status =  r.status
      txData.from =  r.from
      txData.blockNumber =  Number(r.blockNumber)
    } catch {
    }

    return txData
  }

  private async findFinishTransfer(sequence: string, wormholeChainId: number, emitterAddress: string,chainId: number) {
    //const provider = this.rpcService.getProvider(chainId)
    const tokenBridge = this.rolodexService.getTokenBridge(chainId)
    if(!tokenBridge) {
      throw new BadRequest("no token bridge on receiver chain")
    }

    try {
      const res = await fetch(`https://api.wormholescan.io/api/v1/global-tx/${wormholeChainId}/${emitterAddress}/${sequence}`)
      const resp = await res.json()
      console.log(resp)

      const txData = this.getTxData(resp.destinationTx.txHash, chainId)

      return txData
    } catch {
      return undefined
    }
  }


  public async getOrder(transactionHash:Hex, chainId: number): Promise<OrderModel> {
    const receipt = await this.getTxData(transactionHash, chainId)
    const id = `${transactionHash}_${chainId}`
    if(!receipt) {
      return {
        id,
        status: OrderStatus.INFLIGHT,
      }
    }
    const startingPorticoAddress = this.rolodexService.getPortico("todo", chainId)
    if(!startingPorticoAddress) {
      throw new BadRequest(`unsupported chain ${chainId}`)
    }
    const porticoSwapStartTopic = encodeEventTopics({
      abi: porticoEventsAbi,
      eventName: "PorticoSwapStart",
    })
    const startEvent = receipt.logs?.filter((x=>{
      return x.topics[0] === porticoSwapStartTopic[0]
    })).pop()

    const logPublishedEventTopic = encodeEventTopics({
      abi: porticoEventsAbi,
      eventName: "LogMessagePublished",
    })
    const logPublishedEvent = receipt.logs?.filter((x=>{
      return x.topics[0] === logPublishedEventTopic[0]
    })).pop()

    // if there is no "PorticoSwapStart" event, we return not found
    if(!startEvent || !logPublishedEvent) {
      return {
        id,
        status: OrderStatus.NOTFOUND,
        reason: `wrong portico. want ${startingPorticoAddress.toLowerCase()}, got ${receipt.to?.toLowerCase()}`
      }
    }
    if(receipt.status == "reverted") {
      return {
        id,
        status: OrderStatus.REVERTED,
        originTxnData: {
          hash: transactionHash,
          chainId: chainId,
          data: receipt,
        }
      }
    }



    const decodedStartLog = decodeEventLog({
      abi: porticoEventsAbi,
      eventName: "PorticoSwapStart",
      topics: startEvent.topics as any,
      data: startEvent.data,
    })
    // now grab the emitter
    const decodedLogPublish =  decodeEventLog({
      abi: porticoEventsAbi,
      eventName: "LogMessagePublished",
      topics: logPublishedEvent.topics as any,
      data: logPublishedEvent.data,
    })
    const originTxnData =  {
      hash: transactionHash,
      chainId: chainId,
      data: receipt,
      wormholeChainId: decodedStartLog.args.chainId,
    }
    const emitterAddress = decodedLogPublish.args.sender.replace("0x","00".repeat(12))
    const bridgeInfo = await this.wormholeService.getBridgeInfo(
      emitterAddress,
      decodedStartLog.args.chainId,
      decodedLogPublish.args.sequence.toString(10),
    )
    if (!bridgeInfo) {
      return {
        id,
        status: OrderStatus.PENDING,
        originTxnData,
      }
    }

    const parsedVaa = parseVaa(bridgeInfo.vaaBytes)
    const tokenTransferPayload = parseTokenTransferPayload(parsedVaa.payload)

    // TODO: look at the destination Portico to see if the receiving txn has been finished.
    // this is a getLogs filter to locate the transaction to then do a getTxData

    const metadata =  {
      wormholeOriginChain: decodedStartLog.args.chainId,
      sequence: decodedStartLog.args.sequence.toString(10),
      wormholeTargetChain:  tokenTransferPayload.toChain,
    }

    const bridgeStatus = {
      VAA: toHex(bridgeInfo.vaaBytes),
      target: getAddress(toHex(tokenTransferPayload.to).replace("0x"+"00".repeat(12), "0x")),
      targetChainId: this.rolodexService.getEvmChainId(tokenTransferPayload.toChain) || 0 ,
    }

    const destinationEvmChainId = this.rolodexService.getEvmChainId(tokenTransferPayload.toChain)
    if (!destinationEvmChainId) {
      return {
        id,
        status: OrderStatus.LEGGED,
        reason: "not a valid destination chain",
        bridgeStatus,
        metadata,
        originTxnData,

      }
    }

    // try to get the log on the corresponding chain
    const finishTransfer = await this.findFinishTransfer(
      metadata.sequence,
      decodedStartLog.args.chainId,
      decodedLogPublish.args.sender.replace("0x","00".repeat(12)),
      destinationEvmChainId,
    )

    if(!finishTransfer) {
      return {
        id,
        status: OrderStatus.WORKING,
        bridgeStatus,
        metadata,
        originTxnData,
      }
    }

    return {
      id,
      status: OrderStatus.CONFIRMED,
      receipientTxnData: finishTransfer,
      bridgeStatus,
      metadata,
      originTxnData,

    }

  }

}
