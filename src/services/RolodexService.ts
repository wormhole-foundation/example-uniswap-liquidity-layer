import { Service} from "@tsed/di";
import { MultiRpcService } from "./RpcServices";
import { RedisService } from "./RedisService";
import { arbitrum, base, mainnet, optimism, polygon } from "viem/chains";
import { Address } from "viem";

interface lut {[key:string]:{[key:string]:string}}

const withFlip = (x:lut):lut => {
  for(const [k, v] of Object.entries(x)) {
    for(const [sk,sv] of Object.entries(v)) {
      x[k][sv] = sk
    }
  }
  return x
}

const canonAssetTable = withFlip({
  [mainnet.id]: {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2":"eth"
  },
  [arbitrum.id]: {
    "0xd8369c2eda18dd6518eabb1f85bd60606deb39ec": "eth",
  },
  [polygon.id] : {
    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": "eth",
  },
  [base.id]: {
    "0x11CD37bb86F65419713f30673A480EA33c826872": "eth",
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
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": "eth",
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
  getPortico(chainId: number): Address | undefined {
    return {
      [mainnet.id]: "",
      [arbitrum.id]: "",
      [polygon.id] : "0x87aC3f21A5335286cCC1785f66d39847Be6Bfed9",
      [base.id]: "",
      [optimism.id]: "0xB8177A860A3c9A4c02bcDa00799c9548ec0181c8",
    }[chainId] as (Address | undefined)
  }
  getCanonTokenForTokenName(chainId: number, token:string) {
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if(!(ct && nt)) {
      return undefined
    }
    return ct[token]
  }
  getNativeTokenForTokenName(chainId: number, token:string) {
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if(!(ct && nt)) {
      return undefined
    }
    return nt[token]
  }
  getCanonTokenForToken(chainId: number, token:string) {
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if(!(ct && nt)) {
      return undefined
    }
    // if the token is the canon token, then just return it, no need to swap
    if(ct[token]) {
      return token
    }
    // get the name of the token we would like to find the canon token for
    // for instance, if the input is native polygon weth, it will return "eth"
    const tokenName = nt[token]
    // now get the canon asset on the chain for that name.
    return ct[tokenName]
  }
  getWeth(chainId: number) {
    return nativeAssetTable[chainId]["eth"];
  }
}
