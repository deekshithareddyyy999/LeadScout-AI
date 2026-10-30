import { useEffect, useRef } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatKm } from "../services/geo";
import type { BusinessResult, GeoPoint } from "../types";

// OpenStreetMap tiles by default. Keep this configurable: the public tile server has no production SLA,
// so set VITE_MAP_TILE_URL / VITE_MAP_TILE_ATTRIBUTION to a hosted tile provider for production.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const COLORS = { listed: "#6f2da8", none: "#b45309", selected: "#4b0082", centre: "#141618" };

interface OpportunityMapProps {
  center: GeoPoint;
  radiusKm: number;
  /** Draw the radius circle (only once a search has a centre). */
  showRadius: boolean;
  results: BusinessResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Increment to re-fit the view to the search area and results. */
  fitRequest: number;
}

function MapController({ center, radiusKm, showRadius, results, selectedId, fitRequest, markers }: Omit<OpportunityMapProps, "onSelect"> & { markers: Map<string, L.CircleMarker> }) {
  const map = useMap();

  // Keep Leaflet's size in sync with its (flexible) container.
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  // Fit to the search area whenever the centre or radius changes, or when asked explicitly.
  useEffect(() => {
    let bounds = L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000);
    if (!showRadius) {
      map.setView([center.lat, center.lng], 12);
      return;
    }
    for (const r of results) if (r.lat !== null && r.lng !== null) bounds = bounds.extend([r.lat, r.lng]);
    map.fitBounds(bounds, { padding: [24, 24] });
    // `results` is read but deliberately not a dependency: re-filtering the same area shouldn't keep re-zooming.
  }, [map, center.lat, center.lng, radiusKm, showRadius, fitRequest]);

  // Bring the selected business into view and open its popup.
  useEffect(() => {
    if (!selectedId) return;
    const marker = markers.get(selectedId);
    if (!marker) return;
    if (!map.getBounds().contains(marker.getLatLng())) map.panTo(marker.getLatLng());
    marker.openPopup();
  }, [map, selectedId, markers]);

  return null;
}

export default function OpportunityMap(props: OpportunityMapProps) {
  const { center, radiusKm, showRadius, results, selectedId, onSelect } = props;
  const markers = useRef(new Map<string, L.CircleMarker>()).current;
  const plotted = results.filter((r) => r.lat !== null && r.lng !== null);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} scrollWheelZoom className="bi-map" attributionControl>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <MapController {...props} markers={markers} />

      {showRadius && (
        <>
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: COLORS.selected, weight: 1.5, fillColor: COLORS.listed, fillOpacity: 0.06, dashArray: "4 4" }}
            interactive={false}
          />
          <CircleMarker center={[center.lat, center.lng]} radius={6} pathOptions={{ color: COLORS.centre, weight: 2.5, fillColor: "#ffffff", fillOpacity: 1 }} interactive={false} />
        </>
      )}

      {plotted.map((r) => {
        const selected = r.id === selectedId;
        const color = r.website ? COLORS.listed : COLORS.none;
        return (
          <CircleMarker
            key={r.id}
            center={[r.lat as number, r.lng as number]}
            radius={selected ? 10 : 7}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: selected ? COLORS.selected : color, fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelect(r.id) }}
            ref={(marker) => {
              if (marker) markers.set(r.id, marker);
              else markers.delete(r.id);
            }}
          >
            <Popup>
              <div className="bi-popup">
                <strong className="bi-popup__name">{r.name}</strong>
                <span className="bi-popup__meta">
                  {r.category} · {formatKm(r.distanceKm)}
                </span>
                {r.address && <span className="bi-popup__addr">{r.address}</span>}
                <span className={`bi-popup__web${r.website ? "" : " bi-popup__web--none"}`}>{r.website ? "Website listed" : "No website listed"}</span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
