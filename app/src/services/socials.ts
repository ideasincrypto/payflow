import { MetaType, ProfileWithSocialsType, SocialInfoType } from '../types/ProfleType';
import { fetchQuery } from '@airstack/airstack-react';
import { isAddress } from 'viem';
import { FARCASTER_DAPP, LENS_DAPP } from '../utils/dapps';
import { getProfileByAddress, searchByListOfAddressesOrUsernames } from './user';

export const QUERY_SOCIALS = `query GetSocial($identity: Identity!, $me: Identity!) {
  Wallet(input: {identity: $identity, blockchain: ethereum}) {
    addresses
    primaryDomain {
      name
      tokenNft {
        contentValue {
          image {
            small
          }
        }
      }
    }
    socials(input: {limit: 5}) {
      dappName
      profileName
      profileDisplayName
      profileImage
      profileImageContentValue {
        image {
          small
        }
      }
      followerCount
    }
    xmtp {
      isXMTPEnabled
    }
    socialFollowers(
      input: {filter: {identity: {_in: [$me]}, dappName: {_in: [farcaster,lens]}}}
    ) {
      Follower {
        dappName
      }
    }
    socialFollowings(
      input: {filter: {identity: {_in: [$me]}, dappName: {_in: [farcaster,lens]}}}
    ) {
      Following {
       dappName
      }
    }
  }
}`;

export const QUERY_SOCIALS_IN_BATCH_FOR_ASSOCIATED_ADDRESSES_BY_PROFILE_NAME = `query GetSocialsForAssociatedAddresses($dappName: SocialDappName!, $profileName: String!, $me:Identity!) {
  Socials(
    input: {filter: {dappName: {_eq: $dappName}, profileName: {_eq: $profileName}}, blockchain: ethereum}
  ) {
    Social {
      userAssociatedAddressDetails {
      	addresses
        primaryDomain {
          name
          tokenNft {
            contentValue {
              image {
                small
              }
            }
          }
        }
        socials(input: {limit: 5}) {  
          userAssociatedAddresses
          dappName
          profileName
          profileDisplayName
          profileImage
          profileImageContentValue {
            image {
              small
            }
          }
          followerCount
        }
        xmtp {
          isXMTPEnabled
        }
        socialFollowers(
          input: {filter: {identity: {_in: [$me]}, dappName: { _in: [farcaster,lens]}}}
        ) {
          Follower {
            dappName
          }
        }
        socialFollowings(
          input: {filter: {identity: {_in: [$me]}, dappName: {_in: [farcaster,lens]}}}
        ) {
          Following {
            dappName
          }
        }
      }
    }
  }
}`;

export const QUERY_SOCIALS_MINIMAL = `query GetSocial($identity: Identity!, $me: Identity!) {
  Wallet(input: {identity: $identity, blockchain: ethereum}) {
    primaryDomain {
      name
    }
    socials(input: {limit: 5}) {
      dappName
      profileName
      followerCount
    }
    xmtp {
      isXMTPEnabled
    }
    socialFollowers(
      input: {filter: {identity: {_in: [$me]}, dappName: { _in: [ farcaster,lens]}}}
    ) {
      Follower {
        dappName
      }
    }
    socialFollowings(
      input: {filter: {identity: {_in: [$me]}, dappName: {_in: [ farcaster,lens]}}}
    ) {
      Following {
        dappName
      }
    }
  }
}`;

const FARCASTER_SCORE = 4;
const LENS_SCORE = 4;
const ENS_SCORE = 3;
const XMTP_SCORE = 1;

export function sortBySocialScore(
  profilesWithSocials: ProfileWithSocialsType[]
): ProfileWithSocialsType[] {
  return profilesWithSocials.sort((left, right) => calculateScore(right) - calculateScore(left));
}

function calculateScore(profilesWithSocials: ProfileWithSocialsType): number {
  let score = 0;
  if (profilesWithSocials.meta) {
    if (profilesWithSocials.meta.ens) {
      score += ENS_SCORE;
    }

    if (profilesWithSocials.meta.xmtp) {
      score += XMTP_SCORE;
    }

    profilesWithSocials.meta.socials.forEach((s) => {
      if (s.dappName === 'farcaster') {
        score += FARCASTER_SCORE;
      }

      if (s.dappName === 'lens') {
        score += LENS_SCORE;
      }
    });
  }
  return score;
}

export async function searchProfile(
  searchValue: string,
  me: string = ''
): Promise<ProfileWithSocialsType[]> {
  let foundProfiles: ProfileWithSocialsType[] = [];

  if (!searchValue.includes(':') && !searchValue.includes('.') && !isAddress(searchValue)) {
    const profiles = await searchByListOfAddressesOrUsernames([searchValue]);
    if (profiles) {
      foundProfiles = foundProfiles.concat(
        ...(await Promise.all(
          profiles.filter((p) => p.defaultFlow).map((p) => searchProfile(p.address, me))
        ))
      );
    }
  } else if (searchValue.startsWith('fc:') || searchValue.startsWith('lens:')) {
    const dappName = searchValue.startsWith('fc:') ? FARCASTER_DAPP : LENS_DAPP;
    const profileName = searchValue.startsWith('fc:')
      ? searchValue.substring(searchValue.indexOf(':') + 1)
      : 'lens/@'.concat(searchValue.substring(searchValue.indexOf(':') + 1));

    const { data: dataInBatch } = await fetchQuery(
      QUERY_SOCIALS_IN_BATCH_FOR_ASSOCIATED_ADDRESSES_BY_PROFILE_NAME,
      {
        dappName,
        profileName,
        me
      },
      {
        cache: true
      }
    );

    if (
      dataInBatch &&
      dataInBatch.Socials &&
      dataInBatch.Socials.Social &&
      dataInBatch.Socials.Social.length > 0
    ) {
      const userAssociatedAddressDetails =
        dataInBatch.Socials.Social[0].userAssociatedAddressDetails;
      const userAssociatedAddressSocials = userAssociatedAddressDetails.map((s: any) =>
        converSocialResults(s)
      ) as MetaType[];
      const addresses = userAssociatedAddressSocials.map((s) => s.addresses[0]);

      const profiles = await searchByListOfAddressesOrUsernames(addresses);
      userAssociatedAddressSocials.forEach((s) => {
        const profile = profiles.find(
          (p) => p.address.toLowerCase() === s.addresses[0].toLowerCase()
        );

        if (profile) {
          foundProfiles.push({ profile: profile, meta: s });
        } else {
          foundProfiles.push({ meta: s });
        }
      });
    }
  } else if (
    searchValue.endsWith('.eth') ||
    isAddress(searchValue) ||
    searchValue.endsWith('.xyz') ||
    searchValue.endsWith('.id')
  ) {
    const { data, error } = await fetchQuery(
      QUERY_SOCIALS,
      { identity: searchValue, me },
      {
        cache: true
      }
    );

    if (data && data.Wallet) {
      const meta = converSocialResults(data.Wallet);

      if (meta && meta.addresses[0]) {
        const profile = await getProfileByAddress(data.Wallet.addresses[0]);
        if (profile) {
          foundProfiles.push({ profile: profile, meta: meta });
        } else {
          foundProfiles.push({ meta: meta });
        }
      }
    }
  }

  console.debug('Found profiles:', foundProfiles);

  return foundProfiles;
}

export function converSocialResults(walletInfo: any): MetaType | undefined {
  let meta = {} as MetaType;

  if (walletInfo.addresses) {
    meta.addresses = walletInfo.addresses;
  } else {
    meta.addresses = [];
  }

  if (walletInfo.primaryDomain) {
    meta.ens = walletInfo.primaryDomain.name;
  }

  if (walletInfo.socials) {
    meta.socials = walletInfo.socials
      .filter((s: any) => s.dappName && s.profileName)
      .map(
        (s: any) =>
          ({
            dappName: s.dappName,
            profileName: s.profileName,
            profileDisplayName: s.profileDisplayName,
            profileImage: s.profileImageContentValue?.image?.small ?? s.profileImage,
            followerCount: s.followerCount
          } as SocialInfoType)
      );
  } else {
    meta.socials = [];
  }

  if (walletInfo.primaryDomain && walletInfo.primaryDomain.tokenNft) {
    meta.ensAvatar = walletInfo.primaryDomain.tokenNft.contentValue?.image?.small;
  }

  if (!meta.ensAvatar && meta.socials.length > 0) {
    meta.ensAvatar = meta.socials[0].profileImage;
  }

  if (walletInfo.xmtp && walletInfo.xmtp[0].isXMTPEnabled) {
    meta.xmtp = true;
  } else {
    meta.xmtp = false;
  }

  if (
    walletInfo.socialFollowers &&
    walletInfo.socialFollowings &&
    walletInfo.socialFollowings.Following
  ) {
    if (walletInfo.socialFollowings.Following.find((f: any) => f.dappName === FARCASTER_DAPP)) {
      if (walletInfo.socialFollowers.Follower?.find((f: any) => f.dappName === FARCASTER_DAPP)) {
        meta.farcasterFollow = 'mutual';
      } else {
        meta.farcasterFollow = 'following';
      }
    }

    if (walletInfo.socialFollowings.Following.find((f: any) => f.dappName === LENS_DAPP)) {
      if (walletInfo.socialFollowers.Follower?.find((f: any) => f.dappName === LENS_DAPP)) {
        meta.lensFollow = 'mutual';
      } else {
        meta.lensFollow = 'following';
      }
    }
  }

  return meta;
}
