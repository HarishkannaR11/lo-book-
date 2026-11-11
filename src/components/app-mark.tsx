/** The app's lorry mark, shared with the generated PWA icons (scripts/make-icons.mjs). */
export function AppMark({ className = "size-14" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 512 512" className={className}>
      <rect width="512" height="512" rx="112" fill="#1d4ed8" />
      <g fill="#fff">
        <rect x="72" y="156" width="236" height="164" rx="14" />
        <path d="M322 196h72l50 58v66H322z" />
        <rect x="72" y="320" width="372" height="22" rx="6" />
      </g>
      <path d="M342 214h44l34 40h-78z" fill="#1d4ed8" />
      <g fill="#fff" stroke="#1d4ed8" strokeWidth="14">
        <circle cx="150" cy="350" r="40" />
        <circle cx="370" cy="350" r="40" />
      </g>
      <g fill="#1d4ed8">
        <circle cx="150" cy="350" r="13" />
        <circle cx="370" cy="350" r="13" />
      </g>
    </svg>
  );
}
