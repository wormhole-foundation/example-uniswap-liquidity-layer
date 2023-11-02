import { Service} from "@tsed/di";
import { Address } from "cluster";
import { MultiRpcService } from "./RpcServices";
import { RedisService } from "./RedisService";
import { arbitrum, base, mainnet, optimism, polygon } from "viem/chains";

interface lut {[key:string]:{[key:string]:string}}

const withFlip = (x:lut):lut => {
  for(const [k, v] of Object.entries(x)) {
    for(const [sk,sv] of Object.entries(v)) {
      x[k][sv] = sk
    }
  }
  return x
}

const xAssetTable = withFlip({
  [mainnet.id]: {
    "0x8B5653Ae095529155462eDa8CF664eD96773F557": "eth",
  },
  [arbitrum.id]: {
    "0xd8369c2eda18dd6518eabb1f85bd60606deb39ec": "eth",
  },
  [polygon.id] : {
    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": "eth",
  },
  [base.id]: {
    "0x71b35ECb35104773537f849FBC353F81303A5860": "eth",
  },
  [optimism.id]: {
    "0xb47bC3ed6D70F04fe759b2529c9bc7377889678f": "eth",
  },
})

const nativeAssetTable = withFlip({
  [mainnet.id]: {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2":"eth"
  },
  [arbitrum.id]: {
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "eth",
  },
  [polygon.id] : {
    "0x11cd37bb86f65419713f30673a480ea33c826872": "eth",
  },
  [base.id]: {
    "0x4200000000000000000000000000000000000006": "eth",
  },
  [optimism.id]: {
    "0x4200000000000000000000000000000000000006": "eth",
  },
})




@Service()
export class RolodexService {
  constructor(
    private readonly rpcService: MultiRpcService,
    private readonly redisService: RedisService,
  ) {
  }
  getPortico(chainId: number) {
    return {
      [mainnet.id]: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      [arbitrum.id]: "",
      [polygon.id] : "0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85",
      [base.id]: "",
      [optimism.id]: "",
    }[chainId]
  }
  getXTokenForToken(chainId: number, token:string) {
    const ct = xAssetTable[chainId]
    if(!ct) {
      return undefined
    }
    // if is an x token, just return it
    if(ct[token]) {
      return token
    }
    const nt = nativeAssetTable[chainId]
    if(!nt) {
      return undefined
    }
    return ct[nt[token]]
  }
  getWeth(chainId: number) {
    return nativeAssetTable[chainId]["eth"];
  }
}
