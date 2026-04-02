import { getApiBaseUrl } from '@/lib/config';
import type {
  CreateSessionPayload,
  JoinOrCreatePayload,
  LeaveSessionResponse,
  OwnerActionPayload,
  SessionParticipantResponse,
  SessionView,
  VotePayload
} from '@/lib/types';

export function buildSessionUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildSessionUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (payload.error) {
      return payload.error;
    }
  } catch {
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
}

export function createSession(payload: CreateSessionPayload): Promise<SessionParticipantResponse> {
  return requestJson<SessionParticipantResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function joinSession(
  code: string,
  payload: JoinOrCreatePayload
): Promise<SessionParticipantResponse> {
  return requestJson<SessionParticipantResponse>(`/sessions/${code}/join`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getSession(code: string): Promise<SessionView> {
  return requestJson<SessionView>(`/sessions/${code}`);
}

export function submitVote(code: string, payload: VotePayload): Promise<SessionView> {
  return requestJson<SessionView>(`/sessions/${code}/vote`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function revealSession(code: string, payload: OwnerActionPayload): Promise<SessionView> {
  return requestJson<SessionView>(`/sessions/${code}/reveal`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function resetSession(code: string, payload: OwnerActionPayload): Promise<SessionView> {
  return requestJson<SessionView>(`/sessions/${code}/reset`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function leaveSession(
  code: string,
  payload: OwnerActionPayload
): Promise<LeaveSessionResponse> {
  return requestJson<LeaveSessionResponse>(`/sessions/${code}/leave`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
