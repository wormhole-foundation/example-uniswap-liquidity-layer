import { Service} from "@tsed/di";
import { MultiRpcService } from "./RpcServices";
import { RedisService } from "./RedisService";
import { arbitrum, base, bsc, mainnet, optimism, polygon } from "viem/chains";
import { Address, getAddress } from "viem";
import { v5 } from "uuid";
import { BadRequest } from "@tsed/exceptions";

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
    "0x11CD37bb86F65419713f30673A480EA33c826872": "eth",
  },
  [base.id]: {
    "0x71b35ecb35104773537f849fbc353f81303a5860": "eth",
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

  getQuoterV2(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [arbitrum.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [polygon.id] : "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [optimism.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [base.id]: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    //  [bsc.id]: "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
    }[chainId]
    if(!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getSwapRouter(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [arbitrum.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [polygon.id] : "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [base.id]: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      [optimism.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    //  [bsc.id]: "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
    }[chainId]
    if(!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }
  getPortico(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x0fe9a1cd02B6633A2c2084Ff87E3Ee75D3e2081d",
      [arbitrum.id]: "0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889",
      [polygon.id] : "0x69F3d75Fa1eaA2a46005D566Ec784FE9059bb04B",
      [base.id]: "0xF352DC165783538A26e38A536e76DceF227d90F2",
      [optimism.id]: "0x7558Bc5d000bD1a7Fd68E23d5d6C9220c987C228",
    }[chainId]
    if(!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getTokenBridge(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
      [arbitrum.id]: "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c",
      [polygon.id] : "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE",
      [base.id]: "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627",
      [optimism.id]: "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b",
    }[chainId]
    if(!ans) {
      throw new BadRequest(`chain ${chainId} not supported`)
    }
    return getAddress(ans)
  }

  getWormholeChainId(chainId: number): number {
    const ans = {
      [mainnet.id]: 2,
      [arbitrum.id]: 23,
      [polygon.id] : 5,
      [base.id]: 30,
      [optimism.id]: 24,
    }[chainId]
    if(!ans)  {
      throw new BadRequest(`chain ${chainId} not supported`)
    }
    return ans
  }
  getEvmChainId(wormholeChainId: number): number{
    const ans = {
      [2]: mainnet.id,
      [23]: arbitrum.id,
      [5]: polygon.id,
      [30]:base.id,
      [24]: optimism.id,
    }[wormholeChainId] as (number | undefined)
    if(!ans) {
      throw new BadRequest(`no support for wormhole chain ${wormholeChainId}`)
    }
    return ans
  }
  getCanonTokenForTokenName(chainId: number, token:string) {
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if(!(ct && nt)) {
      throw new BadRequest(`no support for chain ${chainId}`)
    }
    const ans = ct[token]
    if(!ans) {
      throw new BadRequest(`no canon token for ${token} on ${chainId}`)
    }
    return ans
  }
  getNativeTokenForTokenName(chainId: number, token:string) {
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if(!(ct && nt)) {
      throw new BadRequest(`no support for chain ${chainId}`)
    }
    const ans = nt[token]
    if(!ans) {
      throw new BadRequest(`no native token for ${token} on ${chainId}`)
    }
    return  ans
  }
  getCanonTokenForToken(chainId: number, token:string) {
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if(!(ct && nt)) {
      throw new BadRequest(`no support for chain ${chainId}`)
    }
    // if the token is the canon token, then just return it, no need to swap
    if(ct[token]) {
      return token
    }
    // get the name of the token we would like to find the canon token for
    // for instance, if the input is native polygon weth, it will return "eth"
    const tokenName = nt[token]
    // now get the canon asset on the chain for that name.
    const ans = ct[tokenName]
    if(!ans) {
      throw new BadRequest(`no canon token for ${token} on ${chainId}`)
    }
    return ans
  }
  getWeth(chainId: number) {
    const ans = nativeAssetTable[chainId]["eth"];
    if(!ans) {
      throw new BadRequest(`no weth on ${chainId}`)
    }
    return ans
  }
}
