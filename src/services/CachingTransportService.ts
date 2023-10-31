import { Service} from "@tsed/di";
import { Class } from "estree";
import { RedisService } from "./RedisService";
import { EIP1193RequestFn, Transport, custom } from "viem";

interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}


@Service()
export class CachingTransportService {
  constructor(
    private readonly redisService: RedisService,
  ) {
  }

  createCachingProvider(id:number, fn:EIP1193RequestFn) {
    const self = this
    return custom({
      async request({method, params}:RequestArguments) {
        const shouldCache = self.shouldCacheCall(method, params)
        const cacheTable = `rpc_cache:${id}:${method}`
        const cacheKey = JSON.stringify(params)
        // see if this is possibly cached
        if(shouldCache) {
          try {
            const result = await self.redisService.client.hGet(cacheTable, cacheKey)
            if(result) {
              return JSON.parse(result)
            }
          } catch {
          }
          // cache miss, so just keep going
          // TODO: metrics here
        }
        const response = await fn({method, params})
        if(response && shouldCache) {
          await self.redisService.client.hSet(cacheTable, cacheKey, JSON.stringify(response))
        }
        return response
      }
    })
  }

  private shouldCacheCall(method:string, params:any) {
    switch(method){
      case "eth_getTransactionReceipt":
      case "eth_getTransactionByHash":
        return true
      case "eth_call":
        if(params && params.length && params.length > 1) {
          if(params[1] && params[1] != "latest" && params[1] != "pending") {
            return true
          }
        }
        return false
    }
    return false

  }
}
