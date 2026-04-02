export type ParticipantView = {
  id: string;
  name: string;
  isOwner: boolean;
  hasVoted: boolean;
  vote: string | null;
};

export type SessionView = {
  code: string;
  revealed: boolean;
  deck: string[];
  createdAt: string;
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
};

export type CreateSessionPayload = {
  name: string;
  deck: string[];
};

export type VotePayload = {
  participantId: string;
  card: string;
};

export type OwnerActionPayload = {
  participantId: string;
};
