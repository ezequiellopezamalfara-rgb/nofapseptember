export async function notifyFall(userId: string, userName: string, streakLost: number): Promise<void> {
  try {
    await fetch('/api/notify-fall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, streakLost }),
    })
  } catch {
    // best-effort: si falla el push, no bloquea el check-in ya confirmado
  }
}

export async function notifyAnnouncement(authorId: string, message: string): Promise<void> {
  try {
    await fetch('/api/notify-announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId, message }),
    })
  } catch {
    // best-effort: si falla el push, el comunicado ya quedó publicado igual
  }
}
