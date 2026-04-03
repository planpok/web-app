import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/components/home-page';
import { createSession } from '@/lib/api';
import { saveParticipantIdentity } from '@/lib/storage';

const { routerMock } = vi.hoisted(() => ({
  routerMock: {
    push: vi.fn(),
    replace: vi.fn()
  }
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock
}));

vi.mock('@/lib/api', () => ({
  createSession: vi.fn(),
  joinSession: vi.fn()
}));

vi.mock('@/lib/storage', () => ({
  saveParticipantIdentity: vi.fn()
}));

const createSessionMock = vi.mocked(createSession);
const saveParticipantIdentityMock = vi.mocked(saveParticipantIdentity);

describe('HomePage flow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    createSessionMock.mockReset();
    saveParticipantIdentityMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderHomePage(initialCode = ''): Promise<void> {
    await act(async () => {
      root.render(React.createElement(HomePage, { initialCode }));
    });
  }

  function getButton(label: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.trim() === label
    );

    if (!button) {
      throw new Error(`Button not found: ${label}`);
    }

    return button as HTMLButtonElement;
  }

  async function setInputValue(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ): Promise<void> {
    await act(async () => {
      const prototype = Object.getPrototypeOf(element);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

      if (!descriptor?.set) {
        throw new Error('Unable to update input value in test environment.');
      }

      descriptor.set.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  it('creates a session from the custom deck and persists the participant identity', async () => {
    createSessionMock.mockResolvedValue({
      participantId: 'participant_123',
      session: {
        code: 'abc123',
        revealed: false,
        deck: ['1', '2', '3', '5'],
        createdAt: new Date().toISOString(),
        participants: [
          {
            id: 'participant_123',
            name: 'Maxime',
            isOwner: true,
            hasVoted: false,
            vote: null
          }
        ]
      }
    });

    await renderHomePage();

    await act(async () => {
      getButton('custom').click();
    });

    const nameInput = container.querySelector('input[placeholder="Maxime"]') as HTMLInputElement;
    const deckTextarea = container.querySelector(
      'textarea[placeholder="1, 2, 3, 5, 8, 13, ?"]'
    ) as HTMLTextAreaElement;
    const submitButton = getButton('Demarrer la session');

    await setInputValue(nameInput, 'Maxime');
    await setInputValue(deckTextarea, '1, 2, 3, 3, 5');

    await act(async () => {
      submitButton.click();
    });

    expect(createSessionMock).toHaveBeenCalledWith({
      name: 'Maxime',
      deck: ['1', '2', '3', '5']
    });
    expect(saveParticipantIdentityMock).toHaveBeenCalledWith({
      sessionCode: 'abc123',
      participantId: 'participant_123',
      name: 'Maxime'
    });
    expect(routerMock.push).toHaveBeenCalledWith('/session/abc123');
  });
});
