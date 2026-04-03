import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionPage } from '@/components/session-page';
import { getSession } from '@/lib/api';
import { getParticipantIdentity } from '@/lib/storage';

const { routerMock } = vi.hoisted(() => ({
  routerMock: {
    push: vi.fn(),
    replace: vi.fn()
  }
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const socketMock = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  io: {
    on: vi.fn()
  }
};

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock
}));

vi.mock('@/lib/api', () => ({
  getSession: vi.fn(),
  leaveSession: vi.fn(),
  resetSession: vi.fn(),
  revealSession: vi.fn(),
  submitVote: vi.fn()
}));

vi.mock('@/lib/storage', () => ({
  clearParticipantIdentity: vi.fn(),
  getParticipantIdentity: vi.fn()
}));

vi.mock('@/lib/socket', () => ({
  connectToSession: vi.fn(() => socketMock)
}));

vi.mock('@/lib/vote-stats', () => ({
  buildVoteStats: vi.fn(() => null)
}));

const getSessionMock = vi.mocked(getSession);
const getParticipantIdentityMock = vi.mocked(getParticipantIdentity);

describe('SessionPage copy link', () => {
  let container: HTMLDivElement;
  let root: Root;
  const writeTextMock = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    routerMock.push.mockReset();
    routerMock.replace.mockReset();

    getParticipantIdentityMock.mockReset();
    getSessionMock.mockReset();

    socketMock.on.mockReset();
    socketMock.emit.mockReset();
    socketMock.disconnect.mockReset();
    socketMock.io.on.mockReset();

    writeTextMock.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock
      }
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderSessionPage(): Promise<void> {
    await act(async () => {
      root.render(React.createElement(SessionPage, { code: 'abc123' }));
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it('copies the full share URL (origin + session path) when clicking "Copier"', async () => {
    getParticipantIdentityMock.mockReturnValue({
      sessionCode: 'ABC123',
      participantId: 'participant_1',
      name: 'Maxime'
    });
    getSessionMock.mockResolvedValue({
      code: 'ABC123',
      revealed: false,
      deck: ['1', '2', '3', '5', '8'],
      createdAt: new Date().toISOString(),
      participants: [
        {
          id: 'participant_1',
          name: 'Maxime',
          isOwner: true,
          hasVoted: false,
          vote: null
        }
      ]
    });

    await renderSessionPage();

    const copyButton = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Copier'
    ) as HTMLButtonElement | undefined;

    expect(copyButton).toBeDefined();

    await act(async () => {
      copyButton?.click();
    });

    expect(writeTextMock).toHaveBeenCalledWith(`${window.location.origin}/session/ABC123`);
  });
});
