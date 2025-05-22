// File: src/pages/Logs.jsx

import LogDetailsDialog from "@/components/LogDetailsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import supabase from "@/utils/supabaseClient";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { Download, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Helper functions for export
function exportAsCSV(logs) {
  // Get all unique keys to ensure all columns are covered
  const allKeys = new Set();
  logs.forEach((log) => {
    Object.keys(log).forEach((key) => {
      // Skip complex objects that would need special handling
      if (typeof log[key] !== "object" || log[key] === null) {
        allKeys.add(key);
      }
    });
  });

  // Create the header row
  const keys = Array.from(allKeys);
  let csv = keys.map((key) => `"${key}"`).join(",") + "\n";

  // Add data rows
  logs.forEach((log) => {
    const row = keys.map((key) => {
      const value = log[key] !== undefined ? log[key] : "";
      // Safely handle any type of value
      if (typeof value === "string") {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      } else if (value === null || value === undefined) {
        return '""';
      } else {
        return `"${String(value)}"`;
      }
    });
    csv += row.join(",") + "\n";
  });

  // Create and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `system_logs_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up to avoid memory leaks
}

function exportAsJSON(logs) {
  // Create a sanitized version of logs for export
  const sanitizedLogs = logs.map((log) => {
    // Create a copy of the log to avoid modifying the original
    const sanitizedLog = { ...log };

    // Convert dates to ISO strings
    if (sanitizedLog.timestamp) {
      sanitizedLog.timestamp = new Date(sanitizedLog.timestamp).toISOString();
    }

    return sanitizedLog;
  });

  // Create and trigger download
  const json = JSON.stringify(sanitizedLogs, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `system_logs_${new Date().toISOString().split("T")[0]}.json`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up to avoid memory leaks
}

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [actionTypes, setActionTypes] = useState([]);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Check if user has admin privileges
  useEffect(() => {
    if (
      profile &&
      profile.user_role !== "Super Admin" &&
      profile.user_role !== "Admin"
    ) {
      navigate("/");
    }
  }, [profile, navigate]);

  // Define preset date ranges
  const dateRangePresets = {
    today: {
      label: "Today",
      getRange: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    yesterday: {
      label: "Yesterday",
      getRange: () => {
        const yesterday = subDays(new Date(), 1);
        return { from: yesterday, to: yesterday };
      },
    },
    thisMonth: {
      label: "This Month",
      getRange: () => {
        const now = new Date();
        return {
          from: startOfMonth(now),
          to: now,
        };
      },
    },
    lastMonth: {
      label: "Last Month",
      getRange: () => {
        const now = new Date();
        const lastMonth = subMonths(now, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
  };

  const applyPreset = (presetKey) => {
    if (dateRangePresets[presetKey]) {
      setDateRange(dateRangePresets[presetKey].getRange());
    }
  };

  // Fetch logs on component mount
  useEffect(() => {
    fetchLogs();
    fetchUserProfiles();
  }, []);

  // Re-fetch logs when filters change
  useEffect(() => {
    fetchLogs();
  }, [actionTypeFilter, dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Start building the query - FETCH BOTH types of logs and combine them
      // First, get invoice_change_logs
      let query = supabase
        .from("invoice_change_logs")
        .select("*, invoices(invoice_num)")
        .order("created_at", { ascending: false });

      // Apply action type filter
      if (actionTypeFilter !== "all") {
        query = query.eq("change_type", actionTypeFilter);
      }

      // Apply date range filter
      if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        query = query
          .gte("created_at", fromDate.toISOString())
          .lte("created_at", toDate.toISOString());
      }

      const { data: invoiceLogData, error: invoiceLogError } = await query;

      if (invoiceLogError) throw invoiceLogError;

      // Now get system logs
      let systemLogsQuery = supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply action type filter to system logs too
      if (actionTypeFilter !== "all") {
        systemLogsQuery = systemLogsQuery.eq("action", actionTypeFilter);
      }

      // Apply date range filter
      if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        systemLogsQuery = systemLogsQuery
          .gte("created_at", fromDate.toISOString())
          .lte("created_at", toDate.toISOString());
      }

      const { data: systemLogData, error: systemLogError } =
        await systemLogsQuery;

      if (systemLogError) throw systemLogError;

      // Normalize and combine both types of logs
      const normalizedInvoiceLogs = (invoiceLogData || []).map((log) => ({
        id: log.id,
        timestamp: log.created_at,
        entityId: log.invoice_id,
        entityType: "invoice",
        userId: log.changed_by,
        actionType: log.change_type,
        details: {
          previous: log.previous_data,
          new: log.new_data,
        },
        previous_data: log.previous_data,
        new_data: log.new_data,
        change_type: log.change_type,
        invoiceNumber: log.invoices?.invoice_num || "Unknown",
        description: log.description || renderChangeDetails(log),
        sourceTable: "invoice_change_logs",
      }));

      const normalizedSystemLogs = (systemLogData || []).map((log) => ({
        id: log.id,
        timestamp: log.created_at,
        entityId: log.entity_id,
        entityType: log.entity_type,
        userId: log.user_id,
        actionType: log.action,
        details: log.details || {},
        invoiceNumber: log.details?.invoiceNumber || "N/A",
        description:
          log.details?.description || `${log.action} on ${log.entity_type}`,
        sourceTable: "system_logs",
      }));

      // Combine and sort logs by timestamp (most recent first)
      const combinedLogs = [
        ...normalizedInvoiceLogs,
        ...normalizedSystemLogs,
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // For system logs that reference invoices, fetch invoice numbers
      const invoiceIds = combinedLogs
        .filter(
          (log) =>
            log.sourceTable === "system_logs" &&
            log.entityType === "invoice" &&
            log.entityId
        )
        .map((log) => log.entityId);

      if (invoiceIds.length > 0) {
        try {
          const uniqueIds = [...new Set(invoiceIds)]; // Remove duplicates
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .select("id, invoice_num")
            .in("id", uniqueIds);

          if (invoiceError) throw invoiceError;

          if (invoiceData) {
            const invoiceMap = {};
            invoiceData.forEach((inv) => {
              invoiceMap[inv.id] = inv.invoice_num;
            });

            // Update invoice numbers in the combined logs
            combinedLogs.forEach((log) => {
              if (
                log.sourceTable === "system_logs" &&
                log.entityType === "invoice" &&
                invoiceMap[log.entityId]
              ) {
                log.invoiceNumber = invoiceMap[log.entityId];
              }
            });
          }
        } catch (error) {
          console.error("Error fetching invoice numbers:", error);
        }
      }

      // Set the combined logs
      setLogs(combinedLogs);

      // Extract unique action types for the filter dropdown
      if (combinedLogs.length > 0) {
        const types = [...new Set(combinedLogs.map((log) => log.actionType))];
        setActionTypes(types);
      }
    } catch (error) {
      console.error("Error fetching logs:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (error) throw error;

      // Create a lookup object for profiles
      const profilesLookup = {};
      if (data) {
        data.forEach((profile) => {
          profilesLookup[profile.id] = profile;
        });
      }

      setUserProfiles(profilesLookup);
    } catch (error) {
      console.error("Error fetching user profiles:", error.message);
    }
  };

  const getUserName = (userId) => {
    const profile = userProfiles[userId];
    if (profile) {
      return profile.full_name || profile.email || "Unknown User";
    }
    return "Unknown User";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      const date = new Date(timestamp);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return timestamp;
    }
  };

  const renderChangeDetails = (log) => {
    if (log.sourceTable === "system_logs") {
      return log.description || `${log.actionType} on ${log.entityType}`;
    }

    if (!log.details?.previous && !log.details?.new) {
      return "No change details available";
    }

    if (log.actionType === "create" || log.actionType === "draft_create") {
      return "Created new invoice";
    }

    if (log.actionType === "update" || log.actionType === "draft_update") {
      // You could enhance this with a diff view later
      return "Updated invoice data";
    }

    if (log.actionType === "finalize") {
      return "Finalized invoice";
    }

    if (log.actionType === "status_change") {
      const oldStatus = log.details?.previous?.invoice_status || "Unknown";
      const newStatus = log.details?.new?.invoice_status || "Unknown";
      return `Changed status from ${oldStatus} to ${newStatus}`;
    }

    return "Changed invoice";
  };

  const viewInvoice = (invoiceId) => {
    navigate(`/edit-invoice/${invoiceId}`);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;

    // Search by invoice number or user name
    const invoiceNum = log.invoiceNumber || "";
    const userName = getUserName(log.userId);
    const actionType = log.actionType || "";
    const searchLower = searchQuery.toLowerCase();

    return (
      invoiceNum.toLowerCase().includes(searchLower) ||
      userName.toLowerCase().includes(searchLower) ||
      actionType.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="mb-6 ml-1 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--primary))]">
            System Logs
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-extralight">
            View all system activity logs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportAsCSV(filteredLogs)}
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={loading || filteredLogs.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={() => exportAsJSON(filteredLogs)}
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={loading || filteredLogs.length === 0}
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button onClick={fetchLogs} size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="gap-0 pb-3">
        <CardHeader className="pb-0">
          <CardTitle className="mb-4">Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search and filters */}
          <div className="w-full">
            <Input
              placeholder="Search by invoice number or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-5 h-5 rounded-xs placeholder:text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={actionTypeFilter}
              onValueChange={setActionTypeFilter}
              className="flex-1"
            >
              <SelectTrigger className="p-4 h-4 rounded-xs">
                <SelectValue placeholder="Filter by action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <DateRangePicker
                className="flex-1"
                placeholder="Select date range"
                value={dateRange}
                onChange={setDateRange}
              />
              <div className="flex space-x-1">
                {Object.entries(dateRangePresets).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="text-xs px-2 py-1 h-8"
                    onClick={() => applyPreset(key)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Timestamp</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>{log.invoiceNumber}</TableCell>
                        <TableCell>{getUserName(log.userId)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              log.actionType === "create" ||
                              log.actionType === "draft_create"
                                ? "bg-green-500/10 text-green-500"
                                : log.actionType === "update" ||
                                  log.actionType === "draft_update"
                                ? "bg-blue-500/10 text-blue-500"
                                : log.actionType === "finalize"
                                ? "bg-purple-500/10 text-purple-500"
                                : log.actionType === "status_change"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-gray-500/10 text-gray-500"
                            }`}
                          >
                            {log.actionType}
                          </span>
                        </TableCell>
                        <TableCell>{log.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <LogDetailsDialog
                              log={log} // Pass the full log object regardless of source
                              userName={getUserName(log.userId)}
                              invoiceNumber={log.invoiceNumber}
                            />

                            {log.entityType === "invoice" && log.entityId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => viewInvoice(log.entityId)}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Invoice</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Logs;
