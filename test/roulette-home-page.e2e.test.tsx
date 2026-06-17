import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouletteHomePage } from '@/components/roulette-home-page';
import { createRouletteSession, getRouletteSession } from '@/lib/api';
import { saveRouletteOwnerToken } from '@/lib/storage';

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
  createRouletteSession: vi.fn(),
  getRouletteSession: vi.fn()
}));

vi.mock('@/lib/storage', () => ({
  saveRouletteOwnerToken: vi.fn()
}));

const createRouletteSessionMock = vi.mocked(createRouletteSession);
const getRouletteSessionMock = vi.mocked(getRouletteSession);
const saveRouletteOwnerTokenMock = vi.mocked(saveRouletteOwnerToken);

describe('RouletteHomePage flow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    createRouletteSessionMock.mockReset();
    getRouletteSessionMock.mockReset();
    saveRouletteOwnerTokenMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderRouletteHomePage(initialCode = ''): Promise<void> {
    await act(async () => {
      root.render(React.createElement(RouletteHomePage, { initialCode }));
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

  it('creates a roulette session, stores the owner token and navigates to it', async () => {
    createRouletteSessionMock.mockResolvedValue({
      ownerToken: 'roulette_owner_123',
      session: {
        code: 'ABC123',
        values: ['Alice', 'Bob'],
        lastDraw: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    await renderRouletteHomePage();

    const valuesTextarea = container.querySelector(
      'textarea[placeholder="Alice, Bob, Charlie"]'
    ) as HTMLTextAreaElement;

    await setInputValue(valuesTextarea, 'Alice, Bob\nAlice');

    await act(async () => {
      getButton('Creer la roulette').click();
    });

    expect(createRouletteSessionMock).toHaveBeenCalledWith({
      values: ['Alice', 'Bob']
    });
    expect(saveRouletteOwnerTokenMock).toHaveBeenCalledWith('ABC123', 'roulette_owner_123');
    expect(routerMock.push).toHaveBeenCalledWith('/roulette/ABC123');
  });

  it('opens an existing roulette after checking it exists', async () => {
    getRouletteSessionMock.mockResolvedValue({
      code: 'ABC123',
      values: [],
      lastDraw: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await renderRouletteHomePage();

    await act(async () => {
      getButton('Rejoindre').click();
    });

    const codeInput = container.querySelector('input[placeholder="ABC123"]') as HTMLInputElement;
    await setInputValue(codeInput, 'abc123');

    await act(async () => {
      getButton('Ouvrir la roulette').click();
    });

    expect(getRouletteSessionMock).toHaveBeenCalledWith('ABC123');
    expect(routerMock.push).toHaveBeenCalledWith('/roulette/ABC123');
  });
});
