'use client'

import { buildMapInfoCardContent, buildMapInfoCardContentForDestination, destinationPin, getStreetFromAddress, libs, parkingPin, parkingPinWithIndex } from "@/lib/utils"
import { MapAddressType, MapParams } from "@/types"
import { useJsApiLoader, Libraries } from "@react-google-maps/api"
import { useEffect, useMemo, useRef } from "react"

function Map({ mapParams }: { mapParams: string}) {
    let infoWindow: google.maps.InfoWindow

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

    // Early return if params is invalid
    if (!params || params.length === 0) {
        return <div className="p-4 text-slate-400">No locations to display on map</div>
    }

    // TypeScript now knows params is non-null after the check above
    const validParams: MapParams[] = params

    const { isLoaded } = useJsApiLoader({
        nonce: "477d4456-f7b5-45e2-8945-5f17b3964752",
        googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY as string,
        libraries: libs as Libraries
    })

    const mapRef = useRef<HTMLDivElement>(null)

    const getPinType = (loc: MapParams): string => {
        return loc.type === MapAddressType.DESTINATION ? 'parking_destination_tr' : 'parking_pin_tr'
    }

    useEffect(() => {
        if (isLoaded && validParams.length > 0 && mapRef.current) {
            const mapOptions = {
                center: {
                    lat: validParams[0].gpscoords.lat,
                    lng: validParams[0].gpscoords.lng
                },
                zoom: 14,
                mapId: 'MY-MAP-ID-1234'
            }

            const gMap = new google.maps.Map(mapRef.current as HTMLDivElement, mapOptions)

            setMarker(gMap)

        }
    },[isLoaded, mapParams])

    function setMarker(map: google.maps.Map) {
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 200
        })

        validParams.map((loc, index) => {

            const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: loc.gpscoords,
                title: loc.address
            })

            if (loc.type === MapAddressType.PARKINGLOCATION) {
                marker.setAttribute("content", buildMapInfoCardContent(getStreetFromAddress(loc.address),
                loc.address,
                loc.numberofspots as number,
                loc.price?.hourly as number))

                marker.content = parkingPinWithIndex(getPinType(loc), index).element
            } else if(loc.type === MapAddressType.ADMIN) {
                marker.setAttribute("content", buildMapInfoCardContent(getStreetFromAddress(loc.address),
                loc.address,
                loc.numberofspots as number,
                loc.price?.hourly as number))

                marker.content = parkingPin(getPinType(loc)).element
            } else {
                const cityCircle = new google.maps.Circle({
                    strokeColor: '#00FF00',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#0FF000',
                    fillOpacity: 0.35,
                    map,
                    center: {
                        lat: validParams[0].gpscoords.lat,
                        lng: validParams[0].gpscoords.lng
                    },
                    radius: loc.radius
                })

                marker.content = destinationPin(getPinType(loc)).element
                marker.setAttribute("content", buildMapInfoCardContentForDestination(getStreetFromAddress(loc.address), loc.address))
            }

            marker.addListener('click', () => {
                infoWindow.close()
                infoWindow.setContent(marker.getAttribute('content'))
                infoWindow.open({
                    map,
                    anchor: marker
                })
            })
        })
    }

    return (
        <div className="flex flex-col space-y-4">
            {
                isLoaded ? <div style={{ height: '600px'}} ref={mapRef} /> : <p>Loading...</p>
            }
        </div>
    )
}

export default Map