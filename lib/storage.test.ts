import {
  clearParticipantIdentity,
  getParticipantIdentity,
  getStorageKey,
  saveParticipantIdentity
} from '@/lib/storage';

describe('participant storage', () => {
  it('persists and reads participant identity by normalized session code', () => {
    saveParticipantIdentity({
      sessionCode: 'abc123',
      participantId: 'participant_1',
      name: 'Maxime'
    });

    expect(getStorageKey('ABC123')).toBe('pokerplanning:participant:ABC123');
    expect(getParticipantIdentity('ABC123')).toEqual({
      sessionCode: 'ABC123',
      participantId: 'participant_1',
      name: 'Maxime'
    });

    clearParticipantIdentity('abc123');
    expect(getParticipantIdentity('ABC123')).toBeNull();
  });
});
