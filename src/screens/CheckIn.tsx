import { useState } from 'react'
import { confirmCheckIn } from '../lib/entries'
import { notifyFall } from '../lib/notify'
import { OBJECTIVES, type ObjectiveKey } from '../lib/objectives'
import type { EntryStatus } from '../lib/scoring'

interface CheckInProps {
  /** Fecha (AR, 'YYYY-MM-DD') del día que se está reportando — siempre ayer. */
  date: string
  userId: string
  userName: string
  /** Racha personal antes de este check-in — si cae, es la racha que pierde. */
  currentStreak: number
  onDone: () => void
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

export function CheckIn({ date, userId, userName, currentStreak, onDone }: CheckInProps) {
  const [status, setStatus] = useState<EntryStatus | null>(null)
  const [objectives, setObjectives] = useState<Partial<Record<ObjectiveKey, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: ObjectiveKey) {
    setObjectives((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleConfirm() {
    if (!status) return
    setSubmitting(true)
    setError(null)
    try {
      await confirmCheckIn(date, status, objectives)
      if (status === 'caido') void notifyFall(userId, userName, currentStreak)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el reporte.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="text-center">
        <p className="font-stencil text-xs text-ink-light">Reporte del día {formatDate(date)}</p>
        <h1 className="mt-1 text-xl text-brown-dark">¿Cómo terminó el día?</h1>
      </header>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setStatus('en_pie')}
          className={`font-stencil border-4 px-4 py-8 text-2xl transition-colors ${
            status === 'en_pie'
              ? 'border-ink bg-brown-dark text-cream'
              : 'border-ink bg-cream text-ink'
          }`}
        >
          SIGO EN PIE
        </button>
        <button
          type="button"
          onClick={() => setStatus('caido')}
          className={`font-stencil border-2 px-4 py-3 text-base transition-colors ${
            status === 'caido' ? 'border-alert bg-alert text-cream' : 'border-alert text-alert'
          }`}
        >
          CAÍ
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-stencil text-xs text-ink-light">Objetivos del día</p>
        {OBJECTIVES.map((o) => (
          <label
            key={o.key}
            className="flex cursor-pointer items-center gap-3 border-2 border-ink bg-cream px-3 py-2"
          >
            <input
              type="checkbox"
              checked={objectives[o.key] ?? false}
              onChange={() => toggle(o.key)}
              className="h-5 w-5 accent-brown-dark"
            />
            <span className="flex-1 font-serif text-sm text-ink">{o.label}</span>
            <span className="font-stencil text-xs text-ink-light">+{o.points}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-center text-sm text-alert">{error}</p>}

      <button
        type="button"
        disabled={!status || submitting}
        onClick={handleConfirm}
        className="font-stencil border-2 border-ink bg-ink px-4 py-3 text-cream disabled:opacity-40"
      >
        {submitting ? 'Guardando...' : 'Confirmar'}
      </button>
    </div>
  )
}
