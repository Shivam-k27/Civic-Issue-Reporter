
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MapComponentProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  onLocationSelect,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [77.757218, 20.932185],
      zoom: 12,
    });

    mapRef.current = map;

    map.on("mouseenter", () => {
      map.getCanvas().style.cursor = "crosshair";
    });

    map.on("mouseleave", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", async (e) => {
      const { lng, lat } = e.lngLat;

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map);

        markerRef.current.on("dragstart", () => {
          map.getCanvas().style.cursor = "grabbing";
        });

        markerRef.current.on("dragend", async () => {
          map.getCanvas().style.cursor = "crosshair";

          const position = markerRef.current!.getLngLat();
          const address = await reverseGeocode(
            position.lng,
            position.lat
          );

          onLocationSelect(
            position.lat,
            position.lng,
            address
          );
        });
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }

      const address = await reverseGeocode(lng, lat);
      onLocationSelect(lat, lng, address);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [onLocationSelect]);

  async function reverseGeocode(
    lng: number,
    lat: number
  ): Promise<string> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) {
        throw new Error("Address lookup failed");
      }

      const data = await response.json();

      return data.features?.[0]?.place_name
        ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const map = mapRef.current;

        if (!map) return;

        map.flyTo({
          center: [lng, lat],
          zoom: 16,
        });

        if (!markerRef.current) {
          markerRef.current = new mapboxgl.Marker({
            draggable: true,
          })
            .setLngLat([lng, lat])
            .addTo(map);

          markerRef.current.on("dragend", async () => {
            const point = markerRef.current!.getLngLat();
            const address = await reverseGeocode(
              point.lng,
              point.lat
            );

            onLocationSelect(point.lat, point.lng, address);
          });
        } else {
          markerRef.current.setLngLat([lng, lat]);
        }

        const address = await reverseGeocode(lng, lat);
        onLocationSelect(lat, lng, address);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert("Location permission denied. Please allow location access in your browser.");
        } else if (error.code === error.TIMEOUT) {
          alert("Location request timed out. Please try again.");
        } else {
          alert("Unable to get your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={useCurrentLocation}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 2,
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          color: "#111827",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Use My Current Location
      </button>

      <div
        ref={mapContainer}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default MapComponent;
