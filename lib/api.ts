import { getApiBaseUrl } from '@/lib/config';
import type {
  CreateSessionPayload,
  JoinOrCreatePayload,
  LeaveSessionResponse,
  AddRouletteValuePayload,
  CreateRouletteSessionPayload,
  OwnerActionPayload,
  RouletteOwnerActionPayload,
  RouletteSessionOwnerResponse,
  RouletteSessionView,
  SessionParticipantResponse,
  SessionView,
  VotePayload
} from '@/lib/types';

const LEGACY_GROUP_FIELD_PATTERN =
  /(groups?|ownerGroup(Id|Name)|group(Id|Name)).*should not exist/i;

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

function shouldRetryWithoutGroupFields(error: unknown): boolean {
  return error instanceof Error && LEGACY_GROUP_FIELD_PATTERN.test(error.message);
}

export function createSession(payload: CreateSessionPayload): Promise<SessionParticipantResponse> {
  const createRequest = (nextPayload: CreateSessionPayload) =>
    requestJson<SessionParticipantResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(nextPayload)
    });

  return createRequest(payload).catch((error) => {
    if (
      !shouldRetryWithoutGroupFields(error) ||
      (!payload.groups && !payload.ownerGroupId && !payload.ownerGroupName)
    ) {
      throw error;
    }

    const { groups: _groups, ownerGroupId: _ownerGroupId, ownerGroupName: _ownerGroupName, ...fallbackPayload } = payload;
    return createRequest(fallbackPayload);
  });
}

export function joinSession(
  code: string,
  payload: JoinOrCreatePayload
): Promise<SessionParticipantResponse> {
  const joinRequest = (nextPayload: JoinOrCreatePayload) =>
    requestJson<SessionParticipantResponse>(`/sessions/${code}/join`, {
      method: 'POST',
      body: JSON.stringify(nextPayload)
    });

  return joinRequest(payload).catch((error) => {
    if (!shouldRetryWithoutGroupFields(error) || (!payload.groupId && !payload.groupName)) {
      throw error;
    }

    const { groupId: _groupId, groupName: _groupName, ...fallbackPayload } = payload;
    return joinRequest(fallbackPayload);
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

export function createRouletteSession(
  payload: CreateRouletteSessionPayload
): Promise<RouletteSessionOwnerResponse> {
  return requestJson<RouletteSessionOwnerResponse>('/roulette-sessions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getRouletteSession(code: string): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>(`/roulette-sessions/${code}`);
}

export function addRouletteValue(
  code: string,
  payload: AddRouletteValuePayload
): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>(`/roulette-sessions/${code}/values`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function removeRouletteValue(
  code: string,
  value: string,
  payload: RouletteOwnerActionPayload
): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>(
    `/roulette-sessions/${code}/values/${encodeURIComponent(value)}`,
    {
      method: 'DELETE',
      body: JSON.stringify(payload)
    }
  );
}

export function drawRouletteValue(
  code: string,
  payload: RouletteOwnerActionPayload
): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>(`/roulette-sessions/${code}/draw`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function removeLastRouletteDraw(
  code: string,
  payload: RouletteOwnerActionPayload
): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>(`/roulette-sessions/${code}/draw/remove`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function keepLastRouletteDraw(
  code: string,
  payload: RouletteOwnerActionPayload
): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>(`/roulette-sessions/${code}/draw/keep`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
