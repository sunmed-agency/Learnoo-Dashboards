'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';

type Props = {
  label: string;
  links: { href: string; label: string }[];
  login: string;
  join: string;
};

/** The header menu on phones and tablets; closes after a link is tapped. */
export default function MobileMenu({ label, links, login, join }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute('open');

  return (
    <details ref={ref} className="group relative xl:hidden">
      <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full text-white ring-1 ring-white/25 hover:bg-white/10" aria-label={label}>
        <Menu className="h-5 w-5" />
      </summary>
      <div className="absolute end-0 top-12 w-60 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5">
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={close} className="block rounded-xl px-4 py-2.5 text-[15px] font-semibold text-[#0F172A] hover:bg-[#F1F5FF]">{l.label}</a>
        ))}
        <div className="my-2 h-px bg-[#E2E8F0]" />
        <Link href="/login" className="block rounded-xl px-4 py-2.5 text-[15px] font-semibold text-[#2137D6] hover:bg-[#F1F5FF]">{login}</Link>
        <a href="#pricing" onClick={close} className="mt-1 block rounded-xl bg-[#2137D6] px-4 py-2.5 text-center text-[15px] font-bold text-white">{join}</a>
      </div>
    </details>
  );
}
