import { Service } from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { PublicClient, Transport, createClient, createPublicClient, custom, http, webSocket } from "viem";
import { CachingTransportService } from "./CachingTransportService";
import { ChainId, getSignedVAAWithRetry } from "@certusone/wormhole-sdk";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";



const MAINNET_GUARDIAN_RPC: string[] =  [
  "https://wormhole-v2-mainnet-api.certus.one",
  "https://wormhole-v2-mainnet-api.staking.fund",
  "https://wormhole-v2-mainnet-api.chainlayer.network",
  "https://wormhole.inotel.ro",
  "https://wormhole-v2-mainnet-api.mcf.rocks",
  "https://wormhole-v2-mainnet.01node.com",
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
