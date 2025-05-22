// File: src/components/ui/breadcrumb.jsx

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import React from "react";

const Breadcrumb = React.forwardRef(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    data-slot="breadcrumb"
    className={cn("flex flex-wrap items-right text-sm", className)}
    aria-label="Breadcrumb"
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    data-slot="breadcrumb-list"
    className={cn("flex items-center gap-1 font-light", className)}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-slot="breadcrumb-item"
    className={cn("flex items-center gap-1", className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef(
  (
    { asChild, className, activeClassName, isActive = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        data-slot="breadcrumb-link"
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "hover:text-foreground text-muted-foreground hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
          isActive &&
            cn(
              "font-normal text-primary pointer-events-none no-underline cursor-default",
              activeClassName
            ),
          className
        )}
        {...props}
      />
    );
  }
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbSeparator = React.forwardRef(
  ({ className, children = ">", ...props }, ref) => (
    <li
      ref={ref}
      data-slot="breadcrumb-separator"
      className={cn("text-muted-foreground mx-0.5", className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </li>
  )
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="breadcrumb-ellipsis"
    className={cn(
      "text-muted-foreground flex h-9 items-middle justify-center",
      className
    )}
    {...props}
  >
    <span className="flex h-1 w-1 rounded-full bg-muted-foreground" />
    <span className="ml-1 flex h-1 w-1 rounded-full bg-muted-foreground" />
    <span className="ml-1 flex h-1 w-1 rounded-full bg-muted-foreground" />
  </span>
));
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
};
