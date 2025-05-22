// File: src/components/BreadcrumbNav.jsx

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { Home } from "lucide-react";
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function BreadcrumbNav() {
  const { breadcrumbs } = useBreadcrumbs();
  const location = useLocation();

  // Default breadcrumbs for common routes
  const defaultBreadcrumbs = [{ label: "Home", path: "/" }];

  // Use provided breadcrumbs or generate from current path
  const activeBreadcrumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : generateBreadcrumbs(location.pathname);

  // Function to generate breadcrumbs from path
  function generateBreadcrumbs(path) {
    if (path === "/") return defaultBreadcrumbs;

    const parts = path.split("/").filter(Boolean);
    let currentPath = "";

    return [
      { label: "Home", path: "/" },
      ...parts.map((part) => {
        currentPath += `/${part}`;

        // Format the label (capitalize, replace hyphens)
        const label = part
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Handle path params (like :id)
        const finalPath = currentPath.includes(":") ? "#" : currentPath;

        return { label, path: finalPath };
      }),
    ];
  }

  if (activeBreadcrumbs.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4 mt-4">
      <BreadcrumbList>
        {activeBreadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <BreadcrumbItem>
              {index === 0 ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path} className="flex items-center">
                    <Home className="h-4.5 w-4.5 mr-1" />
                    <span className="sr-only">Home</span>
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbLink
                  asChild
                  isActive={index === activeBreadcrumbs.length - 1}
                >
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>

            {index < activeBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
