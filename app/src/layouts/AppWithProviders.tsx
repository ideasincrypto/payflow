import App from './App';

import {
  connectorsForWallets,
  getDefaultWallets,
  RainbowKitProvider
} from '@rainbow-me/rainbowkit';

import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import { useMediaQuery } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppSettings } from '../types/AppSettingsType';
import { CustomAvatar } from '../components/CustomAvatar';
import { customDarkTheme, customLightTheme } from '../theme/rainbowTheme';
import { SUPPORTED_CHAINS } from '../utils/networks';
import { AirstackProvider, init } from '@airstack/airstack-react';
import { me } from '../services/user';
import CenteredCircularProgress from '../components/CenteredCircularProgress';
import { ProfileType } from '../types/ProfleType';
import { useNavigate } from 'react-router-dom';
import sortAndFilterFlows from '../utils/sortAndFilterFlows';
import CustomThemeProvider from '../theme/CustomThemeProvider';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';

const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const AIRSTACK_API_KEY = import.meta.env.VITE_AIRSTACK_API_KEY;

init(AIRSTACK_API_KEY);

const { chains, publicClient, webSocketPublicClient } = configureChains(SUPPORTED_CHAINS, [
  alchemyProvider({ apiKey: import.meta.env.VITE_ALCHEMY_API_KEY }),
  publicProvider()
]);

const { wallets } = getDefaultWallets({
  appName: 'Payflow',
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains
});

const connectors = connectorsForWallets([
  ...wallets
  /*   {
    groupName: 'Other',
    wallets: [rainbowWeb3AuthConnector({ chains })]
  } */
]);

const appSettingsStorageItem = localStorage.getItem('appSettings');
const appSettingsStored = appSettingsStorageItem
  ? (JSON.parse(appSettingsStorageItem) as AppSettings)
  : null;

export default function AppWithProviders() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [appSettings, setAppSettings] = useState<AppSettings>(
    appSettingsStored
      ? appSettingsStored
      : {
          autoConnect: import.meta.env.VITE_INIT_CONNECT === 'true',
          darkMode: prefersDarkMode
        }
  );

  const navigate = useNavigate();

  const fetchingStatusRef = useRef(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<ProfileType>();

  // Fetch user when:
  useEffect(() => {
    const fetchStatus = async () => {
      if (fetchingStatusRef.current) {
        return;
      }

      fetchingStatusRef.current = true;

      try {
        const profile = await me();

        if (profile) {
          if (profile.defaultFlow && profile.flows) {
            profile.flows = sortAndFilterFlows(profile.defaultFlow, profile.flows);
          }

          setProfile(profile);
        } else {
          navigate('/connect');
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(`🤷🏻‍♂️ ${error.message}`);
        }
        console.error(error);
      } finally {
        setLoading(false);
        fetchingStatusRef.current = false;
      }
    };

    // 1. page loads
    fetchStatus();

    // 2. window is focused (in case user logs out of another window)
    window.addEventListener('focus', fetchStatus);
    return () => window.removeEventListener('focus', fetchStatus);
  }, []);

  useMemo(() => {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }, [appSettings]);

  const wagmiConfig = createConfig({
    autoConnect: appSettings.autoConnect,
    connectors,
    publicClient,
    webSocketPublicClient
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <AirstackProvider apiKey={AIRSTACK_API_KEY}>
        <RainbowKitProvider
          theme={appSettings.darkMode ? customDarkTheme : customLightTheme}
          avatar={CustomAvatar}
          modalSize="compact"
          chains={chains}>
          <CustomThemeProvider darkMode={appSettings.darkMode}>
            {loading ? (
              <CenteredCircularProgress />
            ) : (
              profile && (
                <App profile={profile} appSettings={appSettings} setAppSettings={setAppSettings} />
              )
            )}
          </CustomThemeProvider>
        </RainbowKitProvider>
      </AirstackProvider>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        limit={5}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastStyle={{ borderRadius: 20, textAlign: 'center' }}
      />
    </WagmiConfig>
  );
}
