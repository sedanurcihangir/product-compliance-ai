"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonObject,
  Position,
} from "geojson";
import type { Layer, PathOptions } from "leaflet";
import type { CityDistribution } from "@/lib/analytics";
import "leaflet/dist/leaflet.css";
import styles from "./TurkeyMap.module.css";

type ProvinceProperties = {
  name?: string;
  city?: string;
  city_code?: string;
};

type TurkeyMapProps = {
  cities: CityDistribution[];
};

type LegendBand = {
  key: string;
  label: string;
  color: string;
  min: number;
  max: number | null;
};

type LabelPoint = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  areaHint: number;
};

const TURKEY_BOUNDS = L.latLngBounds(
  L.latLng(35.5, 25.5),
  L.latLng(42.5, 45.0),
);

const FILL_COLORS = [
  "#f8fafc",
  "#dbeafe",
  "#93c5fd",
  "#3b82f6",
  "#1d4ed8",
  "#1e3a8a",
] as const;

function normalizeName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i");
}

/** Approximate label point: centroid of the largest exterior ring. */
function featureLabelPoint(feature: Feature): LabelPoint | null {
  const props = (feature.properties ?? {}) as ProvinceProperties;
  const name = (props.city || props.name || "").trim();
  const code = String(props.city_code || "").padStart(2, "0");
  if (!name || !code) return null;

  const geometry = feature.geometry;
  if (!geometry) return null;

  let rings: Position[][] = [];
  if (geometry.type === "Polygon") {
    rings = [geometry.coordinates[0] ?? []];
  } else if (geometry.type === "MultiPolygon") {
    rings = geometry.coordinates.map((poly) => poly[0] ?? []);
  } else {
    return null;
  }

  let bestRing: Position[] = [];
  let bestScore = -1;
  for (const ring of rings) {
    if (ring.length < 3) continue;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const score = (maxX - minX) * (maxY - minY);
    if (score > bestScore) {
      bestScore = score;
      bestRing = ring;
    }
  }
  if (bestRing.length < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of bestRing) {
    sumX += x;
    sumY += y;
  }
  return {
    code,
    name,
    lng: sumX / bestRing.length,
    lat: sumY / bestRing.length,
    areaHint: bestScore,
  };
}

function buildLegendBands(quantities: number[]): LegendBand[] {
  const positive = quantities.filter((q) => q > 0).sort((a, b) => a - b);
  if (positive.length === 0) {
    return [{ key: "0", label: "0", color: FILL_COLORS[0], min: 0, max: 0 }];
  }

  const unique = [...new Set(positive)];
  const max = unique[unique.length - 1];
  const pick = (p: number) => {
    const idx = Math.min(
      unique.length - 1,
      Math.max(0, Math.ceil(p * unique.length) - 1),
    );
    return unique[idx];
  };

  const edges = [0, 1, pick(0.25), pick(0.5), pick(0.75), max];
  const cleaned: number[] = [];
  for (const edge of edges) {
    if (cleaned.length === 0 || edge > cleaned[cleaned.length - 1]) {
      cleaned.push(edge);
    }
  }
  if (cleaned[cleaned.length - 1] < max) cleaned.push(max);

  const bands: LegendBand[] = [
    { key: "0", label: "0", color: FILL_COLORS[0], min: 0, max: 0 },
  ];

  for (let i = 1; i < cleaned.length; i += 1) {
    const min = i === 1 ? 1 : cleaned[i - 1] + 1;
    const maxBand = cleaned[i];
    if (min > maxBand) continue;
    bands.push({
      key: `${min}-${maxBand}`,
      label: min === maxBand ? String(min) : `${min}–${maxBand}`,
      color: FILL_COLORS[Math.min(FILL_COLORS.length - 1, i)],
      min,
      max: maxBand,
    });
  }
  return bands;
}

function colorForQuantity(quantity: number, bands: LegendBand[]): string {
  if (quantity <= 0) return FILL_COLORS[0];
  for (const band of bands) {
    if (band.max == null) continue;
    if (quantity >= band.min && quantity <= band.max) return band.color;
  }
  return FILL_COLORS[FILL_COLORS.length - 1];
}

function MapChrome({ geojson }: { geojson: FeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 80);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);

  useEffect(() => {
    const layer = L.geoJSON(geojson as GeoJsonObject);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [18, 18], maxZoom: 7 });
    }
  }, [map, geojson]);

  return null;
}

function ZoomLabelSync({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const update = () => onZoom(map.getZoom());
    update();
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [map, onZoom]);
  return null;
}

export default function TurkeyMap({ cities }: TurkeyMapProps) {
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/maps/tr-provinces.geojson");
        if (!res.ok) throw new Error("Türkiye il sınırları yüklenemedi.");
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

  const legendBands = useMemo(
    () => buildLegendBands(cities.map((c) => c.quantity)),
    [cities],
  );

  const labels = useMemo(() => {
    if (!provinces) return [] as LabelPoint[];
    const points: LabelPoint[] = [];
    for (const feature of provinces.features) {
      const point = featureLabelPoint(feature);
      if (point) points.push(point);
    }
    return points;
  }, [provinces]);

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

  function infoHtml(label: string, city: CityDistribution | null) {
    const quantity = city?.quantity ?? 0;
    const records = city?.record_count ?? 0;
    return `
      <div class="${styles.tooltipCard}">
        <strong>${label}</strong>
        <div>Dağıtılan miktar: ${quantity.toLocaleString("tr-TR")}</div>
        <div>Kayıt sayısı: ${records.toLocaleString("tr-TR")}</div>
      </div>
    `;
  }

  function styleFeature(feature?: Feature): PathOptions {
    const props = (feature?.properties ?? {}) as ProvinceProperties;
    const city = resolveCity(props);
    const quantity = city?.quantity ?? 0;
    return {
      color: "#94a3b8",
      weight: 0.85,
      opacity: 1,
      fillColor: colorForQuantity(quantity, legendBands),
      fillOpacity: 1,
    };
  }

  function onEachFeature(
    feature: Feature<Geometry, ProvinceProperties>,
    layer: Layer,
  ) {
    const props = feature.properties ?? {};
    const city = resolveCity(props);
    const label = city?.city || props.city || props.name || "İl";
    const html = infoHtml(label, city);

    layer.bindTooltip(html, {
      sticky: true,
      opacity: 1,
      className: styles.leafletTooltip,
      direction: "top",
    });
    layer.bindPopup(html, { className: styles.leafletPopup });

    layer.on({
      mouseover: (event) => {
        const target = event.target as L.Path;
        target.setStyle({
          weight: 1.6,
          color: "#334155",
          fillOpacity: 1,
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          target.bringToFront();
        }
      },
      mouseout: (event) => {
        const target = event.target as L.Path;
        target.setStyle(styleFeature(feature));
      },
    });
  }

  if (loadError) {
    return <p data-testid="turkey-map-error">{loadError}</p>;
  }

  if (!provinces) {
    return <p data-testid="turkey-map-loading">Harita hazırlanıyor…</p>;
  }

  const styleKey = cities
    .map((c) => `${c.city_code}:${c.quantity}:${c.record_count ?? 0}`)
    .join("|");

  const labelFontSize =
    zoom >= 7 ? 11 : zoom >= 6 ? 9.5 : zoom >= 5.5 ? 8.5 : 7.5;

  return (
    <div className={styles.mapRoot} data-testid="turkey-map">
      <MapContainer
        center={[39.0, 35.2]}
        zoom={6}
        minZoom={5}
        maxZoom={9}
        maxBounds={TURKEY_BOUNDS.pad(0.35)}
        maxBoundsViscosity={0.85}
        scrollWheelZoom
        attributionControl={false}
        zoomControl
        style={{ height: "100%", width: "100%", background: "#ffffff" }}
        className={styles.mapContainer}
      >
        <MapChrome geojson={provinces} />
        <ZoomLabelSync onZoom={setZoom} />
        <GeoJSON
          key={`provinces-${styleKey}`}
          data={provinces as GeoJsonObject}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
        {labels.map((label) => {
          const compact = label.areaHint < 0.35;
          const icon = L.divIcon({
            className: styles.labelIcon,
            html: `<span class="${styles.labelText}" style="font-size:${
              compact ? Math.max(6.5, labelFontSize - 1.5) : labelFontSize
            }px"><i class="${styles.labelDot}"></i>${label.name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          return (
            <Marker
              key={label.code}
              position={[label.lat, label.lng]}
              icon={icon}
              interactive={false}
              keyboard={false}
            />
          );
        })}
      </MapContainer>

      <aside className={styles.legend} aria-label="Ürün dağılımı göstergesi">
        <div className={styles.legendTitle}>Ürün Dağılımı</div>
        <ul className={styles.legendList}>
          {legendBands.map((band) => (
            <li key={band.key} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: band.color }}
              />
              <span>{band.label}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
