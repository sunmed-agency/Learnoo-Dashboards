import { useLocale } from 'next-intl';
import AR from './ui-text-ar.json';

const ARABIC: Record<string, string> = AR;

/** Arabic for UI text that was written in English inside the code (English stays English in the English site). */
export function translateUiText(text: string, locale: string): string {
  return locale === 'ar' ? ARABIC[text] ?? text : text;
}

/** In a component: const tx = useTx(); then tx('Save Changes'). */
export function useTx(): (text: string) => string {
  const locale = useLocale();
  return (text: string) => translateUiText(text, locale);
}
