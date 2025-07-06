import { NextApiRequest, NextApiResponse } from "next";

interface GeocodeResponse {
  city: string;
  country: string;
  formattedAddress: string;
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      city: "",
      country: "",
      formattedAddress: "",
      success: false,
      error: "Method not allowed",
    });
  }

  const { lat, lng } = req.query;

  // Validate coordinates
  if (!lat || !lng) {
    return res.status(400).json({
      city: "",
      country: "",
      formattedAddress: "",
      success: false,
      error: "Missing lat or lng parameters",
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      city: "",
      country: "",
      formattedAddress: "",
      success: false,
      error: "Invalid lat or lng parameters",
    });
  }

  // Check for API key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      city: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      country: "Unknown",
      formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      success: false,
      error: "Google Maps API key not configured",
    });
  }

  try {
    // First try: Places API Nearby Search for localities
    const radius = 50000; // 50km radius
    const nearbyResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=locality&key=${apiKey}`
    );

    if (!nearbyResponse.ok) {
      throw new Error(`Nearby search failed: ${nearbyResponse.status}`);
    }

    const nearbyData = await nearbyResponse.json();

    if (nearbyData.status === "OK" && nearbyData.results.length > 0) {
      const place = nearbyData.results[0];

      if (place.types.includes("locality")) {
        return res.status(200).json({
          city: place.name,
          country: "Unknown", // Nearby search doesn't include country directly
          formattedAddress: place.vicinity || place.name,
          success: true,
        });
      }
    }

    // Second try: Places API Text Search
    const textSearchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${latitude},${longitude}&key=${apiKey}`
    );

    if (!textSearchResponse.ok) {
      throw new Error(`Text search failed: ${textSearchResponse.status}`);
    }

    const textSearchData = await textSearchResponse.json();

    if (textSearchData.status === "OK" && textSearchData.results.length > 0) {
      const place = textSearchData.results[0];

      // Extract city name from the place name or formatted address
      let cityName = place.name;
      let country = "Unknown";

      // Try to parse the formatted address for better city/country info
      if (place.formatted_address) {
        const addressParts = place.formatted_address.split(", ");
        if (addressParts.length >= 2) {
          cityName = addressParts[0];
          country = addressParts[addressParts.length - 1];
        }
      }

      return res.status(200).json({
        city: cityName,
        country: country,
        formattedAddress: place.formatted_address || place.name,
        success: true,
      });
    }

    // If both methods fail, return coordinates
    return res.status(200).json({
      city: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      country: "Unknown",
      formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      success: false,
      error: "No places found",
    });
  } catch (error) {
    console.error("Places API error:", error);

    // Return fallback coordinates
    return res.status(200).json({
      city: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      country: "Unknown",
      formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
