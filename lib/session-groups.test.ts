import { buildGroupVoteStats, deriveSessionGroups, resolveParticipantGroupId } from '@/lib/session-groups';
import type { SessionView } from '@/lib/types';

describe('session group helpers', () => {
  it('derives groups from session.groups and participant metadata', () => {
    const session: SessionView = {
      code: 'ABC123',
      revealed: true,
      deck: ['3', '5', '8', '?'],
      createdAt: '2026-01-01',
      groups: [{ id: 'ios', name: 'iOS' }],
      participants: [
        {
          id: '1',
          name: 'Alice',
          isOwner: true,
          hasVoted: true,
          vote: '5',
          groupId: 'ios'
        },
        {
          id: '2',
          name: 'Bob',
          isOwner: false,
          hasVoted: true,
          vote: '8',
          groupName: 'Android'
        }
      ]
    };

    expect(deriveSessionGroups(session)).toEqual([
      { id: 'name:android', name: 'Android' },
      { id: 'ios', name: 'iOS' }
    ]);
  });

  it('maps a participant group from groupName when id is missing', () => {
    const groups = [
      { id: 'ios', name: 'iOS' },
      { id: 'name:android', name: 'Android' }
    ];

    expect(
      resolveParticipantGroupId(
        {
          id: '2',
          name: 'Bob',
          isOwner: false,
          hasVoted: true,
          vote: '8',
          groupName: 'Android'
        },
        groups
      )
    ).toBe('name:android');
  });

  it('builds vote stats for each group when a session is revealed', () => {
    const session: SessionView = {
      code: 'ABC123',
      revealed: true,
      deck: ['3', '5', '8', '?'],
      createdAt: '2026-01-01',
      groups: [
        { id: 'ios', name: 'iOS' },
        { id: 'android', name: 'Android' }
      ],
      participants: [
        {
          id: '1',
          name: 'Alice',
          isOwner: true,
          hasVoted: true,
          vote: '5',
          groupId: 'ios'
        },
        {
          id: '2',
          name: 'Bob',
          isOwner: false,
          hasVoted: true,
          vote: '8',
          groupId: 'android'
        },
        {
          id: '3',
          name: 'Charlie',
          isOwner: false,
          hasVoted: true,
          vote: '8',
          groupId: 'android'
        }
      ]
    };

    const groupedStats = buildGroupVoteStats(session);

    expect(groupedStats).toHaveLength(2);
    expect(groupedStats[0].group.name).toBe('Android');
    expect(groupedStats[0].participants).toHaveLength(2);
    expect(groupedStats[0].stats.average).toBe(8);
    expect(groupedStats[1].group.name).toBe('iOS');
    expect(groupedStats[1].participants).toHaveLength(1);
    expect(groupedStats[1].stats.average).toBe(5);
  });
});
