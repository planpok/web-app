import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouletteSessionPage } from '@/components/roulette-session-page';
import {
  addRouletteValue,
  drawRouletteValue,
  getRouletteSession,
  keepLastRouletteDraw,
  removeLastRouletteDraw
} from '@/lib/api';
import { getRouletteOwnerToken } from '@/lib/storage';
import type { RouletteSessionView } from '@/lib/types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api', () => ({
  addRouletteValue: vi.fn(),
  drawRouletteValue: vi.fn(),
  getRouletteSession: vi.fn(),
  keepLastRouletteDraw: vi.fn(),
  removeLastRouletteDraw: vi.fn(),
  removeRouletteValue: vi.fn()
}));

vi.mock('@/lib/storage', () => ({
  getRouletteOwnerToken: vi.fn()
}));

const addRouletteValueMock = vi.mocked(addRouletteValue);
const drawRouletteValueMock = vi.mocked(drawRouletteValue);
const getRouletteSessionMock = vi.mocked(getRouletteSession);
const getRouletteOwnerTokenMock = vi.mocked(getRouletteOwnerToken);
const keepLastRouletteDrawMock = vi.mocked(keepLastRouletteDraw);
const removeLastRouletteDrawMock = vi.mocked(removeLastRouletteDraw);

function buildSession(overrides: Partial<RouletteSessionView> = {}): RouletteSessionView {
  return {
    code: 'ABC123',
    values: ['Alice'],
    lastDraw: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('RouletteSessionPage flow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    addRouletteValueMock.mockReset();
    drawRouletteValueMock.mockReset();
    getRouletteSessionMock.mockReset();
    getRouletteOwnerTokenMock.mockReset();
    keepLastRouletteDrawMock.mockReset();
    removeLastRouletteDrawMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderRouletteSessionPage(): Promise<void> {
    await act(async () => {
      root.render(React.createElement(RouletteSessionPage, { code: 'abc123' }));
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

  async function setInputValue(element: HTMLInputElement, value: string): Promise<void> {
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

  it('lets the owner add a value and draw', async () => {
    const initialSession = buildSession();
    const addedSession = buildSession({ values: ['Alice', 'Bob'] });
    const drawnSession = buildSession({
      values: ['Alice', 'Bob'],
      lastDraw: {
        value: 'Bob',
        drawnAt: new Date().toISOString(),
        removable: true
      }
    });

    getRouletteOwnerTokenMock.mockReturnValue('roulette_owner_123');
    getRouletteSessionMock
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(addedSession)
      .mockResolvedValue(drawnSession);
    addRouletteValueMock.mockResolvedValue(addedSession);
    drawRouletteValueMock.mockResolvedValue(drawnSession);

    await renderRouletteSessionPage();

    const valueInput = container.querySelector('input[placeholder="Nouvelle valeur"]') as HTMLInputElement;
    await setInputValue(valueInput, 'Bob');

    await act(async () => {
      getButton('Ajouter').click();
    });

    expect(addRouletteValueMock).toHaveBeenCalledWith('ABC123', {
      ownerToken: 'roulette_owner_123',
      value: 'Bob'
    });

    await act(async () => {
      getButton('Lancer la roulette').click();
    });

    expect(drawRouletteValueMock).toHaveBeenCalledWith('ABC123', {
      ownerToken: 'roulette_owner_123'
    });
  });

  it('lets the owner remove or keep a removable draw', async () => {
    const drawnSession = buildSession({
      lastDraw: {
        value: 'Alice',
        drawnAt: new Date().toISOString(),
        removable: true
      }
    });
    const resolvedSession = buildSession({
      values: [],
      lastDraw: {
        value: 'Alice',
        drawnAt: drawnSession.lastDraw!.drawnAt,
        removable: false
      }
    });

    getRouletteOwnerTokenMock.mockReturnValue('roulette_owner_123');
    getRouletteSessionMock.mockResolvedValue(drawnSession);
    removeLastRouletteDrawMock.mockResolvedValue(resolvedSession);
    keepLastRouletteDrawMock.mockResolvedValue({
      ...drawnSession,
      lastDraw: {
        ...drawnSession.lastDraw!,
        removable: false
      }
    });

    await renderRouletteSessionPage();

    await act(async () => {
      getButton('Retirer').click();
    });

    expect(removeLastRouletteDrawMock).toHaveBeenCalledWith('ABC123', {
      ownerToken: 'roulette_owner_123'
    });

    await act(async () => {
      getButton('Garder').click();
    });

    expect(keepLastRouletteDrawMock).toHaveBeenCalledWith('ABC123', {
      ownerToken: 'roulette_owner_123'
    });
  });

  it('shows visitors a read-only session', async () => {
    getRouletteOwnerTokenMock.mockReturnValue(null);
    getRouletteSessionMock.mockResolvedValue(buildSession());

    await renderRouletteSessionPage();

    expect(container.textContent).toContain('Lecture seule');
    expect(container.textContent).not.toContain('Lancer la roulette');
    expect(container.textContent).not.toContain('Ajouter');
  });
});
