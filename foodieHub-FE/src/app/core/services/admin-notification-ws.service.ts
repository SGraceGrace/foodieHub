import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { AdminNotification } from '../../model/restaurant.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminNotificationWsService implements OnDestroy {

  private client: Client | null = null;
  private readonly notificationSubject = new Subject<AdminNotification>();

  readonly notification$ = this.notificationSubject.asObservable();

  connect(): void {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.notificationServiceUrl}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        this.client!.subscribe('/topic/admin-notifications', (msg: IMessage) => {
          const notification: AdminNotification = JSON.parse(msg.body);
          this.notificationSubject.next(notification);
        });
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
