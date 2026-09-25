import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AuthStore } from '../../core/auth/auth.store';
import { AdminLanguageSwitcherComponent } from '../../shared/ui/language-switcher.component';

interface NavigationItem {
  label: string;
  path: string;
  glyph: string;
}

@Component({
  selector: 'admin-layout',
  imports: [AdminLanguageSwitcherComponent, NgTemplateOutlet, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main-content"
      class="fixed left-4 top-2 z-[100] -translate-y-20 rounded-xl bg-[#10271f] px-4 py-3 font-bold text-white transition focus:translate-y-0"
      (click)="focusMain()"
      >Skip to main content</a
    >
    <div class="admin-shell lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside
        class="hidden min-h-screen border-r border-[#27473b] bg-[#10271f] px-5 py-7 text-white lg:block"
      >
        <ng-container [ngTemplateOutlet]="navigation" />
      </aside>

      @if (menuOpen()) {
        <button
          class="fixed inset-0 z-40 bg-[#0b1914]/60 lg:hidden"
          type="button"
          aria-label="Close navigation"
          (click)="closeMenu()"
        ></button>
        <aside
          #mobileNavigation
          class="fixed inset-y-0 left-0 z-50 w-[min(85vw,19rem)] overflow-y-auto bg-[#10271f] px-5 py-6 text-white shadow-2xl lg:hidden"
          aria-label="Mobile administration navigation"
        >
          <div class="mb-5 flex justify-end">
            <button
              class="button border border-white/30 text-white"
              type="button"
              (click)="closeMenu()"
            >
              Close
            </button>
          </div>
          <ng-container [ngTemplateOutlet]="navigation" />
        </aside>
      }

      <div class="min-w-0">
        <header
          class="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-[#d9e4e0] bg-[#f8faf9]/95 px-3 backdrop-blur sm:px-7"
        >
          <button
            #menuButton
            class="button button-secondary lg:hidden!"
            type="button"
            aria-label="Open administration navigation"
            [attr.aria-expanded]="menuOpen()"
            (click)="openMenu()"
          >
            Menu
          </button>
          <p class="hidden text-sm font-bold text-[#355047] sm:block">Administrative console</p>
          <div class="flex min-w-0 items-center gap-2 sm:gap-3">
            <div class="hidden min-w-0 text-right sm:block">
              <p class="truncate text-sm font-bold">{{ authStore.user()?.displayName }}</p>
              <p class="text-xs uppercase tracking-wider text-[#6b7e77]">ADMIN</p>
            </div>
            <admin-language-switcher />
            <button class="button button-secondary" type="button" (click)="logout()">Logout</button>
          </div>
        </header>

        <main
          id="main-content"
          tabindex="-1"
          class="mx-auto w-full max-w-[96rem] px-4 py-7 outline-none sm:px-7 lg:px-10 lg:py-10"
        >
          <router-outlet />
        </main>
      </div>
    </div>

    <ng-template #navigation>
      <div class="mb-10 flex items-center gap-3">
        <span
          class="grid size-11 place-items-center rounded-xl bg-[#f2a93b] font-black text-[#10271f]"
          >V</span
        >
        <div>
          <p class="font-bold">Voltio Admin</p>
          <p class="text-xs uppercase tracking-[0.13em] text-[#a9c3b9]">Operations</p>
        </div>
      </div>

      <nav aria-label="Administration">
        <ul class="grid gap-2">
          @for (item of navigationItems; track item.path) {
            <li>
              <a
                #activeLink="routerLinkActive"
                class="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-[#c9d9d3] hover:bg-white/8 hover:text-white"
                routerLinkActive="bg-white/12 text-white"
                [routerLink]="item.path"
                [routerLinkActiveOptions]="{ exact: false }"
                [attr.aria-current]="activeLink.isActive ? 'page' : null"
                (click)="closeMenu(false)"
              >
                <span
                  class="grid size-7 place-items-center rounded-lg bg-white/8"
                  aria-hidden="true"
                  >{{ item.glyph }}</span
                >
                {{ item.label }}
              </a>
            </li>
          }
        </ul>
      </nav>
    </ng-template>
  `,
})
export class AdminLayoutComponent {
  readonly authStore = inject(AuthStore);
  readonly menuOpen = signal(false);
  readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  readonly mobileNavigation = viewChild<ElementRef<HTMLElement>>('mobileNavigation');
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  readonly navigationItems: readonly NavigationItem[] = [
    { label: 'Users', path: '/users', glyph: 'U' },
    { label: 'Charging point reports', path: '/moderation/charging-point-reports', glyph: 'R' },
    { label: 'Reviews', path: '/moderation/reviews', glyph: '★' },
    { label: 'Incidents', path: '/moderation/incidents', glyph: '!' },
    { label: 'Audit trail', path: '/audit', glyph: 'A' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.focusMain());
  }

  focusMain(): void {
    setTimeout(() => document.getElementById('main-content')?.focus({ preventScroll: true }));
  }

  openMenu(): void {
    this.menuOpen.set(true);
    setTimeout(() =>
      this.mobileNavigation()?.nativeElement.querySelector<HTMLElement>('button')?.focus(),
    );
  }

  closeMenu(restoreFocus = true): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (restoreFocus) {
      this.menuButton()?.nativeElement.focus();
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeMenu();
  }

  async logout(): Promise<void> {
    try {
      await this.session.logout();
    } catch {
      // Local session is cleared in finalize; external logout failure remains private.
    }
    await this.router.navigateByUrl('/login');
  }
}
