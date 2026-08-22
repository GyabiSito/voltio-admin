import { Injectable, Signal, signal } from '@angular/core';

export type AdminFeature = 'users' | 'reports' | 'reviews' | 'incidents' | 'audit';

@Injectable({ providedIn: 'root' })
export class AdminRefreshBus {
  private readonly generations = {
    users: signal(0),
    reports: signal(0),
    reviews: signal(0),
    incidents: signal(0),
    audit: signal(0),
  };

  generation(feature: AdminFeature): number {
    return this.generations[feature]();
  }

  watch(feature: AdminFeature): Signal<number> {
    return this.generations[feature].asReadonly();
  }

  invalidate(...features: readonly AdminFeature[]): void {
    for (const feature of features) {
      this.generations[feature].update((generation) => generation + 1);
    }
  }
}
