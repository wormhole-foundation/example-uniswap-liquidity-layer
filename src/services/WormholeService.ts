import { Service } from "@tsed/di";
import { ChainId, getSignedVAAWithRetry } from "@certusone/wormhole-sdk";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";


const MAINNET_GUARDIAN_RPC: string[] =  [
    "https://api.wormholescan.io", // Explorer offers a guardian equivalent endpoint for fetching VAAs
    "https://wormhole-v2-mainnet-api.mcf.rocks",
    "https://wormhole-v2-mainnet-api.chainlayer.network",
    "https://wormhole-v2-mainnet-api.staking.fund",
]

@Service()
export class WormholeService {

  constructor(
  ) {

  }

  async getBridgeInfo(emitterAddress: string, wormholeChainId: number, sequence: string) {
    try {
      const ans = await getSignedVAAWithRetry(
        MAINNET_GUARDIAN_RPC,
        wormholeChainId as ChainId,
        emitterAddress,
        sequence,
        {
          transport: NodeHttpTransport(),
        },
        250,
        2
      )
      return ans
    }catch(e){
      console.log("bridge failed get vaa", e)
      return undefined
    }

  }

}
