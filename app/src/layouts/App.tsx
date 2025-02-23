import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppBar, IconButton, Toolbar, Box, Stack, Typography, Button, Avatar } from '@mui/material';

import { Home, HomeOutlined, AppsOutlined } from '@mui/icons-material';

import Nav from '../components/Navigation';

import { ProfileContext } from '../contexts/UserContext';
import HideOnScroll from '../components/HideOnScroll';
import { useAccount, useContractRead, useEnsAddress } from 'wagmi';
import axios from 'axios';
import { toast } from 'react-toastify';

import AggregatorV2V3Interface from '../../../smart-accounts/zksync-aa/artifacts-zk/contracts/interfaces/AggregatorV2V3Interface.sol/AggregatorV2V3Interface.json';
import { formatUnits } from 'viem';
import { shortenWalletAddressLabel } from '../utils/address';
import { ProfileType } from '../types/ProfleType';
import { AppSettings } from '../types/AppSettingsType';
import { ProfileMenu } from '../components/ProfileMenu';
import SearchProfileDialog from '../components/SearchProfileDialog';
import { API_URL } from '../utils/urlConstants';
import HomeLogo from '../components/Logo';
import { comingSoonToast } from '../components/Toasts';
import { Chain } from '@rainbow-me/rainbowkit';
import ProfileAvatar from '../components/ProfileAvatar';

const drawerWidth = 151;

export default function AppLayout({
  profile,
  appSettings,
  setAppSettings
}: {
  profile: ProfileType;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}) {
  const navigate = useNavigate();

  const { isConnected, address } = useAccount({
    async onDisconnect() {
      await axios.get(`${API_URL}/api/auth/logout`, { withCredentials: true });
      navigate('/connect');
    }
  });

  const [walletBalances, setWalletBalances] = useState<Map<string, bigint>>(new Map());
  const [smartAccountAllowedChains, setSmartAccountAllowedChains] = useState<Chain[]>([]);
  const [initiateFlowsRefresh, setInitiateFlowsRefresh] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [authorized, setAuthorized] = useState<boolean>(false);

  const [profileMenuAnchorEl, setProfileMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [openSearchProfile, setOpenSearchProfile] = useState(false);

  const location = useLocation();

  const { isSuccess: isEnsSuccess, data: ethUsdPriceFeedAddress } = useEnsAddress({
    name: 'eth-usd.data.eth',
    chainId: 1,
    cacheTime: 300_000
  });

  const { data: ethUsdPrice } = useContractRead({
    enabled: isEnsSuccess && ethUsdPriceFeedAddress !== undefined,
    chainId: 1,
    address: ethUsdPriceFeedAddress ?? undefined,
    abi: AggregatorV2V3Interface.abi,
    functionName: 'latestAnswer',
    select: (data) => Number(formatUnits(data as bigint, 8)),
    cacheTime: 10_000
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    if (isConnected && profile) {
      if (profile.address === address) {
        if (profile.username && profile.defaultFlow) {
          setAuthorized(true);
          return;
        }
      } else {
        toast.warn(
          `Please, logout or switch wallet! Connected wallet is different from signed in: ${shortenWalletAddressLabel(
            profile.address
          )}`,
          { autoClose: false }
        );
      }
    }

    navigate('/connect');
  }, [isConnected, address, profile]);

  /*   useMemo(async () => {
    if (initiateFlowsRefresh && flows) {
      setInitiateFlowsRefresh(false);
      await fetchFlows();
    }
  }, [flows, initiateFlowsRefresh]); */

  const drawer = <Nav />;
  return (
    <ProfileContext.Provider
      value={{
        isAuthenticated: authorized,
        profile,
        appSettings,
        setAppSettings,
        smartAccountAllowedChains,
        setSmartAccountAllowedChains,
        setInitiateFlowsRefresh,
        walletBalances,
        setWalletBalances,
        ethUsdPrice
      }}>
      {authorized && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between'
          }}>
          {/* <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true
                }}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
                }}>
                {drawer}
              </Drawer>
              {
                <Drawer
                  variant="permanent"
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
                  }}
                  open>
                  {drawer}
                </Drawer>
              }
            </Box> */}
          <Box flexGrow={1}>
            <HideOnScroll>
              <AppBar
                position="sticky"
                color="transparent"
                elevation={0}
                sx={{ backdropFilter: 'blur(5px)' }}>
                <Toolbar>
                  {/*                     <Box>
                      <IconButton
                        color="inherit"
                        onClick={handleDrawerToggle}
                        sx={{ display: { sm: 'none' } }}>
                        <MenuIcon />
                      </IconButton>
                    </Box> */}
                  <Box
                    display="flex"
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    flexGrow={1}>
                    <HomeLogo />
                    <Stack direction="row" alignItems="center">
                      <IconButton
                        color={location.pathname === '/home' ? 'inherit' : undefined}
                        onClick={() => navigate('/home')}>
                        {location.pathname === '/home' ? <Home /> : <HomeOutlined />}
                      </IconButton>

                      <IconButton
                        color={location.pathname === '/flows' ? 'inherit' : undefined}
                        onClick={() => comingSoonToast()}>
                        <AppsOutlined />
                      </IconButton>

                      {/*
                      <IconButton
                        color={location.pathname === '/requests' ? 'inherit' : undefined}
                        onClick={() => comingSoonToast()}>
                        {location.pathname === '/requests' ? <Payments /> : <PaymentsOutlined />}
                      </IconButton> */}

                      <Box
                        ml={1}
                        display="flex"
                        flexDirection="row"
                        alignItems="center"
                        component={Button}
                        color="inherit"
                        sx={{
                          width: 120,
                          borderRadius: 5,
                          border: 1,
                          borderColor: 'inherit',
                          textTransform: 'none',
                          justifyContent: 'space-evenly'
                        }}
                        onClick={async () => {
                          setOpenSearchProfile(true);
                        }}>
                        <Avatar src="payflow.png" sx={{ width: 24, height: 24 }} />
                        <Typography variant="subtitle2">Search ... </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {/*                       <IconButton color="inherit" onClick={() => comingSoonToast()}>
                        <Badge variant="dot" color="info">
                          <NotificationsOutlined />
                        </Badge>
                      </IconButton> */}

                      <IconButton
                        size="small"
                        onClick={async (event) => {
                          setProfileMenuAnchorEl(event.currentTarget);
                          setOpenProfileMenu(true);
                        }}>
                        <ProfileAvatar profile={profile} sx={{ width: 36, height: 36 }} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Toolbar>
              </AppBar>
            </HideOnScroll>

            <Box
              sx={{
                mt: 3,
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'row'
              }}>
              <Outlet />
            </Box>
          </Box>
        </Box>
      )}
      <ProfileMenu
        profile={profile}
        anchorEl={profileMenuAnchorEl}
        open={openProfileMenu}
        onClose={() => setOpenProfileMenu(false)}
        closeStateCallback={() => setOpenProfileMenu(false)}
      />
      <SearchProfileDialog
        address={profile.address}
        open={openSearchProfile}
        closeStateCallback={() => {
          setOpenSearchProfile(false);
        }}
      />
    </ProfileContext.Provider>
  );
}
