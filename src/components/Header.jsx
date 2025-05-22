// File: src/components/Header.jsx

import logoImage from "@/assets/Split-Second-Towing-Tampa.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Grip, LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";

function Header() {
  const { isAuthenticated, logout, user, profile } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // Get display name from profile, fallback to email or "User" if no profile loaded
  const displayName = profile?.full_name
    ? profile.full_name
    : user?.email
    ? user.email.split("@")[0]
    : "User";

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-neutral-950 border-b border-neutral-800 shadow-lg">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center max-w-[1080px]">
        <Link to="/" className="flex items-center">
          <img
            src={logoImage}
            alt="Split Second Towing & Transport Logo"
            className="h-10 md:h-12 p-1"
          />
        </Link>
        <nav>
          <ul className="flex space-x-4 items-center">
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/invoices">
                    <Button variant="ghost">Invoices</Button>
                  </Link>
                </li>
                <li>
                  <Link to="/create-invoice">
                    <Button className="h-8 rounded-sm leading-0">
                      Create Invoice
                    </Button>
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sm hidden md:inline text-neutral-300">
                    {displayName}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <Grip className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72 shadow-xl mt-3 bg-neutral-800 rounded-tr-none rounded-tl-none"
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {displayName}
                          </p>
                          <p className="text-xs leading-none text-neutral-400">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {/* Settings */}
                      <DropdownMenuItem asChild>
                        <Link
                          to="/settings"
                          className="flex items-center cursor-pointer w-full"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Logs */}
                      {profile?.user_role === "Super Admin" ||
                      profile?.user_role === "Admin" ? (
                        <DropdownMenuItem asChild>
                          <Link
                            to="/logs"
                            className="flex items-center cursor-pointer w-full"
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            <span>System Logs</span>
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      {/* Logout */}
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              </>
            ) : (
              <li>
                <Link to="/login">
                  <Button>Login</Button>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
