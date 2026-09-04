'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AddressSuggestion {
  id: string;
  address: string;
  city: string;
  area: string;
  postCode: string;
}

interface AddressData {
  address: string;
  city: string;
  area: string;
  postCode: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: AddressData) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your address",
  className = ""
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const geocodeCacheRef = useRef<Map<string, {
    latitude: number;
    longitude: number;
    city?: string;
    area?: string;
    postCode?: string;
  }>>(new Map());

  useEffect(() => {
    const searchAddresses = async () => {
      if (value.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/address/search?q=${encodeURIComponent(value)}`);
        const data = await response.json();
        
        if (response.ok) {
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Address search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchAddresses, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionSelect = async (suggestion: AddressSuggestion) => {
    onChange(suggestion.address);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    // Get detailed address with coordinates
    try {
      const response = await fetch(`/api/address/details?id=${suggestion.id}`);
      const data = await response.json();
      
      if (response.ok && onAddressSelect) {
        onAddressSelect({
          address: data.address,
          city: data.city,
          area: data.area,
          postCode: data.postCode,
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (error) {
      console.error('Error getting address details:', error);
    }
  };

  const handleManualGeocode = async () => {
    if (!value.trim() || !onAddressSelect) return;

    // Use in-memory cache to minimize API calls for the same input
    const cached = geocodeCacheRef.current.get(value.trim());
    if (cached) {
      onAddressSelect({
        address: value, // preserve the user's original typed address
        city: cached.city || '',
        area: cached.area || '',
        postCode: cached.postCode || '',
        latitude: cached.latitude,
        longitude: cached.longitude
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/address/geocode?address=${encodeURIComponent(value)}`);
      const data = await response.json();
      
      if (response.ok) {
        geocodeCacheRef.current.set(value.trim(), {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          area: data.area,
          postCode: data.postCode
        });
        onAddressSelect({
          address: value, // preserve the user's original typed address
          city: data.city || '',
          area: data.area || '',
          postCode: data.postCode || '',
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputBlur = async () => {
    // Behind-the-scenes geocode on blur to avoid extra calls during typing
    if (!onAddressSelect) return;
    const trimmed = value.trim();
    if (trimmed.length < 10) return; // avoid noisy short inputs
    if (geocodeCacheRef.current.has(trimmed)) return; // already geocoded
    if (loading) return;
    await handleManualGeocode();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          onFocus={() => value.length >= 3 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <Search size={16} className="text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-1"
          >
            <Card className="shadow-lg border">
              <CardContent className="p-0">
                <div className="max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={suggestion.id}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`w-full text-left p-3 border-b last:border-b-0 transition-colors ${
                        selectedIndex === index ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <MapPin size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {suggestion.address}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.area}, {suggestion.city}
                            {suggestion.postCode && ` - ${suggestion.postCode}`}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Geocode Button */}
      {value.length > 10 && !showSuggestions && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualGeocode}
          disabled={loading}
          className="mt-2 text-xs"
        >
          <MapPin size={12} className="mr-1" />
          Get Coordinates
        </Button>
      )}
    </div>
  );
}