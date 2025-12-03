import { useEffect } from 'react';

interface GoogleAdsenseProps {
  className?: string;
  style?: React.CSSProperties;
  adSlot?: string;
  adFormat?: 'auto' | 'horizontal' | 'vertical' | 'rectangle' | 'fluid';
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdsense({
  style = { display: 'block' },
  className = '',
  adSlot,
  adFormat = 'fluid'
}: GoogleAdsenseProps) {
  useEffect(() => {
    try {
      // Ensure adsbygoogle array exists
      window.adsbygoogle = window.adsbygoogle || [];
      
      // Push ad configuration
      window.adsbygoogle.push({});
    } catch (error: any) {
      // Suppress "already have ads in them" error - it's harmless when ads are hidden
      if (error?.message?.includes('already have ads in them')) {
        // Silently ignore - this happens when both mobile and desktop ads are in DOM
        return;
      }
      if (import.meta.env.DEV) {
        console.error('AdSense error:', error);
      }
    }
  }, [adSlot]);

  // Show placeholder in development
  if (import.meta.env.DEV) {
    return (
      <div 
        className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[120px] w-full ${className}`}
        style={{ ...style, display: 'block' }}
      >
        <span className="text-gray-500 text-sm font-medium">📢 Google AdSense (Dev Mode)</span>
      </div>
    );
  }

  // Production: Show actual ad space
  return (
    <div style={{ ...style, display: 'block', minHeight: '100px', width: '100%' }} className={className}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          minHeight: '100px',
          minWidth: '300px'
        }}
        data-ad-format={adFormat}
        data-ad-layout-key="-gw-3+1f-3d+2z"
        data-ad-client="ca-pub-9555763610767023"
        data-ad-slot={adSlot || "8971748941"}
      />
    </div>
  );
}
