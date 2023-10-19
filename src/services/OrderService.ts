import { Service} from "@tsed/di";
import { MultiRpcService } from "./RpcServices";
import { BadRequest } from "@tsed/exceptions";
import { OrderStatus } from "src/models";
import { Hex} from "viem";
import { TxnData } from "src/types";
import { RedisService } from "./RedisService";

@Service()
export class OrderService {

  constructor(
    private readonly rpcService: MultiRpcService,
    private readonly redisService: RedisService,
  ) {
  }
  private async getTxData(transactionHash:Hex, chainId: number):Promise<TxnData | undefined> {
    const provider = this.rpcService.getProvider(chainId)
    if(!provider) {
      throw new BadRequest("invalid chain id")
    }
    try {
      const m = await provider.getTransaction({hash:transactionHash})
      const r = await provider.getTransactionReceipt({hash:transactionHash})
      return  {
        data: m.input,
        transactionHash: r.transactionHash,
        contractAddress: r.contractAddress || undefined,
        logs: r.logs,
        status: r.status,
        to: r.to || undefined,
        from: r.from,
        blockNumber: Number(r.blockNumber),
      }
    } catch {
      // couldn't find the receipt, which means should just return undefined
      return undefined
    }
  }

  public async getOrder(transactionHash:Hex, chainId: number) {
    const receipt = await this.getTxData(transactionHash, chainId)
    if(!receipt) {
      return {
        id: `${transactionHash}_${chainId}`,
        status: OrderStatus.NOTFOUND,
      }
    }
    if(receipt.status == "reverted") {
      return {
        id: `${transactionHash}_${chainId}`,
        status: OrderStatus.REVERTED,
        receipt: receipt,
      }
    }

    // TODO: look at the bridge to see when the bridge is done bridging
    // this is just an eth_call to the contract

    // TODO: look at the destination Portico to see if the receiving txn has been finished.
    // this is a getLogs filter to locate the transaction to then do a getTxData
    return {
      id: `${transactionHash}_${chainId}`,
      status: OrderStatus.INFLIGHT,
      transactionReceipt: receipt,
    }
  }

}
