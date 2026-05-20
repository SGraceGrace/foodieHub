import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserAddress } from '../../model/address.model';

const STORAGE_KEY = 'selectedDeliveryAddress';

@Injectable({ providedIn: 'root' })
export class DeliveryAddressService {
  private subject = new BehaviorSubject<UserAddress | null>(this.load());

  selected$ = this.subject.asObservable();

  get(): UserAddress | null { return this.subject.value; }

  set(address: UserAddress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
    this.subject.next(address);
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    this.subject.next(null);
  }

  private load(): UserAddress | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
