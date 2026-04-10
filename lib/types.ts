export type ParticipantView = {
  id: string;
  name: string;
  isOwner: boolean;
  hasVoted: boolean;
  vote: string | null;
  groupId?: string | null;
  groupName?: string | null;
  group?: SessionGroupView | null;
};

export type SessionGroupView = {
  id: string;
  name: string;
};

export type SessionView = {
  code: string;
  revealed: boolean;
  deck: string[];
  createdAt: string;
  groups?: SessionGroupView[];
  participants: ParticipantView[];
};

export type SessionParticipantResponse = {
  participantId: string;
  session: SessionView;
};

export type LeaveSessionResponse = {
  deleted: boolean;
};

export type JoinOrCreatePayload = {
  name: string;
  groupId?: string;
  groupName?: string;
};

export type CreateSessionPayload = {
  name: string;
  deck: string[];
  groups?: string[];
  ownerGroupId?: string;
  ownerGroupName?: string;
};

export type VotePayload = {
  participantId: string;
  card: string;
};

export type OwnerActionPayload = {
  participantId: string;
};
