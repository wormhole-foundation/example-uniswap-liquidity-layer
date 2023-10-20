import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { IERC20, ITokenBridge, Portico } from "../typechain-types"
import { BN } from "../util/number"
import { BigNumber, BytesLike } from "ethers";
import {e, o} from "../util/addresser"

export class TestScope {
    Bank = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
    USDC!: IERC20
    WETH!: IERC20


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

const ts = new TestScope();
export const s = ts
