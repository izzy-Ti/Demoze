/** Brand wordmark: "demoz" + purple speech-bubble "e". Inline SVG, no image request. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center text-[1.35rem] font-semibold leading-none tracking-[-0.045em] ${className}`}>
      demoz
      <svg viewBox="0 0 40 40" aria-hidden="true" className="ml-px h-[1.02em] w-[1.02em] translate-y-[0.07em]">
        <path d="M20 3a17 17 0 1 1-9.9 30.8L3 37l2.6-7.4A17 17 0 0 1 20 3Z" fill="#7c3aed" />
        <text x="20.5" y="27.6" textAnchor="middle" fontSize="23" fontWeight="600" fill="#fff" fontFamily="inherit">e</text>
      </svg>
    </span>
  );
}
