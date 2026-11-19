import Image from 'next/image';
import { Globe } from 'lucide-react';

/** Apple mark, taken from the official App Store badge in public/images/store-badges. */
function AppleLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="7.3 8.7 20 23.6" className={className} aria-hidden fill="currentColor">
      <path d="M24.76888,20.30068a4.94881,4.94881,0,0,1,2.35656-4.15206,5.06566,5.06566,0,0,0-3.99116-2.15768c-1.67924-.17626-3.30719,1.00483-4.1629,1.00483-.87227,0-2.18977-.98733-3.6085-.95814a5.31529,5.31529,0,0,0-4.47292,2.72787c-1.934,3.34842-.49141,8.26947,1.3612,10.97608.9269,1.32535,2.01018,2.8058,3.42763,2.7533,1.38706-.05753,1.9051-.88448,3.5794-.88448,1.65876,0,2.14479.88448,3.591.8511,1.48838-.02416,2.42613-1.33124,3.32051-2.66914a10.962,10.962,0,0,0,1.51842-3.09251A4.78205,4.78205,0,0,1,24.76888,20.30068Z" />
      <path d="M22.03725,12.21089a4.87248,4.87248,0,0,0,1.11452-3.49062,4.95746,4.95746,0,0,0-3.20758,1.65961,4.63634,4.63634,0,0,0-1.14371,3.36139A4.09905,4.09905,0,0,0,22.03725,12.21089Z" />
    </svg>
  );
}

/** Android robot head (the robot is shared by Google under CC BY). */
function AndroidLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <path d="M2.2 15.2a9.8 9.8 0 0 1 19.6 0Z" fill="#3DDC84" />
      <path d="M6.6 6.3 4.4 2.6M17.4 6.3l2.2-3.7" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.9" cy="10.9" r="1.15" fill="#fff" />
      <circle cx="16.1" cy="10.9" r="1.15" fill="#fff" />
    </svg>
  );
}

/** Logo for each item of the "Learnoo goes wherever you go" strip: Android, iPhone, Huawei, Web. */
export function PlatformLogo({ index }: { index: number }) {
  if (index === 0) return <AndroidLogo className="h-[15px] w-[22px]" />;
  if (index === 1) return <AppleLogo className="h-5 w-[17px] text-[#0A1033]" />;
  if (index === 2) return <Image src="/images/platforms/huawei-appgallery.png" alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-[6px]" />;
  return <Globe className="h-5 w-5 text-[#2D46E8]" aria-hidden />;
}
