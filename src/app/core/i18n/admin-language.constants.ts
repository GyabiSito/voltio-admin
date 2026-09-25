export const ADMIN_SUPPORTED_LANGUAGES = ['es', 'en', 'pt-BR'] as const;

export type AdminLanguage = (typeof ADMIN_SUPPORTED_LANGUAGES)[number];

export const ADMIN_DEFAULT_LANGUAGE: AdminLanguage = 'es';
export const ADMIN_LANGUAGE_STORAGE_KEY = 'voltio.language';
export const ADMIN_LOCAL_LANGUAGE_STORAGE_KEY = 'voltio.language.local';

export const ADMIN_FORMAT_LOCALES: Record<AdminLanguage, string> = {
  es: 'es-UY',
  en: 'en-US',
  'pt-BR': 'pt-BR',
};

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return typeof value === 'string' && ADMIN_SUPPORTED_LANGUAGES.includes(value as AdminLanguage);
}

export function adminLanguageFromBrowser(values: readonly string[] | undefined): AdminLanguage {
  for (const value of values ?? []) {
    const normalized = value.toLowerCase();
    if (normalized === 'pt-br' || normalized.startsWith('pt-')) return 'pt-BR';
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
    if (normalized === 'es' || normalized.startsWith('es-')) return 'es';
  }

  return ADMIN_DEFAULT_LANGUAGE;
}
