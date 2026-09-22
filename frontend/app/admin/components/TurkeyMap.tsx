"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonObject,
} from "geojson";
import type { Layer, PathOptions } from "leaflet";
import type { CityDistribution } from "@/lib/analytics";
import "leaflet/dist/leaflet.css";

type ProvinceProperties = {
  name?: string;
  city?: string;
  city_code?: string;
};

type TurkeyMapProps = {
  cities: CityDistribution[];
};

function normalizeName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i");
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

function FitTurkeyBounds({ geojson }: { geojson: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(geojson as GeoJsonObject);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [16, 16], maxZoom: 7 });
    }
  }, [map, geojson]);
  return null;
}

function quantityColor(ratio: number): string {
  if (ratio <= 0) return "#e2e8f0";
  if (ratio < 0.25) return "#bfdbfe";
  if (ratio < 0.5) return "#60a5fa";
  if (ratio < 0.75) return "#2563eb";
  return "#1e3a8a";
}

export default function TurkeyMap({ cities }: TurkeyMapProps) {
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/maps/tr-provinces.geojson");
        if (!res.ok) {
          throw new Error("Türkiye il sınırları yüklenemedi.");
        }
        const data = (await res.json()) as FeatureCollection;
        if (!cancelled) setProvinces(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Harita yüklenemedi.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxQuantity = useMemo(
    () => Math.max(1, ...cities.map((c) => c.quantity)),
    [cities],
  );

  const byCode = useMemo(() => {
    const map = new Map<string, CityDistribution>();
    for (const item of cities) {
      if (item.city_code) map.set(item.city_code.padStart(2, "0"), item);
    }
    return map;
  }, [cities]);

  const byName = useMemo(() => {
    const map = new Map<string, CityDistribution>();
    for (const item of cities) {
      map.set(normalizeName(item.city), item);
    }
    return map;
  }, [cities]);

  function resolveCity(props: ProvinceProperties | null | undefined) {
    if (!props) return null;
    if (props.city_code) {
      const hit = byCode.get(String(props.city_code).padStart(2, "0"));
      if (hit) return hit;
    }
    const name = props.city || props.name;
    if (!name) return null;
    return byName.get(normalizeName(name)) ?? null;
  }

  function styleFeature(feature?: Feature): PathOptions {
    const props = (feature?.properties ?? {}) as ProvinceProperties;
    const city = resolveCity(props);
    const quantity = city?.quantity ?? 0;
    const ratio = quantity / maxQuantity;
    return {
      color: "#1e293b",
      weight: 0.9,
      opacity: 0.85,
      fillColor: quantityColor(ratio),
      fillOpacity: quantity > 0 ? 0.78 : 0.35,
    };
  }

  function onEachFeature(feature: Feature<Geometry, ProvinceProperties>, layer: Layer) {
    const props = feature.properties ?? {};
    const city = resolveCity(props);
    const label = city?.city || props.city || props.name || "İl";
    const quantity = city?.quantity ?? 0;
    const html = `<strong>${label}</strong><br/>Ürün miktarı: ${quantity.toLocaleString("tr-TR")}`;
    layer.bindTooltip(html, { sticky: true, opacity: 0.95 });
    layer.bindPopup(html);
  }

  if (loadError) {
    return <p data-testid="turkey-map-error">{loadError}</p>;
  }

  if (!provinces) {
    return <p data-testid="turkey-map-loading">Harita hazırlanıyor…</p>;
  }

  if (cities.length === 0) {
    return (
      <p data-testid="turkey-map-empty">
        Bu filtrelere uygun şehir dağılımı bulunamadı.
      </p>
    );
  }

  const styleKey = cities
    .map((c) => `${c.city_code}:${c.quantity}`)
    .join("|");

  return (
    <div data-testid="turkey-map" style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={[39.0, 35.2]}
        zoom={6}
        minZoom={5}
        maxZoom={12}
        scrollWheelZoom
        style={{
          height: "100%",
          width: "100%",
          background: "#e2e8f0",
          borderRadius: "10px",
        }}
      >
        <MapResizeFix />
        <FitTurkeyBounds geojson={provinces} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={`provinces-${styleKey}`}
          data={provinces as GeoJsonObject}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  );
}
