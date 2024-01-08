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
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2":"eth",
    "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0":"wsteth"
  },
  [arbitrum.id]: {
    "0xd8369c2eda18dd6518eabb1f85bd60606deb39ec": "eth",
    "0xf2717122Dfdbe988ae811E7eFB157aAa07Ff9D0F":"wsteth",
  },
  [polygon.id] : {
    "0x11CD37bb86F65419713f30673A480EA33c826872": "eth",
    "0xe082a7fc696de18172ad08d956569ee80bc37f06": "wsteth",
  },
  [base.id]: {
    "0x71b35ecb35104773537f849fbc353f81303a5860": "eth",
    "0xEd4e2FD35161c3c0e33cA187fce64C70d44Ce32b": "wsteth"
  },
  [optimism.id]: {
    "0xb47bC3ed6D70F04fe759b2529c9bc7377889678f": "eth",
    "0x855CFcEEe998c8ca34F9c914F584AbF72dC88B87": "wsteth",
  },
  [bsc.id]: {
    "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA": "eth",
    "0xad80e1a9b5824234afa9de1f3bbdb8a994796169": "wsteth",
  },
})

const nativeAssetTable = withFlip({
  [mainnet.id]: {
    "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0": "wsteth",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2":"eth"
  },
  [arbitrum.id]: {
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "eth",
    "0x5979D7b546E38E414F7E9822514be443A4800529": "wsteth",
  },
  [polygon.id] : {
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": "eth",
    "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD":"wsteth"
  },
  [base.id]: {
    "0x4200000000000000000000000000000000000006": "eth",
    "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452": "wsteth"
  },
  [optimism.id]: {
    "0x4200000000000000000000000000000000000006": "eth",
    "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb": "wsteth"
  },
  [bsc.id]: {
    "0x2170Ed0880ac9A755fd29B2688956BD959F933F8": "eth",
    "0x2Bbbdf97295F73175b12CC087cF446765931e1C3": "wsteth"
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
      [bsc.id]: "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
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
      [bsc.id]: "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
    }[chainId]
    if(!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }
  getPortico(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x48b6101128C0ed1E208b7C910e60542A2ee6f476",
      [arbitrum.id]: "0x48fa7528bFD6164DdF09dF0Ed22451cF59c84130",
      [polygon.id] : "0x227bABe533fa9a1085f5261210E0B7137E44437B",
      [base.id]: "0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889",
      [optimism.id]: "0x9ae506cDDd27DEe1275fd1fe6627E5dc65257061",
      [bsc.id]: "0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85",
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
      [bsc.id]: "0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7",
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
      [bsc.id]: 4
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
      [4]: bsc.id
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
