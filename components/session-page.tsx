'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getSession, leaveSession, resetSession, revealSession, submitVote } from '@/lib/api';
import {
  clearParticipantIdentity,
  getParticipantIdentity,
  type StoredParticipantIdentity
} from '@/lib/storage';
import { buildGroupVoteStats, deriveSessionGroups, resolveParticipantGroupId } from '@/lib/session-groups';
import { connectToSession } from '@/lib/socket';
import type { SessionView } from '@/lib/types';
import { buildVoteStats } from '@/lib/vote-stats';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type SessionPageProps = {
  code: string;
};

function formatInsightValue(value: number | null): string {
  return value === null ? '—' : `${value}`;
}

export function SessionPage({ code }: SessionPageProps) {
  const router = useRouter();
  const sessionCode = code.toUpperCase();
  const sessionShareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/session/${sessionCode}`;
    }

    return `${window.location.origin}/session/${sessionCode}`;
  }, [sessionCode]);
  const [identity, setIdentity] = useState<StoredParticipantIdentity | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [pendingOwnVote, setPendingOwnVote] = useState<string | null>(null);

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

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.revealed) {
      setPendingOwnVote(null);
    }
  }, [session]);

  const selectedCard = session?.revealed ? me?.vote ?? null : pendingOwnVote;
  const isOwner = me?.isOwner ?? false;

  const votedCount = useMemo(() => {
    if (!session) {
      return 0;
    }

    return session.participants.filter((participant) => participant.hasVoted).length;
  }, [session]);

  const participantCountLabel = useMemo(() => {
    if (!session) {
      return 'Chargement...';
    }

    return `${votedCount}/${session.participants.length} votes`;
  }, [session, votedCount]);

  const revealedVoteStats = useMemo(() => {
    if (!session?.revealed) {
      return null;
    }

    return buildVoteStats(session.participants, session.deck);
  }, [session]);

  const sessionGroups = useMemo(() => {
    if (!session) {
      return [];
    }

    return deriveSessionGroups(session);
  }, [session]);

  const groupedVoteStats = useMemo(() => {
    if (!session?.revealed) {
      return [];
    }

    return buildGroupVoteStats(session);
  }, [session]);

  const participantGroupNameById = useMemo(() => {
    if (!session) {
      return new Map<string, string>();
    }

    const nameByParticipantId = new Map<string, string>();

    session.participants.forEach((participant) => {
      const groupId = resolveParticipantGroupId(participant, sessionGroups);

      if (!groupId) {
        return;
      }

      const group = sessionGroups.find((sessionGroup) => sessionGroup.id === groupId);

      if (group) {
        nameByParticipantId.set(participant.id, group.name);
      }
    });

    return nameByParticipantId;
  }, [session, sessionGroups]);

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

  const sessionMeta = (
    <header className="session-summary card">
      <div className="session-summary-main">
        <div>
          <span className="session-kicker">Session</span>
          <div className="session-summary-row">
            <h1 className="session-code-title">{sessionCode}</h1>
            <button
              className="secondary-button compact-button"
              onClick={() => navigator.clipboard.writeText(sessionShareUrl)}
              type="button"
            >
              Copier
            </button>
          </div>
          <p className="muted-text">
            {identity.name} · {participantCountLabel}
          </p>
        </div>

        <div className="session-summary-badges">
          <span className={`status-pill ${connectionState}`}>{connectionState}</span>
          {isOwner ? <span className="owner-pill">Owner</span> : null}
        </div>
      </div>
    </header>
  );

  const participantsPanel = (
    <div className="card stack-gap participants-panel">
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">Participants</span>
          <h2>{session?.revealed ? 'Votes individuels' : 'Etat de la table'}</h2>
        </div>
        <p className="muted-text">
          {session?.revealed
            ? 'Chaque estimation reste visible pour comparer rapidement les ecarts.'
            : 'Suivez qui a vote et qui est encore en attente.'}
        </p>
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
                {participantGroupNameById.has(participant.id) ? (
                  <span className="participant-group">{participantGroupNameById.get(participant.id)}</span>
                ) : null}
              </div>
            </div>

            <div className="vote-state emphasized">
              {session?.revealed ? (
                <span className="revealed-vote compact">{participant.vote ?? '—'}</span>
              ) : participant.id === identity.participantId && selectedCard ? (
                <div className="personal-vote-state">
                  <span className="personal-vote-label">Votre vote</span>
                  <span className="revealed-vote compact pending">{selectedCard}</span>
                </div>
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
  );

  const revealedLayout =
    session?.revealed && revealedVoteStats ? (
      <section className="session-revealed-layout">
        {sessionMeta}

        <section className="card result-hero">
          <div className="result-hero-header">
            <div>
              <span className="eyebrow">Resultat</span>
              <h2 className="result-hero-title">Votes reveles</h2>
            </div>
            <p className="muted-text result-hero-copy">
              Le round est clos. La moyenne et la distribution passent au premier plan pour lire
              rapidement le consensus.
            </p>
          </div>

          <div className="result-hero-grid">
            <article className="result-primary-stat">
              <span className="insight-label">Moyenne</span>
              <strong>{formatInsightValue(revealedVoteStats.average)}</strong>
              <p className="muted-text">
                {revealedVoteStats.average === null
                  ? 'Aucune moyenne numerique disponible.'
                  : `Calculee sur ${revealedVoteStats.numericVoteCount} vote(s) numerique(s).`}
              </p>
            </article>

            <div className="result-secondary-stats">
              <article className="insight-stat-card">
                <span className="insight-label">Mediane</span>
                <strong>{formatInsightValue(revealedVoteStats.median)}</strong>
              </article>
              <article className="insight-stat-card">
                <span className="insight-label">Ecart min/max</span>
                <strong>{formatInsightValue(revealedVoteStats.spread)}</strong>
              </article>
              <article className="insight-stat-card">
                <span className="insight-label">Ecart-type</span>
                <strong>{formatInsightValue(revealedVoteStats.standardDeviation)}</strong>
              </article>
            </div>
          </div>

          <div className="vote-chart vote-chart-hero" aria-label="Repartition des votes">
            {revealedVoteStats.buckets.map((bucket) => (
              <article className="vote-chart-row" key={bucket.label}>
                <div className="vote-chart-meta">
                  <span className="vote-chart-label">{bucket.label}</span>
                  <span className="vote-chart-count">{bucket.count} vote(s)</span>
                </div>
                <div className="vote-chart-track" role="presentation">
                  <div
                    className="vote-chart-bar"
                    style={{ width: `${Math.max(bucket.ratio * 100, bucket.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card consensus-panel">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Consensus</span>
              <h2>Lecture du vote</h2>
            </div>
            <p className="muted-text">
              Une synthese rapide pour juger si la table converge ou s’il faut rouvrir la
              discussion.
            </p>
          </div>

          <div className="consensus-grid">
            <article className="consensus-card emphasis">
              <span className="insight-label">Consensus</span>
              <strong>{revealedVoteStats.consensusLabel}</strong>
              <p>{revealedVoteStats.consensusDescription}</p>
            </article>

            <article className="consensus-card">
              <span className="insight-label">Dispersion</span>
              <strong>{revealedVoteStats.dispersionLabel}</strong>
              <p>{revealedVoteStats.dispersionDescription}</p>
            </article>

            {revealedVoteStats.nonNumericVotesMessage ? (
              <article className="consensus-card note">
                <span className="insight-label">Votes exclus</span>
                <strong>{revealedVoteStats.nonNumericVoteCount}</strong>
                <p>{revealedVoteStats.nonNumericVotesMessage}</p>
              </article>
            ) : null}
          </div>
        </section>

        {groupedVoteStats.length > 0 ? (
          <section className="card grouped-results-panel">
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow">Groupes</span>
                <h2>Tendances par groupe</h2>
              </div>
              <p className="muted-text">
                Les statistiques sont ventilées par groupe pour comparer les dynamiques iOS/Android
                ou tout autre découpage de l’équipe.
              </p>
            </div>

            <div className="grouped-results-grid">
              {groupedVoteStats.map((groupStats) => (
                <article className="group-result-card" key={groupStats.group.id}>
                  <header className="group-result-header">
                    <h3>{groupStats.group.name}</h3>
                    <span className="muted-text">
                      {groupStats.votedCount}/{groupStats.participants.length} votes
                    </span>
                  </header>

                  <div className="group-result-insights">
                    <div className="insight-stat-card">
                      <span className="insight-label">Consensus</span>
                      <strong>{groupStats.stats.consensusLabel}</strong>
                    </div>
                    <div className="insight-stat-card">
                      <span className="insight-label">Moyenne</span>
                      <strong>{formatInsightValue(groupStats.stats.average)}</strong>
                    </div>
                  </div>

                  <div className="vote-chart">
                    {groupStats.stats.buckets
                      .filter((bucket) => bucket.count > 0)
                      .map((bucket) => (
                        <article className="vote-chart-row" key={`${groupStats.group.id}:${bucket.label}`}>
                          <div className="vote-chart-meta">
                            <span className="vote-chart-label">{bucket.label}</span>
                            <span className="vote-chart-count">{bucket.count}</span>
                          </div>
                          <div className="vote-chart-track" role="presentation">
                            <div
                              className="vote-chart-bar"
                              style={{
                                width: `${Math.max(
                                  bucket.ratio * 100,
                                  bucket.count > 0 ? 8 : 0
                                )}%`
                              }}
                            />
                          </div>
                        </article>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {participantsPanel}

        <section className="session-support-grid">
          <div className="card support-card">
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow">Actions</span>
                <h2>Controle du round</h2>
              </div>
            </div>

            <div className="action-row">
              {isOwner ? (
                <button
                  className="primary-button"
                  disabled={pendingAction === 'reset'}
                  onClick={() =>
                    runAction('reset', async () => {
                      await resetSession(sessionCode, { participantId: identity.participantId });
                      setPendingOwnVote(null);
                    })
                  }
                  type="button"
                >
                  {pendingAction === 'reset' ? 'Relance...' : 'Nouveau round'}
                </button>
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

          <div className="card support-card session-facts">
            <div className="session-stats compact-session-stats">
              <div className="session-stat">
                <span className="session-stat-value">{session.participants.length}</span>
                <span className="session-stat-label">Participants</span>
              </div>
              <div className="session-stat accent">
                <span className="session-stat-value">{votedCount}</span>
                <span className="session-stat-label">Votes poses</span>
              </div>
            </div>
          </div>
        </section>
      </section>
    ) : null;

  const hiddenLayout = session && !session.revealed ? (
    <section className="session-hidden-layout">
      {sessionMeta}

      <section className="card vote-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Votre vote</span>
            <h2>Choisissez votre estimation</h2>
          </div>
          <p className="muted-text">
            Votre selection reste masquee jusqu’a la revelation. Le round en cours donne la
            priorite a votre action de vote.
          </p>
        </div>

        <div className="personal-vote-banner">
          <span className="personal-vote-label">Valeur choisie</span>
          <div className="personal-vote-banner-content">
            <strong>{selectedCard ?? '—'}</strong>
            <span className="muted-text">
              {selectedCard
                ? 'Votre estimation est enregistree et restera visible uniquement pour vous jusqu’a la revelation.'
                : 'Aucune carte selectionnee pour le moment.'}
            </span>
          </div>
        </div>

        <div className="cards-grid vote-hero-grid">
          {session.deck.map((card) => (
            <button
              key={card}
              className={selectedCard === card ? 'vote-card active' : 'vote-card'}
              disabled={pendingAction === 'vote'}
              onClick={() =>
                runAction('vote', async () => {
                  await submitVote(sessionCode, {
                    participantId: identity.participantId,
                    card
                  });
                  setPendingOwnVote(card);
                })
              }
              type="button"
            >
              {card}
            </button>
          ))}
        </div>
      </section>

      <section className="session-support-grid">
        <div className="card support-card">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Progression</span>
              <h2>Resume du round</h2>
            </div>
            <p className="muted-text">Le vote personnel est prioritaire, le reste tient en support.</p>
          </div>

          <div className="session-stats compact-session-stats">
            <div className="session-stat">
              <span className="session-stat-value">{session.participants.length}</span>
              <span className="session-stat-label">Participants</span>
            </div>
            <div className="session-stat accent">
              <span className="session-stat-value">{votedCount}</span>
              <span className="session-stat-label">Votes poses</span>
            </div>
          </div>

          <div className="action-row">
            {isOwner ? (
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

        {participantsPanel}
      </section>
    </section>
  ) : null;

  return (
    <main className="shell session-shell">
      <section className="session-layout">
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {revealedLayout}
        {hiddenLayout}
      </section>
    </main>
  );
}
