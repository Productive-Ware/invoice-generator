// File: src/components/ui/address-autocomplete.jsx

// File: src/components/ui/address-autocomplete.jsx

import { useEffect, useRef, useState } from "react";
import { Input } from "./input";
// Import removed temporarily - we'll implement locally first to debug

// Singleton to track API loading status
const googleMapsState = {
  isLoading: false,
  isLoaded: false,
  callbacks: [],
};

// Helper function to load Google Maps API once
const loadGoogleMapsApi = () => {
  if (googleMapsState.isLoaded) {
    return Promise.resolve();
  }

  if (googleMapsState.isLoading) {
    return new Promise((resolve) => {
      googleMapsState.callbacks.push(resolve);
    });
  }

  googleMapsState.isLoading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    }&libraries=places`;
    script.async = true;

    script.onload = () => {
      googleMapsState.isLoaded = true;
      googleMapsState.isLoading = false;
      googleMapsState.callbacks.forEach((cb) => cb());
      googleMapsState.callbacks = [];
      resolve();
    };

    script.onerror = (error) => {
      googleMapsState.isLoading = false;
      reject(error);
    };

    document.head.appendChild(script);
  });
};

// Temporarily define the calculateDieselCost function here for debugging
async function calculateDieselCost(
  distanceInMiles,
  milesPerGallon = 6.5,
  dieselPrice = 3.85
) {
  try {
    console.log("calculateDieselCost called with distance:", distanceInMiles);

    // Convert distance to number if it's a string
    distanceInMiles =
      typeof distanceInMiles === "string"
        ? parseFloat(distanceInMiles.replace(/,/g, ""))
        : distanceInMiles;

    // If no distance, return null
    if (!distanceInMiles || isNaN(distanceInMiles)) {
      console.log("Invalid distance, returning null");
      return null;
    }

    // Calculate gallons needed
    const gallonsNeeded = distanceInMiles / milesPerGallon;

    // Calculate total cost
    const totalCost = gallonsNeeded * dieselPrice;

    const result = {
      gallons: parseFloat(gallonsNeeded.toFixed(2)),
      cost: parseFloat(totalCost.toFixed(2)),
      pricePerGallon: parseFloat(dieselPrice.toFixed(3)),
    };

    console.log("Diesel calculation result:", result);
    return result;
  } catch (error) {
    console.error("Error in local calculateDieselCost:", error);
    return null;
  }
}

// Function to calculate distance between two addresses
export const calculateDistance = async (origin, destination) => {
  if (!origin || !destination) {
    return null;
  }

  // Check if address is too short/incomplete
  if (origin.length < 5 || destination.length < 5) {
    return null; // Skip calculation for partial addresses
  }

  try {
    await loadGoogleMapsApi();

    return new Promise((resolve, reject) => {
      const distanceMatrixService =
        new window.google.maps.DistanceMatrixService();

      distanceMatrixService.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: "DRIVING",
          unitSystem: window.google.maps.UnitSystem.IMPERIAL, // Use IMPERIAL for miles or METRIC for kilometers
        },
        async (response, status) => {
          if (status === "OK") {
            try {
              // Add defensive checks for the response structure
              if (
                !response.rows ||
                !response.rows[0] ||
                !response.rows[0].elements ||
                !response.rows[0].elements[0]
              ) {
                throw new Error(
                  "Invalid response structure from Distance Matrix API"
                );
              }

              const element = response.rows[0].elements[0];

              // Check if the status of the individual element is OK
              if (element.status !== "OK") {
                throw new Error(`Route calculation failed: ${element.status}`);
              }

              const distanceElement = element.distance;
              const durationElement = element.duration;

              // Extract distance in miles from text (remove " mi")
              let distanceInMiles = 0;
              if (distanceElement && distanceElement.text) {
                distanceInMiles = parseFloat(
                  distanceElement.text.replace(" mi", "").replace(",", "")
                );
              } else if (distanceElement && distanceElement.value) {
                // Fallback to using the value in meters and convert to miles
                distanceInMiles = distanceElement.value / 1609.34;
              }

              // Calculate diesel cost using local function
              let dieselEstimate = null;
              try {
                dieselEstimate = await calculateDieselCost(distanceInMiles);
                console.log("Diesel estimate result:", dieselEstimate);
              } catch (error) {
                console.error("Error calculating diesel cost:", error);
                // Continue without diesel cost if there's an error
              }

              const result = {
                distance: distanceElement,
                duration: durationElement,
                status: element.status,
                fuelEstimate: dieselEstimate,
              };

              resolve(result);
            } catch (error) {
              console.error(
                "Error processing distance matrix response:",
                error
              );
              reject(error);
            }
          } else {
            reject(new Error(`Distance calculation failed: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
};

const AddressAutocomplete = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Enter address",
  className = "",
  id,
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        await loadGoogleMapsApi();
        setIsApiLoaded(true);

        if (inputRef.current && window.google && !autocompleteRef.current) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              types: ["address"],
              componentRestrictions: { country: "us" },
              fields: ["formatted_address"],
            }
          );

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current.getPlace();
            if (place.formatted_address) {
              onChange(place.formatted_address);
            }
          });
        }
      } catch (error) {
        console.error("Error initializing Google Maps:", error);
      }
    };

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Always use the value prop, never local state
  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value || ""}
      onChange={handleInputChange}
      disabled={disabled || !isApiLoaded}
      placeholder={!isApiLoaded ? "Loading..." : placeholder}
      className={className}
      autoComplete="off"
    />
  );
};

export default AddressAutocomplete;
