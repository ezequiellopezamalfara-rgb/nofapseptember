import { isIosSafariNotInstalled } from '../lib/push'

export function InstallBanner() {
  if (!isIosSafariNotInstalled()) return null

  return (
    <div className="border-b-2 border-alert bg-cream px-4 py-2 text-center">
      <p className="font-serif text-xs text-alert">
        Sin instalar no vas a recibir avisos. Compartir → Agregar a pantalla de inicio.
      </p>
    </div>
  )
}
