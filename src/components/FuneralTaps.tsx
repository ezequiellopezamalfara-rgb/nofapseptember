import { useEffect, useRef, useState } from 'react'
import { toArgentinaDate } from '../lib/date'

const MOURNING_DATE = '2026-09-10'
const isMourningDay = toArgentinaDate(new Date()) === MOURNING_DATE

export function FuneralTaps() {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!isMourningDay) return
    const audio = audioRef.current
    if (!audio) return

    // Los navegadores bloquean el autoplay con sonido sin interacción previa:
    // si play() falla, arrancamos apenas el usuario toque cualquier cosa.
    audio.play().catch(() => {
      document.addEventListener('pointerdown', () => void audio.play(), { once: true })
    })
  }, [])

  if (!isMourningDay) return null

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play()
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src="/trompeta-funeral.mp3"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar trompeta funeral' : 'Reproducir trompeta funeral'}
        className="font-stencil fixed right-4 bottom-20 z-50 flex h-12 w-12 items-center justify-center border-2 border-ink bg-brown-dark text-cream shadow-lg"
      >
        {playing ? '❚❚' : '▶'}
      </button>
    </>
  )
}
