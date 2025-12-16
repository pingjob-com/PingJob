import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    googletag: any;
  }
}

export type AdSlotType = 'responsive_in_feed' | 'medium_rectangle' | 'leaderboard' | 'wide_skyscraper';

interface GoogleAdManagerProps {
  slotType: AdSlotType;
  className?: string;
}

const AD_CONFIG: Record<AdSlotType, {
  slotPath: string;
  sizes: (number[] | string)[];
  style: React.CSSProperties;
}> = {
  responsive_in_feed: {
    slotPath: '/23331199163/responsive_in-feed',
    sizes: [[970, 90], [728, 90], [320, 100], [320, 50]],
    style: { minHeight: '90px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    sizes: [[300, 250]],
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    sizes: [[728, 90]],
    style: { minWidth: '728px', minHeight: '90px' }
  },
  wide_skyscraper: {
    slotPath: '/23331199163/wide_skycraper',
    sizes: [[160, 600]],
    style: { minWidth: '160px', minHeight: '600px' }
  }
};

let instanceCounter = 0;

export default function GoogleAdManager({ slotType, className = '' }: GoogleAdManagerProps) {
  const [divId] = useState(() => {
    instanceCounter++;
    return `gam-${slotType.replace(/_/g, '-')}-${Date.now()}-${instanceCounter}`;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<any>(null);
  const isInitialized = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            const rect = entry.boundingClientRect;
            if (rect.width > 0 && rect.height > 0) {
              setIsVisible(true);
              observer.disconnect();
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isInitialized.current) return;
    isInitialized.current = true;

    const config = AD_CONFIG[slotType];
    
    if (typeof window === 'undefined') return;
    
    window.googletag = window.googletag || { cmd: [] };

    window.googletag.cmd.push(function() {
      try {
        const container = document.getElementById(divId);
        if (!container) return;

        const containerWidth = container.offsetWidth || container.clientWidth;
        if (containerWidth === 0) return;

        const existingSlots = window.googletag.pubads().getSlots();
        const existingSlot = existingSlots.find((s: any) => s.getSlotElementId() === divId);
        if (existingSlot) {
          window.googletag.pubads().refresh([existingSlot]);
          return;
        }

        const slot = window.googletag.defineSlot(
          config.slotPath,
          config.sizes,
          divId
        );

        if (!slot) return;

        if (slotType === 'responsive_in_feed') {
          const mapping = window.googletag.sizeMapping()
            .addSize([1000, 0], [[970, 90], [728, 90]])
            .addSize([750, 0], [[728, 90]])
            .addSize([0, 0], [[320, 100], [320, 50]])
            .build();
          slot.defineSizeMapping(mapping);
        }

        slot.addService(window.googletag.pubads());
        slotRef.current = slot;

        window.googletag.display(divId);
        window.googletag.pubads().refresh([slot]);
      } catch (error) {
        console.error('GAM error:', error);
      }
    });

    return () => {
      if (slotRef.current && window.googletag && window.googletag.destroySlots) {
        window.googletag.cmd.push(function() {
          try {
            window.googletag.destroySlots([slotRef.current]);
          } catch (e) {}
        });
      }
    };
  }, [isVisible, slotType, divId]);

  const config = AD_CONFIG[slotType];

  return (
    <div 
      ref={containerRef}
      className={`w-full flex justify-center ${className}`}
      style={{ width: '100%' }}
    >
      <div 
        id={divId}
        className="gam-ad-container"
        style={{
          ...config.style,
          display: 'block',
          textAlign: 'center'
        }}
        data-ad-slot={slotType}
      />
    </div>
  );
}
