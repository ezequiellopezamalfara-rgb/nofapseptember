import { useRef, useState } from 'react'
import { toArgentinaDate } from '../lib/date'

const MOURNING_DATE = '2026-09-10'

export function FuneralTaps() {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  if (toArgentinaDate(new Date()) !== MOURNING_DATE) return null

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play()
    }
    setPlaying(!playing)
  }

  return (
    <>
      <audio ref={audioRef} src="/trompeta-funeral.mp3" loop />
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
