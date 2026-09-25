import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import {
  ADMIN_LANGUAGE_STORAGE_KEY,
  ADMIN_LOCAL_LANGUAGE_STORAGE_KEY,
} from './admin-language.constants';
import { AdminLanguageService } from './admin-language.service';

describe('AdminLanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['es-UY', 'en-US'],
    });
  });

  afterEach(() => localStorage.clear());

  it('prioritizes explicit preference over local and browser preferences', () => {
    localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, 'en');
    localStorage.setItem(ADMIN_LOCAL_LANGUAGE_STORAGE_KEY, 'pt-BR');
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['pt-BR'],
    });

    const service = createService();
    service.initialize();

    expect(service.language()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('uses local preference, then supported browser language, then Spanish', () => {
    localStorage.setItem(ADMIN_LOCAL_LANGUAGE_STORAGE_KEY, 'pt-BR');
    const local = createService();
    local.initialize();
    expect(local.language()).toBe('pt-BR');

    TestBed.resetTestingModule();
    localStorage.clear();
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
    const browser = createService();
    browser.initialize();
    expect(browser.language()).toBe('en');

    TestBed.resetTestingModule();
    localStorage.clear();
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['fr-FR'],
    });
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'fr-FR',
    });
    const fallback = createService();
    fallback.initialize();
    expect(fallback.language()).toBe('es');
  });

  it('persists PT-BR and formats dates with the selected language', () => {
    const service = createService();
    service.initialize();
    service.setLanguage('pt-BR');

    expect(localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY)).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(service.translate('common.notAvailable')).toBe('Não disponível');
    expect(service.formatDate('2026-08-09T12:00:00Z')).toContain('2026');
  });

  it('translates visible labels, options, and accessible attributes', () => {
    const heading = document.createElement('h1');
    heading.textContent = 'Administrative console';
    const option = document.createElement('option');
    option.textContent = 'All statuses';
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Open');
    document.body.append(heading, option, button);

    const service = createService();
    service.initialize();
    service.setLanguage('pt-BR');

    expect(heading.textContent).toBe('Console administrativo');
    expect(option.textContent).toBe('Todos os status');
    expect(button.getAttribute('aria-label')).toBe('Abrir');

    heading.remove();
    option.remove();
    button.remove();
  });

  function createService(): AdminLanguageService {
    TestBed.configureTestingModule({ providers: [AdminLanguageService] });
    return TestBed.inject(AdminLanguageService);
  }
});
