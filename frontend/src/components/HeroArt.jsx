// Ilustración original del paisaje del Magdalena Medio (cultivos y río).
// Es un recurso decorativo propio, no una fotografía de productos.
const ROWS = Array.from({ length: 17 }, (_, i) => -140 + i * 50);

export default function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 560 560"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Ilustración de cultivos junto al río Magdalena"
    >
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e7bd" />
          <stop offset="1" stopColor="#eef2e2" />
        </linearGradient>
        <linearGradient id="heroRiver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c3dcda" />
          <stop offset="1" stopColor="#8dbcc0" />
        </linearGradient>
      </defs>

      <rect width="560" height="560" fill="url(#heroSky)" />
      <circle cx="400" cy="150" r="82" fill="#f3d58a" opacity=".5" />
      <circle cx="400" cy="150" r="54" fill="#e0a12c" />

      <path
        d="M0 300C90 240 170 272 250 250S440 208 560 258V560H0Z"
        fill="#bcd3a0"
      />
      <path
        d="M0 342C110 302 200 332 300 306S470 292 560 322V560H0Z"
        fill="#8bb06b"
      />

      <path
        d="M-10 392C110 360 170 430 290 396S470 350 580 392L580 436C470 396 380 456 280 444S110 402 -10 440Z"
        fill="url(#heroRiver)"
      />
      <path
        d="M24 412c60-16 100 14 170 4s110-30 200-8"
        stroke="#fff"
        strokeOpacity=".6"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M0 448C140 426 260 458 380 438S520 424 560 436V560H0Z"
        fill="#3f7a49"
      />
      <g stroke="#2a5a38" strokeWidth="3" strokeOpacity=".55">
        {ROWS.map((x) => (
          <line key={x} x1={300 + (x - 300) * 0.2} y1="446" x2={x} y2="560" />
        ))}
      </g>

      <path
        d="M0 560C8 470 52 418 126 398 136 470 94 542 0 560Z"
        fill="#143528"
      />
      <path
        d="M12 548C30 490 62 446 108 418"
        stroke="#9dbd6f"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M560 560C550 484 520 444 462 428 452 492 492 546 560 560Z"
        fill="#1d4a36"
      />
    </svg>
  );
}
