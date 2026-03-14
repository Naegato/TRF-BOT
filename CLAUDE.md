# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Action | npm script | Make |
|---|---|---|
| Dev (hot reload) | `pnpm dev` | `make up` |
| Build | `pnpm build` | — |
| Production | `pnpm start` | `make start` |
| Lint | `pnpm lint` | `make lint` |
| Lint + autofix | `pnpm lint:fix` | `make lint-fix` |
| Install deps | `pnpm install` | `make install` |

## Environment

Copy `.env.example` to `.env` and fill in:
- `DISCORD_TOKEN` — Discord bot token
- `EXTERNAL_CLASS` — class name treated as external (e.g. `EXTERNE`); members of this class get the `EXTERNE` role on registration
- `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB` — MongoDB credentials (used to build the connection URI in `src/database.ts`)
- `COMPOSE_PROJECT_NAME` — Docker Compose project name

MongoDB is expected at `localhost:27017`. Use `docker-compose.yml` (if present) to spin it up locally.

## Architecture

The project is a **Discord.js v14 bot** written in TypeScript (CommonJS, target ES2022), backed by **MongoDB via Mongoose**.

- `src/index.ts` — entry point: initializes the Discord client, registers slash commands via the REST API on `ClientReady`, calls `ensureRoles` for every guild, and routes interactions to command handlers.
- `src/database.ts` — connects Mongoose to MongoDB using env vars.
- `src/models/User.ts` — Mongoose model storing registered users (`discordId`, `nom`, `prenom`, `classe`, `email`, `registeredAt`).
- `src/commands/` — one file per slash command; each exports `command` (a `SlashCommandBuilder`) and handler functions.
- `src/utils/ensureRoles.ts` — creates `ADMIN`, `ESGI`, and `EXTERNE` roles in a guild if they don't exist; called at startup.

**Runtime:** `tsx` is used for development (no compilation step). TypeScript compiles to `dist/` for production.

**Intents currently declared:** `Guilds`, `GuildMessages`, `MessageContent` — add new intents to the `Client` constructor in `src/index.ts` as features require them.

## Adding a new slash command

1. Create `src/commands/myCommand.ts` exporting `command` (SlashCommandBuilder) and `handleCommand`.
2. Import and add `myCommand.command.toJSON()` to the `commands` array in `src/index.ts`.
3. Add an `else if` branch in the `InteractionCreate` handler in `src/index.ts` to dispatch to the handler.
