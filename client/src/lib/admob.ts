import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdMobBannerSize, RewardAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

export const ADMOB_CONFIG = {
  testAppId: 'ca-app-pub-3940256099942544~3347511713',
  
  testAdUnits: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  
  productionAdUnits: {
    banner: import.meta.env.VITE_ADMOB_BANNER_ID || '',
    interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || '',
    rewarded: import.meta.env.VITE_ADMOB_REWARDED_ID || '',
  }
};

export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

export const isTestMode = () => {
  return import.meta.env.DEV || !import.meta.env.VITE_ADMOB_BANNER_ID;
};

export const getAdUnitId = (type: 'banner' | 'interstitial' | 'rewarded') => {
  const useTest = isTestMode();
  return useTest ? ADMOB_CONFIG.testAdUnits[type] : ADMOB_CONFIG.productionAdUnits[type];
};

export class AdMobService {
  private static initialized = false;
  private static bannerVisible = false;

  static async initialize(): Promise<void> {
    if (!isNativeApp()) {
      console.log('AdMob: Not a native app, skipping initialization');
      return;
    }

    if (this.initialized) {
      console.log('AdMob: Already initialized');
      return;
    }

    try {
      await AdMob.initialize({
        initializeForTesting: isTestMode(),
      });
      
      this.initialized = true;
      console.log('AdMob: Initialized successfully', { testMode: isTestMode() });
    } catch (error) {
      console.error('AdMob: Initialization failed', error);
      throw error;
    }
  }

  static async showBanner(position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER): Promise<void> {
    if (!isNativeApp()) {
      console.log('AdMob: Banner skipped (not native app)');
      return;
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (this.bannerVisible) {
      console.log('AdMob: Banner already visible');
      return;
    }

    try {
      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        console.log('AdMob: Banner loaded');
      });

      AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
        console.error('AdMob: Banner failed to load', error);
      });

      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
        console.log('AdMob: Banner size changed', size);
      });

      const options: BannerAdOptions = {
        adId: getAdUnitId('banner'),
        adSize: BannerAdSize.BANNER,
        position,
        isTesting: isTestMode(),
      };

      await AdMob.showBanner(options);
      this.bannerVisible = true;
      console.log('AdMob: Banner displayed', { position, testMode: isTestMode() });
    } catch (error) {
      console.error('AdMob: Failed to show banner', error);
      throw error;
    }
  }

  static async hideBanner(): Promise<void> {
    if (!isNativeApp() || !this.bannerVisible) {
      return;
    }

    try {
      await AdMob.hideBanner();
      console.log('AdMob: Banner hidden');
    } catch (error) {
      console.error('AdMob: Failed to hide banner', error);
    }
  }

  static async removeBanner(): Promise<void> {
    if (!isNativeApp() || !this.bannerVisible) {
      return;
    }

    try {
      await AdMob.removeBanner();
      this.bannerVisible = false;
      console.log('AdMob: Banner removed');
    } catch (error) {
      console.error('AdMob: Failed to remove banner', error);
    }
  }

  static async showInterstitial(): Promise<void> {
    if (!isNativeApp()) {
      console.log('AdMob: Interstitial skipped (not native app)');
      return;
    }

    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await AdMob.prepareInterstitial({
        adId: getAdUnitId('interstitial'),
        isTesting: isTestMode(),
      });

      await AdMob.showInterstitial();
      console.log('AdMob: Interstitial displayed');
    } catch (error) {
      console.error('AdMob: Failed to show interstitial', error);
      throw error;
    }
  }

  static async showRewarded(onRewarded?: (reward: AdMobRewardItem) => void): Promise<void> {
    if (!isNativeApp()) {
      console.log('AdMob: Rewarded ad skipped (not native app)');
      return;
    }

    if (!this.initialized) {
      await this.initialize();
    }

    let listener: PluginListenerHandle | null = null;
    
    try {
      if (onRewarded) {
        listener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          console.log('AdMob: User earned reward', reward);
          onRewarded(reward);
        });
      }

      await AdMob.prepareRewardVideoAd({
        adId: getAdUnitId('rewarded'),
        isTesting: isTestMode(),
      });

      await AdMob.showRewardVideoAd();
      console.log('AdMob: Rewarded ad displayed');
    } catch (error) {
      console.error('AdMob: Failed to show rewarded ad', error);
      throw error;
    } finally {
      if (listener) {
        listener.remove();
      }
    }
  }
}
