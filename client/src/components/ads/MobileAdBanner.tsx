import { BannerAdPosition } from '@capacitor-community/admob';
import { useAdMobBanner, useAdMob } from '@/hooks/use-admob';

interface MobileAdBannerProps {
  position?: BannerAdPosition;
}

export function MobileAdBanner({ position = BannerAdPosition.BOTTOM_CENTER }: MobileAdBannerProps) {
  useAdMobBanner(position);
  
  return null;
}

export function MobileInterstitialButton() {
  const { showInterstitial, isNative } = useAdMob();

  if (!isNative) {
    return null;
  }

  const handleClick = async () => {
    try {
      await showInterstitial();
    } catch (error) {
      console.error('Failed to show interstitial:', error);
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      Show Ad
    </button>
  );
}

export function MobileRewardedButton() {
  const { showRewarded, isNative } = useAdMob();

  if (!isNative) {
    return null;
  }

  const handleClick = async () => {
    try {
      await showRewarded((reward) => {
        console.log('User earned reward:', reward);
        alert(`You earned ${reward.amount} ${reward.type}!`);
      });
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="px-4 py-2 bg-green-600 text-white rounded-lg"
    >
      Watch Ad for Reward
    </button>
  );
}
