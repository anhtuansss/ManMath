import Image from 'next/image';

export function MathProductVisual() {
  return (
    <div className="relative isolate mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden lg:max-w-none">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full text-primary/70"
        viewBox="0 0 720 540"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="manmath-hero-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" stroke="currentColor" strokeWidth="0.75" />
          </pattern>
        </defs>

        <rect width="720" height="540" fill="url(#manmath-hero-grid)" opacity="0.16" />

        <g opacity="0.9" transform="translate(0 -26)">
          <path d="M54 188H494" stroke="#0F172A" strokeWidth="1.1" opacity="0.72" />
          <path d="M216 38V230" stroke="#0F172A" strokeWidth="1.1" opacity="0.72" />
          <path d="M494 188L486 184V192Z" fill="#0F172A" opacity="0.76" />
          <path d="M216 38L212 46H220Z" fill="#0F172A" opacity="0.76" />
          <g stroke="#0F172A" strokeWidth="1" opacity="0.66">
            <path d="M120 183V193M152 183V193M184 183V193M216 183V193M248 183V193M280 183V193M312 183V193" />
            <path d="M211 156H221M211 124H221M211 92H221" />
          </g>
          <path
            d="M72 114C110 174 146 190 184 150C218 114 246 52 286 84C330 120 360 198 430 66L430 188H72Z"
            fill="currentColor"
            opacity="0.08"
          />
          <path
            d="M72 114C110 174 146 190 184 150C218 114 246 52 286 84C330 120 360 198 430 66"
            stroke="currentColor"
            strokeWidth="2.75"
          />
          <circle cx="286" cy="84" r="3.5" fill="currentColor" />
          <text x="474" y="178" fill="currentColor" fontSize="13" fontWeight="500">x</text>
          <text x="225" y="56" fill="currentColor" fontSize="13" fontWeight="500">y</text>
          <g fill="#555555" fontSize="11" fontWeight="500" textAnchor="middle">
            <text x="120" y="208">-3</text>
            <text x="152" y="208">-2</text>
            <text x="184" y="208">-1</text>
            <text x="220" y="208">0</text>
            <text x="248" y="208">1</text>
            <text x="280" y="208">2</text>
            <text x="312" y="208">3</text>
          </g>
          <g fill="#555555" fontSize="11" fontWeight="500" textAnchor="end">
            <text x="202" y="160">1</text>
            <text x="202" y="128">2</text>
            <text x="202" y="96">3</text>
          </g>
        </g>
        <text x="408" y="34" fill="currentColor" fontSize="16" fontWeight="500">f(x) = ax² + bx + c</text>

        <g className="hidden text-text-primary lg:block" opacity="0.74">
          <g transform="translate(0 50) translate(632 112) scale(1.2) translate(-632 -112)" >
            <circle cx="632" cy="112" r="58" stroke="currentColor" strokeWidth="1.5" />
            <path d="M574 112C574 85 690 85 690 112" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 5" opacity="0.76" />
            <path d="M574 112C574 139 690 139 690 112" stroke="currentColor" strokeWidth="1.4" />
            <path d="M632 54C603 80 603 144 632 170" stroke="currentColor" strokeWidth="1.45" />
            <path d="M632 54C661 80 661 144 632 170" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 5" opacity="0.76" />
          </g>

        </g>
      </svg>

      <div className="absolute bottom-3 left-3 z-10 w-[92%] overflow-hidden rounded-xl border border-primary/20 bg-surface p-2 ring-1 ring-white shadow-[0_26px_54px_rgba(37,99,235,0.16),0_10px_24px_rgba(15,23,42,0.10)] sm:bottom-[10%] sm:left-[8%] sm:w-[80%] sm:p-3 lg:bottom-[8%] lg:left-[6%] lg:w-[74%]">
        <div className="aspect-[16/9] overflow-hidden rounded-xl bg-background-alt">
          <Image
            src="/images/landing/exam-workspace.webp"
            alt="Giao diện làm đề ManMath với đồng hồ, câu hỏi, đáp án và điều hướng câu hỏi."
            width={1424}
            height={805}
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 88vw, 58vw"
            className="h-full max-w-none w-[calc(100%+14px)] object-cover object-left-top brightness-[0.99] contrast-[1.12] saturate-[1.04]"
          />
        </div>
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full text-text-primary lg:block"
        viewBox="0 0 720 540"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.74" transform="translate(0 100) translate(633 302) scale(1.1) translate(-633 -302)">
          <path d="M632 232L566 334L636 372L700 334L632 232" stroke="currentColor" strokeWidth="1.45" />
          <path d="M632 232L636 372" stroke="currentColor" strokeWidth="1.45" />
          <path d="M566 334L700 334" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 5" opacity="0.72" />
          <text x="627" y="222" fill="currentColor" fontSize="13" fontWeight="500">S</text>
          <text x="552" y="337" fill="currentColor" fontSize="13" fontWeight="500">A</text>
          <text x="705" y="337" fill="currentColor" fontSize="13" fontWeight="500">B</text>
          <text x="632" y="390" fill="currentColor" fontSize="13" fontWeight="500">C</text>
        </g>
      </svg>
    </div>
  );
}
