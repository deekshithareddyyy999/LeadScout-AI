import { useEffect, useRef, useState } from "react";
import { formatKm } from "../services/geo";
import type { BusinessResult, GeoPoint } from "../types";

// Google Places results must be shown on a Google map (Google Maps Platform terms), so Google searches use this
// instead of the Leaflet/OpenStreetMap map. Loads the Maps JavaScript API directly (no npm package).
// The browser key is public by design: restrict it in Google Cloud to your site's URLs and to "Maps JavaScript API".
const BROWSER_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
// Advanced markers need a Map ID; Google's DEMO_MAP_ID is fine for development.
const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

const COLORS = { listed: "#6f2da8", none: "#b45309", selected: "#4b0082", centre: "#141618" };

/* The Maps API has no bundled types and adding @types/google.maps would be a new dependency, so the few objects used here are untyped. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type GoogleLibs = { Map: any; Circle: any; InfoWindow: any; LatLngBounds: any; AdvancedMarkerElement: any };

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
    __lsGoogleMapsReady?: () => void;
  }
}

let loading: Promise<GoogleLibs> | null = null;

function loadGoogleMaps(key: string): Promise<GoogleLibs> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.importLibrary) return resolve();
    window.__lsGoogleMapsReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__lsGoogleMapsReady`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(script);
  })
    .then(async () => {
      const [maps, core, marker] = await Promise.all([
        window.google.maps.importLibrary("maps"),
        window.google.maps.importLibrary("core"),
        window.google.maps.importLibrary("marker"),
      ]);
      return { Map: maps.Map, Circle: maps.Circle, InfoWindow: maps.InfoWindow, LatLngBounds: core.LatLngBounds, AdvancedMarkerElement: marker.AdvancedMarkerElement };
    })
    .catch((error) => {
      loading = null; // allow a retry on the next mount
      throw error;
    });
  return loading;
}

function dot(color: string, size: number): HTMLElement {
  const el = document.createElement("div");
  // Advanced markers anchor at the bottom centre; shift down by half so the dot is centred on the location.
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(20,22,24,.3);transform:translateY(50%);cursor:pointer;`;
  return el;
}

/** Popup content built with textContent, so business names from the data source can't inject HTML. */
function popupContent(r: BusinessResult): HTMLElement {
  const root = document.createElement("div");
  root.className = "bi-popup";
  const add = (tag: string, className: string, text: string) => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    root.appendChild(el);
  };
  add("strong", "bi-popup__name", r.name);
  add("span", "bi-popup__meta", `${r.category} · ${formatKm(r.distanceKm)}`);
  if (r.address) add("span", "bi-popup__addr", r.address);
  add("span", `bi-popup__web${r.website ? "" : " bi-popup__web--none"}`, r.website ? "Website listed" : "No website listed");
  return root;
}

interface GoogleOpportunityMapProps {
  center: GeoPoint;
  radiusKm: number;
  showRadius: boolean;
  results: BusinessResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fitRequest: number;
}

export default function GoogleOpportunityMap({ center, radiusKm, showRadius, results, selectedId, onSelect, fitRequest }: GoogleOpportunityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [libs, setLibs] = useState<GoogleLibs | null>(null);
  const [error, setError] = useState<string | null>(
    BROWSER_KEY ? null : "The Google map isn't set up yet. Add VITE_GOOGLE_MAPS_BROWSER_KEY to frontend/.env.local and restart the frontend."
  );
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const centreRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markersRef = useRef(new Map<string, { marker: any; result: BusinessResult }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Load the API once.
  useEffect(() => {
    if (!BROWSER_KEY) return;
    let cancelled = false;
    // Google calls this when the key is invalid, not allowed for this site, or the API isn't enabled.
    window.gm_authFailure = () =>
      setError("Google rejected the map key. Check that Maps JavaScript API is enabled and the key allows this site (http://localhost:5173/*).");
    loadGoogleMaps(BROWSER_KEY)
      .then((loaded) => !cancelled && setLibs(loaded))
      .catch(() => !cancelled && setError("Google Maps couldn't be loaded. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
  }, []);

  // Create the map once the API is ready.
  useEffect(() => {
    if (!libs || !containerRef.current || mapRef.current) return;
    mapRef.current = new libs.Map(containerRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: 12,
      mapId: MAP_ID,
      clickableIcons: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    infoRef.current = new libs.InfoWindow();
    // `center` is only the initial position; later moves are handled by the fit effect.
  }, [libs, center.lat, center.lng]);

  // Search-area circle and centre point.
  useEffect(() => {
    const map = mapRef.current;
    if (!libs || !map) return;
    circleRef.current?.setMap(null);
    if (centreRef.current) centreRef.current.map = null;
    circleRef.current = null;
    centreRef.current = null;
    if (!showRadius) return;
    circleRef.current = new libs.Circle({
      map,
      center: { lat: center.lat, lng: center.lng },
      radius: radiusKm * 1000,
      strokeColor: COLORS.selected,
      strokeWeight: 1.5,
      fillColor: COLORS.listed,
      fillOpacity: 0.06,
      clickable: false,
    });
    const centreDot = dot("#ffffff", 12);
    centreDot.style.border = `3px solid ${COLORS.centre}`;
    centreDot.style.cursor = "default";
    centreRef.current = new libs.AdvancedMarkerElement({ map, position: { lat: center.lat, lng: center.lng }, content: centreDot, title: "Search centre" });
  }, [libs, center.lat, center.lng, radiusKm, showRadius]);

  // Fit to the search area when it changes, or when asked ("Fit to area").
  useEffect(() => {
    const map = mapRef.current;
    if (!libs || !map) return;
    if (!showRadius || !circleRef.current) {
      map.setCenter({ lat: center.lat, lng: center.lng });
      map.setZoom(12);
      return;
    }
    const bounds = new libs.LatLngBounds(circleRef.current.getBounds());
    for (const r of results) if (r.lat !== null && r.lng !== null) bounds.extend({ lat: r.lat, lng: r.lng });
    map.fitBounds(bounds, 24);
    // `results` is read but deliberately not a dependency: re-filtering the same area shouldn't keep re-zooming.
  }, [libs, center.lat, center.lng, radiusKm, showRadius, fitRequest]);

  // Business markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!libs || !map) return;
    for (const { marker } of markersRef.current.values()) marker.map = null;
    markersRef.current.clear();
    for (const r of results) {
      if (r.lat === null || r.lng === null) continue;
      const marker = new libs.AdvancedMarkerElement({
        map,
        position: { lat: r.lat, lng: r.lng },
        content: dot(r.website ? COLORS.listed : COLORS.none, 14),
        title: r.name,
        gmpClickable: true,
      });
      marker.addListener("click", () => onSelectRef.current(r.id));
      markersRef.current.set(r.id, { marker, result: r });
    }
  }, [libs, results]);

  // Highlight the selected business and open its popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!libs || !map) return;
    for (const [id, { marker, result }] of markersRef.current) {
      const selected = id === selectedId;
      marker.content = dot(selected ? COLORS.selected : result.website ? COLORS.listed : COLORS.none, selected ? 20 : 14);
      marker.zIndex = selected ? 1000 : undefined;
    }
    const entry = selectedId ? markersRef.current.get(selectedId) : undefined;
    if (!entry) {
      infoRef.current?.close();
      return;
    }
    infoRef.current.setContent(popupContent(entry.result));
    infoRef.current.open({ map, anchor: entry.marker });
    if (!map.getBounds()?.contains(entry.marker.position)) map.panTo(entry.marker.position);
  }, [libs, selectedId, results]);

  if (error) {
    return (
      <div className="bi-map bi-map--loading bi-map--error" role="alert">
        {error}
      </div>
    );
  }
  return (
    <div className="bi-map">
      <div ref={containerRef} className="bi-map__google" />
      {!libs && <div className="bi-map__overlay">Loading Google map…</div>}
    </div>
  );
}
