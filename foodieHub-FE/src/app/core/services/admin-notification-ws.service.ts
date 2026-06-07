import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AdminNotification } from '../../model/restaurant.model';
import { environment } from '../../../environments/environment';
import { TokenService } from '../shared/token.service';

@Injectable({ providedIn: 'root' })
export class AdminNotificationWsService implements OnDestroy {

  private readonly notificationSubject = new Subject<AdminNotification>();
  readonly notification$ = this.notificationSubject.asObservable();

  private abortController: AbortController | null = null;

  constructor(private tokenService: TokenService) {}

  connect(): void {
    if (this.abortController) return;
    const token = this.tokenService.getAccessToken();
    if (!token) return;
    this.abortController = new AbortController();
    this.stream(token);
  }

  private async stream(token: string): Promise<void> {
    const url = `${environment.apiBaseUrl}/api/v1/admin/notifications/stream`;
    while (!this.abortController?.signal.aborted) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: token },
          signal: this.abortController!.signal,
        });

        if (res.status === 401) {
          // Token may have been refreshed by another request — pick it up and retry once
          const fresh = this.tokenService.getAccessToken();
          if (fresh && fresh !== token) { token = fresh; continue; }
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const dataLine = part.split('\n').find(l => l.startsWith('data:'));
            if (dataLine) {
              try {
                const notification: AdminNotification = JSON.parse(dataLine.slice(5).trim());
                this.notificationSubject.next(notification);
              } catch { /* malformed event — skip */ }
            }
          }
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
