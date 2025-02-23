import { Stack, Typography } from '@mui/material';
import { useContext } from 'react';

import { Chain, formatEther } from 'viem';
import { NetworkAssetBalanceSection } from './NetworkAssetBalanceSection';
import { BalanceFetchResultType } from '../types/BalanceFetchResultType';
import { ProfileContext } from '../contexts/UserContext';
import { ActivitySkeletonSection } from './ActivitySkeletonSection';

export default function Assets(props: {
  selectedNetwork: Chain | undefined;
  balanceFetchResult: BalanceFetchResultType;
}) {
  const { ethUsdPrice } = useContext(ProfileContext);
  const { selectedNetwork } = props;
  const { loading, fetched, balances } = props.balanceFetchResult;

  return (
    <Stack pt={1} px={1} spacing={1} width="100%" maxHeight={350} overflow="auto">
      {loading || balances.length === 0 ? (
        <ActivitySkeletonSection />
      ) : fetched && ethUsdPrice ? (
        balances
          .filter((assetBalance) => {
            return selectedNetwork
              ? assetBalance.asset.chainId === selectedNetwork.id
              : true /* && assetBalance.balance?.value !== BigInt(0) */;
          })
          // TODO: sort on fetch
          // TODO: works for now, since we have only eth
          .sort((left, right) =>
            Number((right.balance?.value ?? BigInt(0)) - (left.balance?.value ?? BigInt(0)))
          )
          .map((assetBalance) => {
            console.log(assetBalance);
            return (
              <NetworkAssetBalanceSection
                key={`network_asset_balance_${assetBalance.asset.chainId}_${assetBalance.asset.address}_${assetBalance.asset.token}`}
                network={assetBalance.asset.chainId}
                asset={assetBalance.balance?.symbol ?? ''}
                balance={formatEther(assetBalance.balance?.value ?? BigInt(0))}
                price={ethUsdPrice}
              />
            );
          })
      ) : (
        <Typography variant="subtitle2" textAlign="center">
          Couldn't fetch. Try again!
        </Typography>
      )}
    </Stack>
  );
}
