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
      {/* =========================
          1. LƯỚI TỌA ĐỘ VÀ TRỤC
         ========================= */}
      <g stroke="#475569" strokeWidth="1.1" opacity="0.8" strokeLinecap="round">
        {/* Trục Ox */}
        <path d="M10 140H350" />
        {/* Trục Oy */}
        <path d="M160 10V270" />
      </g>

      {/* Mũi tên */}
      <path d="M350 140L341 135V145Z" fill="#475569" opacity="0.8" />
      <path d="M160 10L155 19H165Z" fill="#475569" opacity="0.8" />

      {/* =========================
          2. CÁC MỨC ĐỘ DÀI (Tick marks)
         ========================= */}
      <g stroke="#475569" strokeWidth="1" opacity="0.6">
        {/* Ticks trên Ox (Mỗi đơn vị = 40px) */}
        <path d="M80 137V143 M120 137V143 M200 137V143 M240 137V143 M280 137V143 M320 137V143" />
        {/* Ticks trên Oy */}
        <path d="M157 60H163 M157 100H163 M157 180H163 M157 220H163" />
      </g>

      {/* Nhãn giá trị (Labels cho các vạch chia) */}
      <g fill="#64748B" fontFamily="Georgia, serif" fontSize="11" opacity="0.9">
        {/* Ox labels */}
        <text x="74" y="158">-2</text>
        <text x="114" y="158">-1</text>
        <text x="197" y="158">1</text>
        <text x="237" y="158">2</text>
        <text x="277" y="158">3</text>
        {/* Oy labels */}
        <text x="142" y="104">1</text>
        <text x="142" y="64">2</text>
        <text x="138" y="184">-1</text>
        <text x="138" y="224">-2</text>
        {/* Gốc O */}
        <text x="145" y="156" fontStyle="italic" fontSize="12">O</text>
      </g>

      {/* =========================
          3. ĐƯỜNG GIÓNG ĐIỂM CỰC TRỊ
          - Tọa độ toán học chính xác 100% không lệch pixel
         ========================= */}
      <g stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" opacity="0.6">
        <path d="M 103.4 140 V 100 H 160" />
        <path d="M 216.6 140 V 180 H 160" />
      </g>

      <g fill="#2563EB">
        {/* Chấm tròn tại điểm cực đại & cực tiểu */}
        <circle cx="103.4" cy="100" r="3" />
        <circle cx="216.6" cy="180" r="3" />
        {/* Chấm điểm uốn (giao với O) */}
        <circle cx="160" cy="140" r="2.5" fill="#475569" opacity="0.8"/>
      </g>

      {/* =========================
          4. ĐỒ THỊ HÀM BẬC 3 (Cubic Curve)
          - Phủ chính xác qua các đỉnh điểm cực trị
         ========================= */}

         <style>
        {`
          @keyframes drawCurve {
            from {
              stroke-dashoffset: 1000;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          .animate-draw {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            /* Thời gian chạy 2s, chạy mượt dần và dừng lại ở trạng thái cuối */
            animation: drawCurve 5s ease-in-out forwards;
          }
        `}
      </style>

      {/* White backing (Tạo viền trắng mờ để nổi bật đường cong) */}
      <path
        className="animate-draw"
        d="M 40 203.6 C 126.7 -118.1 213.3 456.4 300 -14.7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        opacity="0.6"
        strokeLinecap="round"
      />

      {/* Đường cong chính */}
      <path
        className="animate-draw"
        d="M 40 203.6 C 126.7 -118.1 213.3 456.4 300 -14.7"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* =========================
          5. NHÃN TÊN TRỤC & ĐỒ THỊ
         ========================= */}
      <g fill="#334155" fontFamily="Georgia, serif" fontStyle="italic">
        <text x="356" y="145" fontSize="14">x</text>
        <text x="172" y="20" fontSize="14">y</text>

        {/* Nhãn y = f(x) neo theo đuôi đường cong */}
        <text x="310" y="-5" fill="#1D4ED8" fontSize="15" fontWeight="500">
          y = f(x)
        </text>
      </g>
    </g>
  );
}

function OxyzSystem() {
  return (
    <g transform="translate(20 230)">
{/* ========================================================= */}
      {/* NHÚNG CSS ANIMATION CHO HỆ OXYZ VÀ KHỐI CHÓP                */}
      {/* ========================================================= */}
      <style>
        {`
          /* Hiệu ứng tự vẽ nét cho trục tọa độ và cạnh chóp */
          @keyframes drawPath3D {
            to { stroke-dashoffset: 0; }
          }

          /* Hiệu ứng hiện dần lên */
          @keyframes fadeIn3D {
            to { opacity: 1; }
          }

          /* Áp dụng: Trục tọa độ vẽ nhanh ngay từ đầu */
          .draw-axes {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: drawPath3D 1.5s ease-out forwards;
          }

          /* Áp dụng: Cạnh chóp bắt đầu vẽ SAU KHI trục đã vẽ xong (delay 1s) */
          .draw-pyramid {
            stroke-dasharray: 800;
            stroke-dashoffset: 800;
            animation: drawPath3D 2s ease-out 1s forwards;
          }

          /* Mặt đáy và gốc O hiện sớm */
          .fade-early {
            opacity: 0;
            animation: fadeIn3D 1.5s ease-out 0.5s forwards;
          }

          /* Mặt chóp và nét đứt hiện trễ cùng lúc cạnh chóp vẽ */
          .fade-late {
            opacity: 0;
            animation: fadeIn3D 2.5s ease-out 1.2s forwards;
          }
        `}
      </style>

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
        className="fade-early"
      />

      {/* =========================
          2. AXES (Hệ trục tọa độ)
          Gốc O tại (160, 180)
         ========================= */}
      <g stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" className="draw-axes">
        {/* Ox: Hướng theo vector (-2.5, 1) */}
        <path d="M160 180 L60 220" />
        {/* Oy: Hướng theo vector (10, 1) */}
        <path d="M160 180 L360 200" />
        {/* Oz: Thẳng đứng */}
        <path d="M160 180 L160 30" />
      </g>

      <g className="fade-early">
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
      </g>
      {/* =========================
          3. FLOATING PYRAMID
          (Được bọc trong thẻ g để áp dụng hiệu ứng bay lơ lửng)
         ========================= */}

        {/* Fill: Mặt bên trái phía trước (S B C) */}
        <g className="fade-late">
          <polygon
            points="210,60 100,225 235,239"
            fill="#3B82F6"
            fillOpacity="0.15"
          />
          <polygon
            points="210,60 235,239 320,207"
            fill="#1D4ED8"
            fillOpacity="0.25"
          />
        </g>

        <g strokeLinecap="round" strokeLinejoin="round">
          {/* === CÁC ĐƯỜNG NÉT ĐỨT (Khuất) === */}
          <g className="fade-late">
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
          </g>

          {/* === CÁC ĐƯỜNG NÉT LIỀN (Nhìn thấy) === */}
          <path
            d="M100 225 L235 239 L320 207"
            stroke="#1E3A8A"
            strokeWidth="1.4"
            fill="none"
            className="draw-pyramid"
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
            className="draw-pyramid"
          />
        </g>

        {/* === CÁC ĐỈNH (Dots) === */}
        <g fill="#2563EB" className="fade-late">
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
      transform="translate(470 324) scale(1.2)"
      strokeLinecap="round"
    >
      {/* NHÚNG CSS ANIMATION CHO HÌNH CẦU */}
      <style>
        {`
          /* Hiệu ứng lơ lửng */
          @keyframes floatSphere {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }

          /* Hiệu ứng tự vẽ cho các đường NÉT LIỀN (chu vi vòng tròn r=72 là ~452, nên 500 là đủ bọc kín) */
          @keyframes drawSolidLines {
            from { stroke-dashoffset: 500; stroke-dasharray: 500; }
            to { stroke-dashoffset: 0; stroke-dasharray: 500; }
          }

          /* Hiệu ứng mờ dần lên cho các đường NÉT ĐỨT (để không phá vỡ cấu trúc đứt đoạn) */
          @keyframes fadeInDashed {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          /* Hiệu ứng nhịp đập tâm O */
          @keyframes pulseCore {
            0%, 100% { transform: scale(1); opacity: 0.8; stroke-width: 1.5; }
            50% { transform: scale(1.3); opacity: 1; stroke-width: 3; stroke: #93C5FD; }
          }

          /* Các class áp dụng hiệu ứng */
          .sphere-float {
            animation: floatSphere 4s ease-in-out infinite;
          }
          .line-draw {
            animation: drawSolidLines 4s ease-out forwards;
          }
          .line-fade {
            animation: fadeInDashed 2.5s ease-out forwards;
          }
          .core-pulse {
            transform-origin: 80px 82px; /* Lấy tọa độ cx, cy làm gốc */
            animation: pulseCore 2s ease-in-out infinite;
          }
        `}
      </style>

      {/* Bao bọc tất cả bằng group có hiệu ứng Lơ lửng */}
      <g className="sphere-float">

        {/* 1. VỎ NGOÀI (Nét liền -> Dùng line-draw) */}
        <circle
          cx="80"
          cy="82"
          r="72"
          fill="#F8FAFC"
          fillOpacity="0.8"
          stroke="#334155"
          strokeWidth="1.5"
          className="line-draw"
        />

        {/* 2. KINH/VĨ TUYẾN PHÍA SAU (Nét đứt -> Dùng line-fade để giữ nét đứt) */}
        <g className="line-fade">
          <g fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" opacity="0.6">
            <path d="M 8 82 A 72 24 0 0 1 152 82" />
            <path d="M 80 10 A 24 72 0 0 1 80 154" />
          </g>
        </g>

        {/* 4. KINH/VĨ TUYẾN PHÍA TRƯỚC (Nét liền -> Dùng line-draw) */}
        <g fill="none" stroke="#334155" strokeWidth="1.2" opacity="0.85">
          <path d="M 8 82 A 72 24 0 0 0 152 82" className="line-draw" />
          <path d="M 80 10 A 24 72 0 0 0 80 154" className="line-draw" />
        </g>

        {/* 5. TÂM O VÀ NHÃN */}
        <g>
          {/* Chấm xanh nhấp nháy */}
          <circle
            cx="80"
            cy="82"
            r="3.5"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            className="core-pulse"
          />
          {/* Nhãn O hiện lên sau 2s */}
          <text
            x="88"
            y="98"
            fill="#334155"
            fontFamily="Georgia, serif"
            fontSize="14"
            fontStyle="italic"
            opacity="0"
            style={{ animation: 'fadeInDashed 0.5s ease-in 2s forwards' }}
          >
            O
          </text>
        </g>
      </g>
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
