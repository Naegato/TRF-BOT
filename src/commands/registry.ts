import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from 'discord.js';
import { withErrorHandling } from '../utils/withErrorHandling';
import * as register from './register';
import * as adminRegister from './adminRegister';
import * as setRole from './setRole';
import * as openSession from './openSession';
import * as closeSession from './closeSession';
import * as presence from './presence';
import * as scheduleSession from './scheduleSession';
import * as createRendu from './createRendu';
import * as profile from './profile';
import * as points from './points';
import * as pointsHistory from './pointsHistory';
import * as resetServer from './resetServer';
import * as deleteAccount from './deleteAccount';
import * as deleteUser from './deleteUser';
import * as listUsers from './listUsers';
import * as stopBot from './stopBot';
import * as setRulesMessage from './setRulesMessage';
import * as setup from './setup';
import * as sendRules from './sendRules';
import * as backupDb from './backupDb';

// ─── Command modules (order determines registration) ─────────────────────────

const modules = [
    register,
    adminRegister,
    setRole,
    openSession,
    closeSession,
    presence,
    scheduleSession,
    createRendu,
    profile,
    points,
    pointsHistory,
    resetServer,
    deleteAccount,
    deleteUser,
    listUsers,
    stopBot,
    setRulesMessage,
    setup,
    sendRules,
    backupDb,
] as const;

export const commandsJSON = modules.map(m => m.command.toJSON());

// Wrap every command handler with centralized error handling
export const commandMap = new Map<string, (i: ChatInputCommandInteraction) => Promise<void>>(
    modules.map(m => [m.command.name, withErrorHandling(m.handleCommand)]),
);

// ─── Button handlers ─────────────────────────────────────────────────────────

export const buttonHandlers: Array<{
    match:  (id: string) => boolean;
    handle: (i: ButtonInteraction) => Promise<void>;
}> = [
    {
        match:  (id) => id === 'register:esgi' || id === 'register:external',
        handle: register.handleButton,
    },
    {
        match:  (id) => id.startsWith('presence:approve:') || id.startsWith('presence:deny:'),
        handle: presence.handleButton,
    },
];

// ─── Select menu handlers ─────────────────────────────────────────────────────

export const selectHandlers: Array<{
    match:  (id: string) => boolean;
    handle: (i: StringSelectMenuInteraction) => Promise<void>;
}> = [
    {
        match:  (id) => id.startsWith('register-select:'),
        handle: register.handleSelect,
    },
];

// ─── Modal handlers ───────────────────────────────────────────────────────────

export const modalHandlers: Array<{
    match:  (id: string) => boolean;
    handle: (i: ModalSubmitInteraction) => Promise<void>;
}> = [
    {
        match:  (id) => id.startsWith('register-modal:'),
        handle: register.handleModalSubmit,
    },
    {
        match:  (id) => id === 'send-rules-modal',
        handle: sendRules.handleModalSubmit,
    },
];
