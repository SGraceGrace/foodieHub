import {
  Component, EventEmitter, Input, OnDestroy, OnInit, Output, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import * as L from 'leaflet';

export interface PickedLocation {
  lat: number;
  lng: number;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements OnInit, OnDestroy {
  @Input() initialLat = 20.5937;
  @Input() initialLng = 78.9629;
  @Input() placeholder = 'Search location...';
  @Output() locationPicked = new EventEmitter<PickedLocation>();
  @Output() cancelled = new EventEmitter<void>();

  searchQuery = '';
  suggestions: NominatimResult[] = [];
  searching = false;
  picked: PickedLocation | null = null;

  private map!: L.Map;
  private marker!: L.Marker;
  private search$ = new Subject<string>();

  constructor(private http: HttpClient, private zone: NgZone) {}

  ngOnInit() {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 3) return of([]);
        this.searching = true;
        return this.http.get<NominatimResult[]>(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
      })
    ).subscribe({
      next: results => {
        this.searching = false;
        this.suggestions = results as NominatimResult[];
      },
      error: () => { this.searching = false; }
    });

    setTimeout(() => this.initMap(), 50);
  }

  private initMap() {
    this.map = L.map('location-map', { zoomControl: true }).setView(
      [this.initialLat, this.initialLng], 5
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41],
    });

    this.marker = L.marker([this.initialLat, this.initialLng], { draggable: true, icon }).addTo(this.map);

    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.zone.run(() => this.reverseGeocode(pos.lat, pos.lng));
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.zone.run(() => this.reverseGeocode(e.latlng.lat, e.latlng.lng));
    });
  }

  onSearchInput() {
    this.search$.next(this.searchQuery);
  }

  selectSuggestion(s: NominatimResult) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    this.searchQuery = s.display_name;
    this.suggestions = [];
    this.picked = { lat, lng, displayName: s.display_name };
    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], 15);
  }

  private reverseGeocode(lat: number, lng: number) {
    this.http.get<any>(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    ).subscribe({
      next: res => {
        const name = res.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.searchQuery = name;
        this.picked = { lat, lng, displayName: name };
      },
      error: () => {
        this.picked = { lat, lng, displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
      }
    });
  }

  confirm() {
    if (this.picked) this.locationPicked.emit(this.picked);
  }

  cancel() {
    this.cancelled.emit();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }
}
