// File: src/components/LogDetailsDialog.jsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Eye } from "lucide-react";

function LogDetailsDialog({ log, userName, invoiceNumber }) {
  if (!log) return null;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      const date = new Date(timestamp);
      return format(date, "MMM d, yyyy h:mm:ss a");
    } catch (error) {
      return timestamp;
    }
  };

  const renderChangeData = (data) => {
    if (!data) return "None";

    // Pretty print JSON data
    try {
      return (
        <pre className="bg-black/5 p-4 rounded-md overflow-auto max-h-[300px] text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch (e) {
      return String(data);
    }
  };

  const getChanges = () => {
    // Exit early if no log
    if (!log) return [];

    // Extract changes from the normalized log format
    let previous, newData;

    if (log.sourceTable === "invoice_change_logs") {
      previous = log.previous_data;
      newData = log.new_data;
    } else if (log.sourceTable === "system_logs") {
      // For system logs, check if details has previous/new structure
      previous = log.details?.previous;
      newData = log.details?.new;
    }

    // If we don't have both previous and new data, return empty array
    if (!previous || !newData) return [];

    // Try to identify specific changes between the objects
    const changes = [];

    // Handle primitive values
    if (
      typeof previous !== "object" ||
      typeof newData !== "object" ||
      previous === null ||
      newData === null
    ) {
      return [
        {
          field: "value",
          from: previous,
          to: newData,
        },
      ];
    }

    // Compare fields in both objects
    const allKeys = new Set([
      ...Object.keys(previous || {}),
      ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
      const prevValue = previous?.[key];
      const newValue = newData?.[key];

      // Skip if the values are the same
      if (JSON.stringify(prevValue) === JSON.stringify(newValue)) continue;

      // Add to changes
      changes.push({
        field: key,
        from: prevValue,
        to: newValue,
      });
    }

    return changes;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <Eye className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Log Details</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Timestamp</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {formatTimestamp(log.timestamp || log.created_at)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">User</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {userName}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Invoice</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {invoiceNumber || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Action Type</h3>
              <p className="text-sm">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    log.actionType === "create" || log.change_type === "create"
                      ? "bg-green-500/10 text-green-500"
                      : log.actionType === "update" ||
                        log.change_type === "update"
                      ? "bg-blue-500/10 text-blue-500"
                      : log.actionType === "finalize" ||
                        log.change_type === "finalize"
                      ? "bg-purple-500/10 text-purple-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}
                >
                  {log.actionType || log.change_type}
                </span>
              </p>
            </div>
          </div>

          {(log.change_type === "update" || log.actionType === "update") && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Changes</h3>
              <div className="space-y-2">
                {getChanges().length > 0 ? (
                  getChanges().map((change, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 border border-neutral-200 dark:border-neutral-700 rounded-md"
                    >
                      <p className="font-medium">{change.field}</p>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">
                            Previous:
                          </p>
                          <div className="bg-black/5 p-2 rounded-md break-all text-xs">
                            {change.from !== undefined
                              ? JSON.stringify(change.from)
                              : "N/A"}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">New:</p>
                          <div className="bg-black/5 p-2 rounded-md break-all text-xs">
                            {change.to !== undefined
                              ? JSON.stringify(change.to)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">
                    No specific changes detected
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Previous Data</h3>
              {renderChangeData(log.previous_data || log.details?.previous)}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">New Data</h3>
              {renderChangeData(log.new_data || log.details?.new)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LogDetailsDialog;
