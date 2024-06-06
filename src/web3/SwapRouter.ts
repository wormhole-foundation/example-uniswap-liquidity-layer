import { parseAbi } from "viem";

export const quoterAbi = parseAbi([
  `function quoteExactInputSingle((address,address,uint256,uint24,uint160)) public view returns (uint256,uint160,uint32,uint256)`,
])
