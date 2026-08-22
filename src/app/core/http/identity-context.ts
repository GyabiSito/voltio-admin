import { AuthStore } from '../auth/auth.store';

export interface IdentityContext {
  userId: number;
  identityGeneration: number;
  featureGeneration: number;
  lifetimeGeneration: number;
}

export function captureIdentity(
  store: AuthStore,
  featureGeneration: number,
  lifetimeGeneration: number,
): IdentityContext | null {
  const user = store.user();
  return user === null
    ? null
    : {
        userId: user.id,
        identityGeneration: store.identityGeneration(),
        featureGeneration,
        lifetimeGeneration,
      };
}

export function identityIsCurrent(
  context: IdentityContext | null,
  store: AuthStore,
  featureGeneration: number,
  lifetimeGeneration: number,
): boolean {
  return (
    context !== null &&
    context.userId === store.user()?.id &&
    context.identityGeneration === store.identityGeneration() &&
    context.featureGeneration === featureGeneration &&
    context.lifetimeGeneration === lifetimeGeneration
  );
}
