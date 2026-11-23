'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { Check, Copy, Eye, EyeOff, Wand2 } from 'lucide-react';
import { generateStrongPassword } from '@/src/lib/strong-password';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Show "generate a strong password" and "copy" next to the eye (forms that set a password). */
  generator?: boolean;
  /** Called with a generated password (e.g. to fill a confirmation field too). */
  onGenerated?: (password: string) => void;
};

/**
 * A password field with an eye to show/hide it and, when `generator` is set, buttons to generate
 * a strong password (it is shown and copied at once) and to copy the current one.
 */
export default function PasswordInput({ value, onValueChange, generator = false, onGenerated, className = '', ...input }: Props) {
  const ar = useLocale() === 'ar';
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the password is shown, so it can still be copied by hand.
      setVisible(true);
    }
  };

  const generate = () => {
    const password = generateStrongPassword();
    onValueChange(password);
    onGenerated?.(password);
    setVisible(true);
    void copy(password);
  };

  const button = 'grid h-8 w-8 place-items-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2137D6]/30';

  return (
    <div className="relative">
      <input
        {...input}
        type={visible ? 'text' : 'password'}
        dir="ltr"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={`${className} ${generator ? '!pr-[7.25rem]' : '!pr-11'}`}
      />
      <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
        {generator && (
          <>
            <button type="button" onClick={generate} className={button} aria-label={ar ? 'توليد كلمة مرور قوية' : 'Generate a strong password'} title={ar ? 'توليد كلمة مرور قوية (وتتنسخ)' : 'Generate a strong password (copied)'}>
              <Wand2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => void copy(value)} disabled={!value} className={`${button} disabled:opacity-40`} aria-label={copied ? (ar ? 'اتنسخت' : 'Copied') : (ar ? 'نسخ كلمة المرور' : 'Copy password')} title={copied ? (ar ? 'اتنسخت' : 'Copied') : (ar ? 'نسخ' : 'Copy')}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </>
        )}
        <button type="button" onClick={() => setVisible((current) => !current)} className={button} aria-label={visible ? (ar ? 'إخفاء كلمة المرور' : 'Hide password') : (ar ? 'إظهار كلمة المرور' : 'Show password')} aria-pressed={visible}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? (ar ? 'اتنسخت كلمة المرور' : 'Password copied') : ''}</span>
    </div>
  );
}
