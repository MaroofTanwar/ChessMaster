import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveHistory } from '../src/components/chess/MoveHistory';
import {
  scrollContainerToEnd,
  scrollElementWithinContainer,
} from '../src/utils/scrollWithinContainer';

const rect = (top, bottom) => ({
  top,
  bottom,
  left: 0,
  right: 200,
  width: 200,
  height: bottom - top,
  x: 0,
  y: top,
  toJSON: () => ({}),
});

describe('mobile game scroll containment', () => {
  let originalScrollIntoView;

  beforeEach(() => {
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
    else delete Element.prototype.scrollIntoView;
    vi.restoreAllMocks();
  });

  it('scrolls only the move-history container when the selected move is below it', () => {
    const history = [
      { san: 'e4' }, { san: 'e5' }, { san: 'Nf3' }, { san: 'Nc6' },
      { san: 'Bb5' }, { san: 'a6' }, { san: 'Ba4' }, { san: 'Nf6' },
    ];
    const { container, getByTestId, rerender } = render(
      <MoveHistory history={history} currentMoveIndex={0} />
    );
    const scroller = getByTestId('move-history-scroll');
    const selectedMove = container.querySelector('[data-move-index="7"]');
    let internalScrollTop = 0;

    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 100 },
      scrollTop: {
        configurable: true,
        get: () => internalScrollTop,
        set: (value) => { internalScrollTop = value; },
      },
    });
    scroller.getBoundingClientRect = () => rect(200, 300);
    selectedMove.getBoundingClientRect = () => rect(340, 364);
    scroller.scrollTo = vi.fn(({ top }) => { internalScrollTop = top; });

    const pageScrollBefore = document.documentElement.scrollTop;
    rerender(<MoveHistory history={history} currentMoveIndex={7} />);

    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 64, behavior: 'smooth' });
    expect(internalScrollTop).toBe(64);
    expect(document.documentElement.scrollTop).toBe(pageScrollBefore);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('uses container-local scrolling for move and chat feeds', () => {
    let moveScrollTop = 20;
    const moveContainer = {
      clientHeight: 100,
      get scrollTop() { return moveScrollTop; },
      set scrollTop(value) { moveScrollTop = value; },
      getBoundingClientRect: () => rect(100, 200),
      scrollTo: vi.fn(({ top }) => { moveScrollTop = top; }),
    };
    const move = { getBoundingClientRect: () => rect(210, 235) };

    expect(scrollElementWithinContainer(moveContainer, move, { behavior: 'smooth' })).toBe(true);
    expect(moveScrollTop).toBe(55);

    let chatScrollTop = 0;
    const chatContainer = {
      clientHeight: 120,
      scrollHeight: 420,
      get scrollTop() { return chatScrollTop; },
      set scrollTop(value) { chatScrollTop = value; },
      scrollTo: vi.fn(({ top }) => { chatScrollTop = top; }),
    };
    expect(scrollContainerToEnd(chatContainer, 'smooth')).toBe(true);
    expect(chatScrollTop).toBe(300);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
