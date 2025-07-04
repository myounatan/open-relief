import { useLogin } from "@privy-io/react-auth";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { CountryData, DISASTER_ZONES } from "../lib/countryData";

// Type alias for consistency
type DisasterZone = CountryData;

// Country data now imported from ../lib/countryData

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
  color: string[];
  altitude: number;
  stroke: number;
}

// Generate donor arcs to disaster zones
const generateDonorArcs = (): ArcData[] => {
  const arcs: ArcData[] = [];
  DONOR_LOCATIONS.forEach((donor) => {
    DISASTER_ZONES.forEach((zone) => {
      arcs.push({
        startLat: donor.lat,
        startLng: donor.lng,
        endLat: zone.center[1],
        endLng: zone.center[0],
        color: ["rgba(0, 255, 100, 0.6)", "rgba(255, 50, 50, 0.6)"],
        altitude: Math.random() * 0.3 + 0.1,
        stroke: 0.5,
      });
    });
  });
  return arcs;
};

interface PopupData {
  zone: DisasterZone;
  x: number;
  y: number;
}

const AidGlobe: React.FC = () => {
  const globeRef = useRef<any>();
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isHovered, setIsHovered] = useState(false);
  const { login } = useLogin();
  const router = useRouter();

  useEffect(() => {
    // Set initial dimensions and arcs data on client side
    if (typeof window !== "undefined") {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setArcsData(generateDonorArcs());
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
      globeRef.current.pointOfView({ altitude: 2 });

      // Auto-rotate the globe, but pause on hover
      globeRef.current.controls().autoRotate = !isHovered;
      globeRef.current.controls().autoRotateSpeed = 0.3;

      // Animate arcs periodically
      const interval = setInterval(() => {
        setArcsData(generateDonorArcs());
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isHovered]);

  const handlePolygonClick = (polygon: any, event: any) => {
    // Handle both direct object and polygon event cases
    const polygonData = polygon.object || polygon;
    const zone = DISASTER_ZONES.find((z) => z.id === polygonData?.id);
    if (zone && event) {
      setPopup({
        zone,
        x: event.clientX,
        y: event.clientY,
      });
    }
  };

  const handleDonate = () => {
    setPopup(null);
    login();
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
      className="relative w-full h-screen bg-gradient-to-br from-slate-900 to-slate-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        // Disaster zones as elevated polygons
        polygonsData={DISASTER_ZONES}
        polygonCapColor={(d: any) => d?.color || "rgba(255, 100, 50, 0.7)"}
        polygonSideColor={(d: any) => d?.color || "rgba(255, 100, 50, 0.7)"}
        polygonStrokeColor={() => "rgba(255, 255, 255, 0.2)"}
        polygonAltitude={(d: any) => d?.altitude || 0.015}
        polygonCapMaterial={{ opacity: 0.8, transparent: true }}
        polygonSideMaterial={{ opacity: 0.6, transparent: true }}
        polygonLabel={(d: any) => `
          <div class="bg-slate-800 text-white p-3 rounded-lg shadow-lg border border-slate-600">
            <div class="font-semibold text-orange-400">${d.name}</div>
            <div class="text-sm text-slate-300">${d.description}</div>
            <div class="text-xs text-red-400 mt-1">Urgency: ${d.urgency}</div>
          </div>
        `}
        onPolygonClick={handlePolygonClick}
        // Donor arcs
        arcsData={arcsData}
        arcColor={(d: any) =>
          d?.color || ["rgba(0, 255, 100, 0.6)", "rgba(255, 50, 50, 0.6)"]
        }
        arcStroke={(d: any) => d?.stroke || 0.5}
        arcAltitude={(d: any) => d?.altitude || 0.2}
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
              {popup.zone.name}
            </h3>
            <p className="text-sm text-slate-300 mb-3">
              {popup.zone.description}
            </p>
            <div className="text-xs text-red-400 mb-4">
              Urgency: {popup.zone.urgency}
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
    </div>
  );
};

export default AidGlobe;
