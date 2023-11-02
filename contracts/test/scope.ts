import { IERC20, ITokenBridge, Portico, } from "../typechain-types"
import { BN } from "../util/number"
import { BigNumber, BytesLike } from "ethers";
import { e, o } from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class TestScope {
    Bank = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
    tokenBridgeAddr = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585"//"0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B"
    swapRouterAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    relayerAddr = "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

    //no wrap data
    noWrapData:BytesLike = "0x010001000000b80b00b80b002c012c0100000000000000000000000000000000"
    noSippage:BytesLike = "0x010001000000b80b00b80b000000000000000000000000000000000000000000"
    wrapData!: BytesLike

    USDC!: IERC20
    WETH!: IERC20

    WETH_AMOUNT = BN("1e18")

    slippage = 200 //BIPS = 200 => 2% slippage


    Portico!: Portico

    TokenBridge!: ITokenBridge

    e = e
    o = o


    Frank!: SignerWithAddress
    Andy!: SignerWithAddress
    Bob!: SignerWithAddress
    Carol!: SignerWithAddress
    Dave!: SignerWithAddress
    Eric!: SignerWithAddress
    Gus!: SignerWithAddress


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
    xAssetAmount: BigNumber
}

const ts = new TestScope();
export const s = ts
