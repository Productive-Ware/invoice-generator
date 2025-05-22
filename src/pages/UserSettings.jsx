// File: src/pages/UserSettings.jsx

import AdminUserManagement from "@/components/AdminUserManagement";
import ChangePassword from "@/components/ChangePassword";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import supabase from "@/utils/supabaseClient";
import { useEffect, useState } from "react";

function UserSettings() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [isAdminOrSuperAdmin, setIsAdminOrSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: "", isError: false });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        if (!user) return;

        // Fetch the profile for the current user
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // throw the error. Otherwise, show a message to the user.
        if (error) {
          if (error.code === "PGRST116") {
            // PGRST116 is the error code for "Results contain 0 rows"
            setUserProfile(null);
            setSaveStatus({
              message:
                "Your profile hasn't been set up yet. Please contact an administrator.",
              isError: true,
            });
          } else {
            throw error;
          }
        } else {
          // Now fetch driver information if it exists
          const { data: driverData, error: driverError } = await supabase
            .from("drivers")
            .select("license_num, driver_status")
            .eq("profile_id", user.id);

          if (driverError) throw driverError;

          // Combine profile and driver data
          const combinedProfile = {
            ...profile,
            drivers: driverData || [],
          };

          setUserProfile(combinedProfile);
          setIsAdminOrSuperAdmin(
            profile.user_role === "Admin" || profile.user_role === "Super Admin"
          );

          setFormData({
            fullName: profile.full_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error.message);
        setSaveStatus({
          message: `Error: ${error.message}`,
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaveStatus({ message: "", isError: false });

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq("id", user.id);

      if (error) throw error;

      setIsEditing(false);
      setSaveStatus({
        message: "Profile updated successfully",
        isError: false,
      });

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        full_name: formData.fullName,
        phone: formData.phone,
      }));
    } catch (error) {
      console.error("Error updating profile:", error.message);
      setSaveStatus({ message: `Error: ${error.message}`, isError: true });
    }
  };

  if (loading) {
    return (
      <div className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin inline-block"></div>
              <p className="mt-2">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Add padding top to account for fixed header */}
      <div className="container max-w-[700px] mx-auto">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-[hsl(var(--primary))]">
            Account Settings
          </h1>
          <p className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
            Manage your account settings
          </p>
        </div>

        <div className="mx-auto mb-20 max-w-[700px]">
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {saveStatus.message && (
                  <div
                    className={`p-3 mb-4 rounded-md ${
                      saveStatus.isError
                        ? "bg-red-500/10 text-red-500"
                        : "bg-green-500/10 text-green-500"
                    }`}
                  >
                    {saveStatus.message}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="p-2 bg-muted rounded-md">
                        {userProfile?.full_name || "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {userProfile?.email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="p-2 bg-muted rounded-md">
                        {userProfile?.phone || "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userRole">User Role</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {userProfile?.user_role || "No role assigned"}
                    </div>
                  </div>

                  {userProfile?.drivers &&
                    userProfile.drivers.length > 0 &&
                    userProfile.drivers[0].driver_status && (
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber">Driver License</Label>
                        <div className="p-2 bg-muted rounded-md">
                          {userProfile.drivers[0].license_num || "Not set"}
                        </div>
                      </div>
                    )}

                  <div className="flex justify-end">
                    {isEditing ? (
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <ChangePassword />

          {/* Add Administrative Tools section if the user is an admin or super admin */}
          {isAdminOrSuperAdmin && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4">Admin Tools</h2>
              <AdminUserManagement />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
