'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createSession, joinSession } from '@/lib/api';
import {
  DEFAULT_DECK_MODE,
  DECK_PRESETS,
  parseCustomDeck,
  type DeckMode
} from '@/lib/decks';
import { saveParticipantIdentity } from '@/lib/storage';

const FORM_MESSAGES: Record<string, string> = {
  join: 'Rejoignez une session existante avec votre nom.',
  create: 'Créez une nouvelle session et partagez le code à votre équipe.'
};

type HomePageProps = {
  initialCode?: string;
};

export function HomePage({ initialCode = '' }: HomePageProps) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<'create' | 'join'>(
    initialCode ? 'join' : 'create'
  );
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [deckMode, setDeckMode] = useState<DeckMode>(DEFAULT_DECK_MODE);
  const [customDeck, setCustomDeck] = useState(DECK_PRESETS.custom.join(', '));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

  const availableDeck = useMemo(() => {
    if (deckMode === 'custom') {
      return parseCustomDeck(customDeck);
    }

    return DECK_PRESETS[deckMode];
  }, [customDeck, deckMode]);

  const submitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingAction('create');
    setErrorMessage(null);

    try {
      const response = await createSession({
        name: createName,
        deck: [...availableDeck]
      });

      saveParticipantIdentity({
        sessionCode: response.session.code,
        participantId: response.participantId,
        name: createName.trim()
      });

      router.push(`/session/${response.session.code}`);
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
      const response = await joinSession(code, {
        name: joinName
      });

      saveParticipantIdentity({
        sessionCode: response.session.code,
        participantId: response.participantId,
        name: joinName.trim()
      });

      router.push(`/session/${response.session.code}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Planning Poker</span>
          <h1>Des estimations nettes, en temps reel.</h1>
          <p>
            Lancez une session en quelques secondes, partagez le code et laissez
            chaque participant voter sans influence jusqu&apos;à la révélation.
          </p>
        </div>

        <div className="hero-panels">
          <div className="panel-switcher" role="tablist" aria-label="Choix du flux">
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

          <p className="panel-message">{FORM_MESSAGES[activePanel]}</p>

          {activePanel === 'create' ? (
            <form className="form-card" onSubmit={submitCreate}>
              <label className="field">
                <span>Votre nom</span>
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Maxime"
                  maxLength={50}
                  required
                />
              </label>

              <div className="field">
                <span>Deck</span>
                <div className="deck-presets">
                  {Object.keys(DECK_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      className={deckMode === preset ? 'preset-chip active' : 'preset-chip'}
                      onClick={() => setDeckMode(preset as DeckMode)}
                      type="button"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Cartes</span>
                <textarea
                  value={customDeck}
                  onChange={(event) => {
                    setDeckMode('custom');
                    setCustomDeck(event.target.value);
                  }}
                  rows={3}
                  placeholder="1, 2, 3, 5, 8, 13, ?"
                />
              </label>

              <div className="deck-preview">
                {availableDeck.map((card) => (
                  <span key={card} className="mini-card">
                    {card}
                  </span>
                ))}
              </div>

              <button className="primary-button" disabled={pendingAction === 'create'} type="submit">
                {pendingAction === 'create' ? 'Creation...' : 'Demarrer la session'}
              </button>
            </form>
          ) : (
            <form className="form-card" onSubmit={submitJoin}>
              <label className="field">
                <span>Code de session</span>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  required
                />
              </label>

              <label className="field">
                <span>Votre nom</span>
                <input
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  placeholder="Alice"
                  maxLength={50}
                  required
                />
              </label>

              <button className="primary-button" disabled={pendingAction === 'join'} type="submit">
                {pendingAction === 'join' ? 'Connexion...' : 'Rejoindre la session'}
              </button>
            </form>
          )}

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        </div>
      </section>
    </main>
  );
}
