import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import en from './en.json';
import es from './es.json';
import ptBR from './pt-BR.json';
import {
  ADMIN_DEFAULT_LANGUAGE,
  ADMIN_FORMAT_LOCALES,
  ADMIN_LANGUAGE_STORAGE_KEY,
  adminLanguageFromBrowser,
  ADMIN_LOCAL_LANGUAGE_STORAGE_KEY,
  ADMIN_SUPPORTED_LANGUAGES,
  AdminLanguage,
  isAdminLanguage,
} from './admin-language.constants';

type Catalog = Record<string, string>;

const catalogs: Record<AdminLanguage, Catalog> = { en, es, 'pt-BR': ptBR };
const sourceKeys = Object.fromEntries(Object.entries(en).map(([key, value]) => [value, key]));

@Injectable({ providedIn: 'root' })
export class AdminLanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentLanguage = signal<AdminLanguage>(ADMIN_DEFAULT_LANGUAGE);
  private readonly originalAttributes = new WeakMap<Element, Map<string, string>>();
  private observer: MutationObserver | null = null;
  private initialized = false;

  readonly language = this.currentLanguage.asReadonly();
  readonly locale = computed(() => ADMIN_FORMAT_LOCALES[this.currentLanguage()]);
  readonly supportedLanguages = ADMIN_SUPPORTED_LANGUAGES;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.applyLanguage(this.resolveInitialLanguage());
    if (!isPlatformBrowser(this.platformId)) return;

    this.observer = new MutationObserver(() => this.translateDocument());
    this.observer.observe(this.document.body, { childList: true, subtree: true, characterData: true });
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
    this.translateDocument();
  }

  setLanguage(language: string): void {
    this.applyLanguage(isAdminLanguage(language) ? language : ADMIN_DEFAULT_LANGUAGE);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.document.defaultView?.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, this.currentLanguage());
    } catch {
      // Storage is optional; the in-memory preference remains usable.
    }
  }

  translate(key: string): string {
    const language = this.currentLanguage();
    return catalogs[language][key] ?? catalogs.en[key] ?? key;
  }

  translateStatus(value: string): string {
    const key = `status.${value.toLowerCase().replaceAll('_', '-')}`;
    return this.translate(key) === key ? this.humanize(value) : this.translate(key);
  }

  formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? this.translate('common.notAvailable')
      : new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', ...options, timeZone: 'UTC' }).format(date);
  }

  private applyLanguage(language: AdminLanguage): void {
    this.currentLanguage.set(language);
    if (!isPlatformBrowser(this.platformId)) return;
    this.document.documentElement.lang = language;
    this.translateDocument();
  }

  private resolveInitialLanguage(): AdminLanguage {
    if (!isPlatformBrowser(this.platformId)) return ADMIN_DEFAULT_LANGUAGE;

    try {
      const storage = this.document.defaultView?.localStorage;
      const explicit = storage?.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
      if (isAdminLanguage(explicit)) return explicit;
      const local = storage?.getItem(ADMIN_LOCAL_LANGUAGE_STORAGE_KEY);
      if (isAdminLanguage(local)) return local;
      const navigator = this.document.defaultView?.navigator;
      return adminLanguageFromBrowser([
        ...(navigator?.languages ?? []),
        ...(navigator?.language ? [navigator.language] : []),
      ]);
    } catch {
      return ADMIN_DEFAULT_LANGUAGE;
    }
  }

  private translateDocument(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = this.document.body;
    if (!root) return;

    const walker = this.document.createTreeWalker(
      root,
      this.document.defaultView?.NodeFilter?.SHOW_TEXT ?? 4,
    );
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);

    for (const node of nodes) {
      if (this.skipNode(node)) continue;
      const current = node.nodeValue ?? '';
      const trimmed = current.trim();
      if (!trimmed) continue;
      const translated = this.translateSource(trimmed);
      if (translated !== trimmed) node.nodeValue = current.replace(trimmed, translated);
    }

    for (const element of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      for (const attribute of ['aria-label', 'title', 'placeholder', 'alt']) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const originals = this.originalAttributes.get(element) ?? new Map<string, string>();
        const key = originals.get(attribute) ?? this.sourceForValue(value);
        if (!key) continue;
        originals.set(attribute, key);
        this.originalAttributes.set(element, originals);
        element.setAttribute(attribute, this.translate(key));
      }
    }
  }

  private translateSource(value: string): string {
    const key = this.sourceForValue(value);
    if (key) return this.translate(key);
    return value
      .replaceAll('Actor: ', this.translate('audit.actor') + ': ')
      .replaceAll('Reporter: ', this.translate('reports.reporter') + ': ')
      .replaceAll('Anonymous', this.currentLanguage() === 'es' ? 'Anónimo' : this.currentLanguage() === 'pt-BR' ? 'Anônimo' : 'Anonymous');
  }

  private sourceForValue(value: string): string | null {
    if (sourceKeys[value]) return sourceKeys[value];
    for (const source of Object.keys(sourceKeys)) {
      for (const language of ADMIN_SUPPORTED_LANGUAGES) {
        if (catalogs[language][sourceKeys[source]] === value) return sourceKeys[source];
      }
    }
    return null;
  }

  private skipNode(node: Text): boolean {
    const parent = node.parentElement;
    return (
      parent === null ||
      parent.closest('[data-i18n-ignore]') !== null ||
      ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)
    );
  }

  private humanize(value: string): string {
    const normalized = value.replaceAll('_', ' ').replaceAll('.', ' · ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}
