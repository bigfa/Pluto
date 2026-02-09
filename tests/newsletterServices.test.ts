import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getDbMock = vi.hoisted(() => vi.fn());
const getActiveSubscribersMock = vi.hoisted(() => vi.fn());

vi.mock('@/db/client', () => ({
    getDb: getDbMock,
}));

vi.mock('@/services/subscriberServices', () => ({
    getActiveSubscribers: getActiveSubscribersMock,
}));

import { sendNewsletter } from '@/services/newsletterServices';
import type { Env } from '@/lib/env';

type NewsletterRow = {
    id: string;
    subject: string;
    content: string;
    status: string;
};

function createDbClient(newsletter: NewsletterRow | null) {
    const limitMock = vi.fn().mockResolvedValue(newsletter ? [newsletter] : []);
    const whereMock = vi.fn(() => ({ limit: limitMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    const selectMock = vi.fn(() => ({ from: fromMock }));

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: updateSetMock }));

    return {
        client: { db: { select: selectMock, update: updateMock } },
        spies: {
            updateSetMock,
            updateWhereMock,
            selectMock,
        },
    };
}

function okResendResponse() {
    return {
        ok: true,
        json: async () => ({ id: 'email-id' }),
        text: async () => '',
    };
}

function failResendResponse(message: string) {
    return {
        ok: false,
        json: async () => ({}),
        text: async () => message,
    };
}

describe('newsletterServices.sendNewsletter', () => {
    const env: Env = {
        RESEND_API_KEY: 'resend-key',
        NEXT_PUBLIC_BASE_URL: 'https://photos.test',
        EMAIL_FROM: 'noreply@photos.test',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns sent/failed/total when partially successful', async () => {
        const { client, spies } = createDbClient({
            id: 'n1',
            subject: 'Hello',
            content: '<p>Hello {{email}} {{unsubscribe_url}}</p>',
            status: 'draft',
        });
        getDbMock.mockReturnValue(client);
        getActiveSubscribersMock.mockResolvedValue([
            { email: 'a@example.com', token: 't1' },
            { email: 'b@example.com', token: 't2' },
        ]);

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(okResendResponse())
            .mockResolvedValueOnce(failResendResponse('boom'));
        vi.stubGlobal('fetch', fetchMock);

        const result = await sendNewsletter(env, 'n1');

        expect(result.ok).toBe(true);
        expect(result.count).toBe(1);
        expect(result.total).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.failedRecipients).toEqual(['b@example.com']);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(spies.updateSetMock).toHaveBeenCalledTimes(2);
        expect(spies.updateSetMock.mock.calls[1]?.[0]).toMatchObject({
            status: 'sent',
            recipients_count: 1,
        });
    });

    it('returns failure with counts when all sends fail', async () => {
        const { client, spies } = createDbClient({
            id: 'n2',
            subject: 'Hello',
            content: '<p>Hello {{email}} {{unsubscribe_url}}</p>',
            status: 'draft',
        });
        getDbMock.mockReturnValue(client);
        getActiveSubscribersMock.mockResolvedValue([
            { email: 'a@example.com', token: 't1' },
            { email: 'b@example.com', token: 't2' },
        ]);

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(failResendResponse('fail-1'))
            .mockResolvedValueOnce(failResendResponse('fail-2'));
        vi.stubGlobal('fetch', fetchMock);

        const result = await sendNewsletter(env, 'n2');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('SERVER_ERROR');
        expect(result.count).toBe(0);
        expect(result.total).toBe(2);
        expect(result.failed).toBe(2);
        expect(result.error).toBe('All sends failed');
        expect(result.failedRecipients).toEqual(['a@example.com', 'b@example.com']);
        expect(spies.updateSetMock.mock.calls[1]?.[0]).toMatchObject({
            status: 'failed',
            recipients_count: 0,
        });
    });

    it('returns zero counts when no active subscribers', async () => {
        const { client, spies } = createDbClient({
            id: 'n3',
            subject: 'Hello',
            content: '<p>Hello {{email}} {{unsubscribe_url}}</p>',
            status: 'draft',
        });
        getDbMock.mockReturnValue(client);
        getActiveSubscribersMock.mockResolvedValue([]);

        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const result = await sendNewsletter(env, 'n3');

        expect(result).toMatchObject({
            ok: true,
            count: 0,
            total: 0,
            failed: 0,
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(spies.updateSetMock).not.toHaveBeenCalled();
    });
});
