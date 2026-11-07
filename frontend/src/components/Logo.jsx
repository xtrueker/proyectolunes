export function LogoMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="14" fill="#143528" />
      <path
        d="M24 30V19"
        stroke="#f7f3e6"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M24 22c-6.5 0-9.5-4-9.5-9 6 0 9.5 3.2 9.5 9Z" fill="#9dbd6f" />
      <path
        d="M24 25c0-5.2 3.2-8.6 9.8-8.6 0 5.4-3.4 8.6-9.8 8.6Z"
        fill="#f7f3e6"
      />
      <path
        d="M8 35c3.5-3 6.5-3 10 0s6.5 3 10 0 6.5-3 10 0"
        stroke="#e0a12c"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ tone = "dark" }) {
  return (
    <span className={`logo logo-${tone}`}>
      <LogoMark size={38} />
      <span className="logo-word">
        <strong>Agro-Red</strong>
        <span>Magdalena</span>
      </span>
    </span>
  );
}
