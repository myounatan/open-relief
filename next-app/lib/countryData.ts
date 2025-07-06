// Country boundary data for disaster zones
export interface CountryData {
  id: string;
  name: string;
  coordinates: number[][];
  center: [number, number];
  color: string;
  altitude: number;
  description: string;
  urgency: string;
}

// Relief pool data from GraphQL
export interface ReliefPoolData {
  id: string;
  poolId: string;
  disasterType: number;
  classification: number;
  nationalityRequired: string;
  allocatedFundsPerPerson: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

// Disaster type enum mapping (from smart contract)
export enum DisasterTypeEnum {
  Earthquake = 0,
  Flood = 1,
  Wildfire = 2,
  Warzone = 3,
}

// Function to get disaster zone ID from relief pool data
export const getDisasterZoneId = (
  reliefPool: ReliefPoolData
): string | null => {
  // The poolId directly matches our zone IDs
  return reliefPool.poolId;
};

// Function to get disaster type string from enum
export const getDisasterTypeString = (disasterType: number): string => {
  switch (disasterType) {
    case DisasterTypeEnum.Earthquake:
      return "earthquake";
    case DisasterTypeEnum.Flood:
      return "flood";
    case DisasterTypeEnum.Wildfire:
      return "fire";
    case DisasterTypeEnum.Warzone:
      return "war";
    default:
      return "unknown";
  }
};

// GeoJSON Feature structure for disaster zones
export interface DisasterZoneFeature {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    description: string;
    disasterType:
      | "earthquake"
      | "flood"
      | "fire"
      | "typhoon"
      | "hurricane"
      | "war";
    severity: "high" | "medium" | "low";
    color: string;
    altitude: number;
    // Add blockchain data
    poolId?: string;
    reliefPool?: ReliefPoolData;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

// Color assignment function based on disaster type and severity
export const getDisasterColor = (
  type: "earthquake" | "flood" | "fire" | "typhoon" | "hurricane" | "war",
  severity: "high" | "medium" | "low"
): string => {
  switch (type) {
    case "war":
      switch (severity) {
        case "high":
          return "#dc2626"; // Dark red
        case "medium":
          return "#ef4444"; // Medium red
        case "low":
          return "#f87171"; // Light red
        default:
          return "#dc2626";
      }
    case "earthquake":
      switch (severity) {
        case "high":
          return "#ea580c"; // Dark orange
        case "medium":
          return "#f97316"; // Medium orange
        case "low":
          return "#fb923c"; // Light orange-yellow
        default:
          return "#ea580c";
      }
    case "flood":
      switch (severity) {
        case "high":
          return "#1d4ed8"; // Dark blue
        case "medium":
          return "#3b82f6"; // Medium blue
        case "low":
          return "#60a5fa"; // Light blue
        default:
          return "#1d4ed8";
      }
    case "fire":
      switch (severity) {
        case "high":
          return "#ea580c"; // Dark orange
        case "medium":
          return "#f97316"; // Medium orange
        case "low":
          return "#fb923c"; // Light orange-yellow
        default:
          return "#ea580c";
      }
    case "typhoon":
    case "hurricane":
      switch (severity) {
        case "high":
          return "#7c3aed"; // Dark purple
        case "medium":
          return "#8b5cf6"; // Medium purple
        case "low":
          return "#a78bfa"; // Light purple
        default:
          return "#7c3aed";
      }
    default:
      return "#6b7280"; // Gray fallback
  }
};

// Base disaster zones with accurate coordinates
export const BASE_DISASTER_ZONES: DisasterZoneFeature[] = [
  {
    type: "Feature",
    properties: {
      id: "haiti",
      name: "Haiti",
      description: "Earthquake Recovery Aid",
      disasterType: "earthquake",
      severity: "high",
      color: getDisasterColor("earthquake", "high"),
      altitude: 0.03,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-71.712361, 19.714456],
          [-71.624873, 19.169838],
          [-71.701303, 18.785417],
          [-71.945112, 18.6169],
          [-71.687738, 18.31666],
          [-71.708305, 18.044997],
          [-72.372476, 18.214961],
          [-72.844411, 18.145611],
          [-73.454555, 18.217906],
          [-73.922433, 18.030993],
          [-74.458034, 18.34255],
          [-74.369925, 18.664908],
          [-73.449542, 18.526053],
          [-72.694937, 18.445799],
          [-72.334882, 18.668422],
          [-72.79165, 19.101625],
          [-72.784105, 19.483591],
          [-73.415022, 19.639551],
          [-73.189791, 19.915684],
          [-72.579673, 19.871501],
          [-71.712361, 19.714456],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      id: "philippines",
      name: "Philippines (Luzon)",
      description: "Typhoon Relief",
      disasterType: "typhoon",
      severity: "high",
      color: getDisasterColor("typhoon", "high"),
      altitude: 0.03,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [121.321308, 18.504065],
          [121.937601, 18.218552],
          [122.246006, 18.47895],
          [122.336957, 18.224883],
          [122.174279, 17.810283],
          [121.739091, 17.496051],
          [121.739091, 17.01287],
          [122.25747, 16.226551],
          [122.706032, 15.937671],
          [123.072498, 15.70669],
          [123.072498, 15.226872],
          [122.880127, 14.867804],
          [122.880127, 14.417936],
          [122.519287, 14.2],
          [121.50806, 14.05542],
          [121.014404, 14.273882],
          [120.695801, 14.273882],
          [120.2969, 14.748208],
          [120.0, 15.5],
          [119.921265, 16.0],
          [120.296326, 16.5],
          [120.296326, 17.0],
          [120.8, 17.5],
          [121.321308, 18.504065],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      id: "turkey",
      name: "Turkey (Southern Region)",
      description: "Flood Emergency Aid",
      disasterType: "flood",
      severity: "high",
      color: getDisasterColor("flood", "high"),
      altitude: 0.03,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [35.782085, 36.274995],
          [36.160822, 36.650606],
          [35.550936, 36.565443],
          [34.714553, 36.795532],
          [34.026895, 36.21996],
          [32.509158, 36.107564],
          [31.699595, 36.644275],
          [30.621625, 36.677865],
          [30.391096, 36.262981],
          [29.699976, 36.144357],
          [28.732903, 36.676831],
          [27.641187, 36.658822],
          [27.048768, 37.653361],
          [26.318218, 38.208133],
          [26.8047, 38.98576],
          [26.170785, 39.463612],
          [27.28002, 40.420014],
          [28.819978, 40.460011],
          [29.240004, 41.219991],
          [31.145934, 41.087622],
          [32.347979, 41.736264],
          [33.513283, 42.01896],
          [35.167704, 42.040225],
          [36.913127, 41.335358],
          [38.347665, 40.948586],
          [39.512607, 41.102763],
          [40.373433, 41.013673],
          [41.554084, 41.535656],
          [42.619549, 41.583173],
          [43.582746, 41.092143],
          [43.752658, 40.740201],
          [43.656436, 40.253564],
          [44.400009, 40.005],
          [44.79399, 39.713003],
          [44.109225, 39.428136],
          [44.421403, 38.281281],
          [44.225756, 37.971584],
          [44.77267, 37.17045],
          [44.293452, 37.001514],
          [43.942259, 37.256228],
          [42.779126, 37.385264],
          [42.349591, 37.229873],
          [41.212089, 37.074352],
          [40.673259, 37.091276],
          [39.52258, 36.716054],
          [38.699891, 36.712927],
          [38.167727, 36.90121],
          [37.066761, 36.623036],
          [36.739494, 36.81752],
          [36.685389, 36.259699],
          [36.41755, 36.040617],
          [36.149763, 35.821535],
          [35.782085, 36.274995],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      id: "ukraine",
      name: "Ukraine (Eastern Region)",
      description: "Humanitarian Crisis Support",
      disasterType: "war",
      severity: "high",
      color: getDisasterColor("war", "high"),
      altitude: 0.03,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [40.06904, 49.60105],
          [40.080789, 49.30743],
          [39.67465, 48.78382],
          [39.89562, 48.23241],
          [39.738278, 47.898937],
          [38.77057, 47.82562],
          [38.255112, 47.5464],
          [38.223538, 47.10219],
          [37.425137, 47.022221],
          [36.759855, 46.6987],
          [35.823685, 46.645964],
          [34.962342, 46.273197],
          [35.012659, 45.737725],
          [34.861792, 45.768182],
          [34.732017, 45.965666],
          [34.410402, 46.005162],
          [33.699462, 46.219573],
          [33.435988, 45.971917],
          [33.298567, 46.080598],
          [31.74414, 46.333348],
          [31.675307, 46.706245],
          [30.748749, 46.5831],
          [30.377609, 46.03241],
          [29.603289, 45.293308],
          [29.149725, 45.464925],
          [28.679779, 45.304031],
          [28.233554, 45.488283],
          [28.485269, 45.596907],
          [28.659987, 45.939987],
          [28.933717, 46.25883],
          [28.862972, 46.437889],
          [29.072107, 46.517678],
          [29.170654, 46.379262],
          [29.759972, 46.349988],
          [30.024659, 46.423937],
          [29.83821, 46.525326],
          [29.908852, 46.674361],
          [29.559674, 46.928583],
          [29.415135, 47.346645],
          [29.050868, 47.510227],
          [29.122698, 47.849095],
          [28.670891, 48.118149],
          [28.259547, 48.155562],
          [27.522537, 48.467119],
          [26.857824, 48.368211],
          [26.619337, 48.220726],
          [26.19745, 48.220881],
          [25.945941, 47.987149],
          [25.207743, 47.891056],
          [24.866317, 47.737526],
          [24.402056, 47.981878],
          [23.760958, 47.985598],
          [23.142236, 48.096341],
          [22.710531, 47.882194],
          [22.64082, 48.15024],
          [22.085608, 48.422264],
          [22.280842, 48.825392],
          [22.558138, 49.085738],
          [22.776419, 49.027395],
          [22.51845, 49.476774],
          [23.426508, 50.308506],
          [23.922757, 50.424881],
          [24.029986, 50.705407],
          [23.527071, 51.578454],
          [24.005078, 51.617444],
          [24.553106, 51.888461],
          [25.327788, 51.910656],
          [26.337959, 51.832289],
          [27.454066, 51.592303],
          [28.241615, 51.572227],
          [28.617613, 51.427714],
          [28.992835, 51.602044],
          [29.254938, 51.368234],
          [30.157364, 51.416138],
          [30.555117, 51.319503],
          [30.619454, 51.822806],
          [30.927549, 52.042353],
          [31.785992, 52.101678],
          [32.15944, 52.06125],
          [32.412058, 52.288695],
          [32.715761, 52.238465],
          [33.7527, 52.335075],
          [34.391731, 51.768882],
          [34.141978, 51.566413],
          [34.224816, 51.255993],
          [35.022183, 51.207572],
          [35.37791, 50.77394],
          [35.356116, 50.577197],
          [36.626168, 50.225591],
          [37.39346, 50.383953],
          [38.010631, 49.915662],
          [38.594988, 49.926462],
          [40.06904, 49.60105],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      id: "france",
      name: "France",
      description: "Wildfire Emergency Relief",
      disasterType: "fire",
      severity: "high",
      color: getDisasterColor("fire", "high"),
      altitude: 0.03,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [2.513573, 51.148506],
          [2.658422, 50.796848],
          [3.123252, 50.780363],
          [3.588184, 50.378992],
          [4.286023, 49.907497],
          [4.799222, 49.985373],
          [5.674052, 49.529484],
          [5.897759, 49.442667],
          [6.18632, 49.463803],
          [6.65823, 49.201958],
          [8.099279, 49.017784],
          [7.593676, 48.333019],
          [7.466759, 47.620582],
          [7.192202, 47.449766],
          [6.736571, 47.541801],
          [6.768714, 47.287708],
          [6.037389, 46.725779],
          [6.022609, 46.27299],
          [6.5001, 46.429673],
          [6.843593, 45.991147],
          [6.802355, 45.70858],
          [7.096652, 45.333099],
          [6.749955, 45.028518],
          [7.007562, 44.254767],
          [7.549596, 44.127901],
          [7.435185, 43.693845],
          [6.529245, 43.128892],
          [4.556963, 43.399651],
          [3.100411, 43.075201],
          [2.985999, 42.473015],
          [1.826793, 42.343385],
          [0.701591, 42.795734],
          [0.338047, 42.579546],
          [-1.502771, 43.034014],
          [-1.901351, 43.422802],
          [-1.384225, 44.02261],
          [-1.193798, 46.014918],
          [-2.225724, 47.064363],
          [-2.963276, 47.570327],
          [-4.491555, 47.954954],
          [-4.59235, 48.68416],
          [-3.295814, 48.901692],
          [-1.616511, 48.644421],
          [-1.933494, 49.776342],
          [-0.989469, 49.347376],
          [1.338761, 50.127173],
          [1.639001, 50.946606],
          [2.513573, 51.148506],
        ],
      ],
    },
  },
];

// Function to get active disaster zones based on relief pool data
export const getActiveDisasterZones = (
  reliefPools: ReliefPoolData[]
): DisasterZoneFeature[] => {
  if (!reliefPools || reliefPools.length === 0) {
    console.log("📍 No relief pools provided");
    return [];
  }

  const activeZones: DisasterZoneFeature[] = [];
  let unmatchedPools = 0;

  reliefPools.forEach((pool) => {
    const zoneId = getDisasterZoneId(pool);
    if (!zoneId) {
      unmatchedPools++;
      console.warn("⚠️ Relief pool could not be mapped to a zone:", {
        poolId: pool.poolId,
        disasterType: pool.disasterType,
        nationality: pool.nationalityRequired,
      });
      return;
    }

    const baseZone = BASE_DISASTER_ZONES.find(
      (zone) => zone.properties.id === zoneId
    );
    if (!baseZone) {
      unmatchedPools++;
      console.warn("⚠️ Zone not found in BASE_DISASTER_ZONES:", zoneId);
      return;
    }

    // Create a copy of the zone with relief pool data
    const activeZone: DisasterZoneFeature = {
      ...baseZone,
      properties: {
        ...baseZone.properties,
        // Update disaster type based on blockchain data
        disasterType: getDisasterTypeString(pool.disasterType) as any,
        color: getDisasterColor(
          getDisasterTypeString(pool.disasterType) as any,
          "high"
        ),
        poolId: pool.poolId,
        reliefPool: pool,
      },
    };

    activeZones.push(activeZone);
  });

  if (unmatchedPools > 0) {
    console.log(
      `📍 ${unmatchedPools} relief pools could not be mapped to zones`
    );
  }

  console.log(
    `📍 Active disaster zones: ${activeZones.length}/${reliefPools.length} pools mapped`
  );
  return activeZones;
};

// Backward compatibility - this will be replaced by getActiveDisasterZones
export const DISASTER_ZONES = BASE_DISASTER_ZONES;

// Helper function to get center coordinates from a polygon
export const getPolygonCenter = (
  feature: DisasterZoneFeature
): [number, number] => {
  const coords = feature.geometry.coordinates[0];
  if (!coords || coords.length === 0) {
    return [0, 0];
  }
  const lngSum = coords.reduce((sum, coord) => sum + (coord?.[0] || 0), 0);
  const latSum = coords.reduce((sum, coord) => sum + (coord?.[1] || 0), 0);
  return [lngSum / coords.length, latSum / coords.length];
};
