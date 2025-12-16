import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    googletag: any;
    gamSlotsInitialized: boolean;
    gamDefinedSlots: Record<string, any>;
  }
}

export type AdSlotType = 'responsive_in_feed' | 'medium_rectangle' | 'leaderboard' | 'wide_skyscraper';

interface GoogleAdManagerProps {
  slotType: AdSlotType;
  className?: string;
}

const AD_CONFIG: Record<AdSlotType, {
  slotPath: string;
  size: any;
  style: React.CSSProperties;
}> = {
  responsive_in_feed: {
    slotPath: '/23331199163/responsive_in-feed',
    size: 'fluid',
    style: { minHeight: '90px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    size: [300, 250],
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    size: [728, 90],
    style: { minWidth: '728px', minHeight: '90px' }
  },
  wide_skyscraper: {
    slotPath: '/23331199163/wide_skycraper',
    size: [160, 600],
    style: { minWidth: '160px', minHeight: '600px' }
  }
};

let instanceCounter = 0;

export default function GoogleAdManager({ slotType, className = '' }: GoogleAdManagerProps) {
  const [divId] = useState(() => {
    instanceCounter++;
    return `gam-${slotType.replace(/_/g, '-')}-${instanceCounter}`;
  });
  const slotRef = useRef<any>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const config = AD_CONFIG[slotType];
    
    if (typeof window === 'undefined') return;
    
    window.googletag = window.googletag || { cmd: [] };

    const initSlot = () => {
      window.googletag.cmd.push(() => {
        try {
          const container = document.getElementById(divId);
          if (!container) return;

          const size = config.size === 'fluid' ? 'fluid' : config.size;
          
          const slot = window.googletag.defineSlot(
            config.slotPath,
            size,
            divId
          );
          
          if (slot) {
            slot.addService(window.googletag.pubads());
            slotRef.current = slot;
            
            window.googletag.display(divId);
            window.googletag.pubads().refresh([slot]);
          }
        } catch (error) {
          console.error('GAM slot init error:', error);
        }
      });
    };

    const checkAndInit = () => {
      if (window.gamSlotsInitialized) {
        initSlot();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    checkAndInit();

    return () => {
      if (slotRef.current && window.googletag) {
        window.googletag.cmd.push(() => {
          try {
            window.googletag.destroySlots([slotRef.current]);
          } catch (e) {}
        });
      }
    };
  }, [slotType, divId]);

  const config = AD_CONFIG[slotType];

  return (
    <div 
      id={divId}
      className={`gam-ad-container ${className}`}
      style={{
        ...config.style,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      data-ad-slot={slotType}
    />
  );
}
