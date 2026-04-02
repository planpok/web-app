export type StoredParticipantIdentity = {
  sessionCode: string;
  participantId: string;
  name: string;
};

const STORAGE_PREFIX = 'pokerplanning:participant:';

export function getStorageKey(sessionCode: string): string {
  return `${STORAGE_PREFIX}${sessionCode.toUpperCase()}`;
}

export function saveParticipantIdentity(identity: StoredParticipantIdentity): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getStorageKey(identity.sessionCode),
    JSON.stringify({
      ...identity,
      sessionCode: identity.sessionCode.toUpperCase()
    })
  );
}

export function getParticipantIdentity(sessionCode: string): StoredParticipantIdentity | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(getStorageKey(sessionCode));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredParticipantIdentity;
  } catch {
    return null;
  }
}

export function clearParticipantIdentity(sessionCode: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getStorageKey(sessionCode));
}
