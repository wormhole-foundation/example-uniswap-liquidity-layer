import { IERC20, ITokenBridge, Portico, PorticoReceiver, PorticoStart } from "../typechain-types"
import { BN } from "../util/number"
import { BigNumber, BytesLike } from "ethers";
import {e, o} from "../util/addresser"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class TestScope {
    Bank = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
    tokenBridgeAddr = "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B"
    USDC!: IERC20
    WETH!: IERC20

    WETH_AMOUNT = BN("1e18")


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
    zeroForOne: boolean,
    amountSpecified: BigNumber
}


const ts = new TestScope();
export const s = ts
