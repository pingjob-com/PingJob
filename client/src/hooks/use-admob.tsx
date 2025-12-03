import { useEffect, useState } from 'react';
import { AdMobService, isNativeApp } from '@/lib/admob';
import { BannerAdPosition, AdMobRewardItem } from '@capacitor-community/admob';

export function useAdMob() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      console.log('useAdMob: Not a native app, skipping AdMob initialization');
      return;
    }

    const initAdMob = async () => {
      try {
        await AdMobService.initialize();
        setInitialized(true);
      } catch (err) {
        setError(err as Error);
        console.error('useAdMob: Initialization error', err);
      }
    };

    initAdMob();
  }, []);

  const showBanner = async (position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER) => {
    try {
      await AdMobService.showBanner(position);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const hideBanner = async () => {
    try {
      await AdMobService.hideBanner();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const removeBanner = async () => {
    try {
      await AdMobService.removeBanner();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const showInterstitial = async () => {
    try {
      await AdMobService.showInterstitial();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const showRewarded = async (onRewarded?: (reward: AdMobRewardItem) => void) => {
    try {
      await AdMobService.showRewarded(onRewarded);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    initialized,
    error,
    isNative: isNativeApp(),
    showBanner,
    hideBanner,
    removeBanner,
    showInterstitial,
    showRewarded,
  };
}

export function useAdMobBanner(position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER) {
  const { initialized, showBanner, removeBanner } = useAdMob();

  useEffect(() => {
    if (!initialized || !isNativeApp()) {
      return;
    }

    showBanner(position).catch(console.error);

    return () => {
      removeBanner().catch(console.error);
    };
  }, [initialized, position]);
}
