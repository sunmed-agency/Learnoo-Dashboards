import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import LandingPage from '@/components/landing/LandingPage';
import { LANDING_CONTENT, type LandingLocale } from '@/components/landing/content';
import { fetchLandingPlans } from '@/src/lib/landing-plans';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.learnoo.app';

// Landing typography: Cairo, loaded once in app/layout.tsx for the whole system.

/** Same order as the root layout: locale header, then the locale cookie. Visitors default to Arabic (proxy.ts sets the header). */
async function landingLocale(): Promise<LandingLocale> {
  const headerLocale = (await headers()).get('x-learnoo-locale');
  if (headerLocale === 'ar' || headerLocale === 'en') return headerLocale;
  return (await cookies()).get('locale')?.value === 'en' ? 'en' : 'ar';
}

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = LANDING_CONTENT[await landingLocale()];
  return {
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description, siteName: 'Learnoo', type: 'website', images: [{ url: '/Logo.jpeg?v=20261023', width: 1097, height: 1078, alt: 'Learnoo' }] },
    twitter: { card: 'summary', title: meta.title, description: meta.description, images: ['/Logo.jpeg?v=20261023'] },
  };
}

// Signed-in users never reach this page: proxy.ts sends them to their dashboard.
export default async function Home() {
  const locale = await landingLocale();
  const plans = await fetchLandingPlans(API_BASE_URL);

  return (
    <div>
      <LandingPage locale={locale} plans={plans} apiBaseUrl={API_BASE_URL} />
    </div>
  );
}
