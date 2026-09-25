import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { safeAdminReturnUrl } from '../../../core/routing/admin-return-url';
import { AdminLanguageSwitcherComponent } from '../../../shared/ui/language-switcher.component';

@Component({
  selector: 'admin-login-page',
  imports: [AdminLanguageSwitcherComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="admin-login-background flex min-h-screen items-center justify-center bg-[#10271f] px-4 py-10"
    >
      <section class="w-full max-w-md rounded-[1.5rem] bg-[#f9fbfa] p-7 shadow-2xl sm:p-10">
        <div class="mb-8 flex items-center justify-between gap-3" aria-label="Voltio Admin">
          <span
            class="grid size-11 place-items-center rounded-xl bg-[#176b53] font-black text-white"
            >V</span
          >
          <div>
            <p class="font-bold text-[#17352a]">Voltio Admin</p>
            <p class="text-xs font-semibold uppercase tracking-[0.13em] text-[#6b7f78]">
              Restricted operations
            </p>
          </div>
          <admin-language-switcher />
        </div>

        <p class="eyebrow">Administrative access</p>
        <h1 class="page-title mt-2">Sign in</h1>
        <p class="mt-3 text-sm leading-6 text-[#60736c]">
          Use an active account with the Spatie ADMIN role.
        </p>

        <form class="mt-7 grid gap-5" [formGroup]="form" (ngSubmit)="submit()">
          <label class="grid gap-2 text-sm font-bold" for="admin-email">
            Email
            <input
              id="admin-email"
              class="field"
              type="email"
              formControlName="email"
              autocomplete="username"
              required
            />
          </label>
          <label class="grid gap-2 text-sm font-bold" for="admin-password">
            Password
            <input
              id="admin-password"
              class="field"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              required
            />
          </label>

          @if (authStore.error(); as message) {
            <p
              class="rounded-xl border border-[#e3b5b1] bg-[#fff5f4] p-3 text-sm text-[#8d3731]"
              role="alert"
            >
              {{ message }}
            </p>
          }

          <button
            class="button button-primary mt-1 w-full"
            type="submit"
            [disabled]="form.invalid || authStore.loading()"
            [attr.aria-busy]="authStore.loading()"
          >
            {{ authStore.loading() ? 'Signing in…' : 'Sign in to Voltio Admin' }}
          </button>
        </form>
      </section>
    </main>
  `,
})
export class LoginPageComponent {
  readonly authStore = inject(AuthStore);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.authStore.loading()) {
      return;
    }

    try {
      await this.session.login(this.form.getRawValue());
      await this.router.navigateByUrl(
        safeAdminReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
      );
    } catch {
      this.form.controls.password.setValue('');
    }
  }
}
