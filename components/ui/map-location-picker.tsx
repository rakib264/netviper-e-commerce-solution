'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { MapPin, Search, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import 'maplibre-gl/dist/maplibre-gl.css';

interface Location {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  formattedAddress?: string;
}

interface MapLocationPickerProps {
  value: Location;
  onChange: (location: Location) => void;
  label?: string;
  disabled?: boolean;
}

interface NominatimPlace {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  boundingbox: string[];
}

export function MapLocationPicker({ value, onChange, label, disabled = false }: MapLocationPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Initialize MapLibre-GL map
  useEffect(() => {
    setMapLoaded(true);
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
      const map = new maplibregl.Map({
        container: mapRef.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }
          ]
        },
        center: [value.longitude || 90.4125, value.latitude || 23.8103],
        zoom: 15,
      });

      mapInstanceRef.current = map;

      // Add marker
      const marker = new maplibregl.Marker({
        draggable: true,
        color:
          getComputedStyle(document.documentElement)
            .getPropertyValue('--color-cta-bg')
            .trim() || '#1A1A1A'
      })
        .setLngLat([value.longitude || 90.4125, value.latitude || 23.8103])
        .addTo(map);

      markerRef.current = marker;

      // Handle marker drag
      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat();
        const lat = lngLat.lat;
        const lng = lngLat.lng;
        
        // Reverse geocode to get address using OpenStreetMap
        try {
          const response = await fetch(`/api/address/reverse?lat=${lat}&lng=${lng}`);
          if (response.ok) {
            const data = await response.json();
            onChange({
              address: data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng,
              formattedAddress: data.address,
            });
          } else {
            onChange({
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng
            });
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          onChange({
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            latitude: lat,
            longitude: lng
          });
        }
      });

      // Handle map click
      map.on('click', async (event) => {
        const lat = event.lngLat.lat;
        const lng = event.lngLat.lng;
        
        marker.setLngLat([lng, lat]);
        
        // Reverse geocode using OpenStreetMap
        try {
          const response = await fetch(`/api/address/reverse?lat=${lat}&lng=${lng}`);
          if (response.ok) {
            const data = await response.json();
            onChange({
              address: data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng,
              formattedAddress: data.address,
            });
          } else {
            onChange({
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng
            });
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          onChange({
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            latitude: lat,
            longitude: lng
          });
        }
      });
    }
  }, [mapLoaded, value.latitude, value.longitude, onChange]);

  // Update map when location changes
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && value.latitude && value.longitude) {
      const lngLat: [number, number] = [value.longitude, value.latitude];
      mapInstanceRef.current.setCenter(lngLat);
      markerRef.current.setLngLat(lngLat);
    }
  }, [value.latitude, value.longitude]);

  // Search places using GeoNames API
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) {
      searchPlaces(debouncedSearchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchTerm]);

  const searchPlaces = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?countrycodes=BD&q=${encodeURIComponent(query)}&format=json&limit=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPlace = (place: NominatimPlace) => {
    const formattedAddress = place.display_name;

    onChange({
      address: formattedAddress,
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon),
      formattedAddress,
      placeId: place.place_id.toString()
    });

    setSearchTerm(formattedAddress);
    setShowSuggestions(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (mapInstanceRef.current && markerRef.current) {
            const lngLat: [number, number] = [lng, lat];
            mapInstanceRef.current.setCenter(lngLat);
            markerRef.current.setLngLat(lngLat);
            
            // Reverse geocode using OpenStreetMap
            try {
              const response = await fetch(`/api/address/reverse?lat=${lat}&lng=${lng}`);
              if (response.ok) {
                const data = await response.json();
                onChange({
                  address: data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                  latitude: lat,
                  longitude: lng,
                  formattedAddress: data.address,
                });
              } else {
                onChange({
                  address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                  latitude: lat,
                  longitude: lng
                });
              }
            } catch (error) {
              console.error('Reverse geocoding error:', error);
              onChange({
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                latitude: lat,
                longitude: lng
              });
            }
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="space-y-4">
      {label && <Label className="text-base font-medium">{label}</Label>}
      
      <div className="space-y-2">
        <div className="relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subtle-foreground" />
            <Input
              placeholder="Search for a location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={disabled}
              className="pl-10 pr-10"
            />
            {searchTerm && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-subtle-foreground hover:text-foreground transition-colors"
                disabled={disabled}
              >
                <X size={16} />
              </button>
            )}
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-border border-t-border rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((place) => (
                <button
                  key={place.place_id}
                  className="w-full px-4 py-2 text-left hover:bg-accent border-b last:border-b-0"
                  onClick={() => selectPlace(place)}
                >
                  <div className="font-medium">{place.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {place.display_name}
                  </div>
                  <div className="text-xs font-caption text-subtle-foreground">{place.class} - {place.type}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={disabled}
            className="flex items-center space-x-1"
          >
            <MapPin size={14} />
            <span>Use Current Location</span>
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Map Preview</Label>
        <div
          ref={mapRef}
          className="w-full h-64 border border-border rounded-lg bg-accent"
        >
          {!mapLoaded && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-info-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Location Info */}
      {value.address && (
        <div className="p-3 bg-muted rounded-lg">
          <Label className="text-sm font-medium">Selected Location:</Label>
          <p className="text-sm text-muted-foreground mt-1">{value.address}</p>
          <p className="text-xs text-subtle-foreground mt-1">
            Coordinates: {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
