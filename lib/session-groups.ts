import type { ParticipantView, SessionGroupView, SessionView } from '@/lib/types';
import { buildVoteStats, type VoteStats } from '@/lib/vote-stats';

type NormalizedSessionGroup = {
  id: string;
  name: string;
};

export type GroupVoteStats = {
  group: NormalizedSessionGroup;
  participants: ParticipantView[];
  votedCount: number;
  stats: VoteStats;
};

function normalizeGroupName(groupName: string): string {
  return groupName.trim().replace(/\s+/g, ' ');
}

function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function addGroup(
  groups: Map<string, NormalizedSessionGroup>,
  group: SessionGroupView | null | undefined
): void {
  if (!group) {
    return;
  }

  const normalizedName = normalizeGroupName(group.name);

  if (!group.id || !normalizedName) {
    return;
  }

  if (!groups.has(group.id)) {
    groups.set(group.id, { id: group.id, name: normalizedName });
  }
}

export function deriveSessionGroups(session: SessionView): NormalizedSessionGroup[] {
  const groups = new Map<string, NormalizedSessionGroup>();

  session.groups?.forEach((group) => {
    addGroup(groups, group);
  });

  session.participants.forEach((participant) => {
    addGroup(groups, participant.group ?? null);

    if (participant.groupId && participant.groupName) {
      const normalizedName = normalizeGroupName(participant.groupName);

      if (normalizedName && !groups.has(participant.groupId)) {
        groups.set(participant.groupId, {
          id: participant.groupId,
          name: normalizedName
        });
      }
    } else if (participant.groupName) {
      const normalizedName = normalizeGroupName(participant.groupName);
      const fallbackId = `name:${toSlug(normalizedName)}`;

      if (normalizedName && !groups.has(fallbackId)) {
        groups.set(fallbackId, {
          id: fallbackId,
          name: normalizedName
        });
      }
    }
  });

  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveParticipantGroupId(
  participant: ParticipantView,
  knownGroups: NormalizedSessionGroup[]
): string | null {
  if (participant.groupId) {
    return participant.groupId;
  }

  if (participant.group?.id) {
    return participant.group.id;
  }

  if (!participant.groupName) {
    return null;
  }

  const normalizedName = normalizeGroupName(participant.groupName);
  const matchedGroup = knownGroups.find((group) => group.name === normalizedName);

  if (matchedGroup) {
    return matchedGroup.id;
  }

  return normalizedName ? `name:${toSlug(normalizedName)}` : null;
}

export function buildGroupVoteStats(session: SessionView): GroupVoteStats[] {
  const groups = deriveSessionGroups(session);

  if (groups.length === 0) {
    return [];
  }

  return groups
    .map((group) => {
      const participants = session.participants.filter(
        (participant) => resolveParticipantGroupId(participant, groups) === group.id
      );

      if (participants.length === 0) {
        return null;
      }

      return {
        group,
        participants,
        votedCount: participants.filter((participant) => participant.hasVoted).length,
        stats: buildVoteStats(participants, session.deck)
      };
    })
    .filter((entry): entry is GroupVoteStats => entry !== null);
}
