# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository currently contains only [`nofap-september-spec.md`](nofap-september-spec.md) — no code has been scaffolded yet. That file is the single source of truth for what to build; read it in full before writing any code. Once the project exists (package.json, etc.), this file should be updated with the actual build/lint/test/dev commands.

## What this is

A private PWA for a closed 30-day challenge among ~10 friends (September 2026, `America/Argentina/Buenos_Aires`). Stack per the spec: React + Vite + TypeScript, Tailwind, Supabase (Postgres + client SDK), deployed on Vercel with two API routes and a Vercel Cron for notifications.

## Non-obvious architectural rules

These constraints span multiple files/layers and are easy to get wrong if you only skim the spec:

- **Scoring is a single pure function.** All scoring logic lives in `src/lib/scoring.ts`, takes raw records in, returns points out. Never compute or store points in the database or denormalize them — recompute client-side on every render. Volume is capped at 10 users × 30 days, so this is intentionally not optimized.
- **Streak tiers key off personal streak day, not calendar date.** Day 1–10 of a user's streak = ×1 (20 pts/day), 11–20 = ×2 (40 pts/day), 21–30 = ×3 (60 pts/day). A clean month = 1,200 streak points.
- **Falling resets the tier, not the accumulated score.** On a fall, that day scores 0 and the streak resets to 0, but previously earned points are never subtracted. Falling on day 20 means starting the ladder over at ×1.
- **Daily objectives are fully independent of the streak.** Eight fixed, binary, equal-for-everyone objectives (catalog lives in code, not the DB — see `objective_key` slugs in the spec's data model section). They pay out even on days the user fell. No penalties, no streaks, no multiplier. Daily cap 14 pts / monthly cap 420 pts.
- **Check-in always reports the *previous* day, never the current one.** The reporting window for day `D` is 00:00–23:59 of day `D+1`. After that window, day `D` auto-resolves to "caído" with all eight objectives unmet — irreversibly. This resolution happens at read time (compare stored state against current time), not via a background job. The UI must never display a "pendiente" status for a day past its window — only "en pie" or "caído".
- **Confirmed days are immutable.** Once a check-in is confirmed, it cannot be edited or deleted (enforce this in both RLS policies and UI).
- **A user who joins late inherits fallen days.** All days between the challenge start and first login backfill as "caído".
- **Ranks derive from *current* streak**, not total score — see the rank table in the spec for the 16 thresholds (Civil through Monje ∞).
- **No auth beyond a shared access code + name + 4-digit PIN.** No email, no magic links, no password recovery. PIN is hashed but explicitly not meant to be real security. Session persists indefinitely in `localStorage`.
- **RLS model:** any authenticated user can read all `users` and `daily_entries` (needed for ranking/feed), but can only write their own rows, and never rows that are already confirmed. The two API routes (`/api/cron/reminders`, `/api/notify-fall`) use the Supabase service role key and bypass RLS.
- **Push notifications, three triggers only:** 09:00 and 21:00 reminders via Vercel Cron hitting `/api/cron/reminders` (protected by `CRON_SECRET`), and an immediate push to the rest of the group via `/api/notify-fall` when someone confirms "CAÍ". No rank-up or ranking-change notifications.
- **iOS push caveat:** Web Push only works on iOS if the PWA is installed to the home screen (iOS 16.4+). The app must detect Safari-without-install and show persistent install instructions instead of silently failing to subscribe.

## Explicitly out of scope

Do not implement: Health/Shortcuts integration, automatic step tracking, badges/medals, weekly missions, bonuses, chat, photos, editing closed days, PIN recovery, or multiple yearly editions of the challenge.
