import { Service} from "@tsed/di";
import { MultiRpcService } from "./RpcServices";
import { BadRequest } from "@tsed/exceptions";
import { OrderModel, OrderStatus } from "src/models";
import { Hex, decodeEventLog, encodeEventTopics, toHex} from "viem";
import { TxnData } from "src/types";
import { RedisService } from "./RedisService";
import { RolodexService } from "./RolodexService";
import { porticoEventsAbi } from "src/web3";
import { getEmitterAddressEth, parseTokenTransferPayload, parseTransferPayload, parseVaa } from "@certusone/wormhole-sdk";
import { WormholeService } from "./WormholeService";

@Service()
export class OrderService {

  constructor(
    private readonly rpcService: MultiRpcService,
    private readonly redisService: RedisService,
    private readonly rolodexService: RolodexService,
    private readonly wormholeService: WormholeService,
  ) {
  }
  private async getTxData(transactionHash:Hex, chainId: number):Promise<Partial<TxnData> | undefined> {
    const provider = this.rpcService.getProvider(chainId)
    if(!provider) {
      throw new BadRequest("invalid chain id")
    }

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

  public async getOrder(transactionHash:Hex, chainId: number): Promise<OrderModel> {
    const receipt = await this.getTxData(transactionHash, chainId)
    if(!receipt) {
      return {
        id: `${transactionHash}_${chainId}`,
        status: OrderStatus.INFLIGHT,
      }
    }
    const startingPorticoAddress = this.rolodexService.getPortico(chainId)
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
        id: `${transactionHash}_${chainId}`,
        status: OrderStatus.NOTFOUND,
        reason: `wrong portico. want ${startingPorticoAddress.toLowerCase()}, got ${receipt.to?.toLowerCase()}`
      }
    }
    if(receipt.status == "reverted") {
      return {
        id: `${transactionHash}_${chainId}`,
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


    console.log(decodedLogPublish)
    const bridgeInfo = await this.wormholeService.getBridgeInfo(
      decodedLogPublish.args.sender,
      decodedStartLog.args.chainId,
      decodedLogPublish.args.sequence.toString(10),
    )
    if (!bridgeInfo) {
      return {
        id: `${transactionHash}_${chainId}`,
        status: OrderStatus.PENDING,
        originTxnData: {
          hash: transactionHash,
          chainId: chainId,
          data: receipt,
          wormholeChainId: decodedStartLog.args.chainId,
        },
        metadata: {
          wormholeOriginChain: decodedStartLog.args.chainId,
          sequence: decodedStartLog.args.sequence.toString(10),
        }
      }
    }

    const parsedVaa = parseVaa(bridgeInfo.vaaBytes)
    const tokenTransferPayload = parseTokenTransferPayload(parsedVaa.payload)

    // TODO: look at the destination Portico to see if the receiving txn has been finished.
    // this is a getLogs filter to locate the transaction to then do a getTxData
    return {
      id: `${transactionHash}_${chainId}`,
      status: OrderStatus.WORKING,
      originTxnData: {
        hash: transactionHash,
        chainId: chainId,
        data: receipt,
        wormholeChainId: decodedStartLog.args.chainId,
      },
      metadata: {
        wormholeOriginChain: decodedStartLog.args.chainId,
        sequence: decodedStartLog.args.sequence.toString(10),
        wormholeTargetChain:  tokenTransferPayload.toChain,
      },
      bridgeStatus: {
        VAA: toHex(bridgeInfo.vaaBytes),
        target: toHex(tokenTransferPayload.to).replace("0x"+"00".repeat(12), "0x") as Hex,
      }

    }

  }

}
