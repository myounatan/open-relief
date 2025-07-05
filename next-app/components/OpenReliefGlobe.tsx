import { useLogin, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import {
  DISASTER_ZONES,
  DisasterZoneFeature,
  getPolygonCenter,
} from "../lib/countryData";
import DonationModal from "./DonationModal";

// Sample donor locations and arcs
const DONOR_LOCATIONS = [
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
];

// Arc data type definition
interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string | string[];
  altitude: number;
  stroke: number;
  startTime: number;
  duration: number;
  dashLength: number;
  dashGap: number;
}

// Calculate great circle distance between two points
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate arc altitude based on distance
const calculateArcAltitude = (distance: number): number => {
  const maxAltitude = 0.4;
  const minAltitude = 0.1;
  const normalizedDistance = Math.min(distance / 20000, 1);
  return minAltitude + (maxAltitude - minAltitude) * normalizedDistance;
};

// Generate donor arcs to disaster zones
const generateDonorArcs = (): ArcData[] => {
  const arcs: ArcData[] = [];

  DONOR_LOCATIONS.forEach((donor) => {
    DISASTER_ZONES.forEach((zone) => {
      const center = getPolygonCenter(zone);
      const distance = calculateDistance(
        donor.lat,
        donor.lng,
        center[1],
        center[0],
      );

      const altitude = calculateArcAltitude(distance);

      arcs.push({
        startLat: donor.lat,
        startLng: donor.lng,
        endLat: center[1],
        endLng: center[0],
        color: ["#22c55e", zone.properties.color],
        altitude: altitude,
        stroke: 0.8,
        startTime: 0,
        duration: 3000,
        dashLength: 0.9,
        dashGap: 0.8,
      });
    });
  });

  return arcs;
};

interface PopupData {
  zone: DisasterZoneFeature;
  x: number;
  y: number;
}

const OpenReliefGlobe: React.FC = () => {
  const globeRef = useRef<any>();
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DisasterZoneFeature | null>(
    null,
  );
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isHovered, setIsHovered] = useState(false);
  const { login } = useLogin();
  const { wallets } = useWallets();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Generate initial arcs
      const initialArcs = generateDonorArcs();
      setArcsData(initialArcs);
    }
  }, []);

  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      // Set initial camera position
      globeRef.current.pointOfView({ altitude: 2.8 });

      // Auto-rotate the globe, but pause on hover
      globeRef.current.controls().autoRotate = !isHovered;
      globeRef.current.controls().autoRotateSpeed = 0.3;
    }
  }, [isHovered]);

  const handlePolygonClick = (polygon: any, event: any) => {
    if (polygon && event) {
      setPopup({
        zone: polygon as DisasterZoneFeature,
        x: event.clientX,
        y: event.clientY,
      });
    }
  };

  const handleDonate = () => {
    if (popup?.zone) {
      if (wallets.length === 0) {
        login();
        return;
      }
      setSelectedZone(popup.zone);
      setDonationModalOpen(true);
      setPopup(null);
    }
  };

  const handleClaim = () => {
    setPopup(null);
    router.push("/dashboard");
  };

  const closePopup = () => {
    setPopup(null);
  };

  // Don't render anything if we're on the server
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,1)"
        backgroundImageUrl={null}
        showGlobe={true}
        showAtmosphere={false}
        atmosphereColor="rgba(100, 116, 139, 0.1)"
        atmosphereAltitude={0.1}
        // Disaster zones as GeoJSON features
        polygonsData={DISASTER_ZONES}
        polygonCapColor={(d: any) => {
          const hexColor = d.properties?.color;
          if (hexColor && hexColor.startsWith("#")) {
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, 0.8)`;
          }
          return "rgba(255, 100, 50, 0.8)";
        }}
        polygonSideColor={(d: any) => {
          const hexColor = d.properties?.color;
          if (hexColor && hexColor.startsWith("#")) {
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, 0.6)`;
          }
          return "rgba(255, 100, 50, 0.6)";
        }}
        polygonStrokeColor={() => "rgba(255, 255, 255, 0.4)"}
        polygonAltitude={(d: any) => d.properties?.altitude || 0.03}
        polygonLabel={(d: any) => `
          <div style="
            background: rgba(30, 41, 59, 0.95);
            color: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            border: 1px solid rgba(71, 85, 105, 0.5);
            font-family: sans-serif;
            max-width: 200px;
          ">
            <div style="font-weight: 600; color: #fb923c; margin-bottom: 6px;">
              ${d.properties?.name || "Unknown"}
            </div>
            <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">
              ${d.properties?.description || "No description"}
            </div>
            <div style="font-size: 11px; color: #ef4444;">
              ${d.properties?.disasterType || "Unknown"} - ${
                d.properties?.severity || "Unknown"
              } severity
            </div>
          </div>
        `}
        onPolygonClick={handlePolygonClick}
        onPolygonHover={(polygon: any) => {
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = !polygon && !isHovered;
          }
        }}
        // Donor city points
        pointsData={DONOR_LOCATIONS}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointColor={() => "#22c55e"}
        pointAltitude={0.01}
        pointRadius={0.8}
        pointLabel={(d: any) => `
          <div style="
            background: rgba(30, 41, 59, 0.95);
            color: white;
            padding: 8px;
            border-radius: 6px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            border: 1px solid rgba(71, 85, 105, 0.5);
            font-family: sans-serif;
          ">
            <div style="font-weight: 600; color: #22c55e; margin-bottom: 2px;">
              ${d.name}
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
              Donor Location
            </div>
          </div>
        `}
        // Simple arcs - all visible
        arcsData={arcsData}
        arcColor={(d: any) => d?.color || ["#22c55e", "#ff6432"]}
        arcStroke={(d: any) => d?.stroke || 0.8}
        arcAltitude={(d: any) => d?.altitude || 0.15}
        arcAltitudeAutoScale={0.3}
        arcDashLength={(d: any) => d?.dashLength || 1.0}
        arcDashGap={(d: any) => d?.dashGap || 0}
        arcDashAnimateTime={(d: any) => d?.duration || 3000}
        // Styling
        width={dimensions.width}
        height={dimensions.height}
        enablePointerInteraction={true}
      />

      {/* Popup for disaster zone interaction */}
      {popup && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 min-w-[280px]"
          style={{
            left: popup.x - 140,
            top: popup.y - 100,
            transform: "translateY(-50%)",
          }}
        >
          <button
            onClick={closePopup}
            className="absolute top-2 right-2 text-slate-400 hover:text-white text-xl"
          >
            ×
          </button>

          <div className="text-white">
            <h3 className="font-semibold text-orange-400 mb-2">
              {popup.zone.properties.name}
            </h3>
            <p className="text-sm text-slate-300 mb-3">
              {popup.zone.properties.description}
            </p>
            <div className="text-xs text-red-400 mb-4">
              {popup.zone.properties.disasterType} -{" "}
              {popup.zone.properties.severity} severity
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDonate}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Donate
              </button>
              <button
                onClick={handleClaim}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Claim Aid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close popup */}
      {popup && <div className="fixed inset-0 z-40" onClick={closePopup} />}

      {/* Donation Modal */}
      <DonationModal
        isOpen={donationModalOpen}
        onClose={() => setDonationModalOpen(false)}
        disasterZone={selectedZone!}
      />
    </div>
  );
};

export default OpenReliefGlobe;
