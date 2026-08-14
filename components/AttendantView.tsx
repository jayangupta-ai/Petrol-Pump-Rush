export default function AttendantView() {
  return (
    <div className="attendant" aria-hidden="true">
      <svg viewBox="0 0 48 64" width="48" height="64">
        <defs>
          <linearGradient id="att-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2c49b" />
            <stop offset="1" stopColor="#dda06f" />
          </linearGradient>
        </defs>
        <ellipse cx="24" cy="61" rx="15" ry="3" fill="rgba(0,0,0,0.3)" />
        <path
          d="M13 30 L17 52 L31 52 L35 30 Z"
          fill="#2c3e50"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1"
        />
        <path
          d="M17 36 L31 36 L30 52 L18 52 Z"
          fill="#f1c40f"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.6"
        />
        <path
          d="M13 30 C13 24 18 20 24 20 C30 20 35 24 35 30 Z"
          fill="#2c3e50"
        />
        <circle cx="24" cy="18" r="8" fill="url(#att-skin)" />
        <path
          d="M17 14 C19 10 22 9 24 9 C28 9 31 12 31 14 L29 10 C26 8 22 8 19 10 Z"
          fill="#f1c40f"
        />
        <circle cx="21" cy="18" r="1.4" fill="#333" />
        <circle cx="27" cy="18" r="1.4" fill="#333" />
        <path d="M22 22 Q24 24 26 22" stroke="#b97b47" strokeWidth="1.1" fill="none" />
        <path
          d="M35 30 L44 42 C46 45 43 47 41 45 L34 34 Z"
          fill="#2c3e50"
        />
        <rect x="41" y="42" width="3" height="9" rx="1.2" fill="#57606f" transform="rotate(-24 42.5 46)" />
      </svg>
    </div>
  );
}
