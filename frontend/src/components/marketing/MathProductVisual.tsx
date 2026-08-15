function SharedBackground() {
  return (
    <g>
      <rect
        x="10"
        y="10"
        width="700"
        height="556"
        rx="32"
        fill="#F8FAFC"
        stroke="#BFDBFE"
      />

      <rect
        x="10"
        y="10"
        width="700"
        height="556"
        rx="32"
        fill="url(#math-grid)"
      />

      <rect
        x="10"
        y="10"
        width="700"
        height="556"
        rx="32"
        fill="url(#math-light)"
      />
    </g>
  );
}

function FunctionGraph() {
  return (
    <g transform="translate(292 58)">
      {/* axes */}
      <g stroke="#475569" strokeWidth="1" opacity="0.72" strokeLinecap="round">
        <path d="M0 156H362" />
        <path d="M90 12V206" />
      </g>

      {/* arrow heads */}
      <path d="M362 156L353 151V161Z" fill="#475569" opacity="0.72" />
      <path d="M90 12L85 21H95Z" fill="#475569" opacity="0.72" />

      {/* subtle helper lines */}
      <g stroke="#CBD5E1" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.34">
        <path d="M90 76H128" />
        <path d="M128 76V156" />
        <path d="M224 182H270" />
        <path d="M224 156V182" />
      </g>

      {/* white backing stroke */}
      <path
        d="
          M10 188
          C34 110 62 58 104 76
          C138 90 150 150 198 176
          C238 196 281 175 311 101
          C327 63 340 35 354 18
        "
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        opacity="0.58"
        strokeLinecap="round"
      />

      {/* cubic curve */}
      <path
        d="
          M10 188
          C34 110 62 58 104 76
          C138 90 150 150 198 176
          C238 196 281 175 311 101
          C327 63 340 35 354 18
        "
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* labels */}
      <g fill="#334155" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic">
        <text x="370" y="160">x</text>
        <text x="100" y="22">y</text>
      </g>

      <text
        x="298"
        y="38"
        fill="#1D4ED8"
        fontFamily="Georgia, serif"
        fontSize="14"
        fontStyle="italic"
      >
        f(x)
      </text>
    </g>
  );
}

function OxyzSystem() {
  return (
    <g transform="translate(64 292)">
      {/* =========================
          1. OXY GROUND PLANE (Mặt phẳng đáy)
          Căn chỉnh song song tuyệt đối với trục Ox và Oy
         ========================= */}
      <polygon
        points="160,180 40,228 260,255 380,202"
        fill="#E0F2FE"
        fillOpacity="0.15"
        stroke="#7DD3FC"
        strokeWidth="1.2"
      />

      {/* =========================
          2. AXES (Hệ trục tọa độ)
          Gốc O tại (160, 180)
         ========================= */}
      <g stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round">
        {/* Ox: Hướng theo vector (-2.5, 1) */}
        <path d="M160 180 L60 220" />
        {/* Oy: Hướng theo vector (10, 1) */}
        <path d="M160 180 L360 200" />
        {/* Oz: Thẳng đứng */}
        <path d="M160 180 L160 30" />
      </g>

      {/* Mũi tên trục */}
      <path d="M60 220 L70 213 L72 224 Z" fill="#1E3A8A" />
      <path d="M360 200 L349 194 L351 205 Z" fill="#1E3A8A" />
      <path d="M160 30 L155 40 L165 40 Z" fill="#1E3A8A" />

      {/* Labels */}
      <g fill="#1E3A8A" fontFamily="Georgia, serif" fontSize="15" fontStyle="italic">
        <text x="45" y="220">x</text>
        <text x="368" y="195">y</text>
        <text x="170" y="38">z</text>
        <text x="145" y="196">O</text>
      </g>

      {/* Gốc tọa độ O */}
      <circle cx="160" cy="180" r="3.5" fill="#1E3A8A" />
      
      {/* =========================
          3. FLOATING PYRAMID (Chóp tứ giác đều)
          - Đã scale đáy to hơn và kéo đỉnh chóp cao lên
          - Tâm đáy neo cứng giữa Oxy Plane: (210, 216)
          - Đỉnh S mới vút cao: (210, 60)
         ========================= */}

      {/* Fill: Mặt bên trái phía trước (S B C) */}
      <polygon
        points="210,60 100,225 235,239"
        fill="#3B82F6"
        fillOpacity="0.15"
      />

      {/* Fill: Mặt bên phải phía trước (S C D) */}
      <polygon
        points="210,60 235,239 320,207"
        fill="#1D4ED8"
        fillOpacity="0.25"
      />

      <g strokeLinecap="round" strokeLinejoin="round">
        {/* === CÁC ĐƯỜNG NÉT ĐỨT (Khuất) === */}
        {/* Các cạnh khuất phía sau đáy (AB, AD) và cạnh bên (SA) */}
        <path
          d="
            M185 193 L100 225
            M185 193 L320 207
            M210 60 L185 193
          "
          stroke="#64748B"
          strokeWidth="1.2"
          strokeDasharray="5 4"
          opacity="0.9"
          fill="none"
        />

        {/* Hai đường chéo đáy (AC, BD) */}
        <path
          d="
            M185 193 L235 239
            M100 225 L320 207
          "
          stroke="#94A3B8"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
        />

        {/* === CÁC ĐƯỜNG NÉT LIỀN (Nhìn thấy) === */}
        {/* Các cạnh đáy nhìn thấy (BC, CD) */}
        <path
          d="M100 225 L235 239 L320 207"
          stroke="#1E3A8A"
          strokeWidth="1.4"
          fill="none"
        />

        {/* Các cạnh bên nhìn thấy (SB, SC, SD) */}
        <path
          d="
            M210 60 L100 225
            M210 60 L235 239
            M210 60 L320 207
          "
          stroke="#1E3A8A"
          strokeWidth="1.4"
          fill="none"
        />
      </g>

      {/* === CÁC ĐỈNH (Dots) === */}
      <g fill="#2563EB">
        {/* Đỉnh S */}
        <circle cx="210" cy="60" r="3.5" /> 
        {/* Tâm đáy chóp */}
        <circle cx="210" cy="216" r="2.5" fill="#64748B" /> 
        
        {/* Các góc đáy A, B, C, D */}
        <circle cx="185" cy="193" r="2.5" fill="#64748B" /> {/* Góc A (Khuất) */}
        <circle cx="100" cy="225" r="3" />  {/* Góc B */}
        <circle cx="235" cy="239" r="3" />  {/* Góc C */}
        <circle cx="320" cy="207" r="3" />  {/* Góc D */}
      </g>
    </g>
  );
}

function WireframeSphere() {
  return (
    <g
      className="hidden md:block"
      transform="translate(522 324)"
      strokeLinecap="round"
    >
      {/* sphere body */}
      <circle
        cx="80"
        cy="82"
        r="72"
        fill="url(#sphere-light)"
        stroke="#334155"
        strokeWidth="1.15"
        opacity="0.85"
      />

      {/* ========================================================= */}
      {/* LATITUDE                                                  */}
      {/* ========================================================= */}

      {/* rear upper latitude */}
      <path
        d="M8 82C8 56 152 56 152 82"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeDasharray="5 6"
        opacity="0.34"
      />

      {/* front lower latitude */}
      <path
        d="M8 82C8 108 152 108 152 82"
        fill="none"
        stroke="#475569"
        strokeWidth="0.95"
        opacity="0.62"
      />

      {/* subtle upper parallel */}
      <path
        d="M18 55C42 68 118 68 142 55"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="0.7"
        strokeDasharray="4 5"
        opacity="0.34"
      />

      {/* subtle lower parallel */}
      <path
        d="M18 109C42 96 118 96 142 109"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="0.7"
        opacity="0.34"
      />

      {/* ========================================================= */}
      {/* LONGITUDE                                                 */}
      {/* ========================================================= */}

      {/* front meridian */}
      <path
        d="M80 10C46 43 46 121 80 154"
        fill="none"
        stroke="#475569"
        strokeWidth="0.95"
        opacity="0.62"
      />

      {/* back meridian */}
      <path
        d="M80 10C114 43 114 121 80 154"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeDasharray="5 6"
        opacity="0.38"
      />

      {/* secondary meridians */}
      <path
        d="M48 18C68 50 68 114 48 146"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="0.65"
        opacity="0.3"
      />

      <path
        d="M112 18C92 50 92 114 112 146"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="0.65"
        opacity="0.3"
      />

      {/* center */}
      <circle
        cx="80"
        cy="82"
        r="2.5"
        fill="#2563EB"
        stroke="none"
      />
    </g>
  );
}

export function MathProductVisual() {
  return (
    <div className="relative isolate mx-auto aspect-[5/4] w-full max-w-3xl lg:max-w-none">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 720 576"
        fill="none"
      >
        <defs>
          {/* Background grid */}
          <pattern
            id="math-grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M30 0H0V30"
              stroke="#BFDBFE"
              strokeWidth="0.65"
              opacity="0.28"
            />
          </pattern>

          {/* Overall subtle lighting */}
          <radialGradient
            id="math-light"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(378 326) rotate(132) scale(420 380)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#DBEAFE" stopOpacity="0.68" />
            <stop
              offset="0.62"
              stopColor="#EFF6FF"
              stopOpacity="0.2"
            />
            <stop
              offset="1"
              stopColor="#F8FAFC"
              stopOpacity="0"
            />
          </radialGradient>

          {/* Ground plane */}
          <linearGradient
            id="oxy-plane"
            x1="190"
            y1="190"
            x2="210"
            y2="252"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#DBEAFE" stopOpacity="0.4" />
            <stop
              offset="1"
              stopColor="#BFDBFE"
              stopOpacity="0.12"
            />
          </linearGradient>

          {/* Sphere */}
          <radialGradient
            id="sphere-light"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(55 54) rotate(48) scale(110)"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              stopColor="#FFFFFF"
              stopOpacity="0.68"
            />
            <stop
              offset="0.7"
              stopColor="#DBEAFE"
              stopOpacity="0.17"
            />
            <stop
              offset="1"
              stopColor="#93C5FD"
              stopOpacity="0.05"
            />
          </radialGradient>
        </defs>

        <SharedBackground />
        <FunctionGraph />
        <OxyzSystem />
        <WireframeSphere />
      </svg>
    </div>
  );
}