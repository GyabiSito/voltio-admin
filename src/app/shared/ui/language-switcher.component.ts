import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AdminLanguageService } from '../../core/i18n';

@Component({
  selector: 'admin-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="relative inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-[#667b73] bg-white px-2 text-sm font-bold text-[#213f34]">
      <span class="sr-only">{{ language.translate('language.selector') }}</span>
      <select
        class="h-10 max-w-[8rem] cursor-pointer overflow-hidden text-ellipsis bg-transparent pr-6 outline-none sm:max-w-none"
        [attr.aria-label]="language.translate('language.selector')"
        [value]="language.language()"
        (change)="changeLanguage($event)"
      >
        <option value="es">{{ language.translate('language.es') }}</option>
        <option value="en">{{ language.translate('language.en') }}</option>
        <option value="pt-BR">{{ language.translate('language.ptBR') }}</option>
      </select>
    </label>
  `,
})
export class AdminLanguageSwitcherComponent {
  readonly language = inject(AdminLanguageService);

  changeLanguage(event: Event): void {
    this.language.setLanguage((event.target as HTMLSelectElement).value);
  }
}
