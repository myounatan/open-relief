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
import IdentityVerification from "./IdentityVerification";

// Arc data type definition with unique ID
interface ArcData {
  id: string;
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
  dashInitialGap: number;
}

// Ring data type definition
interface RingData {
  id: string;
  lat: number;
  lng: number;
  color: string;
}

// Donation history data type
interface DonationHistoryData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  amount: number;
  currency: string;
  timestamp: Date;
  donorLocation: string;
  isHighlighted: boolean;
}

// Calculate great circle distance between two points
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
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

// Generate random coordinates within reasonable bounds
const generateRandomLocation = () => {
  // Generate random lat/lng with bias towards populated areas
  const lat = (Math.random() - 0.5) * 140; // -70 to 70 degrees
  const lng = (Math.random() - 0.5) * 360; // -180 to 180 degrees
  return { lat, lng };
};

// Generate sample donation history for a disaster zone
const generateDonationHistory = (
  zone: DisasterZoneFeature
): DonationHistoryData[] => {
  const donations: DonationHistoryData[] = [];
  const center = getPolygonCenter(zone);

  // Sample donor cities with names
  const donorCities = [
    { name: "New York", lat: 40.7128, lng: -74.006 },
    { name: "London", lat: 51.5074, lng: -0.1278 },
    { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
    { name: "Sydney", lat: -33.8688, lng: 151.2093 },
    { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
    { name: "Dubai", lat: 25.2048, lng: 55.2708 },
    { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  ];

  for (let i = 0; i < 5; i++) {
    const cityIndex = Math.floor(Math.random() * donorCities.length);
    const randomCity = donorCities[cityIndex]!; // Non-null assertion since array is populated
    const amount = Math.floor(Math.random() * 5000) + 100; // $100-$5000
    const currencies = ["USD", "EUR", "GBP", "JPY"];
    const currencyIndex = Math.floor(Math.random() * currencies.length);
    const currency = currencies[currencyIndex]!; // Non-null assertion since array is populated

    // Generate timestamp within last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);

    donations.push({
      id: `donation-${zone.properties.name}-${i}`,
      startLat: randomCity.lat,
      startLng: randomCity.lng,
      endLat: center[1],
      endLng: center[0],
      amount,
      currency,
      timestamp,
      donorLocation: randomCity.name,
      isHighlighted: false, // Keep for interface compatibility
    });
  }

  return donations;
};

// Generate a donation arc from random location to disaster zone
const generateDonationArc = (
  startLat?: number,
  startLng?: number,
  targetZone?: DisasterZoneFeature
): ArcData => {
  // Use provided coordinates or generate random ones
  const start =
    startLat !== undefined && startLng !== undefined
      ? { lat: startLat, lng: startLng }
      : generateRandomLocation();

  // Use provided zone or pick random one
  const zone =
    targetZone ||
    DISASTER_ZONES[Math.floor(Math.random() * DISASTER_ZONES.length)];

  // Ensure we have a valid zone
  if (!zone) {
    throw new Error("No disaster zones available");
  }

  const center = getPolygonCenter(zone);

  const distance = calculateDistance(
    start.lat,
    start.lng,
    center[1],
    center[0]
  );

  const altitude = calculateArcAltitude(distance);

  // Create unique ID based on coordinates and timestamp
  const id = `${start.lat.toFixed(4)}_${start.lng.toFixed(4)}_${center[1].toFixed(4)}_${center[0].toFixed(4)}_${Date.now()}`;

  return {
    id,
    startLat: start.lat,
    startLng: start.lng,
    endLat: center[1],
    endLng: center[0],
    color: ["#22c55e", zone.properties.color],
    altitude: altitude,
    stroke: 0.8,
    startTime: 0, // Start animation from the beginning
    duration: 2000,
    dashLength: 0.4, // Length of the traveling dash (40% of arc like example)
    dashGap: 2, // Gap between dashes
    dashInitialGap: 1, // Initial gap before dash starts (key for proper animation!)
  };
};

interface PopupData {
  zone: DisasterZoneFeature;
  x: number;
  y: number;
}

const OpenReliefGlobe: React.FC = () => {
  const globeRef = useRef<any>();
  const arcCleanupTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [identityVerificationOpen, setIdentityVerificationOpen] =
    useState(false);
  const [selectedZone, setSelectedZone] = useState<DisasterZoneFeature | null>(
    null
  );
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [arcIds, setArcIds] = useState<Set<string>>(new Set());
  const [ringsData, setRingsData] = useState<RingData[]>([]);
  const [donationHistoryArcs, setDonationHistoryArcs] = useState<
    DonationHistoryData[]
  >([]);
  const [hoveredDonationId, setHoveredDonationId] = useState<string | null>(
    null
  );
  const [currentHoveredZone, setCurrentHoveredZone] =
    useState<DisasterZoneFeature | null>(null);
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

  // Cleanup all timers on component unmount
  useEffect(() => {
    return () => {
      arcCleanupTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      arcCleanupTimers.current.clear();
    };
  }, []);

  const handlePolygonClick = (polygon: any, event: any) => {
    if (polygon && event) {
      const zone = polygon as DisasterZoneFeature;
      setPopup({
        zone: zone,
        x: event.clientX,
        y: event.clientY,
      });

      // Ensure donation history is shown for clicked zone
      if (zone.properties?.name !== currentHoveredZone?.properties?.name) {
        console.log(
          "Click: Setting donation history for",
          zone.properties?.name
        );
        setCurrentHoveredZone(zone);
        const donationHistory = generateDonationHistory(zone);
        setDonationHistoryArcs(donationHistory);
      }
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
    if (popup?.zone) {
      if (wallets.length === 0) {
        login();
        return;
      }
      setSelectedZone(popup.zone);
      setIdentityVerificationOpen(true);
      setPopup(null);
    }
  };

  const handleVerificationSuccess = (verificationData: any) => {
    console.log("Identity verified:", verificationData);
    setIdentityVerificationOpen(false);
    // Just close the modal - no redirect needed
    // Future: handle claim modal based on query parameters
  };

  // Function to remove an arc after animation completes
  const removeArc = (arcId: string) => {
    setArcsData((prev) => prev.filter((arc) => arc.id !== arcId));
    setArcIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(arcId);
      return newSet;
    });

    // Clean up timers
    const cleanupTimer = arcCleanupTimers.current.get(arcId);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      arcCleanupTimers.current.delete(arcId);
    }
  };

  // Function to simulate a donation arc
  const simulateDonation = (
    startLat?: number,
    startLng?: number,
    targetZone?: DisasterZoneFeature
  ) => {
    const newArc = generateDonationArc(startLat, startLng, targetZone);

    // Check if this arc already exists (prevent duplicates)
    if (!arcIds.has(newArc.id)) {
      setArcsData((prev) => [...prev, newArc]);
      setArcIds((prev) => new Set([...prev, newArc.id]));

      // Create start ring (green) - appears immediately
      const startRing: RingData = {
        id: `start-${newArc.id}`,
        lat: newArc.startLat,
        lng: newArc.startLng,
        color: "green",
      };
      setRingsData((prev) => [...prev, startRing]);

      // Remove start ring after arc dash length duration
      const startRingDuration = newArc.duration * newArc.dashLength; // 40% of flight time
      setTimeout(() => {
        setRingsData((prev) => prev.filter((r) => r.id !== startRing.id));
      }, startRingDuration);

      // Create target ring (red) - appears when arc arrives
      setTimeout(() => {
        const targetRing: RingData = {
          id: `target-${newArc.id}`,
          lat: newArc.endLat,
          lng: newArc.endLng,
          color: "red",
        };
        setRingsData((prev) => [...prev, targetRing]);

        // Remove target ring after same duration
        setTimeout(() => {
          setRingsData((prev) => prev.filter((r) => r.id !== targetRing.id));
        }, startRingDuration);
      }, newArc.duration); // When arc arrives

      // Set up cleanup timer to remove arc after animation completes
      const cleanupTimer = setTimeout(() => {
        removeArc(newArc.id);
      }, newArc.duration * 2); // Remove after 2x flight time like example

      arcCleanupTimers.current.set(newArc.id, cleanupTimer);
    }
  };

  const closePopup = () => {
    setPopup(null);
    setCurrentHoveredZone(null);
    setDonationHistoryArcs([]); // Clear donation history arcs when popup closes
    setHoveredDonationId(null);
  };

  // Don't render anything if we're on the server
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        // Clear donation history arcs when leaving the globe area entirely
        if (!popup) {
          console.log("Mouse left globe area, clearing donation history");
          setCurrentHoveredZone(null);
          setDonationHistoryArcs([]);
          setHoveredDonationId(null);
        }
      }}
    >
      {/* Simulate Donation Button */}
      <button
        onClick={() => simulateDonation()}
        className="absolute top-4 left-4 z-50 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
      >
        Simulate Donation {arcsData.length > 0 && `(${arcsData.length} active)`}
      </button>

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

          // Show donation history arcs when hovering over a disaster zone
          if (polygon) {
            const zone = polygon as DisasterZoneFeature;
            // Only generate new arcs if we're hovering over a different zone
            if (
              zone.properties?.name !== currentHoveredZone?.properties?.name
            ) {
              console.log("Starting hover on new zone:", zone.properties?.name);

              // Clear previous zone's donation highlighting
              setHoveredDonationId(null);

              setCurrentHoveredZone(zone);
              const donationHistory = generateDonationHistory(zone);
              console.log(
                "Generated donation history:",
                donationHistory.length,
                "arcs for",
                zone.properties?.name
              );
              setDonationHistoryArcs(donationHistory);
            }
          } else if (!polygon && currentHoveredZone && !popup) {
            // Clear donation history arcs when hovering off polygon, unless popup is open
            console.log(
              "Clearing donation history arcs - no longer hovering and no popup"
            );
            setCurrentHoveredZone(null);
            setDonationHistoryArcs([]);
            setHoveredDonationId(null);
          }
        }}
        // Dynamic arcs data with native animation (combine regular arcs + donation history)
        arcsData={(() => {
          const combinedArcs = [
            ...arcsData,
            ...donationHistoryArcs.map((donation) => {
              const isHighlighted = hoveredDonationId === donation.id;
              const arc = {
                id: donation.id,
                startLat: donation.startLat,
                startLng: donation.startLng,
                endLat: donation.endLat,
                endLng: donation.endLng,
                color: isHighlighted
                  ? [
                      currentHoveredZone?.properties?.color || "#ff6432",
                      currentHoveredZone?.properties?.color || "#ff6432",
                    ]
                  : ["#a0a0a0", "#a0a0a0"], // Light gray (simulating transparency)
                altitude: 0.2, // Lower altitude

                startTime: 0,

                dashLength: 1, // Long dash to appear more solid
              };
              console.log("Created donation history arc:", {
                id: arc.id,
                startLat: arc.startLat,
                startLng: arc.startLng,
                endLat: arc.endLat,
                endLng: arc.endLng,
                color: arc.color,
                altitude: arc.altitude,

                dashLength: arc.dashLength,

                from: donation.donorLocation,
              });
              return arc;
            }),
          ];
          console.log(
            "=== FINAL ARCS DATA ===",
            "Total arcs being rendered:",
            combinedArcs.length,
            "Regular arcs:",
            arcsData.length,
            "Donation history arcs:",
            donationHistoryArcs.length
          );
          if (combinedArcs.length > 0) {
            console.log("Full arcs array:", combinedArcs);
          }
          return combinedArcs;
        })()}
        arcColor="color"
        arcStroke="stroke"
        arcAltitude="altitude"
        arcAltitudeAutoScale={0.3}
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashInitialGap="dashInitialGap"
        arcDashAnimateTime="duration"
        arcsTransitionDuration={0}
        // Ring system for start/target indicators
        ringsData={ringsData}
        ringColor={(d: any) => {
          const baseColor = d?.color || "orange";
          if (baseColor === "green") {
            return (t: number) => `rgba(34, 197, 94, ${1 - t})`; // Green fade out
          } else if (baseColor === "red") {
            return (t: number) => `rgba(239, 68, 68, ${1 - t})`; // Red fade out
          }
          return (t: number) => `rgba(255, 100, 50, ${1 - t})`; // Default orange
        }}
        ringMaxRadius={5}
        ringPropagationSpeed={5}
        ringRepeatPeriod={400}
        // Styling
        width={dimensions.width}
        height={dimensions.height}
        enablePointerInteraction={true}
      />

      {/* Popup for disaster zone interaction */}
      {popup && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[400px]"
          style={{
            right: "20px",
            top: "20px",
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

            {/* Recent Donations */}
            {donationHistoryArcs.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">
                  Recent Donations
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {donationHistoryArcs.map((donation) => (
                    <div
                      key={donation.id}
                      className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                        hoveredDonationId === donation.id
                          ? "bg-slate-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-650"
                      }`}
                      onMouseEnter={() => setHoveredDonationId(donation.id)}
                      onMouseLeave={() => setHoveredDonationId(null)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {donation.amount} {donation.currency}
                        </span>
                        <span className="text-slate-400">
                          {donation.donorLocation}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs">
                        {donation.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Identity Verification Modal */}
      <IdentityVerification
        isOpen={identityVerificationOpen}
        onClose={() => setIdentityVerificationOpen(false)}
        onVerificationSuccess={handleVerificationSuccess}
        disasterZone={selectedZone!}
      />
    </div>
  );
};

export default OpenReliefGlobe;
