// File: src/utils/supabaseClient.js

import { createClient } from "@supabase/supabase-js";

// Replace with your Supabase URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "Defined" : "Undefined");
console.log("Supabase Anon Key:", supabaseAnonKey ? "Defined" : "Undefined");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Check your .env file."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test Supabase connection
const testConnection = async () => {
  try {
    // Use a simple query instead of an aggregate function
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .limit(1);
    if (error) {
      console.error("Supabase connection error:", error);
      return false;
    }
    console.log("Supabase connection successful. Retrieved sample data:", data);
    return true;
  } catch (err) {
    console.error("Exception testing Supabase connection:", err);
    return false;
  }
};

// Call the test on client init
testConnection();

// Check authentication status
const checkAuth = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Auth check error:", error);
    return false;
  }
  console.log(
    "Auth session check:",
    data.session ? "Authenticated" : "Not authenticated"
  );
  return !!data.session;
};

// Call the auth check
checkAuth();

export default supabase;
