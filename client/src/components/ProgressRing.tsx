
export function ProgressRing({ ratio, seconds, size = 64 }: { ratio: number; seconds: number; size?: number; }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, ratio));
  const dashoffset = circumference * (1 - clamped);
  const urgent = clamped < 0.25;

  return (
    <div className={`progress-ring ${urgent ? "is-urgent" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={urgent ? "#FB5050" : "#16C7B7"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.25s" }}
        />
      </svg>
      <span className={urgent ? "text-danger" : "text-mist-100"} style={{ fontSize: size * 0.31 }}>{seconds}</span>
    </div>
  );
}
