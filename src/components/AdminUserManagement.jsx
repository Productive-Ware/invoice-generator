// File: src/components/AdminUserManagement.jsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import supabase from "@/utils/supabaseClient";
import { useEffect, useState } from "react";

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    userRole: "",
    isDriver: false,
    licenseNumber: "",
  });
  const [status, setStatus] = useState({ message: "", isError: false });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // First fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Then fetch all drivers
      const { data: drivers, error: driversError } = await supabase
        .from("drivers")
        .select("*");

      if (driversError) throw driversError;

      // Combine the data
      const combinedData = profiles.map((profile) => {
        const userDrivers = drivers.filter(
          (driver) => driver.profile_id === profile.id
        );
        return {
          ...profile,
          drivers: userDrivers,
        };
      });

      setUsers(combinedData || []);
    } catch (error) {
      console.error("Error fetching users:", error.message);
      setStatus({ message: `Error: ${error.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId) => {
    const user = users.find((u) => u.id === userId);
    setSelectedUser(user);

    // Check if user is a driver
    const isDriver =
      user.drivers &&
      user.drivers.length > 0 &&
      user.drivers[0].driver_status === true;

    setFormData({
      fullName: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      userRole: user.user_role || "Staff",
      isDriver: isDriver,
      licenseNumber: isDriver ? user.drivers[0].license_num || "" : "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, userRole: value }));
  };

  const handleDriverToggle = (checked) => {
    setFormData((prev) => ({ ...prev, isDriver: checked }));
  };

  const handleSave = async () => {
    try {
      setStatus({ message: "", isError: false });

      // Check if trying to change Super Admin role
      if (
        selectedUser.user_role === "Super Admin" &&
        formData.userRole !== "Super Admin"
      ) {
        throw new Error("Cannot change the role of the Super Admin");
      }

      // Check if trying to create a second Super Admin
      if (
        formData.userRole === "Super Admin" &&
        selectedUser.user_role !== "Super Admin"
      ) {
        const { data: superAdmins, error: countError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_role", "Super Admin");

        if (countError) throw countError;

        if (superAdmins && superAdmins.length > 0) {
          throw new Error("There can only be one Super Admin");
        }
      }

      // Update the user's profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          user_role: formData.userRole,
        })
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      // Handle driver status
      if (formData.isDriver) {
        // Call the function to set as driver
        const { error: driverError } = await supabase.rpc(
          "set_user_as_driver",
          {
            profile_id: selectedUser.id,
            license_number: formData.licenseNumber,
          }
        );

        if (driverError) throw driverError;
      } else if (
        selectedUser.drivers &&
        selectedUser.drivers.length > 0 &&
        selectedUser.drivers[0].driver_status
      ) {
        // Remove driver status
        const { error: removeError } = await supabase.rpc(
          "remove_driver_status",
          {
            profile_id: selectedUser.id,
          }
        );

        if (removeError) throw removeError;
      }

      // Refresh the user list
      await fetchUsers();

      // Update the selected user with the new data
      const updatedUser = users.find((u) => u.id === selectedUser.id);
      setSelectedUser(updatedUser);

      setStatus({ message: "User updated successfully", isError: false });
    } catch (error) {
      console.error("Error updating user:", error.message);
      setStatus({ message: `Error: ${error.message}`, isError: true });
    }
  };

  const isSuperAdmin = selectedUser?.user_role === "Super Admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        {status.message && (
          <div
            className={`p-3 mb-4 rounded-md ${
              status.isError
                ? "bg-red-500/10 text-red-500"
                : "bg-green-500/10 text-green-500"
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 border-r pr-4">
            <h3 className="font-semibold mb-2">Users</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-2 cursor-pointer rounded-md hover:bg-muted ${
                      selectedUser?.id === user.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSelectUser(user.id)}
                  >
                    <div className="font-medium">
                      {user.full_name || "Unnamed User"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Role: {user.user_role || "None"}
                      {user.drivers &&
                        user.drivers.length > 0 &&
                        user.drivers[0].driver_status &&
                        " | Driver"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-2">
            {selectedUser ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userRole">User Role</Label>
                  <Select
                    value={formData.userRole}
                    onValueChange={handleRoleChange}
                    disabled={isSuperAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {!isSuperAdmin && (
                        <SelectItem value="Super Admin">Super Admin</SelectItem>
                      )}
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Branch Contact">
                        Branch Contact
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isSuperAdmin && (
                    <p className="text-xs text-amber-500 mt-1">
                      The Super Admin role cannot be changed
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-driver"
                    checked={formData.isDriver}
                    onCheckedChange={handleDriverToggle}
                  />
                  <Label htmlFor="is-driver">Driver</Label>
                </div>

                {formData.isDriver && (
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      value={formData.licenseNumber || ""}
                      onChange={handleChange}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">Select a user to edit</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminUserManagement;
