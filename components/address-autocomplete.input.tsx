'use client';
import React, { useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { LatLng } from '@/types';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';
import { libs } from '@/lib/utils';

type AddressAutoCompleteInputProps = {
  onAddressSelect: (address: string, gpscoords: LatLng) => void;
  selectedAddress?: string;
};

function AddressAutoCompleteInput({
  onAddressSelect,
  selectedAddress,
}: AddressAutoCompleteInputProps) {
  const placesAutoCompleteRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useJsApiLoader({
    nonce: "477d4456-f7b5-45e2-8945-5f17b3964752",
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY!,
    libraries: libs as Libraries,
  });

  useEffect(() => {
    if (isLoaded && placesAutoCompleteRef.current) {
      console.log('Initializing Autocomplete, isLoaded:', isLoaded);
      const karnatakaBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng({ lat: 11.5, lng: 74.0 }), // Southwest Karnataka
        new google.maps.LatLng({ lat: 18.5, lng: 78.5 })  // Northeast Karnataka
      );

      const autocomplete = new google.maps.places.Autocomplete(placesAutoCompleteRef.current, {
        bounds: karnatakaBounds,
        strictBounds: true, // Enforce Karnataka bounds
        fields: ['formatted_address', 'geometry'],
        componentRestrictions: { country: ['in'] },
      });

      autocomplete.addListener('place_changed', () => {
        console.log('place_changed triggered');
        const place = autocomplete.getPlace();
        console.log('Place data:', place);
        if (place.geometry?.location && place.formatted_address) {
          const gpscoords: LatLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onAddressSelect(place.formatted_address, gpscoords);
          console.log('Address selected:', place.formatted_address, gpscoords);
        } else {
          console.warn('Incomplete place data:', place);
          onAddressSelect('', { lat: 0, lng: 0 }); // Fallback
        }
      });
    }
  }, [isLoaded, onAddressSelect]);

  useEffect(() => {
    setTimeout(() => (document.body.style.pointerEvents = ''), 0);
  }, []);

  if (!isLoaded) {
    return <Input placeholder="Loading Google Maps..." disabled />;
  }

  return (
    <Input
      ref={placesAutoCompleteRef}
      defaultValue={selectedAddress}
      placeholder="Enter Karnataka address..."
      className="bg-slate-800/50 border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 text-white placeholder:text-slate-500"
      autoComplete="off"
      spellCheck="false"
    />
  );
}

export default AddressAutoCompleteInput;