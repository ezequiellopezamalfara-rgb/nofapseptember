// Seed de 3 usuarios con historiales distintos, para probar ranking/feed/perfil
// (Fase 5) y validar scoring.ts contra datos reales (Fase 2) sobre un
// proyecto Supabase ya creado con supabase/schema.sql aplicado.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PIN_PEPPER=... node scripts/seed.mjs
//
// Usa la service role key: bypassea RLS por completo, igual que las API
// routes. Los usuarios quedan sin auth_id (nadie los "reclamó" desde un
// dispositivo real) — alcanza para ver ranking/feed/perfil, no para loguearse
// como ellos a menos que alguien corra claim_user() con su nombre y PIN.

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const pepper = process.env.PIN_PEPPER

if (!url || !serviceRoleKey || !pepper) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PIN_PEPPER en el entorno.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

function pinHash(pin) {
  return createHash('sha256').update(pin + pepper).digest('hex')
}

function objectivesFor(keys) {
  return Object.fromEntries(keys.map((k) => [k, true]))
}

const SEED_USERS = [
  {
    name: 'Racha Limpia',
    pin: '1111',
    days: Array.from({ length: 10 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      status: 'en_pie',
      objectives: objectivesFor(i % 2 === 0 ? ['entrenar', 'agua'] : ['leer', 'ducha']),
    })),
  },
  {
    name: 'Con Caída',
    pin: '2222',
    days: [
      ...Array.from({ length: 5 }, (_, i) => ({
        date: `2026-09-0${i + 1}`,
        status: 'en_pie',
        objectives: objectivesFor(['entrenar']),
      })),
      { date: '2026-09-06', status: 'caido', objectives: objectivesFor(['leer', 'agua']) },
      ...Array.from({ length: 4 }, (_, i) => ({
        date: `2026-09-0${i + 7}`,
        status: 'en_pie',
        objectives: objectivesFor(['pantalla']),
      })),
    ],
  },
  {
    name: 'Objetivos Parciales',
    pin: '3333',
    days: Array.from({ length: 10 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      status: 'en_pie',
      objectives: i % 3 === 0 ? {} : objectivesFor(['despertar', 'fumar']),
    })),
  },
]

for (const seedUser of SEED_USERS) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert({ name: seedUser.name, pin_hash: pinHash(seedUser.pin) }, { onConflict: 'name' })
    .select()
    .single()

  if (userError) {
    console.error(`Error creando ${seedUser.name}:`, userError.message)
    continue
  }

  for (const day of seedUser.days) {
    const { data: entry, error: entryError } = await supabase
      .from('daily_entries')
      .upsert(
        { user_id: user.id, date: day.date, status: day.status },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()

    if (entryError) {
      console.error(`Error en ${seedUser.name} ${day.date}:`, entryError.message)
      continue
    }

    const rows = Object.entries(day.objectives).map(([objective_key, completed]) => ({
      entry_id: entry.id,
      objective_key,
      completed,
    }))

    if (rows.length > 0) {
      const { error: objError } = await supabase
        .from('entry_objectives')
        .upsert(rows, { onConflict: 'entry_id,objective_key' })
      if (objError) console.error(`Error objetivos ${seedUser.name} ${day.date}:`, objError.message)
    }
  }

  console.log(`✓ ${seedUser.name} (PIN ${seedUser.pin}, ${seedUser.days.length} días)`)
}

console.log('Seed listo.')
