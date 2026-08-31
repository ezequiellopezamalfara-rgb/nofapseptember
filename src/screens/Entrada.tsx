import { useEffect, useState } from 'react'
import { ensureAnonymousSession, setAppSession, type AppSession } from '../lib/auth'
import { isIosSafariNotInstalled, subscribeToPush } from '../lib/push'
import { claimUser, nameExists } from '../lib/users'

type Step = 'access' | 'name' | 'pin' | 'push'

interface EntradaProps {
  onDone: (session: AppSession) => void
}

export function Entrada({ onDone }: EntradaProps) {
  const [step, setStep] = useState<Step>('access')
  const [accessCode, setAccessCode] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [isNewName, setIsNewName] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [newSession, setNewSession] = useState<AppSession | null>(null)

  useEffect(() => {
    ensureAnonymousSession().catch(() => {
      setError('No se pudo iniciar sesión. Revisá tu conexión e intentá de nuevo.')
    })
  }, [])

  async function handleAccessSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (accessCode.trim() !== import.meta.env.VITE_ACCESS_CODE) {
      setError('Código de acceso incorrecto.')
      return
    }
    setStep('name')
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Ingresá un nombre.')
      return
    }
    setSubmitting(true)
    try {
      const exists = await nameExists(trimmed)
      setIsNewName(!exists)
      setName(trimmed)
      setStep('pin')
    } catch {
      setError('No se pudo verificar el nombre. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{4}$/.test(pin)) {
      setError('El PIN tiene que ser de 4 dígitos.')
      return
    }
    setSubmitting(true)
    try {
      const user = await claimUser(name, pin)
      setAppSession(user)
      setNewSession(user)
      setStep('push')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN incorrecto.')
      setPin('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivatePush() {
    if (!newSession) return
    setSubmitting(true)
    try {
      await subscribeToPush(newSession.id)
    } catch {
      // no bloquea el alta si falla la suscripción
    } finally {
      setSubmitting(false)
      onDone(newSession)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-xl text-brown-dark">Operación NoFap September</h1>
        <p className="mt-1 text-sm text-ink-light">Acceso restringido al pelotón</p>
      </header>

      {step === 'access' && (
        <form onSubmit={handleAccessSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <label className="font-stencil text-xs text-ink-light">Código de acceso</label>
          <input
            autoFocus
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="border-2 border-ink bg-cream px-3 py-2 font-serif text-ink outline-none"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            className="font-stencil border-2 border-ink bg-brown-dark px-4 py-3 text-cream"
          >
            Entrar
          </button>
        </form>
      )}

      {step === 'name' && (
        <form onSubmit={handleNameSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <label className="font-stencil text-xs text-ink-light">Tu nombre</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-2 border-ink bg-cream px-3 py-2 font-serif text-ink outline-none"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="font-stencil border-2 border-ink bg-brown-dark px-4 py-3 text-cream disabled:opacity-50"
          >
            {submitting ? 'Verificando...' : 'Siguiente'}
          </button>
        </form>
      )}

      {step === 'pin' && (
        <form onSubmit={handlePinSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <label className="font-stencil text-xs text-ink-light">
            {isNewName ? `Elegí un PIN de 4 dígitos para ${name}` : `PIN de ${name}`}
          </label>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="border-2 border-ink bg-cream px-3 py-2 text-center font-serif text-2xl tracking-[0.5em] text-ink outline-none"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="font-stencil border-2 border-ink bg-brown-dark px-4 py-3 text-cream disabled:opacity-50"
          >
            {submitting ? 'Confirmando...' : isNewName ? 'Crear cuenta' : 'Confirmar'}
          </button>
        </form>
      )}

      {step === 'push' && newSession && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {isIosSafariNotInstalled() ? (
            <div className="border-2 border-alert bg-cream px-4 py-3">
              <p className="font-stencil text-xs text-alert">Instalá la app para recibir avisos</p>
              <p className="mt-2 font-serif text-sm text-ink">
                En iPhone, Safari no permite notificaciones sin instalar. Tocá el botón{' '}
                <strong>Compartir</strong> y elegí <strong>Agregar a pantalla de inicio</strong>.
              </p>
              <button
                onClick={() => onDone(newSession)}
                className="font-stencil mt-3 w-full border-2 border-ink bg-brown-dark px-4 py-3 text-cream"
              >
                Entendido
              </button>
            </div>
          ) : (
            <>
              <p className="text-center font-serif text-sm text-ink-light">
                Recibí un aviso a las 9 y a las 21 si te falta reportar, y cuando alguien caiga en
                combate.
              </p>
              <button
                onClick={handleActivatePush}
                disabled={submitting}
                className="font-stencil border-2 border-ink bg-brown-dark px-4 py-3 text-cream disabled:opacity-50"
              >
                {submitting ? 'Activando...' : 'Activar notificaciones'}
              </button>
              <button
                onClick={() => onDone(newSession)}
                className="font-stencil text-xs text-ink-light underline"
              >
                Ahora no
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
