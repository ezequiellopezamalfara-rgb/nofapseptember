import type { VercelRequest, VercelResponse } from '@vercel/node'
import { remindersHandler } from './_handler.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return remindersHandler(req, res)
}
