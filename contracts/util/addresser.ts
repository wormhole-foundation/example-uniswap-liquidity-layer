export class MainnetAddresses {
    readonly wethAddress: string = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    readonly wstethAddress: string = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"
    readonly usdcAddress: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    readonly usdtAddress: string = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    readonly usdtWhale: string = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
    readonly usdcWethPool: string = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
    readonly compAddress: string = "0xc00e94cb662c3520282e6f5717214004a7f26888"
    readonly wbtcAddress: string = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
    readonly usdcWbtcPool: string = "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35"
    readonly uniAddress: string = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
    readonly usdcUniPool: string = "0xD0fC8bA7E267f2bc56044A7715A489d851dC6D78"
    readonly ensAddress: string = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72"
    readonly dydxAddress: string = "0x92d6c1e31e14520e676a687f0a93788b716beff5"
    readonly aaveAddress: string = "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"
    readonly mkrAddress: string = "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2"
    readonly tribeAddress: string = "0xc7283b66eb1eb5fb86327f08e1b5816b0720212b"
    readonly matticAddress: string = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0"
    readonly usdcCompPool: string = "0x4786bb29a1589854204a4e62dcbe26a571224c0f"
    readonly chainlinkEthFeed: string = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419"
    readonly chainlinkCompFeed: string = "0xdbd020caef83efd542f4de03e3cf0c28a4428bd5"
    readonly chainlinkUniFeed: string = "0x553303d460EE0afB37EdFf9bE42922D8FF63220e"
    readonly chainlinkBtcFeed: string = "0xf4030086522a5beea4988f8ca5b36dbc97bee88c"
    readonly compVotingAddress: string = "0x1F2AB8Ac759Fb0E3185630277A554Ae3110bF530"
    readonly richAVAXWallet: string = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
    readonly richBinance14: string = "0x28C6c06298d514Db089934071355E5743bf21d60"
    readonly OPcrossChainMessenger: string = "0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1"
    readonly CRVaddress: string = "0xD533a949740bb3306d119CC777fa900bA034cd52"
    readonly LDOaddress: string = "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32"
    readonly balancerAddress: string = "0xba100000625a3754423978a60c9317c58a424e3D"
    readonly BalancerVault: string = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
    readonly UniV3Router: string = "0xe592427a0aece92de3edee1f18e0157c05861564"
    readonly swapRouter: string = this.UniV3Router
    readonly rethAddress: string = "0xae78736Cd615f374D3085123A210448E74Fc6393"
    readonly tokenBridge: string = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585"
    readonly portico: string = "0xf4c22e13414bcC2FaB827D62De33C05E9B3955F7"
    readonly portico02: string = "0xd8E1465908103eD5fd28e381920575fb09beb264"//updated 12/12
    readonly portico03: string = "0x48b6101128C0ed1E208b7C910e60542A2ee6f476"
    readonly pancakePortico: string = "0x4db1683d60e0a933A9A477a19FA32F472bB9d06e"
    readonly uniRouter: string = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
    readonly pcsSwapRouter: string = "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4"
}

export class WormholeConstants {
    readonly CID = {
        ethereum: 2,
        polygon: 5,
        optimism: 24,
        arbitrum: 23,
        base: 30,
        bsc: 4,
        avax: 6
    }

    readonly WHaddrs = {
        poly: "0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7",
        op: "0xEe91C335eab126dF5fDB3797EA9d6aD93aeC9722",
        ethereum: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B",
        bsc: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B",
        avax: "0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c"
    }
}

export class AvaxAddresses { 
    readonly wethAddress: string = "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab"
    readonly wormWeth: string = "0x8b82A291F83ca07Af22120ABa21632088fC92931"

    readonly usdtAddress: string = "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7"
    readonly wormUsdt: string = "0x9d228444FC4B7E15A2C481b48E10247A03351FD8"//decimal 6
    readonly usdtWhale: string = "0x5a52E96BAcdaBb82fd05763E25335261B270Efcb"
    
    readonly tokenBridge: string = "0x0e082F06FF657D94310cB8cE8B0D9a04541d8052"
    readonly uniRouter: string = "0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE"
    readonly portico03: string = "0xE565E118e75304dD3cF83dff409c90034b7EA18a"

}

export class PolygonAddresses{
    readonly wethAddress: string = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
    readonly wstethAddress: string = "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD"
    readonly usdtAddress: string = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    readonly wormUsdt: string = "0x9417669fBF23357D2774e9D421307bd5eA1006d2"
    readonly usdtWhale: string = "0xF977814e90dA44bFA03b6295A0616a897441aceC"//binance hot wallet
    
    readonly wormWeth: string = "0x11CD37bb86F65419713f30673A480EA33c826872"
    readonly wormWsteth: string = "0xe082a7Fc696De18172Ad08D956569Ee80BC37f06"
    readonly wormUSDC: string = "0x4318CB63A2b8edf2De971E2F17F77097e499459D"

    readonly usdcAddress: string = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
    readonly polyPortico: string = "0x87aC3f21A5335286cCC1785f66d39847Be6Bfed9"//testing deploy
    readonly portico:string =  "0xE1442bA08e330967Dab4fd4Fc173835e9730bff6"
    readonly portico02:string = "0xf6C5FD2C8Ecba25420859f61Be0331e68316Ba01"//updated 12/12
    readonly portico03:string = "0x227bABe533fa9a1085f5261210E0B7137E44437B"

    readonly polySwapRouter: string = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    readonly uniRouter: string = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"

    readonly polyTokenBridge: string = "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE"
    readonly polyRelayerAddress: string = "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

}

export class ArbAddresses{
    readonly portico: string = "0x7C1Caa71943Ef43e9b203B02678000755a4eCdE9"
    readonly portico02: string = "0xf8497FE5B0C5373778BFa0a001d476A21e01f09b"//updated 12/12
    readonly portico03: string = "0x48fa7528bFD6164DdF09dF0Ed22451cF59c84130"
    readonly pancakePortico: string = "0xE70946692E2e56ae47BfAe2d93d31bd60952B090"//"0xd8284305b520FF5486ab718DBdfe46f18454aeDE"

    readonly wethAddress: string = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
    readonly wormWeth: string = "0xD8369C2EDA18dD6518eABb1F85BD60606dEb39Ec"

    readonly wstethAddress: string = "0x5979D7b546E38E414F7E9822514be443A4800529"
    readonly wormWsteth: string = "0xf2717122Dfdbe988ae811E7eFB157aAa07Ff9D0F"

    readonly usdtWhale: string = "0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D"//binance hot wallet
    readonly usdtAddress: string = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
    readonly wormUsdt: string = "0xE4728F3E48E94C6DA2B53610E677cc241DAFB134"//decimal 6

    readonly swapRouter: string = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    readonly uniRouter: string = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
    readonly tokenBridge: string = "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c"

    readonly pcsSwapRouter: string = "0x32226588378236Fd0c7c4053999F88aC0e5cAc77"//"0x1b81D678ffb9C0263b24A97847620C99d213eB14"

}

export class BaseAddresses {
    readonly uniRouter: string = "0x2626664c2603336E57B271c5C0b26F421741e481"
    readonly pcsSwapRouter: string = "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86"//"0x1b81D678ffb9C0263b24A97847620C99d213eB14"
    readonly tokenBridge: string = "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627"
    readonly wethAddress: string = "0x4200000000000000000000000000000000000006"
    readonly wstethAddress: string = "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452"
    readonly usdcAddress: string = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    readonly wormWeth: string = "0x71b35ECb35104773537f849FBC353F81303A5860"
    readonly wormWsteth: string = "0xEd4e2FD35161c3c0e33cA187fce64C70d44Ce32b"
    readonly wormUSDC: string = "0xec267C53f53807c2337C257f8AC3Fc3cC07cc0ed"//500 pool exists 0xB0eCE34DFCb616825576982247f74C7978771f78
    readonly usdtAddress: string = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
    readonly usdtWhale: string = "0xe75358526Ef4441Db03cCaEB9a87F180fAe80eb9"
    readonly wormUsdt: string = "0xFf0C62A4979400841eFaA6faADb07Ac7d5C98b27"
    readonly portico: string = "0xBdCF0bb40eb8642f907133bDB5Fcc681D81f0651"//"0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85"
    readonly portico02: string = "0x9816d7C448f79CdD4aF18c4Ae1726A14299E8C75"//updated 12/12
    readonly portico03: string = "0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889"
    readonly pancakePortico: string = "0x4568aa1eA0ED54db666c58B4526B3FC9BD9be9bf"//"0x9128bA6B88a3851d6aa856aadE7dA0Bb694560Db"
}

export class BscAddresses { 
    readonly uniRouter: string = "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2"
    readonly tokenBridge: string = "0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7"
    readonly wethAddress: string = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
    readonly usdcAddress: string = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
    readonly wstethAddress: string = "0x2Bbbdf97295F73175b12CC087cF446765931e1C3"
    readonly wormUSDT: string = "0x524bC91Dc82d6b90EF29F76A3ECAaBAffFD490Bc"
    readonly usdtAddress: string = "0x55d398326f99059fF775485246999027B3197955"

    readonly pancakePortico: string = "0xF352DC165783538A26e38A536e76DceF227d90F2"
    readonly pcsSwapRouter: string = "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4"//smart router (use this)
    readonly pcsRouter: string = "0x1b81D678ffb9C0263b24A97847620C99d213eB14"//swap router
    readonly bscBank: string = "0xF977814e90dA44bFA03b6295A0616a897441aceC"//binance hot wallet
    readonly usdtWhale: string = "0x58c3beC55C0F744f93DB7A4633aA7DD9a1C4D033"

    readonly wormWeth: string = "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA"
    readonly wormUSDC: string = "0xB04906e95AB5D797aDA81508115611fee694c2b3"
    readonly portico02: string = "0xE565E118e75304dD3cF83dff409c90034b7EA18a"//updated 12/15
    readonly portico03: string = "0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85"
}

export class OptimisimAddresses {
    //Tokens
    readonly wethAddress: string = "0x4200000000000000000000000000000000000006"
    readonly opAddress: string = "0x4200000000000000000000000000000000000042"
    readonly usdcAddress: string = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
    readonly daiAddress: string = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
    readonly wbtcAddress: string = "0x68f180fcCe6836688e9084f035309E29Bf0A2095"
    readonly aaveAddress: string = "0x76FB31fb4af56892A25e32cFC43De717950c9278"
    readonly uniAddress: string = "0x6fd9d7AD17242c41f7131d257212c54A0e816691"
    readonly wstethAddress: string = "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb"
    readonly rethAddress: string = "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D"
    readonly snxAddress: string = "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4"
    readonly usdtAddress: string = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"
    readonly wormUsdtAddress: string = "0xf6B4185FCf8aF291c0E3927fbEab7046b4f6A8CA"

    //Contracts
    readonly nfpManager: string = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    readonly UniV3Router: string = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    readonly UniV3Factory: string = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    readonly BalancerVault: string = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
    readonly ChainlinkRegistry: string = "0x75c0530885F385721fddA23C539AF3701d6183D4"
    readonly opPortico: string = "0xB8177A860A3c9A4c02bcDa00799c9548ec0181c8"//test deploy
    readonly portico: string = "0xCF2FCd9B87113139E809d5F9Ea6f4D571BB1C12a"
    readonly portico02: string = "0xcF205Fa51D33280D9B70321Ae6a3686FB2c178b2"//updated 12/12
    readonly portico03: string = "0x9ae506cDDd27DEe1275fd1fe6627E5dc65257061"
    readonly wormWeth: string = "0xb47bC3ed6D70F04fe759b2529c9bc7377889678f"
    readonly wormWsteth: string = "0x855CFcEEe998c8ca34F9c914F584AbF72dC88B87"
    readonly wormUSDC: string = "0x711e53D031ea9B0bb0C24dD506df11b41AEA419e"

    readonly swapRouter: string = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    readonly uniRouter: string = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
    readonly opSwapRouter: string = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    readonly opTokenBridge: string = "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b"
    readonly opRelayerAddress: string = "0x27428DD2d3DD32A4D7f7C497eAaa23130d894911"

    //readonly ChainlinkRegistrar: string = "0x4F3AF332A30973106Fe146Af0B4220bBBeA748eC"
    readonly dai_usdc_100_pool: string = "0xbf16ef186e715668AA29ceF57e2fD7f9D48AdFE6"

    //Price Feeds
    readonly wETH_CL_FEED: string = "0x13e3ee699d1909e989722e753853ae30b17e08c5"
    readonly wETH_UNI_POOL: string = "0x85149247691df622eaF1a8Bd0CaFd40BC45154a9" //wETH/USDC 500 pool CONTRACT NOT VERRIFIED

    readonly wstETH_CL_FEED: string = "0x698b585cbc4407e2d54aa898b2600b53c68958f7"
    readonly wstETH_UNI_POOL: string = "0x4a5a2A152e985078e1A4AA9C3362c412B7dd0a86" //wETH/wstETH 500 pool FALSE

    readonly rETH_CL_FEED: string = "0x1a8F81c256aee9C640e14bB0453ce247ea0DFE6F"
    readonly rETH_UNI_POOL: string = "0xAEfC1edaeDE6ADaDcdF3bB344577D45A80B19582" //wETH/rETH 500 pool TRUE

    readonly OP_CL_FEED: string = "0x0d276fc14719f9292d5c1ea2198673d1f4269246"
    readonly OP_UNI_POOL: string = "0x68F5C0A2DE713a54991E01858Fd27a3832401849" // wETH/OP 3k pool TRUE

    readonly wBTC_CL_FEED: string = "0x718a5788b89454aae3a028ae9c111a29be6c2a6f"
    readonly wBTC_UNI_POOL: string = "0x73B14a78a0D396C521f954532d43fd5fFe385216" //wETH/wBTC 3k pool CONTRACT NOT VERRIFIED

    readonly UNI_CL_FEED: string = "0x11429ee838cc01071402f21c219870cbac0a59a0"
    readonly UNI_UNI_POOL: string = "0xAD4c666fC170B468B19988959eb931a3676f0e9F" //wETH/UNI 3k pool CONTRACT NOT VERRIFIED + BAD LIQUIDITY ~9k USD WETH

    readonly AAVE_CL_FEED: string = "0x338ed6787f463394d24813b297401b9f05a8c9d1"
    readonly AAVE_UNI_POOL: string = "0x790fde1FD6d2568050061a88c375d5c2E06b140B" //wETH/AAVE 10k pool TRUE BAD LIQUIDITY ~2k USD WETH

    readonly SNX_CL_FEED: string = "0x2fcf37343e916eaed1f1ddaaf84458a359b53877"
    readonly SNX_UNI_POOL: string = "0x0392b358CE4547601BEFa962680BedE836606ae2"


    //v3 pools
    readonly wETH_USDC_POOL: string = this.wETH_UNI_POOL //~6.82mm TVL

}


export const a = new ArbAddresses()

export const av = new AvaxAddresses()

export const b = new BaseAddresses()

export const bsc = new BscAddresses()

export const e = new MainnetAddresses()

export const o = new OptimisimAddresses()

export const p = new PolygonAddresses()

export const w = new WormholeConstants()
