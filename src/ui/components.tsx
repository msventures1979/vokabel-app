import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useMemo } from 'react'

export const JERSEY_COLORS = ['#e63946', '#1d4ed8', '#f4f1e8', '#111827', '#ffc940', '#7c3aed', '#f97316', '#0ea5e9']

export function Jersey({ color, number, size = 96 }: { color: string; number: number | string; size?: number }) {
  const light = ['#f4f1e8', '#ffc940', '#0ea5e9', '#f97316'].includes(color)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path
        d="M30 12 L42 8 Q50 16 58 8 L70 12 L92 26 L82 44 L72 38 L72 92 L28 92 L28 38 L18 44 L8 26 Z"
        fill={color}
        stroke="rgba(0,0,0,.35)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M42 8 Q50 16 58 8" fill="none" stroke={light ? '#0b3d2a' : '#f4f1e8'} strokeWidth="3" />
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily="Barlow Condensed, sans-serif"
        fontWeight="800"
        fontSize="36"
        fill={light ? '#0b3d2a' : '#f4f1e8'}
      >
        {number}
      </text>
    </svg>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'chalk' | 'danger'; size?: 'lg' | 'md' | 'sm' }
export function Btn({ variant = 'primary', size = 'lg', className = '', ...rest }: BtnProps) {
  const v = {
    primary: 'bg-lime text-pitch shadow-[0_4px_0_#7ea32a] active:translate-y-[3px] active:shadow-[0_1px_0_#7ea32a]',
    chalk: 'bg-chalk text-pitch shadow-[0_4px_0_#b9b3a3] active:translate-y-[3px] active:shadow-[0_1px_0_#b9b3a3]',
    ghost: 'bg-white/5 text-chalk ring-1 ring-white/20 active:bg-white/10',
    danger: 'bg-flag text-white',
  }[variant]
  const s = { lg: 'px-6 py-4 text-2xl', md: 'px-5 py-3 text-lg', sm: 'px-3 py-2 text-sm' }[size]
  return (
    <button
      className={`font-display font-extrabold uppercase rounded-2xl transition disabled:opacity-40 disabled:pointer-events-none ${v} ${s} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-pitch-2/90 ring-1 ring-white/10 p-4 ${className}`}>{children}</div>
}

export function Meter({ value, max, label, done }: { value: number; max: number; label: string; done?: boolean }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-sm text-chalk/70 mb-1">
        <span>{label}</span>
        <span className={`font-display text-lg ${done ? 'text-lime' : 'text-chalk'}`}>
          {Math.floor(value)} / {max}
        </span>
      </div>
      <div className="h-3 rounded-full bg-black/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-lime' : 'bg-chalk/80'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Ball rollt mit jedem Trainingstag Richtung Tor.
export function GoalTrack({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const reached = pct >= 1
  return (
    <div className="relative h-16 rounded-2xl bg-pitch-3/60 ring-1 ring-white/10 overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-white/25" />
      {/* Tor */}
      <div
        className={`absolute right-0 top-2 bottom-2 w-7 rounded-l-md border-2 border-r-0 border-chalk ${reached ? 'animate-net bg-lime/30' : ''}`}
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 2px, transparent 2px 6px)' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 transition-all duration-700"
        style={{ left: `calc(${pct * 100}% * 0.86 + 6px)` }}
      >
        <Ball size={34} />
      </div>
    </div>
  )
}

export function Ball({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#f4f1e8" stroke="#0b3d2a" strokeWidth="2" />
      <polygon points="20,12 27,17 24.5,25 15.5,25 13,17" fill="#0b3d2a" />
      <path d="M20 12 L20 3 M27 17 L35 13 M24.5 25 L30 33 M15.5 25 L10 33 M13 17 L5 13" stroke="#0b3d2a" strokeWidth="1.6" />
    </svg>
  )
}

export function Star({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" fill="#ffc940" />
    </svg>
  )
}

export function SpeakerIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" />
    </svg>
  )
}

export function BackIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function FlameIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2c1 4 5 5.5 5 11a5 5 0 01-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3 0-3-1-6 0-9z" fill="#ff5a36" />
    </svg>
  )
}

export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.8,
        color: ['#c8f560', '#ffc940', '#f4f1e8', '#ff5a36', '#0ea5e9'][i % 5],
      })),
    [count],
  )
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece rounded-sm"
          style={{ left: `${p.left}vw`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </>
  )
}

export function TopBar({ onBack, title, right }: { onBack?: () => void; title?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 h-12">
      {onBack && (
        <button onClick={onBack} className="h-10 w-10 grid place-items-center rounded-xl bg-white/5 ring-1 ring-white/15" aria-label="Zurück">
          <BackIcon />
        </button>
      )}
      <div className="flex-1 font-display text-xl font-semibold uppercase tracking-wide truncate">{title}</div>
      {right}
    </div>
  )
}
