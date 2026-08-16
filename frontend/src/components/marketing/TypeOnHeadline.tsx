'use client';

import { useEffect, useState } from 'react';

const headline = 'Luyện đề Toán như một buổi thi thật';
const characters = Array.from(headline);

type HeadlineLinesProps = {
  className: string;
  lines: readonly string[];
  revealed: number;
};

function HeadlineLines({ className, lines, revealed }: HeadlineLinesProps) {
  let offset = 0;

  return (
    <span aria-hidden="true" className={className}>
      {lines.map((line) => {
        const visibleCharacters = Math.max(0, Math.min(line.length, revealed - offset));
        const visibleLine = line.slice(0, visibleCharacters);
        const showCursor = revealed >= offset && revealed < offset + line.length;

        offset += line.length + 1;

        return (
          <span key={line} className="block min-h-[1.08em] whitespace-nowrap">
            {visibleLine}
            {showCursor ? <span className="landing-type-cursor">|</span> : null}
          </span>
        );
      })}
    </span>
  );
}

export function TypeOnHeadline() {
  const [revealed, setRevealed] = useState(characters.length);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let interval: number | undefined;
    const startAnimation = window.setTimeout(() => {
      setRevealed(0);

      let nextCharacter = 0;
      interval = window.setInterval(() => {
        nextCharacter += 1;
        setRevealed(nextCharacter);

        if (nextCharacter === characters.length) {
          window.clearInterval(interval);
        }
      }, 60);
    }, 80);

    return () => {
      window.clearTimeout(startAnimation);
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, []);

  return (
    <h1
      aria-label={headline}
      className="mt-4 max-w-[540px] text-[38px] font-bold leading-[1.08] tracking-[-0.038em] sm:text-[48px] sm:leading-[1.06] lg:text-[52px] xl:text-[56px]"
    >
      <HeadlineLines revealed={revealed} className="sm:hidden" lines={['Luyện đề Toán', 'như một', 'buổi thi thật.']} />
      <HeadlineLines revealed={revealed} className="hidden sm:block lg:hidden" lines={['Luyện đề Toán', 'như một buổi', 'thi thật.']} />
      <HeadlineLines revealed={revealed} className="hidden lg:block xl:hidden" lines={['Luyện đề Toán', 'như một buổi', 'thi thật.']} />
      <HeadlineLines revealed={revealed} className="hidden xl:block" lines={['Luyện đề Toán như', 'một buổi thi thật.']} />
    </h1>
  );
}
