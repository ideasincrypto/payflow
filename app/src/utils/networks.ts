import { getNetwork } from 'wagmi/actions';
import {
  mainnet,
  arbitrumGoerli,
  base,
  baseGoerli,
  lineaTestnet,
  modeTestnet,
  optimism,
  optimismGoerli,
  polygonZkEvmTestnet,
  zkSyncTestnet,
  zoraTestnet
} from 'wagmi/chains';

const ENABLED_CHAINS = JSON.parse(import.meta.env.VITE_ENABLED_CHAINS) as string[];

export const SUPPORTED_CHAINS = [
  optimismGoerli,
  baseGoerli,
  arbitrumGoerli,
  {
    ...modeTestnet,
    iconUrl:
      'https://uploads-ssl.webflow.com/64c906a6ed3c4d809558853b/64d0b11158be9cdd5c89a2fe_webc.png'
  },
  {
    ...zkSyncTestnet,
    iconUrl: 'https://zksync.io/apple-touch-icon.png'
  },
  lineaTestnet,
  //polygonZkEvmTestnet,
  zoraTestnet,
  optimism,
  base,
  mainnet
].filter((c) => ENABLED_CHAINS.includes(c.network));

export const AA_COMPATIBLE_CHAINS = [
  optimismGoerli.name,
  baseGoerli.name,
  zoraTestnet.name,
  modeTestnet.name,
  zkSyncTestnet.name,
  lineaTestnet.name,
  polygonZkEvmTestnet.name,
  optimism.name,
  base.name
] as string[];

export const DEFAULT_FLOW_PRE_CREATE_WALLET_CHAINS = [
  baseGoerli,
  optimismGoerli,
  base,
  optimism
  /*   arbitrumGoerli, */
];

export default function getNetworkImageSrc(network: number | string): string {
  const fileName =
    typeof network === 'number'
      ? getNetwork().chains.find((c) => c.id === network)?.network
      : network;

  if (!fileName) {
    throw new Error(`Chain ${network} not supported!`);
  }

  return `/networks/${fileName}.png`;
}

export function getNetworkDisplayName(network: number | string): string {
  const displayName =
    typeof network === 'number' ? getNetwork().chains.find((c) => c.id === network)?.name : network;

  if (!displayName) {
    throw new Error(`Chain ${network} not supported!`);
  }

  return displayName;
}

// Copyrights reserved to Safe Global
// taken from here: https://github.com/safe-global/safe-core-sdk/blob/main/packages/protocol-kit/src/utils/eip-3770/config.ts
interface NetworkShortName {
  shortName: string;
  chainId: number;
}
// https://github.com/ethereum-lists/chains/tree/master/_data/chains

export function shortNetworkName(network: number) {
  return SHORT_NAME_NETWORKS.find((n) => n.chainId === network)?.shortName;
}

const SHORT_NAME_NETWORKS: NetworkShortName[] = [
  { chainId: 1, shortName: 'eth' },
  { chainId: 3, shortName: 'rop' },
  { chainId: 4, shortName: 'rin' },
  { chainId: 5, shortName: 'gor' },
  { chainId: 10, shortName: 'oeth' },
  { chainId: 11, shortName: 'meta' },
  { chainId: 12, shortName: 'kal' },
  { chainId: 18, shortName: 'tst' },
  { chainId: 25, shortName: 'cro' },
  { chainId: 28, shortName: 'bobarinkeby' },
  { chainId: 39, shortName: 'u2u' },
  { chainId: 40, shortName: 'telosevm' },
  { chainId: 41, shortName: 'telosevmtestnet' },
  { chainId: 42, shortName: 'kov' },
  { chainId: 44, shortName: 'crab' },
  { chainId: 46, shortName: 'darwinia' },
  { chainId: 50, shortName: 'xdc' },
  { chainId: 51, shortName: 'txdc' },
  { chainId: 56, shortName: 'bnb' },
  { chainId: 57, shortName: 'sys' },
  { chainId: 61, shortName: 'etc' },
  { chainId: 63, shortName: 'metc' },
  { chainId: 69, shortName: 'okov' },
  { chainId: 82, shortName: 'meter' },
  { chainId: 83, shortName: 'meter-test' },
  { chainId: 97, shortName: 'bnbt' },
  { chainId: 100, shortName: 'gno' },
  { chainId: 106, shortName: 'vlx' },
  { chainId: 108, shortName: 'tt' },
  { chainId: 111, shortName: 'etl' },
  { chainId: 122, shortName: 'fuse' },
  { chainId: 123, shortName: 'spark' },
  { chainId: 137, shortName: 'matic' },
  { chainId: 155, shortName: 'tenet-testnet' },
  { chainId: 246, shortName: 'ewt' },
  { chainId: 250, shortName: 'ftm' },
  { chainId: 280, shortName: 'zksync-goerli' },
  { chainId: 288, shortName: 'boba' },
  { chainId: 300, shortName: 'ogn' },
  { chainId: 321, shortName: 'kcs' },
  { chainId: 322, shortName: 'kcst' },
  { chainId: 324, shortName: 'zksync' },
  { chainId: 336, shortName: 'sdn' },
  { chainId: 338, shortName: 'tcro' },
  { chainId: 420, shortName: 'ogor' },
  { chainId: 570, shortName: 'sys-rollux' },
  { chainId: 588, shortName: 'metis-stardust' },
  { chainId: 592, shortName: 'astr' },
  { chainId: 595, shortName: 'maca' },
  { chainId: 599, shortName: 'metis-goerli' },
  { chainId: 686, shortName: 'kar' },
  { chainId: 787, shortName: 'aca' },
  { chainId: 1001, shortName: 'baobab' },
  { chainId: 1008, shortName: 'eun' },
  { chainId: 1088, shortName: 'metis-andromeda' },
  { chainId: 1101, shortName: 'zkevm' },
  { chainId: 1111, shortName: 'wemix' },
  { chainId: 1112, shortName: 'twemix' },
  { chainId: 1115, shortName: 'tcore' },
  { chainId: 1116, shortName: 'core' },
  { chainId: 1284, shortName: 'mbeam' },
  { chainId: 1285, shortName: 'mriver' },
  { chainId: 1287, shortName: 'mbase' },
  { chainId: 1294, shortName: 'bobabeam' },
  { chainId: 1559, shortName: 'tenet' },
  { chainId: 1807, shortName: 'rana' },
  { chainId: 1984, shortName: 'euntest' },
  { chainId: 2001, shortName: 'milkada' },
  { chainId: 2002, shortName: 'milkalgo' },
  { chainId: 2008, shortName: 'cloudwalk_testnet' },
  { chainId: 2019, shortName: 'pmint_test' },
  { chainId: 2020, shortName: 'pmint' },
  { chainId: 2221, shortName: 'tkava' },
  { chainId: 2222, shortName: 'kava' },
  { chainId: 3737, shortName: 'csb' },
  { chainId: 4002, shortName: 'tftm' },
  { chainId: 4689, shortName: 'iotex-mainnet' },
  { chainId: 4918, shortName: 'txvm' },
  { chainId: 4919, shortName: 'xvm' },
  { chainId: 5000, shortName: 'mantle' },
  { chainId: 5001, shortName: 'mantle-testnet' },
  { chainId: 5700, shortName: 'tsys' },
  { chainId: 7341, shortName: 'shyft' },
  { chainId: 7700, shortName: 'canto' },
  { chainId: 8217, shortName: 'cypress' },
  { chainId: 8453, shortName: 'base' },
  { chainId: 9000, shortName: 'evmos-testnet' },
  { chainId: 9001, shortName: 'evmos' },
  { chainId: 9728, shortName: 'boba-testnet' },
  { chainId: 10000, shortName: 'smartbch' },
  { chainId: 10001, shortName: 'smartbchtest' },
  { chainId: 10200, shortName: 'chi' },
  { chainId: 11235, shortName: 'islm' },
  { chainId: 11437, shortName: 'shyftt' },
  { chainId: 12357, shortName: 'rei-testnet' },
  { chainId: 23294, shortName: 'sapphire' },
  { chainId: 23295, shortName: 'sapphire-testnet' },
  { chainId: 42161, shortName: 'arb1' },
  { chainId: 42170, shortName: 'arb-nova' },
  { chainId: 42220, shortName: 'celo' },
  { chainId: 43113, shortName: 'fuji' },
  { chainId: 43114, shortName: 'avax' },
  { chainId: 43288, shortName: 'boba-avax' },
  { chainId: 44787, shortName: 'alfa' },
  { chainId: 45000, shortName: 'autobahnnetwork' },
  { chainId: 47805, shortName: 'rei' },
  { chainId: 54211, shortName: 'islmt' },
  { chainId: 56288, shortName: 'boba-bnb' },
  { chainId: 57000, shortName: 'tsys-rollux' },
  { chainId: 59140, shortName: 'linea-testnet' },
  { chainId: 71401, shortName: 'gw-testnet-v1' },
  { chainId: 71402, shortName: 'gw-mainnet-v1' },
  { chainId: 73799, shortName: 'vt' },
  { chainId: 80001, shortName: 'maticmum' },
  { chainId: 84531, shortName: 'base-gor' },
  { chainId: 200101, shortName: 'milktada' },
  { chainId: 200202, shortName: 'milktalgo' },
  { chainId: 333999, shortName: 'olympus' },
  { chainId: 421611, shortName: 'arb-rinkeby' },
  { chainId: 421613, shortName: 'arb-goerli' },
  { chainId: 534353, shortName: 'scr-alpha' },
  { chainId: 7777777, shortName: 'zora' },
  { chainId: 11155111, shortName: 'sep' },
  { chainId: 245022926, shortName: 'neonevm-devnet' },
  { chainId: 1313161554, shortName: 'aurora' },
  { chainId: 1313161555, shortName: 'aurora-testnet' },
  { chainId: 1666600000, shortName: 'hmy-s0' },
  { chainId: 1666700000, shortName: 'hmy-b-s0' },
  { chainId: 11297108099, shortName: 'tpalm' },
  { chainId: 11297108109, shortName: 'palm' }
];
