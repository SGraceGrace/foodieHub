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
  city: string;
  state: string;
  country: string;
}

// ── Photon API types (search autocomplete) ────────────────────────────
interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

interface PhotonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

// ── Nominatim types (reverse geocode only) ────────────────────────────
interface NominatimAddress {
  city?: string; town?: string; village?: string;
  municipality?: string; state?: string; country?: string;
}

// ── Tile layers ───────────────────────────────────────────────────────
type MapLayer = 'street' | 'satellite';

const TILE_LAYERS: Record<MapLayer, { url: string; attribution: string; maxZoom: number }> = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
};

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
  suggestions: PhotonFeature[] = [];
  searching = false;
  picked: PickedLocation | null = null;
  activeLayer: MapLayer = 'street';

  private map!: L.Map;
  private marker!: L.Marker;
  private tileLayer!: L.TileLayer;
  private search$ = new Subject<string>();

  constructor(private http: HttpClient, private zone: NgZone) {}

  ngOnInit() {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 2) { this.suggestions = []; return of(null); }
        this.searching = true;
        return this.http.get<PhotonResponse>(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`
        );
      })
    ).subscribe({
      next: res => { this.searching = false; this.suggestions = res?.features ?? []; },
      error: () => { this.searching = false; }
    });

    setTimeout(() => this.initMap(), 50);
  }

  private initMap() {
    this.map = L.map('location-map', { zoomControl: true }).setView(
      [this.initialLat, this.initialLng], 5
    );

    const cfg = TILE_LAYERS[this.activeLayer];
    this.tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
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

  // ── Layer toggle ──────────────────────────────────────────────────
  switchLayer(layer: MapLayer) {
    if (this.activeLayer === layer) return;
    this.activeLayer = layer;
    this.map.removeLayer(this.tileLayer);
    const cfg = TILE_LAYERS[layer];
    this.tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(this.map);
    // Keep marker on top
    this.marker.remove();
    this.marker.addTo(this.map);
  }

  // ── Search ────────────────────────────────────────────────────────
  onSearchInput() { this.search$.next(this.searchQuery); }

  selectSuggestion(f: PhotonFeature) {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;
    const displayName = this.buildDisplayName(p);
    this.searchQuery = displayName;
    this.suggestions = [];
    this.picked = {
      lat, lng, displayName,
      city:    p.city ?? p.county ?? '',
      state:   p.state   ?? '',
      country: p.country ?? '',
    };
    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], 17);
  }

  getSuggestionPrimary(f: PhotonFeature): string {
    const p = f.properties;
    if (p.name) return p.name;
    return [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || p.county || '';
  }

  getSuggestionSecondary(f: PhotonFeature): string {
    const p = f.properties;
    const parts: string[] = [];
    if (p.name) {
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      if (street) parts.push(street);
    }
    if (p.city || p.county) parts.push(p.city ?? p.county ?? '');
    if (p.state)   parts.push(p.state);
    if (p.country) parts.push(p.country);
    return parts.join(', ');
  }

  private buildDisplayName(p: PhotonProperties): string {
    const parts: string[] = [];
    if (p.name) parts.push(p.name);
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    if (street) parts.push(street);
    if (p.city ?? p.county) parts.push(p.city ?? p.county ?? '');
    if (p.state)   parts.push(p.state);
    if (p.country) parts.push(p.country);
    return parts.join(', ');
  }

  // ── Reverse geocode (map click / drag) ───────────────────────────
  private reverseGeocode(lat: number, lng: number) {
    this.http.get<any>(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    ).subscribe({
      next: res => {
        const name = res.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const addr: NominatimAddress = res.address ?? {};
        this.searchQuery = name;
        this.picked = {
          lat, lng, displayName: name,
          city:    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '',
          state:   addr.state   ?? '',
          country: addr.country ?? '',
        };
      },
      error: () => {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.picked = { lat, lng, displayName: fallback, city: '', state: '', country: '' };
        this.searchQuery = fallback;
      }
    });
  }

  confirm() { if (this.picked) this.locationPicked.emit(this.picked); }
  cancel()  { this.cancelled.emit(); }

  ngOnDestroy() { if (this.map) this.map.remove(); }
}
