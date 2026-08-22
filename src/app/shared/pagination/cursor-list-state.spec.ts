import { describe, expect, it } from 'vitest';

import { CursorPage } from '../../core/http/api-envelope';
import { CursorListState } from './cursor-list-state';

interface Item {
  id: number;
  label: string;
}

function page(
  items: Item[],
  nextCursor: string | null = null,
  generatedAt = '2026-07-29T18:42:01Z',
): CursorPage<Item> {
  return {
    success: true,
    message: 'OK',
    data: items,
    errorCode: null,
    errors: null,
    statusCode: 200,
    meta: {
      generatedAt,
      timezone: 'UTC',
      limit: 20,
      hasMore: nextCursor !== null,
      nextCursor,
    },
  };
}

describe('CursorListState', () => {
  it('resets data and advances its request generation', () => {
    const state = new CursorListState<Item>();
    const first = state.reset();
    state.accept(page([{ id: 1, label: 'one' }], 'cursor'), first, false);

    const second = state.reset();

    expect(second).toBe(first + 1);
    expect(state.items()).toEqual([]);
    expect(state.nextCursor()).toBeNull();
    expect(state.initialLoading()).toBe(true);
  });

  it('replaces items on an initial page', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();

    expect(state.accept(page([{ id: 1, label: 'one' }]), generation, false)).toBe(true);
    expect(state.items()).toEqual([{ id: 1, label: 'one' }]);
    expect(state.initialLoading()).toBe(false);
  });

  it('appends a subsequent page', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();
    state.accept(page([{ id: 1, label: 'one' }], 'cursor-1'), generation, false);
    state.beginLoadMore();
    state.accept(page([{ id: 2, label: 'two' }]), generation, true);

    expect(state.items().map(({ id }) => id)).toEqual([1, 2]);
  });

  it('defensively deduplicates overlapping cursor pages by ID', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();
    state.accept(page([{ id: 1, label: 'original' }], 'cursor-1'), generation, false);
    state.beginLoadMore();
    state.accept(
      page([
        { id: 1, label: 'duplicate' },
        { id: 2, label: 'new' },
      ]),
      generation,
      true,
    );

    expect(state.items()).toEqual([
      { id: 1, label: 'original' },
      { id: 2, label: 'new' },
    ]);
  });

  it('guards double-clicks while loading more', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();
    state.accept(page([], 'opaque'), generation, false);

    expect(state.beginLoadMore()).toBe(generation);
    expect(state.beginLoadMore()).toBeNull();
  });

  it('does not load more without both hasMore and a cursor', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();
    state.accept(page([]), generation, false);
    expect(state.beginLoadMore()).toBeNull();
  });

  it('ignores a late response from an obsolete filter generation', () => {
    const state = new CursorListState<Item>();
    const obsolete = state.reset();
    const current = state.reset();
    state.accept(page([{ id: 2, label: 'current' }]), current, false);

    expect(state.accept(page([{ id: 1, label: 'obsolete' }]), obsolete, false)).toBe(false);
    expect(state.items()).toEqual([{ id: 2, label: 'current' }]);
  });

  it('keeps existing items when load-more fails', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();
    state.accept(page([{ id: 1, label: 'one' }], 'cursor'), generation, false);
    state.beginLoadMore();

    expect(state.fail('Try again.', generation, true)).toBe(true);
    expect(state.items()).toHaveLength(1);
    expect(state.loadMoreError()).toBe('Try again.');
    expect(state.error()).toBeNull();
    expect(state.beginLoadMore()).toBe(generation);
    expect(state.items()).toHaveLength(1);
    expect(state.loadMoreError()).toBeNull();
  });

  it('keeps existing items visible while refreshing', () => {
    const state = new CursorListState<Item>();
    const initial = state.reset();
    state.accept(page([{ id: 1, label: 'one' }]), initial, false);

    const refresh = state.beginRefresh();

    expect(refresh).toBe(initial + 1);
    expect(state.items()).toHaveLength(1);
    expect(state.refreshing()).toBe(true);
    expect(state.initialLoading()).toBe(false);
  });

  it('keeps items and cursor available when a refresh is rate limited', () => {
    const state = new CursorListState<Item>();
    const initial = state.reset();
    state.accept(page([{ id: 1, label: 'one' }], 'opaque-cursor'), initial, false);
    const refresh = state.beginRefresh();

    state.fail('Too many requests. Try again in 12 seconds.', refresh, false);

    expect(state.items()).toEqual([{ id: 1, label: 'one' }]);
    expect(state.nextCursor()).toBe('opaque-cursor');
    expect(state.hasMore()).toBe(true);
    expect(state.error()).toBe('Too many requests. Try again in 12 seconds.');
  });

  it('records an initial failure separately', () => {
    const state = new CursorListState<Item>();
    const generation = state.reset();
    state.fail('Unavailable.', generation, false);

    expect(state.error()).toBe('Unavailable.');
    expect(state.loadMoreError()).toBeNull();
    expect(state.initialLoading()).toBe(false);
  });
});
