import { signal } from '@angular/core';

import { CursorPage } from '../../core/http/api-envelope';

export class CursorListState<T extends { id: number }> {
  readonly items = signal<readonly T[]>([]);
  readonly initialLoading = signal(false);
  readonly loadingMore = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadMoreError = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly generatedAt = signal<string | null>(null);
  readonly generation = signal(0);

  reset(): number {
    const generation = this.generation() + 1;
    this.generation.set(generation);
    this.items.set([]);
    this.nextCursor.set(null);
    this.hasMore.set(false);
    this.generatedAt.set(null);
    this.error.set(null);
    this.loadMoreError.set(null);
    this.initialLoading.set(true);
    this.loadingMore.set(false);
    this.refreshing.set(false);
    return generation;
  }

  beginRefresh(): number {
    const generation = this.generation() + 1;
    this.generation.set(generation);
    this.refreshing.set(this.items().length > 0);
    this.initialLoading.set(this.items().length === 0);
    this.loadingMore.set(false);
    this.error.set(null);
    this.loadMoreError.set(null);
    return generation;
  }

  beginLoadMore(): number | null {
    if (this.loadingMore() || !this.hasMore() || this.nextCursor() === null) {
      return null;
    }
    this.loadingMore.set(true);
    this.loadMoreError.set(null);
    return this.generation();
  }

  accept(page: CursorPage<T>, generation: number, append: boolean): boolean {
    if (generation !== this.generation()) {
      return false;
    }

    this.items.set(append ? deduplicateById([...this.items(), ...page.data]) : page.data);
    this.nextCursor.set(page.meta.nextCursor);
    this.hasMore.set(page.meta.hasMore);
    this.generatedAt.set(page.meta.generatedAt);
    this.initialLoading.set(false);
    this.loadingMore.set(false);
    this.refreshing.set(false);
    this.error.set(null);
    this.loadMoreError.set(null);
    return true;
  }

  fail(message: string, generation: number, append: boolean): boolean {
    if (generation !== this.generation()) {
      return false;
    }
    if (append) {
      this.loadMoreError.set(message);
    } else {
      this.error.set(message);
    }
    this.initialLoading.set(false);
    this.loadingMore.set(false);
    this.refreshing.set(false);
    return true;
  }
}

function deduplicateById<T extends { id: number }>(items: readonly T[]): readonly T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}
