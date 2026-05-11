import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";

export type ReportPoint = {
  id: string;
  title: string;
  description: string;
  category: "Health" | "Environment" | "Social";
  latitude: number;
  longitude: number;
  location_name: string | null;
  created_at: string;
};

const categoryColors: Record<string, string> = {
  Health: "#dc2626",
  Environment: "#16a34a",
  Social: "#2563eb",
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "tgis-pin",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

export function MapView({ reports, height = "70vh" }: { reports: ReportPoint[]; height?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([9.082, 8.6753], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    clusterRef.current = (L as any).markerClusterGroup({ showCoverageOnHover: false });
    map.addLayer(clusterRef.current!);
    return () => { map.remove(); mapRef.current = null; clusterRef.current = null; };
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    reports.forEach((r) => {
      const m = L.marker([r.latitude, r.longitude], { icon: pinIcon(categoryColors[r.category] ?? "#555") });
      const date = new Date(r.created_at).toLocaleDateString();
      m.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:220px">
          <div style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${categoryColors[r.category]};color:white;font-size:11px;font-weight:600;margin-bottom:6px">${r.category}</div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${escapeHtml(r.title)}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:6px">${escapeHtml(r.description)}</div>
          <div style="font-size:11px;color:#64748b">${escapeHtml(r.location_name ?? "")} · ${date}</div>
        </div>
      `);
      cluster.addLayer(m);
    });
  }, [reports]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-xl border border-border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
