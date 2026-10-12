type TimerDisplayProps = {
  remainingSeconds: number;
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function TimerDisplay({ remainingSeconds }: TimerDisplayProps) {
  const isTimeDanger = remainingSeconds <= 60;
  const isTimeWarning = remainingSeconds > 60 && remainingSeconds < 300;

  return (
    <div
      aria-live="polite"
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 transition-colors duration-200 ${isTimeDanger
          ? 'border-error bg-error/10 text-error ring-1 ring-error/30 motion-safe:animate-timer-pulse'
          : isTimeWarning
            ? 'border-warning-border bg-warning-light text-warning'
            : 'border-border bg-background text-text-primary'
        }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 1.5a.75.75 0 0 1 .743.648L8.75 5.25v2.44l1.78 1.78a.75.75 0 0 1-.976 1.133l-.084-.073-2-2a.75.75 0 0 1-.213-.442L7.25 8V5.25A.75.75 0 0 1 8 4.5Z"
          fill="currentColor"
        />
      </svg>
      <span className="hidden text-xs font-semibold sm:inline">Thời gian</span>
      <span className="font-mono text-base font-semibold tabular-nums">
        {remainingSeconds === 0 ? 'Hết giờ' : formatTime(remainingSeconds)}
      </span>
    </div>
  );
}
