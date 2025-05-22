// File: src/pages/InvoiceList.jsx

import InvoiceTable from "@/components/InvoiceTable";
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
import { useAuth } from "@/hooks/useAuth";
import {
  generateEnhancedInvoicePDF,
  generateMultipleInvoicesPDF,
} from "@/utils/invoicePdfGenerator";
import { printMultipleInvoices } from "@/utils/invoicePrinter";
import { INVOICE_CHANGE_TYPES, logInvoiceChange } from "@/utils/logUtils";
import supabase from "@/utils/supabaseClient";
import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function InvoiceList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const [clientData, setClientData] = useState({});
  const [branchData, setBranchData] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilterField, setDateFilterField] = useState("invoice_date");

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Fetch all invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch all clients for reference
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, client_name");

      if (clientsError) throw clientsError;

      // Create a lookup object for clients
      const clientsLookup = {};
      clientsData.forEach((client) => {
        clientsLookup[client.id] = client;
      });

      // Fetch all branches for reference
      const { data: branchesData, error: branchesError } = await supabase
        .from("client_branches")
        .select("id, branch_name, client_id");

      if (branchesError) throw branchesError;

      // Create a lookup object for branches
      const branchesLookup = {};
      branchesData.forEach((branch) => {
        branchesLookup[branch.id] = branch;
      });

      setInvoices(invoicesData || []);
      setClientData(clientsLookup);
      setBranchData(branchesLookup);
    } catch (error) {
      console.error("Error fetching invoices:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoiceId) => {
    // Find the invoice in the list
    const invoice = invoices.find((inv) => inv.id === invoiceId);

    // Log the view if the invoice is found
    if (invoice && user) {
      logInvoiceView(invoiceId, user.id, invoice.invoice_num);
    }

    navigate(`/edit-invoice/${invoiceId}`);
  };

  const handleFinalizeInvoice = async (invoiceId) => {
    try {
      // Add console.log for debugging
      console.log("Finalizing invoice:", invoiceId);
      setLoading(true);

      // Get the current invoice status before updating
      const { data: currentInvoice, error: fetchError } = await supabase
        .from("invoices")
        .select("invoice_status")
        .eq("id", invoiceId)
        .single();

      if (fetchError) throw fetchError;

      // Update the invoice status to "Invoice Sent" (not to "Pending Billing")
      const { error } = await supabase
        .from("invoices")
        .update({
          invoice_status: "Invoice Sent", // Change from "Pending Billing" to "Invoice Sent"
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      if (error) throw error;

      // Log the change with our enhanced logging
      await logInvoiceChange({
        invoiceId,
        userId: user.id,
        previousData: { invoice_status: currentInvoice.invoice_status },
        newData: { invoice_status: "Invoice Sent" },
        changeType: INVOICE_CHANGE_TYPES.FINALIZE,
        description: "Invoice finalized from invoice list",
      });

      // Refresh the invoices list
      await fetchInvoices();

      console.log("Invoice finalized successfully");
    } catch (error) {
      console.error("Error finalizing invoice:", error);
      alert("Error finalizing invoice: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAction = async (action, selectedRows) => {
    try {
      const selectedInvoices = selectedRows.map((row) => row.original);

      if (selectedInvoices.length === 0) {
        alert("Please select at least one invoice");
        return;
      }

      if (action === "print") {
        await handleBatchPrint(selectedInvoices);
      } else if (action === "download") {
        await handleBatchDownload(selectedInvoices);
      }
    } catch (error) {
      console.error(`Error during batch ${action}:`, error);
      alert(`Error during batch ${action}: ${error.message}`);
    }
  };

  const handleBatchPrint = async (selectedInvoices) => {
    // For simplicity, we're just showing how to call the printMultipleInvoices function
    // In a real implementation, you would need to fetch the full invoice data
    // including items, client details, etc.

    // Log the print action
    if (user) {
      selectedInvoices.forEach((invoice) => {
        logInvoiceDocument(
          invoice.id,
          user.id,
          INVOICE_CHANGE_TYPES.PRINT,
          invoice.invoice_num
        );
      });
    }

    await printMultipleInvoices(selectedInvoices, {
      title: "Selected Invoices",
      pageBreaks: true,
    });
  };

  const handleBatchDownload = async (selectedInvoices) => {
    try {
      if (selectedInvoices.length === 0) {
        alert("Please select at least one invoice");
        return;
      }

      // Show loading indicator
      setLoading(true);

      // If only one invoice is selected, use the existing PDF generator
      if (selectedInvoices.length === 1) {
        const invoice = selectedInvoices[0];
        const client = clientData[invoice.client_id];

        await generateEnhancedInvoicePDF(
          {
            invoiceNumber: invoice.invoice_num,
            clientName: client?.client_name || "Client",
          },
          {
            fileName: `Invoice-${invoice.invoice_num}.pdf`,
            addWatermark: invoice.invoice_status === "Pending Billing",
            watermarkText: "DRAFT",
          }
        );
      } else {
        // For multiple invoices, we need to:
        // 1. Fetch all the details for each invoice
        // 2. Generate PDFs for all of them

        // Create an array to hold all the invoice data
        const invoicesData = [];

        // Fetch the complete details for each selected invoice
        for (const invoice of selectedInvoices) {
          // Fetch invoice items
          const { data: items } = await supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", invoice.id);

          // Fetch additional charges if any
          const { data: charges } = await supabase
            .from("additional_charges")
            .select("*")
            .eq("invoice_id", invoice.id);

          // Get client and branch details
          const client = clientData[invoice.client_id] || {
            client_name: "Unknown Client",
          };
          const branch = branchData[invoice.branch_id] || {
            branch_name: "No Branch",
          };

          // Add to the invoices array
          invoicesData.push({
            invoice,
            items: items || [],
            charges: charges || [],
            client,
            branch,
          });
        }

        // Log the PDF generation
        if (user) {
          selectedInvoices.forEach((invoice) => {
            logInvoiceDocument(
              invoice.id,
              user.id,
              INVOICE_CHANGE_TYPES.PDF_GENERATED,
              invoice.invoice_num
            );
          });
        }

        // Generate the combined PDF
        await generateMultipleInvoicesPDF(invoicesData, {
          fileName: `Invoices-Batch-${
            new Date().toISOString().split("T")[0]
          }.pdf`,
          addPageNumbers: true,
          tableOfContents: true,
        });
      }
    } catch (error) {
      console.error("Error downloading invoices:", error);
      alert(`Error downloading invoices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters to the invoices
  // Apply all filters to the invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Status filter
      if (statusFilter !== "all" && invoice.invoice_status !== statusFilter) {
        return false;
      }

      // Client filter
      if (clientFilter !== "all" && invoice.client_id !== clientFilter) {
        return false;
      }

      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        // Get the date field based on selection (invoice_date or invoice_due)
        const dateValue = invoice[dateFilterField];

        // Skip this filter if the date field is null/undefined
        if (dateValue) {
          try {
            // Create date objects with proper handling
            const date = parseISO(dateValue);
            const rangeStart = startOfDay(dateRange.from);
            const rangeEnd = endOfDay(dateRange.to);

            // Use date-fns isWithinInterval for accurate comparison
            if (!isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
              return false;
            }
          } catch (err) {
            console.error(`Error parsing date: ${dateValue}`, err);
            // If date parsing fails, include the item anyway
          }
        }
      }

      return true;
    });
  }, [invoices, statusFilter, clientFilter, dateRange, dateFilterField]);

  return (
    <div>
      <div className="mb-6 ml-1 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--primary))]">
            Invoices
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-extralight">
            Manage your invoices
          </p>
        </div>
        <Link to="/create-invoice">
          <Button>Create New Invoice</Button>
        </Link>
      </div>

      <Card className="gap-0 pb-3">
        <CardHeader className="pb-0">
          <CardTitle className="mb-4 ">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search box - full width */}
          <div className="w-full">
            <Input
              placeholder="Search invoices..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full p-5 h-5 rounded-xs placeholder:text-sm"
            />
          </div>

          {/* Three filters in one row, each taking 1/3 of the width */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={clientFilter}
              onValueChange={setClientFilter}
              className="flex-1"
            >
              <SelectTrigger className="p-4 h-4 rounded-xs">
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {Object.values(clientData).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="flex-1"
            >
              <SelectTrigger className="p-4 h-4 rounded-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Billing">Drafts</SelectItem>
                <SelectItem value="Invoice Sent">Sent</SelectItem>
                <SelectItem value="Paid">Completed</SelectItem>
                <SelectItem value="Needs Revision">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* New date field filter */}
            <div className="flex flex-1 gap-1">
              <Select
                value={dateFilterField}
                onValueChange={setDateFilterField}
                className="w-1/3"
              >
                <SelectTrigger className="p-4 h-4 rounded-xs">
                  <SelectValue placeholder="Date field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_date">Invoice Date</SelectItem>
                  <SelectItem value="invoice_due">Due Date</SelectItem>
                </SelectContent>
              </Select>

              {/* Date range picker - updated placeholder */}
              <DateRangePicker
                className="w-2/3"
                placeholder={`Filter by ${
                  dateFilterField === "invoice_date" ? "invoice" : "due"
                } date`}
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <InvoiceTable
              data={filteredInvoices}
              clientData={clientData}
              branchData={branchData}
              onViewInvoice={handleViewInvoice}
              onFinalizeInvoice={handleFinalizeInvoice}
              onBatchAction={handleBatchAction}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default InvoiceList;
