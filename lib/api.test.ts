import { buildSessionUrl, extractErrorMessage } from '@/lib/api';

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
});
