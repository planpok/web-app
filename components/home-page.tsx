'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createSession, getSession, joinSession } from '@/lib/api';
import {
  DEFAULT_DECK_MODE,
  DECK_PRESETS,
  parseCustomDeck,
  type DeckMode
} from '@/lib/decks';
import { saveParticipantIdentity } from '@/lib/storage';
import type { SessionGroupView } from '@/lib/types';

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
  const [createGroups, setCreateGroups] = useState<string[]>([]);
  const [createGroupInput, setCreateGroupInput] = useState('');
  const [createOwnerGroupName, setCreateOwnerGroupName] = useState('');
  const [joinGroups, setJoinGroups] = useState<SessionGroupView[]>([]);
  const [joinGroupId, setJoinGroupId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

  const availableDeck = useMemo(() => {
    if (deckMode === 'custom') {
      return parseCustomDeck(customDeck);
    }

    return DECK_PRESETS[deckMode];
  }, [customDeck, deckMode]);

  const addCreateGroup = () => {
    const normalized = createGroupInput.trim().replace(/\s+/g, ' ');

    if (!normalized || createGroups.includes(normalized)) {
      return;
    }

    setCreateGroups((previous) => [...previous, normalized]);
    setCreateGroupInput('');
  };

  const removeCreateGroup = (name: string) => {
    setCreateGroups((previous) => previous.filter((groupName) => groupName !== name));
    setCreateOwnerGroupName((previous) => (previous === name ? '' : previous));
  };

  const submitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingAction('create');
    setErrorMessage(null);

    try {
      const response = await createSession({
        name: createName,
        deck: [...availableDeck],
        groups: createGroups.length > 0 ? createGroups : undefined,
        ownerGroupName: createOwnerGroupName || undefined
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
        name: joinName,
        groupId: joinGroupId || undefined
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

  React.useEffect(() => {
    if (activePanel !== 'join') {
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();

    if (normalizedCode.length < 4) {
      setJoinGroups([]);
      setJoinGroupId('');
      return;
    }

    let disposed = false;
    const timeoutId = window.setTimeout(() => {
      getSession(normalizedCode)
        .then((session) => {
          if (disposed) {
            return;
          }

          const nextGroups = session.groups ?? [];
          setJoinGroups(nextGroups);

          if (nextGroups.every((group) => group.id !== joinGroupId)) {
            setJoinGroupId('');
          }
        })
        .catch(() => {
          if (!disposed) {
            setJoinGroups([]);
            setJoinGroupId('');
          }
        });
    }, 250);

    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [activePanel, joinCode, joinGroupId]);

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

              <div className="field">
                <span>Groupes</span>
                <div className="group-input-row">
                  <input
                    value={createGroupInput}
                    onChange={(event) => setCreateGroupInput(event.target.value)}
                    placeholder="iOS"
                    maxLength={50}
                  />
                  <button className="secondary-button compact-button" onClick={addCreateGroup} type="button">
                    Ajouter
                  </button>
                </div>
                {createGroups.length > 0 ? (
                  <div className="group-chip-list" aria-label="Groupes de la session">
                    {createGroups.map((groupName) => (
                      <div
                        className={
                          createOwnerGroupName === groupName
                            ? 'group-chip owner-selected'
                            : 'group-chip'
                        }
                        key={groupName}
                      >
                        <button
                          className="group-chip-select"
                          onClick={() =>
                            setCreateOwnerGroupName((previous) =>
                              previous === groupName ? '' : groupName
                            )
                          }
                          type="button"
                        >
                          {groupName}
                        </button>
                        <button
                          aria-label={`Supprimer le groupe ${groupName}`}
                          className="group-chip-remove"
                          onClick={() => removeCreateGroup(groupName)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">Aucun groupe pour l’instant.</p>
                )}
                {createGroups.length > 0 ? (
                  <p className="muted-text">Cliquez un groupe pour l’assigner à votre participant owner.</p>
                ) : null}
              </div>

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

              {joinGroups.length > 0 ? (
                <label className="field">
                  <span>Groupe</span>
                  <select
                    className="field-select"
                    value={joinGroupId}
                    onChange={(event) => setJoinGroupId(event.target.value)}
                  >
                    <option value="">Sans groupe</option>
                    {joinGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button className="primary-button" disabled={pendingAction === 'join'} type="submit">
                {pendingAction === 'join' ? 'Connexion...' : 'Rejoindre la session'}
              </button>
            </form>
          )}

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        </div>
      </section>

      <section className="seo-section" aria-labelledby="planning-poker-title">
        <div className="seo-heading">
          <span className="eyebrow">Estimation agile</span>
          <h2 id="planning-poker-title">Un planning poker en ligne simple pour les equipes Scrum.</h2>
          <p>
            Planning-poker.fr aide les product owners, scrum masters et equipes de
            developpement a estimer les user stories avec des votes anonymes jusqu&apos;a
            la revelation.
          </p>
        </div>

        <div className="seo-grid">
          <article>
            <h3>Sessions instantanees</h3>
            <p>
              Creez une salle de planning poker, partagez un code court et laissez
              chaque participant rejoindre la session depuis son navigateur.
            </p>
          </article>
          <article>
            <h3>Votes sans influence</h3>
            <p>
              Les estimations restent masquees pendant le vote pour limiter les biais,
              puis l&apos;equipe revele les cartes au meme moment.
            </p>
          </article>
          <article>
            <h3>Decks adaptes a votre methode</h3>
            <p>
              Utilisez une suite Fibonacci, des tailles de t-shirt ou un deck
              personnalise pour aligner l&apos;outil avec votre pratique agile.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
