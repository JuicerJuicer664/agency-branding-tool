'use client';

import Link from 'next/link';
import Image from 'next/image';

const BrandHeader = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-[#111111] border-b border-white/10 shadow-elevation-sm">
      <div className="flex items-center h-16 px-6 md:px-10 gap-4">
        <Link href="/photo-upload-and-editor" className="flex items-center gap-3 focus-gold rounded-sm outline-offset-2 shrink-0">
          {/* The Agency Logo from uploaded asset */}
          <Image
            src="/assets/images/image-1773162561184.png"
            alt="The Agency real estate logo"
            width={120}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        {/* Divider */}
        <span className="h-5 w-px bg-white/20 shrink-0" aria-hidden="true" />

        {/* App title inline with logo */}
        <span
          className="text-white/80 text-sm tracking-widest whitespace-nowrap uppercase"
          style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif', letterSpacing: '0.12em', fontWeight: 500 }}
        >
          Photo Upload &amp; Editor
        </span>
      </div>
    </header>
  );
};

export default BrandHeader;