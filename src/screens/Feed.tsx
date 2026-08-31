import { useEffect, useState } from 'react'
import type { UserWithEntries } from '../lib/data'
import { buildFeed } from '../lib/feed'
import { isSingleEmoji } from '../lib/emoji'
import {
  deleteAnnouncement,
  fetchAnnouncements,
  postAnnouncement,
  removeReaction,
  setReaction,
  type Announcement,
} from '../lib/announcements'

interface FeedProps {
  all: UserWithEntries[]
  userId: string
  isAdmin: boolean
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

interface ReactionsRowProps {
  announcement: Announcement
  userId: string
  onChanged: () => void
}

function ReactionsRow({ announcement, userId, onChanged }: ReactionsRowProps) {
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState(false)

  async function handleTap(emoji: string) {
    if (emoji === announcement.myReaction) {
      await removeReaction(announcement.id, userId)
    } else {
      await setReaction(announcement.id, userId, emoji)
    }
    onChanged()
  }

  async function handleSubmitDraft(e: React.FormEvent) {
    e.preventDefault()
    const emoji = draft.trim()
    if (!emoji) return
    if (!isSingleEmoji(emoji)) {
      setDraftError(true)
      return
    }
    await setReaction(announcement.id, userId, emoji)
    setDraft('')
    setDraftError(false)
    setPicking(false)
    onChanged()
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {announcement.reactionCounts.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleTap(r.emoji)}
          className={`flex items-center gap-1 border px-1.5 py-0.5 text-xs ${
            r.emoji === announcement.myReaction
              ? 'border-brown-dark bg-beige'
              : 'border-ink-light/40'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-stencil text-[0.6rem] text-ink-light">{r.count}</span>
        </button>
      ))}
      {picking ? (
        <form onSubmit={handleSubmitDraft} className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setDraftError(false)
            }}
            maxLength={8}
            placeholder="😀"
            className={`w-12 border bg-paper px-1 py-0.5 text-center text-sm outline-none ${
              draftError ? 'border-alert' : 'border-ink-light/40'
            }`}
          />
          <button type="submit" className="font-stencil text-xs text-ink-light">
            ok
          </button>
          {draftError && <span className="text-[0.6rem] text-alert">solo 1 emoji</span>}
        </form>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="border border-dashed border-ink-light/40 px-1.5 py-0.5 text-xs text-ink-light"
        >
          +
        </button>
      )}
    </div>
  )
}

export function Feed({ all, userId, isAdmin }: FeedProps) {
  const events = buildFeed(all, new Date())
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)
  const [composing, setComposing] = useState(false)
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reloadAnnouncements() {
    setAnnouncements(await fetchAnnouncements(userId))
  }

  useEffect(() => {
    void reloadAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- userId es estable durante la vida de Feed
  }, [userId])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await postAnnouncement(userId, message.trim(), imageFile)
      setMessage('')
      setImageFile(null)
      setComposing(false)
      await reloadAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el comunicado.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteAnnouncement(id)
    await reloadAnnouncements()
  }

  type Item =
    | { key: string; sortKey: string; kind: 'event'; event: (typeof events)[number] }
    | { key: string; sortKey: string; kind: 'announcement'; announcement: Announcement }

  const items: Item[] = [
    ...events.map((e) => ({
      key: e.id,
      sortKey: `${e.date}T12:00:00`,
      kind: 'event' as const,
      event: e,
    })),
    ...(announcements ?? []).map((a) => ({
      key: a.id,
      sortKey: a.createdAt,
      kind: 'announcement' as const,
      announcement: a,
    })),
  ].sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))

  return (
    <div className="flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8">
      <h1 className="mb-4 text-center text-xl text-brown-dark">Feed</h1>

      {isAdmin && (
        <div className="mb-4 border-2 border-ink bg-cream p-3">
          {!composing ? (
            <button
              onClick={() => setComposing(true)}
              className="font-stencil w-full border-2 border-ink bg-brown-dark px-3 py-2 text-xs text-cream"
            >
              Publicar comunicado
            </button>
          ) : (
            <form onSubmit={handlePost} className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Comunicado del mando..."
                rows={3}
                className="border-2 border-ink bg-paper px-2 py-1 font-serif text-sm text-ink outline-none"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="font-serif text-xs text-ink-light"
              />
              {error && <p className="text-xs text-alert">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="font-stencil flex-1 border-2 border-ink bg-brown-dark px-3 py-2 text-xs text-cream disabled:opacity-50"
                >
                  {submitting ? 'Publicando...' : 'Publicar'}
                </button>
                <button
                  type="button"
                  onClick={() => setComposing(false)}
                  className="font-stencil border-2 border-ink px-3 py-2 text-xs text-ink-light"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-center font-serif text-sm text-ink-light">Todavía no hay novedades.</p>
        )}
        {items.map((item) =>
          item.kind === 'announcement' ? (
            <div key={item.key} className="border-2 border-alert-dark bg-cream px-3 py-2">
              <p className="font-stencil text-[0.65rem] text-alert-dark">Comunicado del mando</p>
              <p className="mt-1 whitespace-pre-wrap font-serif text-sm text-ink">
                {item.announcement.message}
              </p>
              {item.announcement.imageUrl && (
                <img
                  src={item.announcement.imageUrl}
                  alt=""
                  className="mt-2 w-full border-2 border-ink"
                />
              )}
              <ReactionsRow
                announcement={item.announcement}
                userId={userId}
                onChanged={reloadAnnouncements}
              />
              <div className="mt-1 flex items-center justify-between">
                <p className="font-stencil text-[0.6rem] text-ink-light">
                  {formatDateTime(item.announcement.createdAt)}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(item.announcement.id)}
                    className="font-stencil text-[0.6rem] text-ink-light underline"
                  >
                    borrar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={item.key} className="border-2 border-ink bg-cream px-3 py-2">
              <p className="font-serif text-sm text-ink">
                {item.event.type === 'en_pie' && (
                  <>
                    <strong>{item.event.userName}</strong> sigue en pie (día {item.event.streakDay})
                  </>
                )}
                {item.event.type === 'caido' && (
                  <span className="text-alert">
                    <strong>{item.event.userName}</strong> cayó en combate
                  </span>
                )}
                {item.event.type === 'ascenso' && (
                  <>
                    <strong>{item.event.userName}</strong> ascendió a {item.event.rank}
                  </>
                )}
              </p>
              <p className="font-stencil text-[0.6rem] text-ink-light">
                {formatDate(item.event.date)}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
