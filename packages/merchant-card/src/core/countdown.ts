export interface Remaining {
  expired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
}

export function remaining(endsAt: number, now: number): Remaining {
  const diff = Math.max(0, endsAt - now);
  const total = Math.floor(diff / 1000);
  return {
    expired: diff === 0,
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function formatRemaining(r: Remaining): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`;
}
