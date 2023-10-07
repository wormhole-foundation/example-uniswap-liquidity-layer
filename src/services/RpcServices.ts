import { Service } from "@tsed/di";
import { config } from "src/config";
import { ALL_CHAINS } from "src/config/cli";
import { PublicClient, createPublicClient, http, webSocket } from "viem";


@Service()
export class MultiRpcService {
  providers: Map<number, PublicClient> = new Map();

  constructor(
  ) {
    ALL_CHAINS.forEach((n) => {
      this.addProvider(
        n.id,
        (config.options as any)[`${camelcase(n.network)}RpcUrl`],
      );
    });
  }

  addProvider(id: number, url?: string) {
    const client = this.dialProvider(id, url)
    return this.providers.set(id, client);
  }

  private dialProvider(id: number, url?: string):PublicClient<any, any> {
    if(url && url.startsWith("ws")) {
      return createPublicClient({
        chain: getChain(id),
        transport: webSocket(url),
      }) as PublicClient
    } else {
      return createPublicClient({
        chain: getChain(id),
        transport: http(url),
      }) as PublicClient
    }
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
