'use client'

import { buildMapInfoCardContent, buildMapInfoCardContentForDestination, destinationPin, getStreetFromAddress, parkingPin, parkingPinWithIndex } from "@/lib/utils"
import { MapAddressType, MapParams } from "@/types"
import { useJsApiLoader } from "@react-google-maps/api"
import { useEffect, useMemo, useRef } from "react"
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/google-maps"

function Map({ mapParams }: { mapParams: string}) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

    const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

    // Parse and validate mapParams with useMemo to handle updates
    const params = useMemo(() => {
        try {
            const parsed = JSON.parse(mapParams) as MapParams[]
            if (!parsed || parsed.length === 0) {
                return null
            }
            return parsed
        } catch (error) {
            console.error('Error parsing mapParams:', error)
            return null
        }
    }, [mapParams])

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey || '',
        libraries: GOOGLE_MAPS_LIBRARIES,
    })

    const getPinType = (loc: MapParams): string => {
        return loc.type === MapAddressType.DESTINATION ? 'parking_destination_tr' : 'parking_pin_tr'
    }

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') {
            return;
        }

        if (!isLoaded || !apiKey || loadError || !params || params.length === 0 || !mapRef.current) {
            if (loadError) {
                console.error('Error loading Google Maps:', loadError);
            }
            return;
        }

        // Ensure google.maps exists
        if (!window.google || !window.google.maps) {
            console.error('Google Maps API not available');
            return;
        }

        try {
            const mapOptions: google.maps.MapOptions = {
                center: {
                    lat: params[0].gpscoords.lat,
                    lng: params[0].gpscoords.lng
                },
                zoom: 14,
                // Remove mapId if not configured - AdvancedMarkerElement can work without it
                // mapId: 'MY-MAP-ID-1234' // Only use if you've created a Map ID in Google Cloud Console
            }

            const gMap = new window.google.maps.Map(mapRef.current as HTMLDivElement, mapOptions)
            mapInstanceRef.current = gMap;

            // Create info window
            infoWindowRef.current = new window.google.maps.InfoWindow({
                maxWidth: 200
            });

            // Clear previous markers
            markersRef.current.forEach(marker => {
                marker.map = null;
            });
            markersRef.current = [];

            // Create markers
            params.forEach((loc, index) => {
                try {
                    const marker = new window.google.maps.marker.AdvancedMarkerElement({
                        map: gMap,
                        position: loc.gpscoords,
                        title: loc.address
                    });

                    markersRef.current.push(marker);

                    if (loc.type === MapAddressType.PARKINGLOCATION) {
                        marker.setAttribute("content", buildMapInfoCardContent(
                            getStreetFromAddress(loc.address),
                            loc.address,
                            loc.numberofspots as number,
                            loc.price?.hourly as number
                        ));
                        marker.content = parkingPinWithIndex(getPinType(loc), index).element;
                    } else if(loc.type === MapAddressType.ADMIN) {
                        marker.setAttribute("content", buildMapInfoCardContent(
                            getStreetFromAddress(loc.address),
                            loc.address,
                            loc.numberofspots as number,
                            loc.price?.hourly as number
                        ));
                        marker.content = parkingPin(getPinType(loc)).element;
                    } else {
                        const cityCircle = new window.google.maps.Circle({
                            strokeColor: '#00FF00',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#0FF000',
                            fillOpacity: 0.35,
                            map: gMap,
                            center: {
                                lat: params[0].gpscoords.lat,
                                lng: params[0].gpscoords.lng
                            },
                            radius: loc.radius || 1000
                        });

                        marker.content = destinationPin(getPinType(loc)).element;
                        marker.setAttribute("content", buildMapInfoCardContentForDestination(
                            getStreetFromAddress(loc.address), 
                            loc.address
                        ));
                    }

                    marker.addListener('click', () => {
                        if (infoWindowRef.current) {
                            infoWindowRef.current.close();
                            infoWindowRef.current.setContent(marker.getAttribute('content'));
                            infoWindowRef.current.open({
                                map: gMap,
                                anchor: marker
                            });
                        }
                    });
                } catch (error) {
                    console.error(`Error creating marker for ${loc.address}:`, error);
                }
            });
        } catch (error) {
            console.error('Error initializing map:', error);
        }

        // Cleanup function
        return () => {
            // Clear markers
            markersRef.current.forEach(marker => {
                marker.map = null;
            });
            markersRef.current = [];
            
            // Close info window
            if (infoWindowRef.current) {
                infoWindowRef.current.close();
                infoWindowRef.current = null;
            }

            // Clear map instance
            mapInstanceRef.current = null;
        };
    }, [isLoaded, apiKey, loadError, params, mapParams]);

    // Early return if params is invalid
    if (!params || params.length === 0) {
        return <div className="p-4 text-slate-400">No locations to display on map</div>
    }

    if (!apiKey) {
        return <div className="p-4 text-red-400">Google Maps API key not configured</div>
    }

    if (loadError) {
        return <div className="p-4 text-red-400">Error loading Google Maps: {loadError.message}</div>
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <p className="text-slate-400">Loading map...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-4">
            <div style={{ height: '600px', width: '100%' }} ref={mapRef} />
        </div>
    )
}

export default Map