export function LogoMark({ size = 22 }: { size?: number }) {
  // Two offset waveforms: the source and the rendition, a beat apart (décalage).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill="#151a25" stroke="#2b3445" />
      <path d="M4 12c1.5-4 3-4 4.5 0s3 4 4.5 0" stroke="#8b94a6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 12c1.5-4 3-4 4.5 0s3 4 4.5 0" stroke="#5b8def" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">Décalage</span>
    </span>
  );
}
