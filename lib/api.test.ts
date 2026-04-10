import { buildSessionUrl, createSession, extractErrorMessage, joinSession } from '@/lib/api';

describe('api helpers', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.unstubAllGlobals();
  });

  it('builds a session url from the explicit public base url', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com/api';

    expect(buildSessionUrl('/sessions/ABC123')).toBe('https://api.example.com/api/sessions/ABC123');
  });

  it('builds a session url from the browser host when no public base url is configured', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        hostname: 'planning.example.com'
      }
    });

    expect(buildSessionUrl('/sessions/ABC123')).toBe(
      'https://planning.example.com:3000/api/sessions/ABC123'
    );
  });

  it('extracts the backend validation message', async () => {
    const response = new Response(
      JSON.stringify({
        message: ['Name must not be empty.']
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    await expect(extractErrorMessage(response)).resolves.toBe('Name must not be empty.');
  });

  it('retries create session without group fields for legacy backends', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com/api';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: ['property groups should not exist'] }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            participantId: 'p1',
            session: {
              code: 'ABC123',
              revealed: false,
              deck: ['1', '2'],
              createdAt: '2026-01-01',
              participants: []
            }
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    await createSession({
      name: 'Alice',
      deck: ['1', '2'],
      groups: ['iOS'],
      ownerGroupName: 'iOS'
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/sessions');

    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      groups?: string[];
      ownerGroupName?: string;
    };
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string) as {
      groups?: string[];
      ownerGroupName?: string;
    };

    expect(firstPayload.groups).toEqual(['iOS']);
    expect(firstPayload.ownerGroupName).toBe('iOS');
    expect(secondPayload.groups).toBeUndefined();
    expect(secondPayload.ownerGroupName).toBeUndefined();
  });

  it('retries join without group fields for legacy backends', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com/api';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: ['property groupId should not exist'] }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            participantId: 'p2',
            session: {
              code: 'ABC123',
              revealed: false,
              deck: ['1', '2'],
              createdAt: '2026-01-01',
              participants: []
            }
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    await joinSession('ABC123', {
      name: 'Bob',
      groupId: 'group-1'
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/sessions/ABC123/join');

    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      groupId?: string;
    };
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string) as {
      groupId?: string;
    };

    expect(firstPayload.groupId).toBe('group-1');
    expect(secondPayload.groupId).toBeUndefined();
  });
});
