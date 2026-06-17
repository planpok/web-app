'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createRouletteSession, getRouletteSession } from '@/lib/api';
import { saveRouletteOwnerToken } from '@/lib/storage';

function parseRouletteValues(rawValues: string): string[] {
  return Array.from(
    new Set(
      rawValues
        .split(/[\n,]/)
        .map((value) => value.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
    )
  );
}

type RouletteHomePageProps = {
  initialCode?: string;
};

export function RouletteHomePage({ initialCode = '' }: RouletteHomePageProps) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<'create' | 'join'>(
    initialCode ? 'join' : 'create'
  );
  const [valuesInput, setValuesInput] = useState('');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

  const submitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingAction('create');
    setErrorMessage(null);

    try {
      const response = await createRouletteSession({
        values: parseRouletteValues(valuesInput)
      });

      saveRouletteOwnerToken(response.session.code, response.ownerToken);
      router.push(`/roulette/${response.session.code}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setPendingAction(null);
    }
  };

  const submitJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingAction('join');
    setErrorMessage(null);

    try {
      const code = joinCode.trim().toUpperCase();
      await getRouletteSession(code);
      router.push(`/roulette/${code}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Roulette introuvable.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="shell">
      <section className="hero-card roulette-landing">
        <div className="hero-copy">
          <span className="eyebrow">Roulette du hasard</span>
          <h1>Tirez une option au hasard.</h1>
          <p>
            Creez une roulette partageable, ajoutez vos valeurs, lancez le tirage puis choisissez
            de retirer ou garder le resultat.
          </p>
          <div className="action-row">
            <Link className="secondary-button" href="/">
              Planning poker
            </Link>
          </div>
        </div>

        <div className="hero-panels">
          <div className="panel-switcher" role="tablist" aria-label="Choix du flux roulette">
            <button
              className={activePanel === 'create' ? 'panel-tab active' : 'panel-tab'}
              onClick={() => setActivePanel('create')}
              type="button"
            >
              Creer
            </button>
            <button
              className={activePanel === 'join' ? 'panel-tab active' : 'panel-tab'}
              onClick={() => setActivePanel('join')}
              type="button"
            >
              Rejoindre
            </button>
          </div>

          {activePanel === 'create' ? (
            <form className="form-card" onSubmit={submitCreate}>
              <label className="field">
                <span>Valeurs</span>
                <textarea
                  value={valuesInput}
                  onChange={(event) => setValuesInput(event.target.value)}
                  placeholder="Alice, Bob, Charlie"
                  rows={5}
                />
              </label>
              <p className="muted-text">
                Vous pourrez aussi creer une roulette vide et ajouter les valeurs ensuite.
              </p>
              <button className="primary-button" disabled={pendingAction === 'create'} type="submit">
                {pendingAction === 'create' ? 'Creation...' : 'Creer la roulette'}
              </button>
            </form>
          ) : (
            <form className="form-card" onSubmit={submitJoin}>
              <label className="field">
                <span>Code de roulette</span>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  required
                />
              </label>
              <button className="primary-button" disabled={pendingAction === 'join'} type="submit">
                {pendingAction === 'join' ? 'Connexion...' : 'Ouvrir la roulette'}
              </button>
            </form>
          )}

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        </div>
      </section>
    </main>
  );
}
