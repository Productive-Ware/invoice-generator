// File: src/utils/invoiceNumberGenerator.js

import supabase from "./supabaseClient";

/**
 * Generates a unique invoice number using the server-side database function
 * Format: INV-YYYY-MM-DD-clientshortname-000
 *
 * @param {string} clientId - The UUID of the client
 * @returns {Promise<{ invoiceNumber: string, error: Error | null }>}
 */
export async function generateInvoiceNumber(clientId) {
  try {
    if (!clientId) {
      throw new Error("Client ID is required to generate an invoice number");
    }

    // Call the database function with the correct parameter name
    const { data, error } = await supabase.rpc("generate_invoice_number", {
      client_id: clientId, // Make sure this matches the SQL function parameter name
    });

    if (error) {
      console.error("RPC Error:", error);
      throw error;
    }

    if (!data) {
      console.error("No data returned from RPC call");
      throw new Error("Failed to generate invoice number: No data returned");
    }

    return { invoiceNumber: data, error: null };
  } catch (error) {
    console.error("Error generating invoice number:", error);

    // Create a fallback invoice number if the server function fails
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    const fallbackNum = `INV-${year}-${month}-${day}-fallback-${timestamp}`;

    return {
      invoiceNumber: fallbackNum,
      error,
    };
  }
}

/**
 * Generates a placeholder invoice number when no client is selected
 *
 * @returns {string} A placeholder invoice number
 */
export function generatePlaceholderInvoiceNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `INV-${year}-${month}-${day}-select-client-000`;
}
