export interface ISession {
    id:             number;
    guildId:        string;
    openedBy:       string;
    openedAt:       Date | null;
    closedAt:       Date | null;
    scheduledStart: Date | null;
    scheduledEnd:   Date | null;
}
