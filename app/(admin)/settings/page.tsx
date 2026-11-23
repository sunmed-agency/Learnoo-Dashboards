'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import { useCurrentUser } from '@/src/hooks/useAuth';

export default function PlatformSettingsPage() {
  const t = useTranslations('header.titles');
  const tSettings = useTranslations('platformSettings');
  const { role } = useCurrentUser();
  const isInstructor = role === 'Instructor';
  const isOwner = role === 'Super Admin';

  const allSettingsCategories = [
    {
      icon: 'Settings' as const,
      titleKey: 'generalSettings',
      href: '/settings/general',
      adminOnly: true
    },
    {
      icon: 'User' as const,
      titleKey: 'profile',
      href: '/settings/profile',
      adminOnly: false,
      soon: false,
      disabled: false
    },
    {
      icon: 'Palette' as const,
      titleKey: 'branding',
      href: '/settings/branding',
      adminOnly: true
    },
    {
      icon: 'FileText' as const,
      titleKey: 'termsPrivacy',
      href: '/settings/terms',
      adminOnly: true
    },
    {
      icon: 'Image' as const,
      titleKey: 'watermark',
      href: '/settings/watermark',
      adminOnly: true
    },
    {
      icon: 'Smartphone' as const,
      titleKey: 'appUpdate',
      href: '/settings/app-update',
      adminOnly: true
    },
    {
      icon: 'CreditCard' as const,
      titleKey: 'landingPlans',
      href: '/settings/landing-plans',
      adminOnly: true
    },
    {
      icon: 'HardDrive' as const,
      titleKey: 'backups',
      href: '/settings/backups',
      adminOnly: true,
      ownerOnly: true
    },
    {
      icon: 'ShieldCheck' as const,
      titleKey: 'permissionProfiles',
      href: '/settings/permission-profiles',
      adminOnly: true,
      ownerOnly: true
    }
  ];

  const settingsCategories = (isInstructor
    ? allSettingsCategories.filter(c => !c.adminOnly)
    : allSettingsCategories).filter(c => !('ownerOnly' in c && c.ownerOnly) || isOwner);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#111827]">{t('platformSettings')}</h1>
        <p className="text-[14px] text-[#6B7280] mt-2">{tSettings('pageDescription')}</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category, index) => (
          <SettingsCard
            key={index}
            icon={category.icon}
            title={tSettings(`${category.titleKey}.title`)}
            description={tSettings(`${category.titleKey}.description`)}
            href={category.href}
            soon={category.soon}
            disabled={category.disabled}
            soonLabel={tSettings('soon')}
          />
        ))}
      </div>
    </div>
  );
}
