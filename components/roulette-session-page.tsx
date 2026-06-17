'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  addRouletteValue,
  drawRouletteValue,
  getRouletteSession,
  keepLastRouletteDraw,
  removeLastRouletteDraw,
  removeRouletteValue
} from '@/lib/api';
import { getRouletteOwnerToken } from '@/lib/storage';
import type { RouletteSessionView } from '@/lib/types';

type RouletteSessionPageProps = {
  code: string;
};

export function RouletteSessionPage({ code }: RouletteSessionPageProps) {
  const sessionCode = code.toUpperCase();
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [session, setSession] = useState<RouletteSessionView | null>(null);
  const [valueInput, setValueInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const sessionShareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/roulette/${sessionCode}`;
    }

    return `${window.location.origin}/roulette/${sessionCode}`;
  }, [sessionCode]);

  const isOwner = Boolean(ownerToken);

  const refreshSession = async () => {
    const nextSession = await getRouletteSession(sessionCode);
    setSession(nextSession);
  };

  useEffect(() => {
    setOwnerToken(getRouletteOwnerToken(sessionCode));
  }, [sessionCode]);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      try {
        const nextSession = await getRouletteSession(sessionCode);

        if (!disposed) {
          setSession(nextSession);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : 'Roulette inaccessible.');
        }
      }
    };

    void load();
    const intervalId = window.setInterval(load, 5000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [sessionCode]);

  const runOwnerAction = async (actionName: string, callback: (token: string) => Promise<unknown>) => {
    if (!ownerToken) {
      return;
    }

    setPendingAction(actionName);
    setErrorMessage(null);

    try {
      await callback(ownerToken);
      await refreshSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setPendingAction(null);
    }
  };

  const submitValue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = valueInput.trim();

    if (!nextValue) {
      return;
    }

    await runOwnerAction('add-value', async (token) => {
      const updated = await addRouletteValue(sessionCode, {
        ownerToken: token,
        value: nextValue
      });
      setSession(updated);
      setValueInput('');
    });
  };

  return (
    <main className="shell session-shell">
      <section className="session-layout roulette-session-layout">
        <header className="session-summary card">
          <div className="session-summary-main">
            <div>
              <span className="session-kicker">Roulette</span>
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
                {isOwner ? 'Mode createur' : 'Lecture seule'} · {session?.values.length ?? 0} valeurs
              </p>
            </div>

            <div className="session-summary-badges">
              {isOwner ? <span className="owner-pill">Owner</span> : null}
              <Link className="secondary-button compact-button" href="/roulette">
                Nouvelle
              </Link>
            </div>
          </div>
        </header>

        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

        <section className="card roulette-result-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Resultat</span>
              <h2>Dernier tirage</h2>
            </div>
            <p className="muted-text">
              Lancez la roulette puis decidez si la valeur doit rester dans la liste.
            </p>
          </div>

          <div className="roulette-result-value">
            <span>{session?.lastDraw?.value ?? '-'}</span>
          </div>

          {isOwner ? (
            <div className="action-row roulette-action-row">
              <button
                className="primary-button"
                disabled={!session || session.values.length === 0 || pendingAction === 'draw'}
                onClick={() =>
                  runOwnerAction('draw', async (token) => {
                    const updated = await drawRouletteValue(sessionCode, { ownerToken: token });
                    setSession(updated);
                  })
                }
                type="button"
              >
                {pendingAction === 'draw' ? 'Tirage...' : 'Lancer la roulette'}
              </button>

              <button
                className="secondary-button"
                disabled={!session?.lastDraw?.removable || pendingAction === 'remove-draw'}
                onClick={() =>
                  runOwnerAction('remove-draw', async (token) => {
                    const updated = await removeLastRouletteDraw(sessionCode, { ownerToken: token });
                    setSession(updated);
                  })
                }
                type="button"
              >
                Retirer
              </button>

              <button
                className="ghost-button"
                disabled={!session?.lastDraw?.removable || pendingAction === 'keep-draw'}
                onClick={() =>
                  runOwnerAction('keep-draw', async (token) => {
                    const updated = await keepLastRouletteDraw(sessionCode, { ownerToken: token });
                    setSession(updated);
                  })
                }
                type="button"
              >
                Garder
              </button>
            </div>
          ) : null}
        </section>

        <section className="session-support-grid roulette-support-grid">
          <div className="card stack-gap">
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow">Valeurs</span>
                <h2>Options disponibles</h2>
              </div>
            </div>

            {isOwner ? (
              <form className="group-input-row" onSubmit={submitValue}>
                <input
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  placeholder="Nouvelle valeur"
                  maxLength={100}
                />
                <button
                  className="secondary-button compact-button"
                  disabled={pendingAction === 'add-value'}
                  type="submit"
                >
                  Ajouter
                </button>
              </form>
            ) : null}

            <div className="roulette-values-list">
              {session?.values.length ? (
                session.values.map((value) => (
                  <article className="roulette-value-row" key={value}>
                    <span>{value}</span>
                    {isOwner ? (
                      <button
                        aria-label={`Supprimer ${value}`}
                        className="group-chip-remove"
                        disabled={pendingAction === `remove-value:${value}`}
                        onClick={() =>
                          runOwnerAction(`remove-value:${value}`, async (token) => {
                            const updated = await removeRouletteValue(sessionCode, value, {
                              ownerToken: token
                            });
                            setSession(updated);
                          })
                        }
                        type="button"
                      >
                        x
                      </button>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="muted-text">Aucune valeur pour le moment.</p>
              )}
            </div>
          </div>

          <aside className="card support-card">
            <div className="session-stats compact-session-stats">
              <div className="session-stat">
                <span className="session-stat-value">{session?.values.length ?? 0}</span>
                <span className="session-stat-label">Valeurs</span>
              </div>
              <div className="session-stat accent">
                <span className="session-stat-value">{session?.lastDraw ? '1' : '0'}</span>
                <span className="session-stat-label">Tirage actif</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
