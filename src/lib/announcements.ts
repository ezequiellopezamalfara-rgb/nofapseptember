import { notifyAnnouncement } from './notify'
import { supabase } from './supabase'

export interface Announcement {
  id: string
  message: string
  imageUrl: string | null
  createdAt: string
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, message, image_url, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    message: row.message,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  }))
}

/**
 * Achica y comprime la foto en el navegador antes de subirla (fotos de
 * celular pesan varios MB). Decodifica vía <img> en vez de createImageBitmap:
 * esta última falla en algunos navegadores/entornos con JPEGs por lo demás
 * válidos, mientras que la carga por <img> es universalmente soportada.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('No se pudo leer la imagen'))
      el.src = url
    })

    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
        'image/jpeg',
        quality,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function postAnnouncement(
  authorId: string,
  message: string,
  imageFile: File | null,
): Promise<void> {
  let imageUrl: string | null = null

  if (imageFile) {
    const blob = await compressImage(imageFile)
    const path = `${authorId}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('announcements')
      .upload(path, blob, { contentType: 'image/jpeg' })
    if (uploadError) throw uploadError
    imageUrl = supabase.storage.from('announcements').getPublicUrl(path).data.publicUrl
  }

  const { error } = await supabase
    .from('announcements')
    .insert({ author_id: authorId, message, image_url: imageUrl })
  if (error) throw error

  void notifyAnnouncement(authorId, message)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}
