'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getSession, leaveSession, resetSession, revealSession, submitVote } from '@/lib/api';
import {
  clearParticipantIdentity,
  getParticipantIdentity,
  type StoredParticipantIdentity
} from '@/lib/storage';
import { connectToSession } from '@/lib/socket';
import type { SessionView } from '@/lib/types';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type SessionPageProps = {
  code: string;
};

export function SessionPage({ code }: SessionPageProps) {
  const router = useRouter();
  const sessionCode = code.toUpperCase();
  const [identity, setIdentity] = useState<StoredParticipantIdentity | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');

  useEffect(() => {
    const storedIdentity = getParticipantIdentity(sessionCode);

    if (!storedIdentity) {
      router.replace(`/?code=${sessionCode}`);
      return;
    }

    setIdentity(storedIdentity);
  }, [router, sessionCode]);

  useEffect(() => {
    if (!identity) {
      return;
    }

    let disposed = false;
    setConnectionState('connecting');
    setErrorMessage(null);

    getSession(sessionCode)
      .then((nextSession) => {
        if (disposed) {
          return;
        }

        const isStillParticipant = nextSession.participants.some(
          (participant) => participant.id === identity.participantId
        );

        if (!isStillParticipant) {
          clearParticipantIdentity(sessionCode);
          router.replace(`/?code=${sessionCode}`);
          return;
        }

        setSession(nextSession);
      })
      .catch((error) => {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : 'Session inaccessible.');
        }
      });

    const socket = connectToSession(sessionCode);

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('session.subscribe', { sessionCode });
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
    });

    socket.on('session.updated', (nextSession: SessionView) => {
      setSession(nextSession);

      const isStillParticipant = nextSession.participants.some(
        (participant) => participant.id === identity.participantId
      );

      if (!isStillParticipant) {
        clearParticipantIdentity(sessionCode);
        router.replace(`/?code=${sessionCode}`);
      }
    });

    socket.on('session.deleted', () => {
      clearParticipantIdentity(sessionCode);
      setErrorMessage('La session a ete fermee par son owner.');
      setTimeout(() => router.replace(`/?code=${sessionCode}`), 1200);
    });

    return () => {
      disposed = true;
      socket.disconnect();
    };
  }, [identity, router, sessionCode]);

  const me = useMemo(() => {
    if (!session || !identity) {
      return null;
    }

    return session.participants.find((participant) => participant.id === identity.participantId) ?? null;
  }, [identity, session]);

  const selectedCard = me?.vote ?? null;
  const isOwner = me?.isOwner ?? false;

  const participantCountLabel = useMemo(() => {
    if (!session) {
      return 'Chargement...';
    }

    const votedCount = session.participants.filter((participant) => participant.hasVoted).length;
    return `${votedCount}/${session.participants.length} votes`;
  }, [session]);

  const runAction = async (actionName: string, callback: () => Promise<unknown>) => {
    setPendingAction(actionName);
    setErrorMessage(null);

    try {
      await callback();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setPendingAction(null);
    }
  };

  if (!identity) {
    return null;
  }

  return (
    <main className="shell session-shell">
      <section className="session-layout">
        <header className="session-header card">
          <div className="session-header-main">
            <div>
              <span className="session-kicker">Code session</span>
              <div className="session-code-row compact">
                <h1 className="session-code-title">{sessionCode}</h1>
                <button
                  className="secondary-button"
                  onClick={() => navigator.clipboard.writeText(sessionCode)}
                  type="button"
                >
                  Copier
                </button>
              </div>
              <p className="muted-text">
                {identity.name} · {participantCountLabel}
              </p>
            </div>

            <div className="session-stats">
              <div className="session-stat">
                <span className="session-stat-value">{session?.participants.length ?? '—'}</span>
                <span className="session-stat-label">Participants</span>
              </div>
              <div className="session-stat accent">
                <span className="session-stat-value">
                  {session?.participants.filter((participant) => participant.hasVoted).length ?? '—'}
                </span>
                <span className="session-stat-label">Votes poses</span>
              </div>
            </div>
          </div>

          <div className="header-meta">
            <span className={`status-pill ${connectionState}`}>{connectionState}</span>
            {isOwner ? <span className="owner-pill">Owner</span> : null}
          </div>
        </header>

        <section className="session-main">
          <div className="card stack-gap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Round</span>
                <h2>{session?.revealed ? 'Votes reveles' : 'Votes masques'}</h2>
              </div>
              <p className="muted-text">
                {session?.revealed
                  ? 'Les estimations sont visibles pour tout le monde.'
                  : 'Chaque participant vote sans influencer les autres.'}
              </p>
            </div>

            <div className="cards-grid">
              {session?.deck.map((card) => (
                <button
                  key={card}
                  className={selectedCard === card ? 'vote-card active' : 'vote-card'}
                  disabled={pendingAction === 'vote' || session.revealed}
                  onClick={() =>
                    runAction('vote', () =>
                      submitVote(sessionCode, {
                        participantId: identity.participantId,
                        card
                      })
                    )
                  }
                  type="button"
                >
                  {card}
                </button>
              ))}
            </div>

            <div className="action-row">
              {isOwner ? (
                session?.revealed ? (
                  <button
                    className="primary-button"
                    disabled={pendingAction === 'reset'}
                    onClick={() =>
                      runAction('reset', () =>
                        resetSession(sessionCode, { participantId: identity.participantId })
                      )
                    }
                    type="button"
                  >
                    {pendingAction === 'reset' ? 'Relance...' : 'Nouveau round'}
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    disabled={pendingAction === 'reveal'}
                    onClick={() =>
                      runAction('reveal', () =>
                        revealSession(sessionCode, { participantId: identity.participantId })
                      )
                    }
                    type="button"
                  >
                    {pendingAction === 'reveal' ? 'Revelation...' : 'Reveler les votes'}
                  </button>
                )
              ) : null}

              <button
                className="ghost-button"
                disabled={pendingAction === 'leave'}
                onClick={() =>
                  runAction('leave', async () => {
                    await leaveSession(sessionCode, { participantId: identity.participantId });
                    clearParticipantIdentity(sessionCode);
                    router.replace('/');
                  })
                }
                type="button"
              >
                Quitter
              </button>
            </div>
          </div>

          <div className="card stack-gap participants-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Participants</span>
                <h2>Votes a la table</h2>
              </div>
            </div>

            <div className="participants-list">
              {session?.participants.map((participant) => (
                <article
                  className={
                    participant.id === identity.participantId
                      ? 'participant-row current-user'
                      : 'participant-row'
                  }
                  key={participant.id}
                >
                  <div className="participant-profile">
                    <div className="avatar">{participant.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div className="participant-title-row">
                        <strong>{participant.name}</strong>
                        {participant.isOwner ? <span className="owner-pill">Owner</span> : null}
                      </div>
                      <span className="muted-text">
                        {participant.id === identity.participantId ? 'Vous' : 'Participant'}
                      </span>
                    </div>
                  </div>

                  <div className="vote-state emphasized">
                    {session.revealed ? (
                      <span className="revealed-vote large">{participant.vote ?? '—'}</span>
                    ) : participant.hasVoted ? (
                      <span className="vote-presence ready">Vote pose</span>
                    ) : (
                      <span className="vote-presence waiting">En attente</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
