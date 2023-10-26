import { IERC20, ITokenBridge, Portico, PorticoReceiver, PorticoStart } from "../typechain-types"
import { BN } from "../util/number"
import { BigNumber, BytesLike } from "ethers";
import { e, o } from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class TestScope {
    Bank = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
    tokenBridgeAddr = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585"//"0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B"
    USDC!: IERC20
    WETH!: IERC20

    WETH_AMOUNT = BN("1e18")

    slippage = 200 //BIPS = 200 => 2% slippage


    Portico!: Portico
    Receiver!: PorticoReceiver
    Start!: PorticoStart

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
    pool: string,
    shouldWrapNative: boolean,
    shouldUnwrapNative: boolean,
    tokenAddress: string,
    xAssetAddress: string,
    recipientChain: number,
    recipientAddress: string,
    recipientPool: string,
    emitterAddress: string,
    tokenBridge: string,
    bridgeRecipient: BytesLike,
    arbiterFee: BigNumber,
    bridgeNonce: number,
    messageNonce: number,
    consistencyLevel: number,
    amountSpecified: BigNumber,
    maxSlippage: number
}

export type DecodedVAA = {
    // doubles as the message recipient
    bridgeRecipient: string,
    emitterAddress: string,
    // instructions for the trade
    pool: string,
    shouldUnwrapNative: boolean,
    tokenAddress: string,
    xAssetAddress: string,
    xAssetAmount: BigNumber,
    tokenBridge: string,
    // TODO: check that this combination of fields (chains + nonces) is enough to serve as a secure nonce
    originChain: BigNumber,
    recipientChain: BigNumber,
    recipientAddress: string,
    porticoVersion: BigNumber,
    messageNonce: BigNumber,
    bridgeNonce: BigNumber,
    bridgeSequence: BigNumber,
    maxSlippage: number

}


const ts = new TestScope();
export const s = ts
