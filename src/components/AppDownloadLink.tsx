'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';
import { STORE_LINKS } from '@/src/lib/store-links';

export default function AppDownloadLink() {
  const ar = useLocale() === 'ar';

  return <footer className="mt-6 w-full shrink-0 border-t border-gray-200 px-4 py-5 text-center">
    <p className="text-sm font-semibold text-gray-700">{ar ? 'حمّل تطبيق Learnoo' : 'Download Learnoo'}</p>
    <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
      {[
        { name: 'Google Play', href: STORE_LINKS.googlePlay, src: `/images/store-badges/google-play-badge-${ar ? 'ar' : 'en'}.png`, width: 564, height: 168 },
        { name: 'Huawei AppGallery', href: STORE_LINKS.appGallery, src: '/images/store-badges/appgallery-en.png', width: 3545, height: 1064 },
        { name: 'App Store', href: STORE_LINKS.appStore, src: '/images/store-badges/app-store-en.svg', width: 250, height: 83 },
      ].map(({ name, href, src, width, height }) => <a
        key={name}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ar ? `تحميل تطبيق Learnoo من ${name} (يفتح في نافذة جديدة)` : `Download Learnoo from ${name} (opens in a new window)`}
        style={{ width: 150, height: 48 }}
        className="flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      ><Image src={src} alt={name} width={width} height={height} sizes="150px" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></a>)}
    </div>
  </footer>;
}
