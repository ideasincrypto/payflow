import {
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
  DialogProps,
  Typography,
  Stack,
  Box,
  IconButton,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Tooltip
} from '@mui/material';

import { providers } from 'ethers';

import { CloseCallbackType } from '../types/CloseCallbackType';
import { useContext, useMemo, useRef, useState } from 'react';
import { useBalance, useNetwork } from 'wagmi';
import {
  AddComment,
  ArrowBack,
  AttachMoney,
  ExpandMore,
  LocalGasStation,
  PriorityHigh
} from '@mui/icons-material';
import { Id, toast } from 'react-toastify';

import { Address, formatEther, parseEther } from 'viem';

import { useEthersSigner } from '../utils/hooks/useEthersSigner';
import { FlowType, FlowWalletType } from '../types/FlowType';
import SearchProfileDialog from './SearchProfileDialog';
import { ProfileType, SelectedProfileWithSocialsType } from '../types/ProfleType';
import { ProfileSection } from './ProfileSection';
import { AddressSection } from './AddressSection';
import LoadingButton from '@mui/lab/LoadingButton';
import { SafeAccountConfig } from '@safe-global/protocol-kit';
import { ProfileContext } from '../contexts/UserContext';
import { SafeVersion } from '@safe-global/safe-core-sdk-types';
import { useSafeTransfer } from '../utils/hooks/useSafeTransfer';
import { comingSoonToast } from './Toasts';
import { updateWallet } from '../services/flow';
import PayflowChip from './PayflowChip';
import { estimateFee as estimateSafeTransferFee, isSafeSponsored } from '../utils/safeTransactions';
import { green, red } from '@mui/material/colors';
import { NetworkSelectorButton } from './NetworkSelectorButton';
import { TransferToastContent } from './toasts/TransferToastContent';
import { LoadingSwitchNetworkButton } from './LoadingSwitchNetworkButton';

export type AccountSendDialogProps = DialogProps &
  CloseCallbackType & {
    flow: FlowType;
  };

export default function AccountSendDialog({
  closeStateCallback,
  flow,
  ...props
}: AccountSendDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { profile, ethUsdPrice } = useContext(ProfileContext);

  const ethersSigner = useEthersSigner();
  const { chain } = useNetwork();

  const [selectedRecipient, setSelectedRecipient] = useState<SelectedProfileWithSocialsType>();
  const [selectedWallet, setSelectedWallet] = useState<FlowWalletType>();
  const [compatibleWallets, setCompatibleWallets] = useState<FlowWalletType[]>([]);

  const [toAddress, setToAddress] = useState<Address>();
  const [sendAmountUSD, setSendAmountUSD] = useState<number>();
  const [sendAmount, setSendAmount] = useState<bigint>();
  const [balanceEnough, setBalanceEnough] = useState<boolean>();
  const [minAmountSatisfied, setMinAmountSatisfied] = useState<boolean>();
  const [gasFee, setGasFee] = useState<bigint>();

  const { isSuccess, data: balance } = useBalance({
    address: selectedWallet?.address,
    chainId: chain?.id
  });

  const { loading, confirmed, error, status, txHash, transfer, reset } = useSafeTransfer();

  const [openSearchProfile, setOpenSearchProfile] = useState<boolean>(true);
  const sendToastId = useRef<Id>();

  useMemo(async () => {
    if (!selectedRecipient) {
      setSelectedWallet(undefined);
      setCompatibleWallets([]);
      return;
    }

    // TODO: what if there is not a single compatible wallet between sender & recipient
    // in case a new wallet chain added, not all users maybe be compatible, limit by chains recipient supports
    const compatibleSenderWallets =
      selectedRecipient.type === 'profile'
        ? flow.wallets.filter((w) =>
            selectedRecipient.data.profile?.defaultFlow?.wallets.find(
              (rw) => rw.network === w.network
            )
          )
        : flow.wallets;

    setCompatibleWallets(compatibleSenderWallets);

    if (compatibleSenderWallets.length === 0) {
      toast.error('No compatible wallets available!');
      return;
    }

    setSelectedWallet(
      (chain && compatibleSenderWallets.find((w) => w.network === chain.id)) ??
        compatibleSenderWallets[0]
    );
  }, [selectedRecipient]);

  useMemo(async () => {
    setGasFee(undefined);

    if (
      selectedWallet &&
      ethersSigner &&
      selectedWallet.network === (await ethersSigner.getChainId())
    ) {
      const sponsored = await isSafeSponsored(ethersSigner, selectedWallet.address);
      setGasFee(
        BigInt(
          sponsored
            ? 0
            : await estimateSafeTransferFee(selectedWallet.deployed, selectedWallet.network)
        )
      );
    }
  }, [selectedWallet, ethersSigner]);

  useMemo(async () => {
    if (!sendAmount || !selectedRecipient || !selectedWallet) {
      return;
    }

    if (loading && !sendToastId.current) {
      toast.dismiss();
      sendToastId.current = toast.loading(
        <TransferToastContent
          from={{ type: 'profile', data: { profile: profile } }}
          to={selectedRecipient}
          ethAmount={sendAmount}
          ethUsdPrice={ethUsdPrice}
        />
      );
    }

    if (!sendToastId.current) {
      return;
    }

    if (confirmed) {
      toast.update(sendToastId.current, {
        render: (
          <TransferToastContent
            from={{ type: 'profile', data: { profile: profile } }}
            to={selectedRecipient}
            ethAmount={sendAmount}
            ethUsdPrice={ethUsdPrice}
          />
        ),
        type: 'success',
        isLoading: false,
        autoClose: 5000
      });
      sendToastId.current = undefined;

      // if tx was successfull, mark wallet as deployed if it wasn't
      if (!selectedWallet.deployed) {
        selectedWallet.deployed = true;
        updateWallet(flow.uuid, selectedWallet);
      }
    } else if (error) {
      toast.update(sendToastId.current, {
        render: (
          <TransferToastContent
            from={{ type: 'profile', data: { profile: profile } }}
            to={selectedRecipient}
            ethAmount={sendAmount}
            ethUsdPrice={ethUsdPrice}
            status="error"
          />
        ),
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
      sendToastId.current = undefined;

      if (status === 'rejected') {
        toast.error('Cancelled', { closeButton: false, autoClose: 5000 });
      }

      if (status === 'insufficient_fees') {
        toast.error('Insufficient Gas Fees', { closeButton: false, autoClose: 5000 });
      }
    }
  }, [loading, confirmed, error, status, txHash, sendAmount, selectedRecipient]);

  async function sendSafeTransaction(
    profile: ProfileType,
    flow: FlowType,
    from: FlowWalletType,
    to: Address,
    amount: bigint,
    ethersSigner: providers.JsonRpcSigner
  ) {
    reset();

    const txData = {
      from: from.address,
      to,
      amount
    };

    const safeAccountConfig: SafeAccountConfig = {
      owners: [profile.address],
      threshold: 1
    };

    const saltNonce = flow.saltNonce as string;
    const safeVersion = from.version as SafeVersion;

    transfer(ethersSigner, txData, safeAccountConfig, safeVersion, saltNonce);
  }

  useMemo(async () => {
    if (sendAmountUSD !== undefined && ethUsdPrice) {
      const amount = parseEther((sendAmountUSD / ethUsdPrice).toString());

      const balanceEnough = balance && amount <= balance?.value;
      const minAmount = sendAmountUSD >= 1;

      setBalanceEnough(balanceEnough);
      setMinAmountSatisfied(minAmount);

      if (minAmount && balanceEnough) {
        setSendAmount(amount);
      } else {
        setSendAmount(undefined);
      }
    } else {
      setBalanceEnough(undefined);
      setMinAmountSatisfied(undefined);
    }
  }, [sendAmountUSD, chain?.id]);

  useMemo(async () => {
    if (!selectedRecipient || !selectedWallet) {
      setToAddress(undefined);
      return;
    }

    if (selectedRecipient.type === 'address') {
      setToAddress(selectedRecipient.data.meta?.addresses[0]);
    } else {
      setToAddress(
        selectedRecipient.data.profile?.defaultFlow?.wallets.find(
          (w) => w.network === selectedWallet.network
        )?.address
      );
    }
  }, [selectedWallet, selectedRecipient]);

  function getGasFeeText(gasFee: bigint | undefined): string {
    return 'fee: '.concat(
      gasFee !== undefined
        ? gasFee === BigInt(0)
          ? 'sponsored'
          : `${parseFloat(formatEther(gasFee)).toFixed(5)} ETH ≈ $${(
              parseFloat(formatEther(gasFee)) * (ethUsdPrice ?? 0)
            ).toFixed(2)}`
        : '...'
    );
  }

  return (
    <Dialog
      fullScreen={isMobile}
      onClose={closeStateCallback}
      {...props}
      PaperProps={{ sx: { borderRadius: 5 } }}
      sx={{
        backdropFilter: 'blur(5px)'
      }}>
      <DialogTitle>
        <Box
          display="flex"
          flexDirection="row"
          alignItems="center"
          justifyContent={isMobile ? 'flex-start' : 'center'}>
          {isMobile && (
            <IconButton onClick={closeStateCallback}>
              <ArrowBack />
            </IconButton>
          )}
          <Stack ml={isMobile ? '25vw' : 0} alignItems="center">
            <Typography variant="h6">Send</Typography>
            <Typography textAlign="center" variant="caption" fontWeight="bold">
              from:{' '}
              <b>
                <u>{flow.title}</u>
              </b>{' '}
              flow
            </Typography>
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
        <Box
          display="flex"
          minWidth={350}
          maxWidth={isMobile ? 450 : 350}
          height="100%"
          flexDirection="column"
          alignItems="center"
          justifyContent="space-between">
          <Stack width="100%" spacing={2} alignItems="center">
            <Box
              display="flex"
              flexDirection="row"
              width="100%"
              alignItems="center"
              justifyContent="space-between"
              component={Button}
              color="inherit"
              onClick={async () => setOpenSearchProfile(true)}
              sx={{
                height: 56,
                border: 1,
                borderRadius: 5,
                p: 1.5,
                textTransform: 'none'
              }}>
              {selectedRecipient &&
                (selectedRecipient.type === 'profile'
                  ? selectedRecipient.data.profile && (
                      <ProfileSection profile={selectedRecipient.data.profile} />
                    )
                  : selectedRecipient.data.meta && (
                      <AddressSection meta={selectedRecipient.data.meta} />
                    ))}

              {!selectedRecipient && (
                <Typography alignSelf="center" flexGrow={1}>
                  Choose Recipient
                </Typography>
              )}

              <Stack direction="row">
                {selectedRecipient && selectedRecipient.type === 'profile' && <PayflowChip />}
                <ExpandMore />
              </Stack>
            </Box>
            {selectedRecipient && selectedWallet && (
              <Box width="100%" display="flex" flexDirection="column">
                <TextField
                  fullWidth
                  variant="outlined"
                  type="number"
                  error={
                    sendAmountUSD !== undefined &&
                    (minAmountSatisfied === false || balanceEnough === false)
                  }
                  inputProps={{ style: { textAlign: 'center', fontSize: 20 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <NetworkSelectorButton
                          selectedWallet={selectedWallet}
                          setSelectedWallet={setSelectedWallet}
                          wallets={compatibleWallets}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box
                          display="flex"
                          flexDirection="row"
                          justifyContent="space-between"
                          alignItems="center"
                          minWidth={150}>
                          <Typography>$</Typography>
                          <Typography>≈</Typography>
                          <Typography>
                            {`${sendAmount ? parseFloat(formatEther(sendAmount)).toPrecision(3) : 0}
                        ETH`}
                          </Typography>
                        </Box>
                      </InputAdornment>
                    ),
                    inputMode: 'decimal',
                    sx: { borderRadius: 5, height: 56 }
                  }}
                  onChange={(event) => {
                    if (event.target.value) {
                      const amountUSD = parseFloat(event.target.value);
                      setSendAmountUSD(amountUSD);
                    } else {
                      setSendAmountUSD(undefined);
                    }
                  }}
                />

                {sendAmountUSD !== undefined &&
                  (minAmountSatisfied === false || balanceEnough === false) && (
                    <Stack ml={0.5} mt={0.5} direction="row" spacing={0.5} alignItems="center">
                      <PriorityHigh fontSize="small" sx={{ color: red.A400 }} />
                      <Typography ml={1} variant="caption" color={red.A400}>
                        {sendAmountUSD !== undefined &&
                          ((minAmountSatisfied === false && 'min: $1') ||
                            (balanceEnough === false && 'balance: not enough'))}
                      </Typography>
                    </Stack>
                  )}

                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center">
                  <Stack ml={0.5} direction="row" spacing={0.5} alignItems="center">
                    <AttachMoney fontSize="small" />
                    <Typography variant="caption">
                      {`max: ${
                        isSuccess && balance && balance.value - (gasFee ?? BigInt(0)) > BigInt(0)
                          ? parseFloat(formatEther(balance.value - (gasFee ?? BigInt(0)))).toFixed(
                              5
                            )
                          : 0
                      } ETH ≈ $${
                        isSuccess && balance && balance.value - (gasFee ?? BigInt(0)) > BigInt(0)
                          ? (
                              parseFloat(formatEther(balance.value - (gasFee ?? BigInt(0)))) *
                              (ethUsdPrice ?? 0)
                            ).toFixed(2)
                          : 0
                      }`}
                    </Typography>
                  </Stack>
                  <Tooltip title="Add a note">
                    <IconButton
                      size="small"
                      color="inherit"
                      sx={{ mr: 0.5, alignSelf: 'flex-end' }}
                      onClick={() => {
                        comingSoonToast();
                      }}>
                      <AddComment fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Stack ml={0.5} direction="row" spacing={0.5} alignItems="center">
                  <Tooltip
                    title="Gas is paid by the sending flow wallet via Gelato SyncFee call method. 
                    The fee includes Gelato on-chain call, safe tx fee + deployment fee on the first tx, and 10% Gelato's comission on top of all.">
                    <LocalGasStation fontSize="small" />
                  </Tooltip>
                  <Typography
                    ml={1}
                    variant="caption"
                    color={gasFee === BigInt(0) ? green.A700 : 'inherit'}>
                    {getGasFeeText(gasFee)}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
          {selectedRecipient &&
            selectedWallet &&
            (chain?.id === selectedWallet.network ? (
              <LoadingButton
                fullWidth
                variant="outlined"
                loading={loading || (txHash && !confirmed && !error)}
                disabled={!(toAddress && sendAmount)}
                loadingIndicator={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress color="inherit" size={16} />
                    <Typography variant="button">{status}</Typography>
                  </Stack>
                }
                size="large"
                color="primary"
                onClick={async () => {
                  if (toAddress && sendAmount && ethersSigner) {
                    await sendSafeTransaction(
                      profile,
                      flow,
                      selectedWallet,
                      toAddress,
                      sendAmount,
                      ethersSigner
                    );
                  } else {
                    toast.error("Can't send to this profile");
                  }
                }}
                sx={{ mt: 3, mb: 1, borderRadius: 5 }}>
                Send
              </LoadingButton>
            ) : (
              <LoadingSwitchNetworkButton chainId={selectedWallet.network} />
            ))}
        </Box>
      </DialogContent>

      <SearchProfileDialog
        address={profile.address}
        open={openSearchProfile}
        closeStateCallback={() => {
          setOpenSearchProfile(false);
        }}
        selectProfileCallback={(selectedProfileWithSocials) => {
          setSelectedRecipient(selectedProfileWithSocials);
        }}
      />
    </Dialog>
  );
}
