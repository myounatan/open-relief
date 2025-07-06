import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Globe from "react-globe.gl";
import {
  BASE_DISASTER_ZONES,
  DisasterZoneFeature,
  getActiveDisasterZones,
  getPolygonCenter,
  ReliefPoolData,
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

// Generate real donation history for a disaster zone from GraphQL data
const generateRealDonationHistory = (
  zone: DisasterZoneFeature,
  donationMades: any[]
): DonationHistoryData[] => {
  const donations: DonationHistoryData[] = [];
  const poolId = zone.properties.id;

  // Filter donations for this specific pool
  const poolDonations = donationMades.filter(
    (donation) => donation.poolId === poolId
  );

  poolDonations.forEach((donation) => {
    // Parse location (format: "lat:lng")
    const locationParts = donation.location.split(":");
    const lat = parseFloat(locationParts[0]) || 0;
    const lng = parseFloat(locationParts[1]) || 0;

    // Use raw amount without conversion
    const amount = parseInt(donation.amount);

    // Convert timestamp to Date
    const timestamp = new Date(parseInt(donation.timestamp) * 1000);

    // Get zone center for end coordinates
    const center = getPolygonCenter(zone);

    donations.push({
      id: donation.id,
      startLat: lat,
      startLng: lng,
      endLat: center[1],
      endLng: center[0],
      amount,
      currency: "USDC",
      timestamp,
      donorLocation: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      isHighlighted: false,
    });
  });

  return donations;
};

// Calculate real zone metrics from GraphQL data
const calculateZoneMetrics = (
  zone: DisasterZoneFeature,
  donationMades: any[],
  fundsClaimeds: any[]
): { donated: number; claimed: number; donors: number } => {
  const poolId = zone.properties.id;

  // Filter data for this specific pool
  const poolDonations = donationMades.filter(
    (donation) => donation.poolId === poolId
  );
  const poolClaims = fundsClaimeds.filter((claim) => claim.poolId === poolId);

  // Calculate totals - show raw amounts without conversion
  const totalDonated = poolDonations.reduce((sum, donation) => {
    return sum + parseInt(donation.amount);
  }, 0);

  const totalClaimed = poolClaims.reduce((sum, claim) => {
    return sum + parseInt(claim.amount);
  }, 0);

  // Count unique donors
  const uniqueDonors = new Set(poolDonations.map((donation) => donation.donor))
    .size;

  return {
    donated: totalDonated,
    claimed: totalClaimed,
    donors: uniqueDonors,
  };
};

// Generate a donation arc from random location to disaster zone
const generateDonationArc = (
  startLat?: number,
  startLng?: number,
  targetZone?: DisasterZoneFeature,
  activeZones?: DisasterZoneFeature[]
): ArcData => {
  // Use provided coordinates or generate random ones
  const start =
    startLat !== undefined && startLng !== undefined
      ? { lat: startLat, lng: startLng }
      : generateRandomLocation();

  // Use provided zone or pick random one from active zones
  const availableZones = activeZones || [];
  const zone =
    targetZone ||
    (availableZones.length > 0
      ? availableZones[Math.floor(Math.random() * availableZones.length)]
      : null);

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

interface OpenReliefGlobeProps {
  reliefPools: ReliefPoolData[];
  loading?: boolean;
  error?: string | null;
  donationMades?: any[];
  fundsClaimeds?: any[];
}

const OpenReliefGlobe: React.FC<OpenReliefGlobeProps> = ({
  reliefPools,
  loading = false,
  error = null,
  donationMades = [],
  fundsClaimeds = [],
}) => {
  const globeRef = useRef<any>();
  const { authenticated } = usePrivy();
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
  const [zoneMetrics, setZoneMetrics] = useState<
    Record<string, { donated: number; claimed: number; donors: number }>
  >({});
  const { login } = useLogin();
  const { wallets } = useWallets();

  // Memoize active disaster zones to prevent infinite loops
  const activeDisasterZones = useMemo(() => {
    // Handle loading and error states
    if (loading) {
      console.log("📍 GraphQL data loading, showing mock disaster zones");
      return BASE_DISASTER_ZONES;
    }

    if (error) {
      console.error("📍 GraphQL error, showing mock disaster zones:", error);
      return BASE_DISASTER_ZONES;
    }

    // Handle empty or invalid relief pools
    if (!reliefPools || reliefPools.length === 0) {
      console.log("📍 No relief pools provided, showing mock disaster zones");
      return BASE_DISASTER_ZONES;
    }

    const zones = getActiveDisasterZones(reliefPools);

    // If no active zones are found, return mock data for demonstration
    if (zones.length === 0) {
      console.log(
        "📍 No active relief pools mapped to zones, showing mock disaster zones"
      );
      return BASE_DISASTER_ZONES;
    }

    return zones;
  }, [reliefPools, loading, error]);

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
    const timers = arcCleanupTimers.current;
    return () => {
      timers.forEach((timer) => {
        clearTimeout(timer);
      });
      timers.clear();
    };
  }, []);

  // Initialize zone metrics
  useEffect(() => {
    const initialMetrics: Record<
      string,
      { donated: number; claimed: number; donors: number }
    > = {};

    activeDisasterZones.forEach((zone) => {
      initialMetrics[zone.properties.name] = calculateZoneMetrics(
        zone,
        donationMades,
        fundsClaimeds
      );
    });
    setZoneMetrics(initialMetrics);
  }, [activeDisasterZones, donationMades, fundsClaimeds]);

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
  const simulateDonation = useCallback(
    (
      startLat?: number,
      startLng?: number,
      targetZone?: DisasterZoneFeature
    ) => {
      const newArc = generateDonationArc(
        startLat,
        startLng,
        targetZone,
        activeDisasterZones
      );

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
    },
    [arcIds, activeDisasterZones]
  );

  // Auto-generate donations every few seconds
  useEffect(() => {
    const interval = setInterval(
      () => {
        // Generate 1-5 random donations
        const numDonations = Math.floor(Math.random() * 5) + 1;

        for (let i = 0; i < numDonations; i++) {
          // Small delay between each donation for visual effect
          setTimeout(() => {
            simulateDonation();

            // Zone metrics are now calculated from real GraphQL data only
          }, i * 200);
        }
      },
      3000 + Math.random() * 2000
    ); // Every 3-5 seconds randomly

    return () => clearInterval(interval);
  }, [zoneMetrics, simulateDonation]);

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
        const donationHistory = generateRealDonationHistory(
          zone,
          donationMades
        );
        setDonationHistoryArcs(donationHistory);
      }
    }
  };

  const handleDonate = () => {
    if (popup?.zone) {
      if (!authenticated || wallets.length === 0) {
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
      if (!authenticated || wallets.length === 0) {
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
    // setIdentityVerificationOpen(false);
    // Just close the modal - no redirect needed
    // Future: handle claim modal based on query parameters
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
          setCurrentHoveredZone(null);
          setDonationHistoryArcs([]);
          setHoveredDonationId(null);
        }
      }}
    >
      {/* Top Centered Section */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-9">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl px-12 py-6 border border-slate-600">
          <div className="flex items-center space-x-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Open Relief"
              className="w-15 h-15"
              width={60}
              height={60}
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Open Relief</h1>
              <p className="text-base text-slate-300">
                Live disaster relief donations worldwide
              </p>
            </div>
          </div>
        </div>
      </div>

      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,1)"
        backgroundImageUrl={null}
        showGlobe={true}
        showAtmosphere={false}
        atmosphereColor="rgba(100, 116, 139, 0.1)"
        atmosphereAltitude={0.1}
        // Disaster zones as GeoJSON features
        polygonsData={activeDisasterZones}
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
        polygonLabel={(d: any) => {
          const zoneName = d.properties?.name || "Unknown";
          const reliefPool = d.properties?.reliefPool;
          let allocatedFunds = null;

          if (reliefPool?.allocatedFundsPerPerson) {
            // Use raw amount without conversion
            allocatedFunds = reliefPool.allocatedFundsPerPerson;
          }

          return `
            <div style="
              background: rgba(30, 41, 59, 0.95);
              color: white;
              padding: 12px;
              border-radius: 8px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
              border: 1px solid rgba(71, 85, 105, 0.5);
              font-family: sans-serif;
              max-width: 250px;
            ">
              <div style="font-weight: 600; color: #fb923c; margin-bottom: 8px;">
                ${zoneName}
              </div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">
                ${d.properties?.description || "No description"}
              </div>
              ${
                allocatedFunds
                  ? `
              <div style="font-size: 12px; color: #22c55e; margin-bottom: 8px; font-weight: 500;">
                💰 ${allocatedFunds} USDC per person
              </div>
              `
                  : ""
              }
              <div style="margin-bottom: 8px; font-size: 11px; color: #cbd5e1;">
                Click to view more information, donate, or claim aid.
              </div>
              <div style="font-size: 11px; color: #ef4444;">
                ${d.properties?.disasterType || "Unknown"} - ${d.properties?.severity || "Unknown"} severity
              </div>
            </div>
          `;
        }}
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
              // Clear previous zone's donation highlighting
              setHoveredDonationId(null);

              setCurrentHoveredZone(zone);
              const donationHistory = generateRealDonationHistory(
                zone,
                donationMades
              );
              setDonationHistoryArcs(donationHistory);
            }
          } else if (!polygon && currentHoveredZone && !popup) {
            // Clear donation history arcs when hovering off polygon, unless popup is open
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
              return arc;
            }),
          ];
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

            {/* Allocated Funds Per Person */}
            {(() => {
              const reliefPool = popup.zone.properties.reliefPool;
              if (!reliefPool?.allocatedFundsPerPerson) return null;

              // Use raw amount without conversion
              const allocatedFunds = reliefPool.allocatedFundsPerPerson;

              return (
                <div className="bg-green-900/30 rounded p-3 mb-4">
                  <div className="text-xs text-green-400 mb-1">
                    Aid Allocation
                  </div>
                  <div className="text-lg font-bold text-green-300">
                    {allocatedFunds} USDC per person
                  </div>
                </div>
              );
            })()}

            {/* Zone Metrics */}
            {(() => {
              const currentMetrics = zoneMetrics[popup.zone.properties.name];
              if (!currentMetrics) return null;

              return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-green-900/30 rounded p-2 text-center">
                    <div className="text-xs text-green-400">Donated</div>
                    <div className="text-sm font-bold text-green-300">
                      {currentMetrics.donated.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-900/30 rounded p-2 text-center">
                    <div className="text-xs text-blue-400">Claimed</div>
                    <div className="text-sm font-bold text-blue-300">
                      {currentMetrics.claimed.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-orange-900/30 rounded p-2 text-center">
                    <div className="text-xs text-orange-400">Donors</div>
                    <div className="text-sm font-bold text-orange-300">
                      {currentMetrics.donors.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })()}

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
