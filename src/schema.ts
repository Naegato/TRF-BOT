import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    discordId:    text('discordId').primaryKey(),
    firstName:    text('firstName').notNull(),
    lastName:     text('lastName').notNull(),
    role:         text('role', { enum: ['external', 'esgi', 'manager', 'deputy'] as const }).notNull(),
    year:         integer('year'),
    track:        text('track', { enum: ['alternating', 'initial'] as const }),
    intake:       text('intake', { enum: ['january', 'september'] as const }),
    registeredAt: integer('registeredAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

export const sessions = sqliteTable('sessions', {
    id:             integer('id').primaryKey({ autoIncrement: true }),
    guildId:        text('guildId').notNull(),
    openedBy:       text('openedBy').notNull(),
    openedAt:       integer('openedAt', { mode: 'timestamp_ms' }),
    closedAt:       integer('closedAt', { mode: 'timestamp_ms' }),
    scheduledStart: integer('scheduledStart', { mode: 'timestamp_ms' }),
    scheduledEnd:   integer('scheduledEnd', { mode: 'timestamp_ms' }),
});

export const points = sqliteTable('points', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    discordId: text('discordId').notNull(),
    type:      text('type', { enum: ['proof', 'session'] as const }).notNull(),
    grantedBy: text('grantedBy').notNull(),
    amount:    integer('amount').notNull().default(1),
    sessionId: integer('sessionId').references(() => sessions.id),
    messageId: text('messageId'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

export const rendus = sqliteTable('rendus', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    guildId:   text('guildId').notNull(),
    createdBy: text('createdBy').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    year:      integer('year'),
    track:     text('track', { enum: ['alternating', 'initial'] as const }),
    intake:    text('intake', { enum: ['january', 'september'] as const }),
});
