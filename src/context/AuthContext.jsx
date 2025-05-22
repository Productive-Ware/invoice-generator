// File: src/context/AuthContext.jsx

import { INVOICE_CHANGE_TYPES, logUserAction } from "@/utils/logUtils";
import supabase from "@/utils/supabaseClient";
import { createContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);

      // Fetch user profile if authenticated
      if (data.session?.user) {
        await fetchUserProfile(data.session.user.id);
      }

      setLoading(false);

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setUser(session?.user || null);

        // Fetch profile when auth state changes
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Exception fetching profile:", error.message);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error logging in:", error.message);
      return { data: null, error };
    }
  };

  const logout = async () => {
    try {
      // Log the logout if user exists
      if (user) {
        // Don't await this - we don't want to delay logout
        logUserAction({
          userId: user.id,
          actionType: INVOICE_CHANGE_TYPES.USER_LOGOUT,
        }).catch((err) => console.error("Failed to log logout:", err));
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    login,
    logout,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
