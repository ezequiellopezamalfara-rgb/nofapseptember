# Operación NoFap September — Spec de implementación

Construí una PWA para un challenge privado de 30 días entre ~10 amigos. Arranca el **1 de septiembre de 2026** y termina el **30 de septiembre de 2026**. Zona horaria fija: `America/Argentina/Buenos_Aires`. El día corre de 00:00 a 23:59.

Hay una sola competencia: todos los que entran a la app compiten en el mismo ranking. No hay grupos, ni salas, ni challenges paralelos.

Es un proyecto chico y cerrado: no hay registro público, no hay pagos, no hay onboarding de terceros. Priorizá que funcione y se vea bien por sobre la extensibilidad.

## Stack

- React + Vite + TypeScript
- Tailwind
- Supabase (Postgres + client SDK)
- Deploy en Vercel, con dos API routes y un Vercel Cron para las notificaciones
- PWA instalable: manifest, íconos, service worker, `display: standalone`

El cálculo de puntaje vive en una única función pura de TypeScript (`src/lib/scoring.ts`) que recibe los registros crudos y devuelve el puntaje. No calcules puntos en la base ni los guardes desnormalizados: se recomputan en cliente en cada render. El volumen máximo es 10 usuarios × 30 días, es trivial.

## Acceso

Sin email, sin contraseñas, sin magic links, sin recuperación.

- Primera apertura: **código de acceso** (una constante compartida, en variable de entorno) → **nombre** (único) → **PIN de 4 dígitos** que el usuario elige.
- Si el nombre ya existe, el PIN lo valida. Si no existe, se crea el usuario con ese PIN.
- Sesión persistida en `localStorage`, sin expiración durante el mes.
- El PIN se guarda hasheado. No es seguridad real y no hace falta que lo sea.

No hay pantalla de selección de objetivos. Todos los participantes tienen los mismos ocho objetivos disponibles todos los días.

## Sistema de puntos

### Racha (obligatoria)

Es lo único obligatorio para seguir en el desafío. Cada día en pie suma según el **tramo**, que depende del día de racha **personal**, no de la fecha del mes:

| Día de racha | Tramo | Puntos del día |
|---|---|---|
| 1 – 10 | ×1 | 20 |
| 11 – 20 | ×2 | 40 |
| 21 – 30 | ×3 | 60 |

Mes limpio = 1.200 puntos de racha.

Al caer: el día suma 0 y **la racha vuelve a 0**. Los puntos ya acumulados no se pierden, lo que se pierde es el tramo: quien cae el día 20 vuelve a ×1 y tiene que rehacer la escalera desde abajo.

### Objetivos

Ocho objetivos fijos, iguales para todos, diarios y binarios. Cada uno suma su valor el día que se marca como cumplido. **Sin penalizaciones, sin rachas, sin multiplicador.** No cumplirlo simplemente no suma.

| Objetivo | Valor |
|---|---|
| Entrené | 3 |
| Caminé 10.000 pasos | 3 |
| No fumé | 2 |
| Me desperté antes de las 7 | 2 |
| Tuve menos de 2h de reels / TikTok / shorts / X | 1 |
| Leí 20 minutos | 1 |
| Me di una ducha fría | 1 |
| Tomé 2L de agua | 1 |

Techo diario: 14 puntos. Techo mensual: 420.

Los objetivos se reportan y suman igual los días en que el usuario cae. Son independientes de la racha en todo sentido.

## Check-in

**El check-in reporta siempre el día anterior, nunca el día en curso.** Nadie sabe a las 9 de la mañana cómo va a terminar el día.

Flujo diario, una sola pantalla:

1. La app abre pidiendo el reporte del día anterior si está pendiente.
2. Botón grande **SIGO EN PIE** / botón secundario **CAÍ**.
3. Debajo, el checklist de los ocho objetivos.
4. Confirmar guarda todo junto. Una vez confirmado, el día queda cerrado e inmutable.

**Ventana:** el día `D` se puede reportar desde las 00:00 del día `D+1` hasta las 23:59 del día `D+1`. Pasado ese momento, el día `D` se resuelve automáticamente como **caído** con los ocho objetivos en no cumplido. Irreversible.

En la base un día puede estar `pendiente`, pero la interfaz nunca muestra "pendiente" para días vencidos: muestra **en pie** o **caído**. La resolución automática se aplica al leer, comparando contra la hora actual.

El día 30 se reporta el 1 de octubre. El challenge cierra el 1/10 a las 23:59.

Un usuario que entra por primera vez después del 1/9 arrastra todos los días previos del mes como caídos.

## Rangos

El rango se deriva de la racha actual y se muestra en el perfil, el ranking y el feed.

| Días | Rango |
|---|---|
| 0 | Civil |
| 1 | Soldado |
| 2 | Cabo |
| 3–5 | Sargento Tercero |
| 6–10 | Sargento Segundo |
| 11–13 | Sargento Primero |
| 14–15 | Subteniente |
| 16–20 | Aspirante a Oficial |
| 21–23 | Teniente Segundo |
| 24 | Teniente Primero |
| 25 | Capitán |
| 26 | Mayor |
| 27 | Coronel |
| 28 | General de Ejército |
| 29 | Rey |
| 30 | Monje ∞ |

## Notificaciones push

Web Push con VAPID. La suscripción se pide al terminar el alta, con un botón explícito (no al cargar la página).

**Restricción de iOS:** el push web solo funciona si la PWA está agregada a la pantalla de inicio (iOS 16.4+). Si el usuario abre desde Safari sin instalar, no recibe nada. La app debe detectar ese caso y mostrar un cartel persistente con las instrucciones para instalarla.

Tres disparadores:

1. **09:00** — recordatorio de reportar el día anterior. Solo a quienes tienen el día pendiente.
2. **21:00** — segundo aviso a quienes siguen pendientes, avisando que quedan menos de 3 horas antes de que el día se marque como caído.
3. **Inmediato** — cuando alguien confirma "CAÍ", push al resto del pelotón con el nombre y el día de racha que perdió.

Implementación: los dos primeros con Vercel Cron sobre `/api/cron/reminders` (protegido con `CRON_SECRET`). El tercero con `/api/notify-fall`, llamado desde el cliente al confirmar la caída. Ambos usan `web-push` con las claves VAPID en variables de entorno y leen las suscripciones de Supabase con la service role key.

Sin notificaciones de ascenso de rango ni de ranking.

## Pantallas

**1. Entrada** — código de acceso, nombre, PIN. Al final, el pedido de permiso de notificaciones y, si corresponde, las instrucciones de instalación.

**2. Home** — la pantalla principal.
- Si hay un día pendiente dentro de ventana: el flujo de check-in ocupa toda la pantalla.
- Si no: racha actual en grande, rango actual, puntaje total, posición en el ranking y cuenta regresiva hasta el próximo check-in.

**3. Ranking** — tabla ordenada por puntaje total: posición, nombre, rango, racha actual, puntaje. Marcá visualmente al usuario propio.

**4. Feed** — cronológico inverso, derivado de los registros. Eventos: `X sigue en pie (día N)`, `X cayó en combate`, `X ascendió a <rango>`. Sin comentarios ni reacciones.

**5. Perfil** — grilla de 30 casilleros con color por estado: en pie, caído, pendiente, futuro. Al tocar un día, el detalle de objetivos cumplidos y los puntos de ese día. Debajo, el desglose del puntaje total: cuánto vino de racha y cuánto de cada objetivo.

Navegación por tab bar inferior: Home, Ranking, Feed, Perfil.

## Modelo de datos

```
users
  id, name (unique), pin_hash, created_at

daily_entries
  id, user_id, date, status ('en_pie' | 'caido' | 'pendiente'), reported_at
  unique (user_id, date)

entry_objectives
  id, entry_id, objective_key, completed (bool)
  unique (entry_id, objective_key)

push_subscriptions
  id, user_id, endpoint, p256dh, auth, created_at
```

El catálogo de objetivos vive en el código, no en la base. `objective_key` es un slug estable: `entrenar`, `pantalla`, `leer`, `despertar`, `pasos`, `ducha`, `fumar`, `agua`.

RLS activada: cualquier usuario autenticado puede leer todos los `users` y `daily_entries` (el ranking y el feed lo necesitan), pero solo escribir los propios. Los registros ya confirmados no se pueden actualizar ni borrar. Las API routes usan la service role key.

## Dirección visual

Estética de documento militar de campaña, siguiendo el reglamento en papel del que sale este challenge: fondo de papel envejecido, tipografía monoespaciada tipo máquina de escribir para títulos y datos, serif para cuerpo. Paleta terrosa: crema, beige, marrón oscuro, un rojo apagado como único acento para caídas y alertas.

Nada de glassmorphism, gradientes ni sombras suaves. Bordes duros, sellos, líneas de separación. El botón **SIGO EN PIE** es el elemento más pesado de toda la app.

Mobile-first, sin layout de escritorio: se usa desde el teléfono.

## Fuera de alcance

No implementes: integración con Salud o Atajos, pasos automáticos, medallas, misiones semanales, bonos, chat, fotos, edición de días cerrados, recuperación de PIN, múltiples ediciones anuales del challenge.

## Entregable

Repo funcional, listo para `vercel deploy`, con:
- `.env.example` con las variables de Supabase, las claves VAPID, el código de acceso y el `CRON_SECRET`
- `supabase/schema.sql` con tablas, constraints y políticas RLS
- `vercel.json` con el cron configurado
- `src/lib/scoring.ts` como única fuente de verdad del puntaje, con tests unitarios que cubran: mes limpio, caída en el día 20, caídas múltiples, objetivos cumplidos en un día caído, y resolución automática por ventana vencida
- README con el alta del código de acceso, la generación de las claves VAPID y el paso obligatorio de instalar la PWA en la pantalla de inicio
