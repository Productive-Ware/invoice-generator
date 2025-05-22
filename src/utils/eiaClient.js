// File: src/utils/eiaClient.js

/**
 * Utility functions for interacting with the U.S. Energy Information Administration (EIA) API
 */

const EIA_API_KEY = import.meta.env.VITE_EIA_API_KEY;
const EIA_BASE_URL = "https://api.eia.gov/v2";

/**
 * Get the latest diesel price (national average)
 * @returns {Promise<number>} The latest diesel price per gallon
 */
export async function getLatestDieselPrice() {
  try {
    // Endpoint for weekly retail diesel prices (national average)
    const response = await fetch(
      `${EIA_BASE_URL}/petroleum/pri/gnd/data/?api_key=${EIA_API_KEY}&frequency=weekly&data[0]=value&facets[series][]=EMD_EPD2D_PTE_NUS_DPG`
    );

    if (!response.ok) {
      throw new Error(`EIA API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract the latest price from the response
    if (
      data &&
      data.response &&
      data.response.data &&
      data.response.data.length > 0
    ) {
      // Sort by period (date) to get the most recent
      const sortedData = [...data.response.data].sort(
        (a, b) => new Date(b.period) - new Date(a.period)
      );

      // Return the most recent price
      return parseFloat(sortedData[0].value);
    }

    // Fallback to a reasonable default if we can't get the data
    console.warn(
      "Could not retrieve diesel price from EIA API, using fallback price"
    );
    return 3.85; // Fallback price as of May 2025
  } catch (error) {
    console.error("Error fetching diesel price from EIA:", error);
    return 3.85; // Fallback price
  }
}

/**
 * Calculate estimated diesel cost based on distance
 * @param {number} distanceInMiles - The distance in miles
 * @param {number} [milesPerGallon=6.5] - Average MPG for commercial trucks
 * @param {number} [dieselPrice] - Price per gallon (optional, will fetch if not provided)
 * @returns {Promise<{gallons: number, cost: number, pricePerGallon: number}>}
 */
export async function calculateDieselCost(
  distanceInMiles,
  milesPerGallon = 6.5,
  dieselPrice = null
) {
  try {
    // Convert distance to number if it's a string
    distanceInMiles =
      typeof distanceInMiles === "string"
        ? parseFloat(distanceInMiles.replace(/,/g, ""))
        : distanceInMiles;

    // If no distance, return null
    if (!distanceInMiles || isNaN(distanceInMiles)) {
      return null;
    }

    // Get the diesel price if not provided
    const pricePerGallon = dieselPrice || (await getLatestDieselPrice());

    // Calculate gallons needed
    const gallonsNeeded = distanceInMiles / milesPerGallon;

    // Calculate total cost
    const totalCost = gallonsNeeded * pricePerGallon;

    return {
      gallons: parseFloat(gallonsNeeded.toFixed(2)),
      cost: parseFloat(totalCost.toFixed(2)),
      pricePerGallon: parseFloat(pricePerGallon.toFixed(3)),
    };
  } catch (error) {
    console.error("Error calculating diesel cost:", error);
    return null;
  }
}

/**
 * Cache for diesel prices to avoid excessive API calls
 */
let cachedDieselPrice = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get the diesel price, using cache if available and not expired
 * @returns {Promise<number>} The diesel price per gallon
 */
export async function getDieselPriceWithCache() {
  // Check if we have a cached price that's still valid
  const now = new Date().getTime();
  if (
    cachedDieselPrice !== null &&
    cacheTimestamp !== null &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return cachedDieselPrice;
  }

  // Otherwise fetch a new price
  const price = await getLatestDieselPrice();

  // Update the cache
  cachedDieselPrice = price;
  cacheTimestamp = now;

  return price;
}
