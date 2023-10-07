
import { Command, Option } from '@commander-js/extra-typings';

import {mainnet, optimism, base, arbitrum} from 'viem/chains'
export const ALL_CHAINS = [
  mainnet,
  optimism,
  base,
  arbitrum,
] as const

export type CHAIN_NETWORK = (typeof ALL_CHAINS)[number]['network'];

const createProgram = () => {
  const program = new Command()
  .name('thermae')
  .description('used for configuration');

  const c1 = program.command('serve', { isDefault: true });

  const c2 = c1
  .addOption(
    new Option('-p, --port <number>', 'port number')
      .default(3333)
      .env('PORT'),
  )
  .addOption(
    new Option('-h, --host <string>', 'host string')
      .default('0.0.0.0')
      .env('BIND_HOST'),
  )
  .addOption(
    new Option('--redis-url <string>', 'redis url string')
      .default('redis://127.0.0.1:6379')
      .env('REDIS_URL'),
  )
  .addOption(
    new Option('--tokenlist-url <string>', 'url to tokenlist')
      .default('https://tokenicons.nyc3.cdn.digitaloceanspaces.com/tokensList.json')
      .env('TOKENLIST_URL'),
  )
  .addOption(
    new Option('--okuapi-url <string>', 'url to oku api')
      .default('https://cush.apiary.software')
      .env('OKUAPI_URL'),
  )

  const c3 = ALL_CHAINS.reduceRight((acc, n) => {
    let rpcUrl: string = n.rpcUrls.public.http[0];
    const selected: any = (
      {
        matic: 'https://rpc.ankr.com/polygon',
        'zksync-era': 'https://mainnet.era.zksync.io',
        "homestead":"https://mainnet-rpc.apiary.software",
        //homestead:
       // 'https://mainnet.chainnodes.org/0ed6f3cd-5bbb-47c9-866d-a899baaf087b',
        optimism:
        'https://optimism-mainnet.chainnodes.org/0ed6f3cd-5bbb-47c9-866d-a899baaf087b',
        arbitrum:
        'https://arbitrum-one-mainnet.chainnodes.org/0ed6f3cd-5bbb-47c9-866d-a899baaf087b',
      } as any
    )[n.network];
    if (selected) {
      rpcUrl = selected;
    }
    return acc.addOption(
      new Option(`--${n.network}-rpc-url <string>`, `${n.name} rpc url`)
        .default(rpcUrl)
        .env(`${n.network}_RPC_URL`.toUpperCase().replace('-', '_')),
    );
  }, c2);
  const cmd = c3;
  return { program, cmd };
};
const { cmd } = createProgram();

export type DefaultActionParameters = ReturnType<typeof cmd.opts> & {
  [Property in `${CHAIN_NETWORK}RpcUrl`]: string;
};

export interface ConfigOptions extends DefaultActionParameters {}

export const ParsedOptions:ConfigOptions = cmd.parse().opts() as ConfigOptions
