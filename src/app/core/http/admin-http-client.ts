import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type QueryValue = string | number | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class AdminHttpClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get(path: string, query: Readonly<Record<string, QueryValue>> = {}): Observable<unknown> {
    return this.http.get<unknown>(this.url(path), { params: this.params(query) });
  }

  post(path: string, body: unknown): Observable<unknown> {
    return this.http.post<unknown>(this.url(path), body);
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/u, '')}`;
  }

  private params(query: Readonly<Record<string, QueryValue>>): HttpParams {
    return Object.entries(query).reduce(
      (params, [key, value]) =>
        value === null || value === undefined || value === ''
          ? params
          : params.set(key, String(value)),
      new HttpParams(),
    );
  }
}
