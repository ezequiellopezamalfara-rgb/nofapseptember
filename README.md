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

## Notificaciones push y PWA

Todavía no implementado (llega después del arranque del challenge). El README se actualiza con
la generación de claves VAPID y el paso de instalar la PWA a pantalla de inicio cuando esa parte
esté lista.
