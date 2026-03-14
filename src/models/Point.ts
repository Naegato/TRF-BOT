export type PointType = 'proof' | 'session';

export interface IPoint {
    id:        number;
    discordId: string;
    type:      PointType;
    grantedBy: string;
    amount:    number;
    sessionId: number | null;
    messageId: string | null;
    createdAt: Date;
}
