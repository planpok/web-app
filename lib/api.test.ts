import { buildSessionUrl, extractErrorMessage } from '@/lib/api';

describe('api helpers', () => {
  it('builds a session url from the public base url', () => {
    expect(buildSessionUrl('/sessions/ABC123')).toBe('http://localhost:3000/api/sessions/ABC123');
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
