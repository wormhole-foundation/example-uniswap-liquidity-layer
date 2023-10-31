import { Service} from "@tsed/di";
import { Address } from "cluster";
import { MultiRpcService } from "./RpcServices";
import { RedisService } from "./RedisService";
import { arbitrum, base, optimism, polygon } from "viem/chains";

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
  getPoolForSwap(chainId: number, from:Address, to:Address){
    const key = [from,to].sort().join("_")
    return
  }
  getBridge(chainId: number) {
    return {
      [arbitrum.id]: "",
      [polygon.id] : "",
      [base.id]: "",
      [optimism.id]: "",
    }[chainId]
  }
  getPortico(chainId: number) {
    return {
      [arbitrum.id]: "",
      [polygon.id] : "",
      [base.id]: "",
      [optimism.id]: "",
    }[chainId]
  }
  getWeth(chainId: number) {
    return {
      [arbitrum.id]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      [base.id]: "0x4200000000000000000000000000000000000006",
      [optimism.id]: "0x4200000000000000000000000000000000000006",
      [polygon.id] : "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    }[chainId]
  }
}
