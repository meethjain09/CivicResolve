'use client';

import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Edit3,
  Loader2,
  Crosshair,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface LocationPickerProps {
  address: string;
  onAddressChange: (val: string) => void;
  onPincodeDetected?: (pincode: string) => void;
}

type PickerMode = 'manual' | 'gps' | 'map';

// Fix Leaflet default marker icons for Next.js bundlers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function LocationPicker({
  address,
  onAddressChange,
  onPincodeDetected,
}: LocationPickerProps) {
  const [mode, setMode] = useState<PickerMode>('manual');
  const [detectingGps, setDetectingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<[number, number] | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default coordinate (fallback center if no coordinates available)
  const defaultCoords: [number, number] = [12.9716, 77.5946];

  const reverseGeocode = async (lat: number, lon: number) => {
    setGeocoding(true);
    setGeoError(null);
    setLastCoords([lat, lon]);

    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to reverse geocode location');
      }

      const formatted = `${data.address} (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
      onAddressChange(formatted);

      if (data.pincode && /^\d{6}$/.test(data.pincode)) {
        onPincodeDetected?.(data.pincode);
      }
    } catch (err: any) {
      console.warn('Geocoding error:', err);
      setGeoError(err?.message || 'Could not resolve exact address name');
      onAddressChange(`Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDetectingGps(false);
        reverseGeocode(latitude, longitude);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please allow location access or type address manually.');
        } else if (err.code === err.TIMEOUT) {
          setGeoError('GPS detection timed out. Please try again or type address manually.');
        } else {
          setGeoError(err.message || 'Unable to determine GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Initialize & manage Leaflet Map when mode is 'map'
  useEffect(() => {
    if (mode !== 'map') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current) return;

    const initialCenter = lastCoords || defaultCoords;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
    }).setView(initialCenter, lastCoords ? 16 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(initialCenter, { draggable: true }).addTo(map);
    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Map click moves marker and triggers geocode
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    // Marker drag end triggers geocode
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng);
    });

    // Invalidate map size after DOM mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [mode]);

  return (
    <div className="space-y-2.5">
      {/* 3-Mode Segmented Selector */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl border shadow-xs"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Mode 1: Manual Entry */}
        <button
          type="button"
          onClick={() => {
            setMode('manual');
            setGeoError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            mode === 'manual' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: mode === 'manual' ? 'var(--bg-card)' : 'transparent',
            color: mode === 'manual' ? 'var(--text-primary)' : 'var(--text-muted)',
            border: mode === 'manual' ? '1px solid var(--border-subtle)' : '1px solid transparent',
          }}
        >
          <Edit3 className="w-3.5 h-3.5" style={{ color: mode === 'manual' ? 'var(--accent)' : 'inherit' }} />
          <span>Manual Entry</span>
        </button>

        {/* Mode 2: GPS Location */}
        <button
          type="button"
          onClick={() => {
            setMode('gps');
            handleGetCurrentLocation();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            mode === 'gps' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: mode === 'gps' ? 'var(--bg-card)' : 'transparent',
            color: mode === 'gps' ? 'var(--text-primary)' : 'var(--text-muted)',
            border: mode === 'gps' ? '1px solid var(--border-subtle)' : '1px solid transparent',
          }}
        >
          <Navigation className="w-3.5 h-3.5" style={{ color: mode === 'gps' ? 'var(--accent)' : 'inherit' }} />
          <span>Current GPS</span>
        </button>

        {/* Mode 3: Pin on Map */}
        <button
          type="button"
          onClick={() => {
            setMode('map');
            setGeoError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            mode === 'map' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: mode === 'map' ? 'var(--bg-card)' : 'transparent',
            color: mode === 'map' ? 'var(--text-primary)' : 'var(--text-muted)',
            border: mode === 'map' ? '1px solid var(--border-subtle)' : '1px solid transparent',
          }}
        >
          <MapPin className="w-3.5 h-3.5" style={{ color: mode === 'map' ? 'var(--accent)' : 'inherit' }} />
          <span>Pin on Map</span>
        </button>
      </div>

      {/* GPS Detecting / Geocoding Status Banner */}
      {(detectingGps || geocoding) && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl border text-xs"
          style={{
            backgroundColor: 'var(--accent-soft)',
            borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            color: 'var(--accent)',
          }}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="font-medium">
            {detectingGps
              ? 'Detecting device GPS coordinates...'
              : 'Resolving reverse geocoding address...'}
          </span>
        </div>
      )}

      {/* Inline Geolocation Error Alert */}
      {geoError && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span>{geoError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="p-0.5 opacity-60 hover:opacity-100 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Interactive Map (Mode 3: Pin on Map) */}
      {mode === 'map' && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px] font-mono px-1">
            <span style={{ color: 'var(--text-muted)' }}>
              Click anywhere on map or drag pin to pinpoint location:
            </span>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={detectingGps}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              style={{ color: 'var(--accent)' }}
              title="Center map on device GPS location"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Center on GPS</span>
            </button>
          </div>

          <div
            ref={mapContainerRef}
            className="h-64 w-full rounded-xl border overflow-hidden z-0 shadow-xs"
            style={{
              borderColor: 'var(--border-strong)',
            }}
          />
        </div>
      )}

      {/* GPS Mode Actions */}
      {mode === 'gps' && !detectingGps && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            GPS position fetched. You can fine-tune the street address below:
          </span>
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 cursor-pointer"
            style={{ color: 'var(--accent)' }}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-detect GPS</span>
          </button>
        </div>
      )}

      {/* Always Visible Wrapped Address Textarea */}
      <textarea
        required
        rows={2}
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="e.g. Corner of 4th Cross Road, opposite Greenfield Public School, next to Central Bakery"
        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors whitespace-pre-wrap break-words"
        style={{
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-strong)',
        }}
      />
    </div>
  );
}
