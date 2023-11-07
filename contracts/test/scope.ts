import { IERC20, ITokenBridge, Portico, } from "../typechain-types"
import { BN } from "../util/number"
import { BigNumber, Bytes, BytesLike } from "ethers";
import { e, o, p } from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class TestScope {
    Bank = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
    rEthWhale = "0x714301eB35fE043FAa547976ce15BcE57BD53144"

    tokenBridgeAddr = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585"//"0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B"
    swapRouterAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    relayerAddr = "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

    opSwapRouter = this.swapRouterAddr
    opTokenBridge = "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b"
    opRelayerAddress = this.relayerAddr

    polySwapRouter = this.swapRouterAddr
    polyTokenBridge = "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE"
    polyRelayerAddress = this.relayerAddr


    //no wrap data
    noWrapData: BytesLike = "0x010001000000b80b00b80b002c012c0100000000000000000000000000000000"
    noSippage: BytesLike = "0x010001000000b80b00b80b000000000000000000000000000000000000000000"
    wrapData!: BytesLike

    USDC!: IERC20
    WETH!: IERC20
    rETH!: IERC20

    WETH_AMOUNT = BN("1e18")

    slippage = 200 //BIPS = 200 => 2% slippage


    Portico!: Portico

    TokenBridge!: ITokenBridge

    e = e //eth addrs
    o = o //op addrs
    p = p //polygon addrs


    Frank!: SignerWithAddress
    Andy!: SignerWithAddress
    Bob!: SignerWithAddress
    Carol!: SignerWithAddress
    Dave!: SignerWithAddress
    Eric!: SignerWithAddress
    Gus!: SignerWithAddress


}

export type TokenReceived = {
    tokenHomeAddress: BytesLike,
    tokenHomeChain: number,
    tokenAddress: string,
    amount: BigNumber
}

export type TradeParameters = {
    flags: BytesLike,
    startTokenAddress: string,
    canonAssetAddress: string,
    finalTokenAddress: string,
    recipientAddress: string,
    amountSpecified: BigNumber
}

export type DecodedVAA = {
    flags: BytesLike,
    canonAssetAddress: string,
    finalTokenAddress: string,
    recipientAddress: string,
    canonAssetAmount: BigNumber
}

const ts = new TestScope();
export const s = ts
