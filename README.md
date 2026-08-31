# Operación NoFap September

PWA privada para un challenge de 30 días entre un grupo cerrado de amigos. Spec completa en
[`nofap-september-spec.md`](nofap-september-spec.md).

## Stack

React + Vite + TypeScript + Tailwind v4, Supabase (Postgres + auth anónima), deploy en Vercel.

## Desarrollo

```bash
npm install
npm run dev
npm test    # tests de src/lib/scoring.ts
npm run lint
npm run build
```

## Setup de Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Activá **Authentication → Providers → Allow anonymous sign-ins**.
3. Corré el contenido de [`supabase/schema.sql`](supabase/schema.sql) completo en el SQL Editor.
4. Configurá el pepper del PIN (no se commitea, va aparte):
   ```sql
   insert into app_config (key, value) values ('pin_pepper', '<un valor random>');
   ```
5. Completá `.env` a partir de [`.env.example`](.env.example) con las credenciales del proyecto
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, el mismo
   `PIN_PEPPER` del paso anterior, y `VITE_ACCESS_CODE` — el código de acceso compartido del
   grupo).
6. (Opcional) Seed de usuarios de prueba con historiales distintos:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PIN_PEPPER=... node scripts/seed.mjs
   ```

## Notificaciones push (VAPID)

1. Generá el par de claves:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Completá en `.env` (y en las variables de entorno de Vercel):
   - `VITE_VAPID_PUBLIC_KEY` y `VAPID_PUBLIC_KEY` — la misma clave pública en ambas.
   - `VAPID_PRIVATE_KEY` — la clave privada.
   - `VAPID_SUBJECT` — `mailto:` de contacto (lo pide la spec de Web Push).
   - `CRON_SECRET` — cualquier valor random; Vercel Cron lo manda como Bearer token para
     autenticar `/api/cron/reminders`.
3. En Vercel, `vercel.json` ya define los dos cron jobs (09:00 y 21:00 hora Argentina, en UTC:
   `12:00` y `00:00`) apuntando a `/api/cron/reminders`. Se activan solos al deployar — no hace
   falta configurarlos a mano en el dashboard.

## Instalar la PWA (obligatorio para recibir avisos)

**En iOS, Safari no entrega Web Push a menos que la app esté instalada a la pantalla de inicio**
(iOS 16.4+). Sin ese paso, activar notificaciones no tiene efecto — la app lo detecta y muestra
un cartel con las instrucciones, pero avisale al grupo igual antes de que arranque el challenge:

1. Abrir el link de la app en Safari (no en Chrome ni otro navegador de terceros en iOS).
2. Tocar el ícono de **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elegir **Agregar a pantalla de inicio**.
4. Abrir la app desde el ícono nuevo (no desde Safari) — recién ahí el botón de "Activar
   notificaciones" del alta funciona.

En Android (Chrome) no hace falta este paso: el botón de activar notificaciones alcanza.
