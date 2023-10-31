import { Service } from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { config } from "src/config";
import { ALL_CHAINS } from "src/config/cli";
import { PublicClient, Transport, createClient, createPublicClient, custom, http, webSocket } from "viem";
import { CachingTransportService } from "./CachingTransportService";


@Service()
export class MultiRpcService {
  providers: Map<number, PublicClient> = new Map();

  constructor(
    private readonly cachingTransportService: CachingTransportService,
  ) {
    ALL_CHAINS.forEach((n) => {
      this.addProvider(
        n.id,
        (config.options as any)[`${camelcase(n.network)}RpcUrl`],
      );
    });
  }

  getProvider(id: number):PublicClient {

    const ans = this.providers.get(id)
    if(ans) {
      return ans
    }
    throw new BadRequest(`chain id ${id} not supported`)
  }

  addProvider(id: number, url?: string) {
    const client = this.dialProvider(id, url)
    return this.providers.set(id, client);
  }

  private dialProvider(id: number, url?: string):PublicClient<any, any> {
    let transport = url && url.startsWith("ws") ? webSocket(url) : http(url)
    const bp = transport({
      chain: getChain(id),
      timeout: 3000,
      retryCount: 3,
      pollingInterval: 4000,
    })

    let cachingTransport = this.cachingTransportService.createCachingProvider(id, bp.request)

    return createPublicClient({
      chain: getChain(id),
      transport: cachingTransport,
    }) as PublicClient
  }
}

function camelcase(str: string) {
  return str.split('-').reduce((str, word) => {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Gets the chain object for the given chain id.
 * @param chainId - Chain id of the target EVM chain.
 * @returns Viem's chain object.
 */
function getChain(chainId: number) {
  for (const chain of Object.values(ALL_CHAINS)) {
    if (chain.id === chainId) {
      return chain;
    }
  }
  throw new Error(`Chain with id ${chainId} not found`);
}
