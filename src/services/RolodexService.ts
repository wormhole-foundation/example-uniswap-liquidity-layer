import { Service } from "@tsed/di";
import { MultiRpcService } from "./RpcServices";
import { RedisService } from "./RedisService";
import { arbitrum, base, bsc, mainnet, optimism, polygon, avalanche, celo } from "viem/chains";
import { Address, getAddress } from "viem";
import { BadRequest } from "@tsed/exceptions";

interface lut { [key: string]: { [key: string]: string } }

const withFlip = (x: lut): lut => {
  for (const [k, v] of Object.entries(x)) {
    for (const [sk, sv] of Object.entries(v)) {
      x[k.toLowerCase()][sv.toLowerCase()] = sk.toLowerCase()
      x[k.toLowerCase()][sk.toLowerCase()] = sv.toLowerCase()
    }
  }
  return x
}

const canonAssetTable = withFlip({
  [mainnet.id]: {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "eth",
    "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wsteth",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "usdt"
  },
  [arbitrum.id]: {
    "0xd8369c2eda18dd6518eabb1f85bd60606deb39ec": "eth",
    "0xf2717122Dfdbe988ae811E7eFB157aAa07Ff9D0F": "wsteth",
    "0xE4728F3E48E94C6DA2B53610E677cc241DAFB134": "usdt"
  },
  [polygon.id]: {
    "0x11CD37bb86F65419713f30673A480EA33c826872": "eth",
    "0xe082a7fc696de18172ad08d956569ee80bc37f06": "wsteth",
    "0x9417669fBF23357D2774e9D421307bd5eA1006d2": "usdt"
  },
  [base.id]: {
    "0x71b35ecb35104773537f849fbc353f81303a5860": "eth",
    "0xEd4e2FD35161c3c0e33cA187fce64C70d44Ce32b": "wsteth",
    "0xFf0C62A4979400841eFaA6faADb07Ac7d5C98b27": "usdt"
  },
  [optimism.id]: {
    "0xb47bC3ed6D70F04fe759b2529c9bc7377889678f": "eth",
    "0x855CFcEEe998c8ca34F9c914F584AbF72dC88B87": "wsteth",
    "0xf6B4185FCf8aF291c0E3927fbEab7046b4f6A8CA": "usdt"
  },
  [bsc.id]: {
    "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA": "eth",
    "0xad80e1a9b5824234afa9de1f3bbdb8a994796169": "wsteth",
    "0x524bC91Dc82d6b90EF29F76A3ECAaBAffFD490Bc": "usdt"
  },
  [avalanche.id]: {
    "0x8b82A291F83ca07Af22120ABa21632088fC92931": "eth",
    "0x9d228444FC4B7E15A2C481b48E10247A03351FD8": "usdt"
  },
  [celo.id]: {
    "0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207": "eth",
    "0x617f3112bf5397D0467D315cC709EF968D9ba546": "usdt"
  },
})

const nativeAssetTable = withFlip({
  [mainnet.id]: {
    "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0": "wsteth",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "eth",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "usdt"
  },
  [arbitrum.id]: {
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "eth",
    "0x5979D7b546E38E414F7E9822514be443A4800529": "wsteth",
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9": "usdt"
  },
  [polygon.id]: {
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": "eth",
    "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD": "wsteth",
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": "usdt"
  },
  [base.id]: {
    "0x4200000000000000000000000000000000000006": "eth",
    "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452": "wsteth",
    "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2": "usdt"
  },
  [optimism.id]: {
    "0x4200000000000000000000000000000000000006": "eth",
    "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb": "wsteth",
    "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58": "usdt"
  },
  [bsc.id]: {
    "0x2170Ed0880ac9A755fd29B2688956BD959F933F8": "eth",
    "0x2Bbbdf97295F73175b12CC087cF446765931e1C3": "wsteth",
    "0x55d398326f99059fF775485246999027B3197955": "usdt"
  },
  [avalanche.id]: {
    "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab": "eth",
    "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": "usdt"
  },
  [celo.id]: {
    "0x122013fd7dF1C6F636a5bb8f03108E876548b455": "eth",
    "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e": "usdt"
  },
})

//only use pcs for usdt, and always use pcs for usdt
const pcsTokens = [
  "usdt"
]

@Service()
export class RolodexService {

  constructor(
    private readonly rpcService: MultiRpcService,
    private readonly redisService: RedisService,
  ) {
  }

  getQuoterPcs(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      [arbitrum.id]: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      [base.id]: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      [bsc.id]: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
    }[chainId]
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getQuoterV2(startToken: string, endToken: string, chainId: number): Address {

    //no pcs for celo
    if (chainId == celo.id) {
      return this.getQuoterUni(chainId)
    }

    let pcs = false

    const nativeUsdt = this.getNativeTokenForTokenName(chainId, "usdt")

    //if either of the tokens are native  usdt then pcs == true
    if (startToken.toLowerCase() == nativeUsdt.toLowerCase()) {
      pcs = true
    }
    if (endToken.toLowerCase() == nativeUsdt.toLowerCase()) {
      pcs = true
    }

    if (pcs) {
      return this.getQuoterPcs(chainId)
    } else {
      return this.getQuoterUni(chainId)
    }
  }

  getQuoterUni(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [arbitrum.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [polygon.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [optimism.id]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      [base.id]: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
      [bsc.id]: "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      [avalanche.id]: "0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F",
      [celo.id]: "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8"
    }[chainId]
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getSwapRouter(tokenName: string, chainId: number): Address {
    let ans: Address
    if (pcsTokens.includes(tokenName)) {
      //no pcs for celo
      if (chainId == celo.id) {
        ans = this.getUniRouter(chainId)
      }else{
        ans = this.getPcsRouter(chainId)
      }
    } else {
      ans = this.getUniRouter(chainId)
    }
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getUniRouter(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [arbitrum.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [polygon.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [base.id]: "0x2626664c2603336E57B271c5C0b26F421741e481",
      [optimism.id]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      [bsc.id]: "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      [avalanche.id]: "0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE",
      [celo.id]: "0x5615CDAb10dc425a742d643d949a7F474C01abc4"
    }[chainId]
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getPcsRouter(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
      [arbitrum.id]: "0x32226588378236Fd0c7c4053999F88aC0e5cAc77",
      [base.id]: "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86",
      [bsc.id]: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
    }[chainId]
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getPortico(tokenAddr: string, chainId: number): Address {

    const nativeUsdt = this.getNativeTokenForTokenName(chainId, "usdt")
    let ans: Address
    if (tokenAddr.toLowerCase() == nativeUsdt.toLowerCase()) {
      //no pcs for celo
      if (chainId == celo.id) {
        ans = this.getUniPortico(chainId)
      } else {
        ans = this.getPcsPortico(chainId)
      }
    } else {
      ans = this.getUniPortico(chainId)
    }
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getUniPortico(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x48b6101128C0ed1E208b7C910e60542A2ee6f476",
      [arbitrum.id]: "0x48fa7528bFD6164DdF09dF0Ed22451cF59c84130",
      [polygon.id]: "0x227bABe533fa9a1085f5261210E0B7137E44437B",
      [base.id]: "0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889",
      [optimism.id]: "0x9ae506cDDd27DEe1275fd1fe6627E5dc65257061",
      [bsc.id]: "0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85",
      [avalanche.id]: "0xE565E118e75304dD3cF83dff409c90034b7EA18a"
    }[chainId]
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getPcsPortico(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x4db1683d60e0a933A9A477a19FA32F472bB9d06e",
      [arbitrum.id]: "0xE70946692E2e56ae47BfAe2d93d31bd60952B090",
      [base.id]: "0x4568aa1eA0ED54db666c58B4526B3FC9BD9be9bf",
      [bsc.id]: "0xF352DC165783538A26e38A536e76DceF227d90F2",
    }[chainId]
    if (!ans) {
      throw new BadRequest("no portico found for chain")
    }
    return getAddress(ans)
  }

  getTokenBridge(chainId: number): Address {
    const ans = {
      [mainnet.id]: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
      [arbitrum.id]: "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c",
      [polygon.id]: "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE",
      [base.id]: "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627",
      [optimism.id]: "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b",
      [bsc.id]: "0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7",
      [avalanche.id]: "0x0e082F06FF657D94310cB8cE8B0D9a04541d8052",
      [celo.id]: "0x796Dff6D74F3E27060B71255Fe517BFb23C93eed"
    }[chainId]
    if (!ans) {
      throw new BadRequest(`chain ${chainId} not supported`)
    }
    return getAddress(ans)
  }

  getWormholeChainId(chainId: number): number {
    const ans = {
      [mainnet.id]: 2,
      [arbitrum.id]: 23,
      [polygon.id]: 5,
      [base.id]: 30,
      [optimism.id]: 24,
      [bsc.id]: 4,
      [avalanche.id]: 6,
      [celo.id]: 14
    }[chainId]
    if (!ans) {
      throw new BadRequest(`chain ${chainId} not supported`)
    }
    return ans
  }
  getEvmChainId(wormholeChainId: number): number {
    const ans = {
      [2]: mainnet.id,
      [23]: arbitrum.id,
      [5]: polygon.id,
      [30]: base.id,
      [24]: optimism.id,
      [4]: bsc.id,
      [6]: avalanche.id,
      [42220]: celo.id

    }[wormholeChainId] as (number | undefined)
    if (!ans) {
      throw new BadRequest(`no support for wormhole chain ${wormholeChainId}`)
    }
    return ans
  }
  getCanonTokenForTokenName(chainId: number, token: string) {
    token = token.toLowerCase()
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if (!(ct && nt)) {
      throw new BadRequest(`no support for chain ${chainId}`)
    }
    const ans = ct[token]
    if (!ans) {
      throw new BadRequest(`no canon token for ${token} on ${chainId}`)
    }
    return ans
  }
  getNativeTokenForTokenName(chainId: number, token: string) {
    token = token.toLowerCase()
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if (!(ct && nt)) {
      throw new BadRequest(`no support for chain ${chainId}`)
    }
    const ans = nt[token]
    if (!ans) {
      throw new BadRequest(`no native token for ${token} on ${chainId}`)
    }
    return ans
  }
  getCanonTokenForToken(chainId: number, token: string) {
    token = token.toLowerCase()
    const [ct, nt] = [canonAssetTable[chainId], nativeAssetTable[chainId]]
    if (!(ct && nt)) {
      throw new BadRequest(`no support for chain ${chainId}`)
    }
    // if the token is the canon token, then just return it, no need to swap
    if (ct[token]) {
      return token
    }
    // get the name of the token we would like to find the canon token for
    // for instance, if the input is native polygon weth, it will return "eth"
    const tokenName = nt[token]
    // now get the canon asset on the chain for that name.
    const ans = ct[tokenName]
    if (!ans) {
      throw new BadRequest(`no canon token for ${token} on ${chainId}`)
    }
    return ans
  }
  getWeth(chainId: number) {
    const ans = nativeAssetTable[chainId]["eth"];
    if (!ans) {
      throw new BadRequest(`no weth on ${chainId}`)
    }
    return ans
  }
}
