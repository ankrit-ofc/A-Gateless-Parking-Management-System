'use client';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from './ui/input';
import { LatLng } from '@/types';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

type AddressAutoCompleteInputProps = {
  onAddressSelect: (address: string, gpscoords: LatLng) => void;
  selectedAddress?: string;
  error?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function AddressAutoCompleteInput({
  onAddressSelect,
  selectedAddress,
  error,
  value,
  onChange,
}: AddressAutoCompleteInputProps) {
  const placesAutoCompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Memoize the callback to prevent infinite re-renders
  const handleAddressSelect = useCallback((address: string, gpscoords: LatLng) => {
    onAddressSelect(address, gpscoords);
  }, [onAddressSelect]);

  // Initialize autocomplete only when Google Maps is loaded
  useEffect(() => {
    if (!isLoaded || !apiKey || loadError || !placesAutoCompleteRef.current) {
      if (loadError) {
        console.error('Error loading Google Maps:', loadError);
      }
      return;
    }

    // Ensure google.maps.places exists
    if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps Places API not available');
      return;
    }

    try {
      const karnatakaBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng({ lat: 11.5, lng: 74.0 }), // Southwest Karnataka
        new window.google.maps.LatLng({ lat: 18.5, lng: 78.5 })  // Northeast Karnataka
      );

      const autocomplete = new window.google.maps.places.Autocomplete(placesAutoCompleteRef.current, {
        bounds: karnatakaBounds,
        strictBounds: false, // Changed to false - strictBounds can be too restrictive
        fields: ['formatted_address', 'geometry', 'name'],
        componentRestrictions: { country: ['in'] },
      });

      autocompleteRef.current = autocomplete;

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.geometry?.location && place.formatted_address) {
          const gpscoords: LatLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          handleAddressSelect(place.formatted_address, gpscoords);
          
          // Trigger onChange if provided (for React Hook Form)
          if (onChange && placesAutoCompleteRef.current) {
            const syntheticEvent = {
              target: { value: place.formatted_address }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        } else {
          console.warn('Incomplete place data:', place);
        }
      });

      // Cleanup function
      return () => {
        if (listener) {
          window.google.maps.event.removeListener(listener);
        }
        autocompleteRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing Autocomplete:', error);
    }
  }, [isLoaded, apiKey, loadError, handleAddressSelect, onChange]);

  if (!apiKey) {
    return (
      <Input 
        placeholder="Google Maps API key not configured" 
        disabled 
        className="bg-slate-800/50 border-red-500 text-white"
      />
    );
  }

  if (loadError) {
    return (
      <Input 
        placeholder="Error loading Google Maps" 
        disabled 
        className="bg-slate-800/50 border-red-500 text-white"
      />
    );
  }

  if (!isLoaded) {
    return (
      <Input 
        placeholder="Loading Google Maps..." 
        disabled 
        className="bg-slate-800/50 border-slate-700 text-white"
      />
    );
  }

  return (
    <div className="w-full">
      <Input
        ref={placesAutoCompleteRef}
        value={value || selectedAddress || ''}
        onChange={onChange}
        placeholder="Enter Karnataka address..."
        className={`bg-slate-800/50 border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 text-white placeholder:text-slate-500 ${
          error ? 'border-red-500 focus:border-red-500' : ''
        }`}
        autoComplete="off"
        spellCheck="false"
      />
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

export default AddressAutoCompleteInput;