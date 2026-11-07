// Ilustración por categoría. Sirve de imagen de apoyo porque el backend
// no almacena fotografías de productos; no representa el producto real.
const KINDS = {
  fruit: { bg: "#f6e3c3", ring: "#efcf98", fg: "#c4452f", leaf: "#4f7f3a" },
  veg: { bg: "#dbe9c8", ring: "#c4dba6", fg: "#3f7a3a", leaf: "#2b5a2c" },
  tuber: { bg: "#ecdcc2", ring: "#dfc79f", fg: "#a97a47", leaf: "#6f4d2b" },
  grain: { bg: "#f3e6b5", ring: "#ead58e", fg: "#c9962a", leaf: "#8a6a1c" },
  coffee: { bg: "#e6d5c3", ring: "#d6bea3", fg: "#6b4226", leaf: "#4b2d17" },
  egg: { bg: "#f1e6d4", ring: "#e6d6bb", fg: "#fbf5e8", leaf: "#b98c56" },
  dairy: { bg: "#dfeaf0", ring: "#c7dbe6", fg: "#fbfaf5", leaf: "#4c7f9a" },
  fish: { bg: "#d3e6ea", ring: "#b9d6dc", fg: "#4a8a9c", leaf: "#2e6272" },
  other: { bg: "#e4ebd6", ring: "#d2ddbd", fg: "#4f8a4a", leaf: "#2d5a2f" },
};

function kindFor(name = "") {
  const text = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/fruta/.test(text)) return "fruit";
  if (/hortaliza|verdura/.test(text)) return "veg";
  if (/tuberculo|raiz/.test(text)) return "tuber";
  if (/grano|cereal/.test(text)) return "grain";
  if (/cafe|cacao/.test(text)) return "coffee";
  if (/pecuario/.test(text)) return "egg";
  if (/lacteo/.test(text)) return "dairy";
  if (/pescado|acuicultura/.test(text)) return "fish";
  return "other";
}

const EGG =
  "M0 -40C22 -40 34 -4 34 14C34 36 18 48 0 48C-18 48 -34 36 -34 14C-34 -4 -22 -40 0 -40Z";

function Glyph({ kind, c }) {
  switch (kind) {
    case "fruit":
      return (
        <>
          <path
            d="M0 -30C-30 -48 -58 -22 -52 12C-47 42 -22 56 0 48C22 56 47 42 52 12C58 -22 30 -48 0 -30Z"
            fill={c.fg}
          />
          <path
            d="M0 -30C0 -42 4 -52 12 -58"
            stroke={c.leaf}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M6 -46C18 -62 38 -60 44 -52C34 -40 18 -38 6 -46Z"
            fill={c.leaf}
          />
          <path
            d="M-36 -4C-38 -16 -30 -28 -20 -30"
            stroke="#fff"
            strokeOpacity=".4"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case "veg":
      return (
        <>
          <g transform="rotate(-38) translate(-6 8) scale(.8)">
            <path
              d="M0 50C-50 30-48 -30 0 -52C48 -30 50 30 0 50Z"
              fill={c.leaf}
            />
          </g>
          <g transform="rotate(38) translate(6 8) scale(.8)">
            <path
              d="M0 50C-50 30-48 -30 0 -52C48 -30 50 30 0 50Z"
              fill={c.leaf}
            />
          </g>
          <path
            d="M0 54C-50 32-48 -32 0 -56C48 -32 50 32 0 54Z"
            fill={c.fg}
          />
          <path
            d="M0 50V-40"
            stroke="#f3f7e8"
            strokeOpacity=".7"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    case "tuber":
      return (
        <>
          <path
            d="M-52 4C-56 -26-24 -46 8 -42C44 -38 60 -14 54 14C48 42 14 52-16 48C-42 44-50 28-52 4Z"
            fill={c.fg}
          />
          <circle cx="-20" cy="-8" r="4" fill={c.leaf} opacity=".6" />
          <circle cx="14" cy="10" r="4" fill={c.leaf} opacity=".6" />
          <circle cx="26" cy="-16" r="3.5" fill={c.leaf} opacity=".6" />
          <circle cx="-6" cy="26" r="3.5" fill={c.leaf} opacity=".6" />
        </>
      );
    case "grain":
      return (
        <>
          <path
            d="M0 58V-44"
            stroke={c.leaf}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <ellipse
                cx="-15"
                cy={-26 + i * 18}
                rx="7"
                ry="14"
                fill={c.fg}
                transform={`rotate(-32 -15 ${-26 + i * 18})`}
              />
              <ellipse
                cx="15"
                cy={-26 + i * 18}
                rx="7"
                ry="14"
                fill={c.fg}
                transform={`rotate(32 15 ${-26 + i * 18})`}
              />
            </g>
          ))}
          <ellipse cx="0" cy="-52" rx="7" ry="14" fill={c.fg} />
        </>
      );
    case "coffee":
      return (
        <>
          <g transform="rotate(30)">
            <ellipse cx="0" cy="0" rx="34" ry="50" fill={c.fg} />
            <path
              d="M0 -46C16 -22-16 22 0 46"
              stroke="#f3e3cf"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g transform="translate(60 30) rotate(-20) scale(.55)">
            <ellipse cx="0" cy="0" rx="34" ry="50" fill={c.leaf} />
            <path
              d="M0 -46C16 -22-16 22 0 46"
              stroke="#f3e3cf"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </>
      );
    case "egg":
      return (
        <>
          <g transform="translate(-26 2) scale(.95)">
            <path d={EGG} fill={c.fg} stroke={c.leaf} strokeWidth="3.5" />
          </g>
          <g transform="translate(32 14) scale(.75)">
            <path d={EGG} fill={c.fg} stroke={c.leaf} strokeWidth="4.5" />
          </g>
        </>
      );
    case "dairy":
      return (
        <>
          <path
            d="M-18 -56H18V-36C18 -28 34 -22 34 -4V44Q34 54 24 54H-24Q-34 54 -34 44V-4C-34 -22 -18 -28 -18 -36Z"
            fill={c.fg}
            stroke={c.leaf}
            strokeWidth="3.5"
          />
          <rect x="-20" y="-64" width="40" height="10" rx="4" fill={c.leaf} />
          <rect x="-32" y="8" width="64" height="26" fill={c.leaf} opacity=".22" />
        </>
      );
    case "fish":
      return (
        <>
          <path
            d="M-60 0C-34 -34 10 -36 36 -8L62 -30V30L36 8C10 36-34 34-60 0Z"
            fill={c.fg}
          />
          <circle cx="-36" cy="-6" r="4.5" fill="#fff" />
          <path
            d="M-14 -18C-6 -6-6 6-14 18"
            stroke="#fff"
            strokeOpacity=".55"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    default:
      return (
        <>
          <path
            d="M0 58V-6"
            stroke={c.leaf}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M0 8C-42 8-56-22-52-44-18-44 0-30 0 8Z" fill={c.fg} />
          <path d="M0 -6C0 -40 20 -58 54 -56 56-20 34 -4 0 -6Z" fill={c.leaf} />
        </>
      );
  }
}

export default function CategoryArt({ name, className = "" }) {
  const kind = kindFor(name);
  const c = KINDS[kind];

  return (
    <svg
      className={`category-art ${className}`.trim()}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="240" fill={c.bg} />
      <circle cx="200" cy="120" r="140" fill={c.ring} opacity=".35" />
      <circle cx="200" cy="120" r="96" fill={c.ring} />
      <path
        d="M0 205c33-14 66-14 100 0s66 14 100 0 66-14 100 0 66 14 100 0"
        stroke={c.ring}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M0 226c33-14 66-14 100 0s66 14 100 0 66-14 100 0 66 14 100 0"
        stroke={c.ring}
        strokeOpacity=".6"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <g transform="translate(200 116) scale(1.35)">
        <Glyph kind={kind} c={c} />
      </g>
    </svg>
  );
}
