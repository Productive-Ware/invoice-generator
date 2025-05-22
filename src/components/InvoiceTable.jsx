// File: src/components/InvoiceTable.jsx

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  FileEdit,
} from "lucide-react";
import { useMemo, useState } from "react";

const StatusBadge = ({ status }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Pending Billing":
        return "bg-yellow-500/10 text-yellow-500 text-[11px]";
      case "Invoice Sent":
        return "bg-blue-500/10 text-blue-500";
      case "Paid":
        return "bg-green-500/10 text-green-500";
      case "Needs Revision":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-neutral-500/10 text-neutral-500";
    }
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-[11px] font-light ${getStatusBadgeClass(
        status
      )}`}
    >
      {status}
    </span>
  );
};

const InvoiceTable = ({
  data,
  clientData,
  branchData,
  onViewInvoice,
  onFinalizeInvoice,
  onBatchAction,
  globalFilter,
  setGlobalFilter,
}) => {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  const columns = useMemo(() => {
    // Define the helper functions inside the useMemo callback
    const getBranchName = (branchId) => {
      const branch = branchData[branchId];
      if (!branch)
        return (
          <div>
            <div>No Branch</div>
          </div>
        );

      // Show branch name with client name in parentheses
      const clientName =
        branch.client_id && clientData[branch.client_id]
          ? clientData[branch.client_id].client_name
          : "Unknown Client";

      return (
        <div>
          <div className="text-xs font-light">{branch.branch_name}</div>
          <div className="text-xs font-light text-muted-foreground">
            {clientName}
          </div>
        </div>
      );
    };

    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            className="rounded-xs"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="rounded-xs"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "invoice_num",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 data-[state=open]:bg-accent"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <span className="text-[12px]">Invoice #</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="font-light invoice-number-font-light-smaller text-nowrap">
            {row.original.invoice_num.toUpperCase()}
          </div>
        ),
      },
      {
        accessorKey: "invoice_date",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <span className="text-[12px]">Invoice Date</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-[12px]">
            {formatDate(row.original.invoice_date)}
          </span>
        ),
      },
      {
        accessorKey: "invoice_due",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <span className="text-[12px]">Due Date</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-[12px]">
            {formatDate(row.original.invoice_due)}
          </span>
        ),
      },
      {
        accessorKey: "branch_id",
        header: () => <span className="text-[12px]">Branch</span>,
        cell: ({ row }) => getBranchName(row.original.branch_id),
      },
      {
        accessorKey: "total",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <span className="text-[12px]">Total</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-[12px]">
            {`$${row.original.total?.toFixed(2) || "0.00"}`}
          </span>
        ),
      },
      {
        accessorKey: "invoice_status",
        header: () => <span className="text-[12px]">Status</span>,
        cell: ({ row }) => <StatusBadge status={row.original.invoice_status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onViewInvoice(row.original.id)}
                  >
                    {row.original.invoice_status === "Pending Billing" ? (
                      <FileEdit className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {row.original.invoice_status === "Pending Billing"
                      ? "Edit Invoice"
                      : "View Invoice"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {row.original.invoice_status === "Pending Billing" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onFinalizeInvoice(row.original.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Finalize Invoice</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },
    ];
  }, [clientData, branchData, onViewInvoice, onFinalizeInvoice]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-sm text-muted-foreground py-2">
              {table.getFilteredSelectedRowModel().rows.length} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onBatchAction(
                    "print",
                    table.getFilteredSelectedRowModel().rows
                  )
                }
              >
                Print Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onBatchAction(
                    "download",
                    table.getFilteredSelectedRowModel().rows
                  )
                }
              >
                Download Selected
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-2">
        <div className="flex-1 text-xs pl-2 text-muted-foreground">
          {table.getFilteredRowModel().rows.length > 0
            ? `Showing ${
                table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1
              }-${Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length} invoice(s)`
            : "No invoices found."}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-xs"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTable;
