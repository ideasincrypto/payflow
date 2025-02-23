import { useMemo, useState } from 'react';
import { ActivityFetchResultType, TxInfo } from '../../types/ActivityFetchResultType';
import { FlowWalletType, WalletWithProfileType } from '../../types/FlowType';
import axios from 'axios';
import {
  base,
  baseGoerli,
  modeTestnet,
  optimism,
  optimismGoerli,
  polygonZkEvm,
  polygonZkEvmTestnet,
  zora,
  zoraTestnet
} from 'viem/chains';
import { API_URL } from '../urlConstants';

interface NextPageParams {
  block_number: number;
  index: number;
  items_count: number;
  transaction_index: number;
}

export const useTransactionsFetcher = (wallets: FlowWalletType[]): ActivityFetchResultType => {
  const [transactions, setTransactions] = useState<TxInfo[]>([]);
  const [fetched, setFetched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useMemo(() => {
    setLoading(true);

    Promise.allSettled(wallets.map((wallet) => fetchTransactions(wallet)))
      .then(async (data) => {
        const txs = (
          data
            .filter((result) => result.status === 'fulfilled')
            .map((result) => (result.status === 'fulfilled' ? result.value : undefined))
            .flat(1)
            .filter((tx) => tx) as TxInfo[]
        ).sort((left, right) => right.timestamp.localeCompare(left.timestamp));

        // TODO: get unique
        const wallets = txs.map((tx) => ({
          address: tx.activity === 'self' || tx.activity === 'inbound' ? tx.from : tx.to,
          network: tx.chainId
        }));

        const { status, data: walletProfiles } = await axios.post(
          `${API_URL}/api/user/search/wallets`,
          wallets
        );

        console.log(walletProfiles);

        if (status === 200 && walletProfiles) {
          txs.forEach((tx) => {
            const profile = walletProfiles.find(
              (w: WalletWithProfileType) =>
                w.address ===
                  (tx.activity === 'self' || tx.activity === 'inbound' ? tx.from : tx.to) &&
                w.network === tx.chainId
            ).profile;

            if (profile) {
              tx.profile = profile;
            }
            return tx;
          });
        }
        setLoading(false);
        setFetched(true);
        setTransactions(txs);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
        setFetched(false);
      });
    setTransactions([]);
  }, [wallets.toString()]);
  return { loading, fetched, transactions };
};

function parseTxHistoryResponse(wallet: FlowWalletType, internalTxs: any[], txs: any[]): TxInfo[] {
  if (!internalTxs || !txs) {
    return [];
  }

  const interalTxsInfo: TxInfo[] = internalTxs.map((item: any) => {
    const txInfo: TxInfo = {
      chainId: wallet.network,
      block: item.block,
      success: item.success,
      hash: item.transaction_hash,
      timestamp: item.timestamp,
      from: item.from?.hash,
      to: item.to?.hash,
      type: item.type,
      value: item.value,
      activity:
        item.to?.hash === item.from?.hash
          ? 'self'
          : wallet.address === item.to?.hash
          ? 'inbound'
          : 'outbound'
    };
    return txInfo;
  });

  const txsInfo: TxInfo[] = txs.map((item: any) => {
    const txInfo: TxInfo = {
      chainId: wallet.network,
      block: item.block,
      success: item.result === 'success',
      hash: item.hash,
      timestamp: item.timestamp,
      from: item.from?.hash,
      to: item.to?.hash,
      type: item.type,
      value: item.value,
      activity:
        item.to?.hash === item.from?.hash
          ? 'self'
          : wallet.address === item.to?.hash
          ? 'inbound'
          : 'outbound'
    };
    return txInfo;
  });

  console.log(txsInfo);

  return interalTxsInfo
    .concat(txsInfo)
    .filter(
      (tx) =>
        (tx.type === 'call' || tx.type === 2) &&
        tx.to !== '0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf' &&
        tx.value > 0 &&
        tx.success
    );
}

async function fetchTransactions(wallet: FlowWalletType): Promise<TxInfo[]> {
  if (!wallet) {
    return [];
  }

  const internalTxsUrl = getWalletInternalTxsFetchAPI(wallet);
  const txsUrl = getWalletTxsFetchAPI(wallet);

  if (!internalTxsUrl || !txsUrl) {
    return [];
  }

  const internalTxs = await fetchAnyTxs(internalTxsUrl);
  const txs = await fetchAnyTxs(txsUrl);

  const txInfos: TxInfo[] = parseTxHistoryResponse(wallet, internalTxs, txs);

  return txInfos;
}

// TODO: later introduce the page number limit
async function fetchAnyTxs(url: string, params?: NextPageParams): Promise<any[]> {
  const response = await axios.get(url.concat(getNextPageParamsUrlProps(params)));

  if (response.status !== 200 || !response.data) {
    return [];
  }

  let items: any[] = response.data.items;
  const nextPageParams = response.data.next_page_params as NextPageParams;

  if (nextPageParams) {
    try {
      const nextPageItems = await fetchAnyTxs(url, nextPageParams);

      if (nextPageItems) {
        items = items.concat(nextPageItems);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return items;
}

function getNextPageParamsUrlProps(params?: NextPageParams) {
  if (!params) {
    return '';
  }
  return `?block_number=${params.block_number}&index=${params.index}&items_count=${params.items_count}&transaction_index=${params.transaction_index}`;
}

function getWalletInternalTxsFetchAPI(wallet: FlowWalletType): string | undefined {
  let baseUrl = getBlockscoutBaseUrl(wallet.network);

  if (baseUrl) {
    return baseUrl.concat(`/api/v2/addresses/${wallet.address}/internal-transactions`);
  }
}

function getWalletTxsFetchAPI(wallet: FlowWalletType): string | undefined {
  let baseUrl = getBlockscoutBaseUrl(wallet.network);

  if (baseUrl) {
    return baseUrl.concat(`/api/v2/addresses/${wallet.address}/transactions`);
  }
}

function getBlockscoutBaseUrl(network: number) {
  let baseUrl;

  switch (network) {
    case baseGoerli.id:
      baseUrl = `https://${baseGoerli.network}.blockscout.com`;
      break;
    case base.id:
      baseUrl = `https://${base.network}.blockscout.com`;
      break;
    case optimismGoerli.id:
      baseUrl = `https://${optimismGoerli.network}.blockscout.com`;
      break;
    case optimism.id:
      baseUrl = `https://${optimism.network}.blockscout.com`;
      break;
    case modeTestnet.id:
      baseUrl = `https://sepolia.explorer.mode.network`;
      break;
    case zoraTestnet.id:
      baseUrl = 'https://testnet.explorer.zora.energy';
      break;
    case zora.id:
      baseUrl = 'https://explorer.zora.energy';
      break;
    case polygonZkEvmTestnet.id:
      baseUrl = 'https://testnet.explorer.zora.energy';
      break;
    case polygonZkEvm.id:
      baseUrl = 'https://explorer.zora.energy';
  }

  return baseUrl;
}
