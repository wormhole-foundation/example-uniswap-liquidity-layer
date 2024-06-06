# Introducing the Uniswap Liquidity Layer

Bridging between EVM chains, particularly L2s can be cumbersome. The Uniswap Liquidity Layer combined with the Wormhole protocol demonstrates how leveraging Wormhole xAssets with Uniswap v3 can quickly create a powerful liquidity layer.

## How It Works - User

To transfer ETH from Optimism to Base, ETH is swapped to Wormhole xETH on Uniswap (Optimism), the xETH is transferred to Base, and then swapped to Base-native ETH on Uniswap (Base), all with minimal fees. The user began with native ETH on Optimism and ended with native ETH on Base all with high speed and extremely low fees.

## How It Works - Protocol

To set up your own liquidity layer, you need to deposit the ERC20 into the Wormhole bridge to mint the xAsset and then deposit the xAsset into a Uniswap v3 pool with the corresponding native chain asset. You can repeat this process across each EVM you would like to support. By relying on Uniswap v3 to handle the exchange rate of xAsset to native assets, anyone can provide liquidity to the pool using available Uniswap v3 infrastructure.

## Current Support

The Uniswap Liquidity Layer supports native ether and Lido wrapped staked ether.

### Portico Contract Deployments

Ethereum: [0x48b6101128C0ed1E208b7C910e60542A2ee6f476](https://etherscan.io/address/0x48b6101128C0ed1E208b7C910e60542A2ee6f476)

Optimism: [0x9ae506cDDd27DEe1275fd1fe6627E5dc65257061](https://optimistic.etherscan.io/address/0x9ae506cDDd27DEe1275fd1fe6627E5dc65257061#code)

Base: [0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889](https://basescan.org/address/0x610d4DFAC3EC32e0be98D18DDb280DACD76A1889)

Arbitrum: [0x48fa7528bFD6164DdF09dF0Ed22451cF59c84130](https://arbiscan.io/address/0x48fa7528bFD6164DdF09dF0Ed22451cF59c84130)

Polygon: [0x227bABe533fa9a1085f5261210E0B7137E44437B](https://polygonscan.com/address/0x227bABe533fa9a1085f5261210E0B7137E44437B)

Binance Smart Chain: [0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85](https://bscscan.com/address/0x05498574BD0Fa99eeCB01e1241661E7eE58F8a85)

Avalanche: [0xE565E118e75304dD3cF83dff409c90034b7EA18a](https://snowtrace.io/address/0xE565E118e75304dD3cF83dff409c90034b7EA18a)


### Uniswap Liquidity Layer ETH Pools

Optimism: [0xaC85eaf55E9C60eD40a683DE7e549d23FDfbEb33](https://optimistic.etherscan.io/address/0xaC85eaf55E9C60eD40a683DE7e549d23FDfbEb33#code)

Base: [0x48413707B70355597404018e7c603B261fcADf3f](https://basescan.org/address/0x48413707B70355597404018e7c603B261fcADf3f)

Arbitrum: [0xbaaf1fc002e31cb12b99e4119e5e350911ec575b](https://arbiscan.io/address/0xbaaf1fc002e31cb12b99e4119e5e350911ec575b)

Polygon: [0xeda1094f59a4781456734e5d258b95e6be20b983](https://polygonscan.com/address/0xeda1094f59a4781456734e5d258b95e6be20b983)

Binance Smart Chain: [0xF5C616e7b58226b8081DCc7E4A7123A63734eef6](https://bscscan.com/address/0xF5C616e7b58226b8081DCc7E4A7123A63734eef6)

Avalanche: [0x9a26dab3bd252a8d3caa102864c57706485586db](https://snowtrace.io/address/0x9a26dab3bd252a8d3caa102864c57706485586db)


### Uniswap Liquidity Layer wstETH Pools

Optimism: [0xDe09856cf2d7c0AeAC6b09437a175612261229e2](https://optimistic.etherscan.io/address/0xDe09856cf2d7c0AeAC6b09437a175612261229e2#code)

Arbitrum: [0xddc4af4db32e47803b22a8fd71d03f3dac87186e](https://arbiscan.io/address/0xddc4af4db32e47803b22a8fd71d03f3dac87186e)

Polygon: [0xf62646bef9215589c4afcd132c924ee675c9bab5](https://polygonscan.com/address/0xf62646bef9215589c4afcd132c924ee675c9bab5)

## Disclaimer

This SDK is an open source software SDK that leverages the Wormhole protocol, a cross chain messaging protocol. The SDK does not process payments. THIS SDK AND THE WORMHOLE PROTOCOL ARE PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND. By using or accessing this SDK or Wormhole, you agree that no developer or entity involved in creating, deploying, maintaining, operating this SDK or Wormhole, or causing or supporting any of the foregoing, will be liable in any manner for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of, this SDK or Wormhole, or this SDK or Wormhole themselves, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value. By using or accessing this SDK, you represent that you are not subject to sanctions or otherwise designated on any list of prohibited or restricted parties or excluded or denied persons, including but not limited to the lists maintained by the United States' Department of Treasury's Office of Foreign Assets Control, the United Nations Security Council, the European Union or its Member States, or any other government authority.
