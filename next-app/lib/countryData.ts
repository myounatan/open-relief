// Country boundary data for disaster zones
export interface CountryData {
  id: string;
  name: string;
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    name: string;
    description: string;
    urgency: string;
  };
  center: [number, number];
  color: string;
  altitude: number;
  description: string;
  urgency: string;
}

// Simplified but more realistic country boundaries
export const DISASTER_ZONES: CountryData[] = [
  {
    id: "haiti",
    name: "Haiti",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-74.478, 18.042],
          [-74.359, 18.667],
          [-73.449, 19.645],
          [-72.334, 19.915],
          [-71.712, 19.714],
          [-71.587, 19.312],
          [-71.708, 18.785],
          [-71.945, 18.616],
          [-72.273, 18.508],
          [-72.57, 18.19],
          [-72.844, 18.143],
          [-73.454, 18.218],
          [-73.922, 18.03],
          [-74.478, 18.042],
        ],
      ],
    },
    properties: {
      name: "Haiti",
      description: "Earthquake Recovery Aid",
      urgency: "Critical",
    },
    center: [-72.285, 18.971],
    color: "rgba(255, 50, 50, 0.7)",
    altitude: 0.015,
    description: "Earthquake Recovery Aid",
    urgency: "Critical",
  },
  {
    id: "philippines",
    name: "Philippines",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [119.5, 4.5],
          [119.5, 8.0],
          [120.0, 10.0],
          [121.0, 11.5],
          [122.0, 13.0],
          [123.5, 13.5],
          [124.0, 12.0],
          [125.0, 11.0],
          [126.0, 9.0],
          [126.5, 7.0],
          [125.5, 6.0],
          [124.0, 4.5],
          [122.5, 4.0],
          [121.0, 4.2],
          [119.5, 4.5],
        ],
      ],
    },
    properties: {
      name: "Philippines",
      description: "Typhoon Relief",
      urgency: "High",
    },
    center: [121.0, 12.8],
    color: "rgba(255, 100, 50, 0.7)",
    altitude: 0.015,
    description: "Typhoon Relief",
    urgency: "High",
  },
  {
    id: "turkey",
    name: "Turkey",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [26.0, 35.8],
          [28.0, 36.0],
          [31.0, 36.2],
          [33.0, 36.0],
          [35.0, 36.1],
          [36.0, 35.8],
          [38.0, 36.9],
          [40.0, 37.0],
          [42.0, 37.5],
          [44.0, 39.0],
          [42.0, 41.0],
          [40.0, 42.0],
          [38.0, 41.5],
          [36.0, 41.2],
          [34.0, 41.0],
          [32.0, 40.8],
          [30.0, 40.5],
          [28.0, 40.2],
          [26.0, 40.0],
          [26.0, 35.8],
        ],
      ],
    },
    properties: {
      name: "Turkey",
      description: "Earthquake Emergency Aid",
      urgency: "Critical",
    },
    center: [35.0, 38.5],
    color: "rgba(255, 120, 50, 0.7)",
    altitude: 0.015,
    description: "Earthquake Emergency Aid",
    urgency: "Critical",
  },
  {
    id: "ukraine",
    name: "Ukraine",
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [22.0, 48.0],
          [24.0, 48.2],
          [26.0, 48.0],
          [28.0, 48.5],
          [30.0, 48.2],
          [32.0, 48.0],
          [34.0, 48.5],
          [36.0, 49.0],
          [38.0, 49.2],
          [40.0, 49.5],
          [40.0, 50.5],
          [38.0, 51.0],
          [36.0, 51.2],
          [34.0, 51.5],
          [32.0, 51.2],
          [30.0, 51.0],
          [28.0, 50.8],
          [26.0, 50.5],
          [24.0, 50.2],
          [22.0, 49.8],
          [22.0, 48.0],
        ],
      ],
    },
    properties: {
      name: "Ukraine",
      description: "Humanitarian Crisis Support",
      urgency: "Critical",
    },
    center: [31.0, 49.0],
    color: "rgba(255, 150, 50, 0.7)",
    altitude: 0.015,
    description: "Humanitarian Crisis Support",
    urgency: "Critical",
  },
];
