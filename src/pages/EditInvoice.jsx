// File: src/pages/EditInvoice.jsx

import InvoicePreview from "@/components/InvoicePreview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useAuth } from "@/hooks/useAuth";
import { generateEnhancedInvoicePDF } from "@/utils/invoicePdfGenerator";
import { printInvoice as printInvoiceUtil } from "@/utils/invoicePrinter";
import {
  determineInvoiceChangeType,
  INVOICE_CHANGE_TYPES,
  logInvoiceChange,
} from "@/utils/logUtils";
import supabase from "@/utils/supabaseClient";
import { format, parseISO } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import { logInvoiceView } from "@/utils/logUtils";

function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateBreadcrumbs } = useBreadcrumbs();

  // State for form data
  const [formData, setFormData] = useState({
    id: "",
    invoiceNumber: "",
    poNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    clientId: "",
    branchId: "",
    driverId: "",
    notes: "",
    files: [],
    invoice_status: "",
  });

  useEffect(() => {
    if (formData.invoiceNumber) {
      // Only update when we have an invoice number
      updateBreadcrumbs([
        { label: "Home", path: "/" },
        { label: "Invoices", path: "/invoices" },
        {
          label: `Edit Invoice ${formData.invoiceNumber}`,
          path: `/edit-invoice/${id}`,
        },
      ]);
    }

    // Clean up when unmounting
    return () => updateBreadcrumbs([]);
  }, [id, formData.invoiceNumber, updateBreadcrumbs]);

  // State for invoice items (repeater)
  const [invoiceItems, setInvoiceItems] = useState([
    {
      id: null,
      pickupLocation: "",
      dropoffLocation: "",
      itemDescription: "",
      itemNumber: "",
      modelNumber: "",
      serialNumber: "",
      amount: "",
    },
  ]);

  // State for additional charges (toggle)
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState([
    {
      id: null,
      description: "",
      amount: "",
    },
  ]);

  // State for loading client data
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Add these new state variables for invoice preview
  const [showPreview, setShowPreview] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Define fetchInvoiceData with useCallback BEFORE using it in useEffect
  const fetchInvoiceData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      // Set read-only mode if not in Draft status
      if (invoice.invoice_status !== "Pending Billing") {
        setIsReadOnly(true);
      }

      // Fetch the invoice items
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id);

      if (itemsError) throw itemsError;

      // Fetch the additional charges
      const { data: charges, error: chargesError } = await supabase
        .from("additional_charges")
        .select("*")
        .eq("invoice_id", id);

      if (chargesError) throw chargesError;

      // Fetch client
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", invoice.client_id)
        .single();

      if (clientError && clientError.code !== "PGRST116") throw clientError;

      // Fetch branch if available
      let branch = null;
      if (invoice.branch_id) {
        const { data: branchData, error: branchError } = await supabase
          .from("client_branches")
          .select("*")
          .eq("id", invoice.branch_id)
          .single();

        if (branchError && branchError.code !== "PGRST116") throw branchError;
        branch = branchData;
      }

      // Fetch driver if available
      let driver = null;
      if (invoice.driver_id) {
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("*, profiles(*)")
          .eq("id", invoice.driver_id)
          .single();

        if (driverError && driverError.code !== "PGRST116") throw driverError;
        driver = driverData;
      }

      // Format invoice data for form
      setFormData({
        id: invoice.id,
        invoiceNumber: invoice.invoice_num,
        poNumber: invoice.po_num || "",
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.invoice_due || "",
        clientId: invoice.client_id,
        branchId: invoice.branch_id || "",
        driverId: invoice.driver_id || "",
        notes: invoice.invoice_notes || "",
        invoice_status: invoice.invoice_status,
      });

      // Set related data
      setSelectedClient(client);
      setSelectedBranch(branch);
      setSelectedDriver(driver);

      // Fetch branches for this client
      if (invoice.client_id) {
        fetchBranches(invoice.client_id);
      }

      // Format invoice items
      if (items && items.length > 0) {
        setInvoiceItems(
          items.map((item) => ({
            id: item.id,
            pickupLocation: item.pickup_address || "",
            dropoffLocation: item.dropoff_address || "",
            itemDescription: item.equip_desc || "",
            itemNumber: item.equip_num || "",
            modelNumber: item.model_num || "",
            serialNumber: item.serial_num || "",
            amount: item.amount ? item.amount.toString() : "",
          }))
        );
      }

      // Log that the invoice was viewed
      if (invoice && user) {
        logInvoiceView(invoice.id, user.id, invoice.invoice_num);
      }

      // Format additional charges
      if (charges && charges.length > 0) {
        setShowAdditionalCharges(true);
        setAdditionalCharges(
          charges.map((charge) => ({
            id: charge.id,
            description: charge.description || "",
            amount: charge.amount ? charge.amount.toString() : "",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching invoice data:", error.message);
      alert("Error loading invoice: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Load invoice data
  useEffect(() => {
    fetchClients();
    fetchDrivers();
    fetchInvoiceData();
  }, [id, fetchInvoiceData]);

  // Fetch clients
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("client_status", true)
        .order("client_name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error.message);
    }
  };

  // Fetch branches based on selected client
  const fetchBranches = async (clientId) => {
    if (!clientId) {
      setBranches([]);
      setSelectedBranch(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("client_branches")
        .select("*")
        .eq("client_id", clientId)
        .eq("branch_status", true)
        .eq("is_acquired", true)
        .order("branch_name");

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error.message);
    }
  };

  // Fetch drivers
  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(
          `
          id,
          driver_status,
          status_type,
          profiles (
            id,
            full_name,
            email
          )
        `
        )
        .eq("driver_status", true)
        .order("license_num");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error.message);
    }
  };

  // Handle form input change
  const handleChange = (e) => {
    if (isReadOnly) return;

    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle invoice item change
  const handleItemChange = (index, e) => {
    if (isReadOnly) return;

    const { name, value } = e.target;
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [name]: value };
    setInvoiceItems(newItems);

    // Calculate distance when both pickup and dropoff locations are available
    const item = newItems[index];
    if (
      (name === "pickupLocation" || name === "dropoffLocation") &&
      item.pickupLocation &&
      item.dropoffLocation
    ) {
      calculateDistance(item.pickupLocation, item.dropoffLocation)
        .then((result) => {
          if (result && result.status === "OK") {
            setInvoiceItems((currentItems) => {
              const updatedItems = [...currentItems];
              updatedItems[index] = {
                ...updatedItems[index],
                distance: result.distance,
                duration: result.duration,
              };
              return updatedItems;
            });
          }
        })
        .catch((error) => console.error("Error calculating distance:", error));
    }
  };

  // Add another invoice item
  const addInvoiceItem = () => {
    if (isReadOnly) return;

    setInvoiceItems([
      ...invoiceItems,
      {
        id: null,
        pickupLocation: "",
        dropoffLocation: "",
        itemDescription: "",
        itemNumber: "",
        modelNumber: "",
        serialNumber: "",
        amount: "",
      },
    ]);
  };

  // Delete an invoice item
  const deleteInvoiceItem = (index) => {
    if (isReadOnly) return;

    if (invoiceItems.length > 1) {
      const newItems = [...invoiceItems];
      newItems.splice(index, 1);
      setInvoiceItems(newItems);
    } else {
      alert("You need at least one invoice item.");
    }
  };

  // Handle additional charge change
  const handleChargeChange = (index, e) => {
    if (isReadOnly) return;

    const { name, value } = e.target;
    const newCharges = [...additionalCharges];
    newCharges[index] = { ...newCharges[index], [name]: value };
    setAdditionalCharges(newCharges);
  };

  // Add another additional charge
  const addAdditionalCharge = () => {
    if (isReadOnly) return;

    setAdditionalCharges([
      ...additionalCharges,
      {
        id: null,
        description: "",
        amount: "",
      },
    ]);
  };

  // Delete an additional charge
  const deleteAdditionalCharge = (index) => {
    if (isReadOnly) return;

    if (additionalCharges.length > 1) {
      const newCharges = [...additionalCharges];
      newCharges.splice(index, 1);
      setAdditionalCharges(newCharges);
    } else {
      alert("You need at least one additional charge.");
    }
  };

  // Toggle additional charges section
  const toggleAdditionalCharges = () => {
    if (isReadOnly) return;

    setShowAdditionalCharges(!showAdditionalCharges);
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return invoiceItems.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0);
    }, 0);
  };

  // Calculate additional charges total
  const calculateAdditionalChargesTotal = () => {
    return additionalCharges.reduce((total, charge) => {
      return total + (parseFloat(charge.amount) || 0);
    }, 0);
  };

  // Calculate grand total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateAdditionalChargesTotal();
  };

  // Validate required fields
  const validateRequiredFields = () => {
    const requiredFields = [
      { name: "invoiceDate", label: "Invoice Date" },
      { name: "dueDate", label: "Due Date" },
      { name: "clientId", label: "Client" },
      { name: "branchId", label: "Branch" },
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field.name]
    );

    // Check invoice items for required fields
    const itemsWithMissingFields = invoiceItems.filter(
      (item) => !item.pickupLocation || !item.dropoffLocation || !item.amount
    );

    if (missingFields.length > 0 || itemsWithMissingFields.length > 0) {
      const fieldLabels = missingFields.map((f) => f.label).join(", ");

      let errorMessage =
        missingFields.length > 0
          ? `Please fill in all required fields: ${fieldLabels}`
          : "";

      if (itemsWithMissingFields.length > 0) {
        errorMessage +=
          (errorMessage ? "\n\n" : "") +
          "Each invoice item must have a Pickup Location, Drop-off Location, and Amount.";
      }

      alert(errorMessage);
      return false;
    }

    return true;
  };

  // Save or update a draft
  const saveDraft = async () => {
    // Prepare the invoice data
    const invoiceData = {
      invoice_num: formData.invoiceNumber,
      po_num: formData.poNumber,
      invoice_date: formData.invoiceDate,
      invoice_due: formData.dueDate,
      client_id: formData.clientId,
      branch_id: formData.branchId,
      driver_id: formData.driverId,
      invoice_notes: formData.notes,
      total: calculateTotal(),
      // Use an allowed value from the check constraint
      invoice_status: "Pending Billing", // Changed from "Draft" to "Pending Billing"
      updated_at: new Date().toISOString(),
    };

    // Update the invoice
    const { data, error } = await supabase
      .from("invoices")
      .update(invoiceData)
      .eq("id", formData.id)
      .select()
      .single();

    if (error) throw error;

    // Log the change with our enhanced logging system
    await logInvoiceChange({
      invoiceId: formData.id,
      userId: user.id,
      previousData: { ...formData },
      newData: invoiceData,
      changeType: determineInvoiceChangeType({ ...formData }, invoiceData),
      description: "Updated invoice in draft status",
    });

    // Update invoice items - first delete existing items
    const { error: deleteItemsError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", formData.id);

    if (deleteItemsError) throw deleteItemsError;

    // Then insert new items
    const invoiceItemsData = invoiceItems.map((item) => ({
      invoice_id: formData.id,
      pickup_address: item.pickupLocation,
      dropoff_address: item.dropoffLocation,
      equip_desc: item.itemDescription,
      equip_num: item.itemNumber,
      model_num: item.modelNumber,
      serial_num: item.serialNumber,
      amount: parseFloat(item.amount) || 0,
      status_type: "Pending",
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItemsData);

    if (itemsError) throw itemsError;

    // Update additional charges - first delete existing charges
    const { error: deleteChargesError } = await supabase
      .from("additional_charges")
      .delete()
      .eq("invoice_id", formData.id);

    if (deleteChargesError) throw deleteChargesError;

    // Then insert new charges if any
    if (showAdditionalCharges && additionalCharges.length > 0) {
      const additionalChargesData = additionalCharges.map((charge) => ({
        invoice_id: formData.id,
        description: charge.description,
        amount: parseFloat(charge.amount) || 0,
      }));

      const { error: chargesError } = await supabase
        .from("additional_charges")
        .insert(additionalChargesData);

      if (chargesError) throw chargesError;
    }

    return { data, error: null };
  };

  // Preview invoice
  const previewInvoice = async () => {
    // Validate required fields first
    if (!validateRequiredFields()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Save the invoice as a draft
      await saveDraft();

      // Open the preview modal
      setShowPreview(true);
    } catch (error) {
      console.error("Error saving draft:", error.message);
      alert("Error saving draft: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft and go to invoice list
  const saveAsDraftAndRedirect = async () => {
    try {
      setIsSubmitting(true);

      await saveDraft();

      // Redirect to invoice list
      navigate("/invoices");
    } catch (error) {
      console.error("Error saving draft:", error.message);
      alert("Error saving draft: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print invoice
  const printInvoice = async () => {
    const result = await printInvoiceUtil({
      elementId: "invoice-preview-content",
      title: `Invoice ${formData.invoiceNumber}`,
    });

    if (!result.success) {
      alert("There was an error printing the invoice: " + result.error.message);
    }
  };

  // Download invoice as PDF
  const downloadInvoice = async () => {
    const result = await generateEnhancedInvoicePDF(
      {
        invoiceNumber: formData.invoiceNumber,
        clientName: selectedClient?.client_name,
      },
      {
        elementId: "invoice-preview-content",
        fileName: `Invoice-${formData.invoiceNumber}.pdf`,
        addWatermark: formData.invoice_status === "Pending Billing",
        watermarkText: "DRAFT",
      }
    );

    if (!result.success) {
      alert("There was an error generating the PDF: " + result.error.message);
    }
  };

  // Finalize invoice
  const finalizeInvoice = async () => {
    try {
      setIsSubmitting(true);

      // Update the invoice status
      const { error } = await supabase
        .from("invoices")
        .update({
          invoice_status: "Invoice Sent", // Update to "Invoice Sent" instead of "Pending Billing"
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id);

      if (error) throw error;

      // Log the change with enhanced logging
      await logInvoiceChange({
        invoiceId: formData.id,
        userId: user.id,
        previousData: { invoice_status: formData.invoice_status },
        newData: { invoice_status: "Invoice Sent" },
        changeType: INVOICE_CHANGE_TYPES.FINALIZE,
        description: "Invoice finalized",
      });

      // Redirect to invoice list
      navigate("/invoices");
    } catch (error) {
      console.error("Error finalizing invoice:", error.message);
      alert("Error finalizing invoice: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin inline-block"></div>
              <p className="mt-2">Loading invoice...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Safely parses an ISO date string to a Date object
   * @param {string|null} dateString - ISO date string (YYYY-MM-DD)
   * @returns {Date|null} - Parsed Date object or null if invalid
   */
  const safeParseDate = (dateString) => {
    if (!dateString) return null;

    try {
      // parseISO handles ISO format strings better than new Date()
      return parseISO(dateString);
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  };

  const handleInvoiceDateChange = (date) => {
    if (date && !isReadOnly) {
      const formattedDate = format(date, "yyyy-MM-dd");
      setFormData((prev) => ({
        ...prev,
        invoiceDate: formattedDate,
      }));
    }
  };

  const handleDueDateChange = (date) => {
    if (date && !isReadOnly) {
      const formattedDate = format(date, "yyyy-MM-dd");
      setFormData((prev) => ({
        ...prev,
        dueDate: formattedDate,
      }));
    }
  };

  return (
    <div>
      {/* Add padding top to account for fixed header */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--primary))]">
              {isReadOnly ? "View Invoice" : "Edit Invoice"}
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              {formData.invoice_status === "Pending Billing" && (
                <span className="ml-2 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md text-xs">
                  DRAFT
                </span>
              )}
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex gap-2">
              <Button onClick={previewInvoice} disabled={isSubmitting}>
                Preview
              </Button>
            </div>
          )}
        </div>

        {/* Add the InvoicePreview component */}
        <InvoicePreview
          open={showPreview}
          onClose={() => setShowPreview(false)}
          invoiceData={{ ...formData, invoice_status: "Draft" }}
          invoiceItems={invoiceItems}
          additionalCharges={showAdditionalCharges ? additionalCharges : []}
          clientData={selectedClient}
          branchData={selectedBranch}
          driverData={selectedDriver}
          onPrint={printInvoice}
          onDownload={downloadInvoice}
          onSaveAsDraft={saveAsDraftAndRedirect}
        />

        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Invoice Information</CardTitle>
                <CardDescription>
                  Enter the basic information for this invoice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invoice Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      readOnly
                      value={formData.invoiceNumber}
                      className="bg-[hsl(var(--muted))]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poNumber">PO #</Label>
                    <Input
                      id="poNumber"
                      name="poNumber"
                      value={formData.poNumber}
                      onChange={handleChange}
                      placeholder="Purchase Order Number"
                      disabled={isSubmitting || isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceDate">Invoice Date *</Label>
                    <DatePicker
                      value={safeParseDate(formData.invoiceDate) || new Date()}
                      onChange={handleInvoiceDateChange}
                      disabled={isSubmitting || isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <DatePicker
                      value={safeParseDate(formData.dueDate)}
                      onChange={handleDueDateChange}
                      placeholder="Select due date"
                      disabled={isSubmitting || isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => {
                        if (isReadOnly) return;

                        // Find and store the selected client object
                        const client = clients.find((c) => c.id === value);
                        setSelectedClient(client);

                        // Update form data
                        setFormData((prev) => ({ ...prev, clientId: value }));

                        // Fetch branches
                        fetchBranches(value);
                      }}
                      disabled={isLoading || isSubmitting || isReadOnly}
                    >
                      <SelectTrigger id="clientId" className="w-full">
                        <SelectValue
                          placeholder={
                            isLoading ? "Loading clients..." : "Select Client"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchId">Branch *</Label>
                    <Select
                      value={formData.branchId}
                      onValueChange={(value) => {
                        if (isReadOnly) return;

                        // Find and store the selected branch object
                        const branch = branches.find((b) => b.id === value);
                        setSelectedBranch(branch);

                        // Update form data
                        setFormData((prev) => ({ ...prev, branchId: value }));
                      }}
                      disabled={
                        !formData.clientId ||
                        isLoading ||
                        isSubmitting ||
                        isReadOnly
                      }
                    >
                      <SelectTrigger id="branchId" className="w-full">
                        <SelectValue
                          placeholder={
                            isLoading ? "Loading branches..." : "Select Branch"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverId">Assigned Driver</Label>
                  <Select
                    value={formData.driverId}
                    onValueChange={(value) => {
                      if (isReadOnly) return;

                      // Find and store the selected driver object
                      const driver = drivers.find((d) => d.id === value);
                      setSelectedDriver(driver);

                      // Update form data
                      setFormData((prev) => ({ ...prev, driverId: value }));
                    }}
                    disabled={isLoading || isSubmitting || isReadOnly}
                  >
                    <SelectTrigger id="driverId" className="w-full">
                      <SelectValue
                        placeholder={
                          isLoading ? "Loading drivers..." : "Select Driver"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.profiles?.full_name || "Unknown Driver"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Add any relevant notes here"
                    className="min-h-[100px]"
                    disabled={isSubmitting || isReadOnly}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Invoice Items</CardTitle>
                <CardDescription>Add items to this invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {invoiceItems.map((item, index) => (
                  <Card
                    key={index}
                    className="border border-neutral-750 relative"
                  >
                    {!isReadOnly && invoiceItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute top-2 right-2 p-1 h-8 w-8 text-neutral-500 hover:text-destructive"
                        onClick={() => deleteInvoiceItem(index)}
                        disabled={isSubmitting}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-full h-full"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </Button>
                    )}
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor={`pickupLocation-${index}`}>
                            Pickup Location *
                          </Label>
                          <Input
                            id={`pickupLocation-${index}`}
                            name="pickupLocation"
                            value={item.pickupLocation}
                            onChange={(e) => handleItemChange(index, e)}
                            disabled={isSubmitting || isReadOnly}
                            className="rounded-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`dropoffLocation-${index}`}>
                            Drop-off Location *
                          </Label>
                          <Input
                            id={`dropoffLocation-${index}`}
                            name="dropoffLocation"
                            value={item.dropoffLocation}
                            onChange={(e) => handleItemChange(index, e)}
                            disabled={isSubmitting || isReadOnly}
                            className="rounded-sm"
                          />
                        </div>
                      </div>

                      {/* Display distance and duration if available */}
                      {item.distance && item.duration && (
                        <div className="col-span-2">
                          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                            <div className="flex flex-wrap gap-2">
                              <span>
                                <span className="font-medium">Distance:</span>{" "}
                                {item.distance.text}
                              </span>
                              <span className="mx-1">•</span>
                              <span>
                                <span className="font-medium">
                                  Estimated time:
                                </span>{" "}
                                {item.duration.text}
                              </span>
                              {item.fuelEstimate && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>
                                    <span className="font-medium">
                                      Est. diesel:
                                    </span>{" "}
                                    {item.fuelEstimate.gallons} gal
                                    <span className="mx-1">•</span>
                                    <span className="font-medium">
                                      Est. cost:
                                    </span>{" "}
                                    ${item.fuelEstimate.cost.toFixed(2)}
                                    <span className="text-xs ml-1">
                                      (@${item.fuelEstimate.pricePerGallon}/gal)
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`itemDescription-${index}`}>
                          Item Description
                        </Label>
                        <Textarea
                          id={`itemDescription-${index}`}
                          name="itemDescription"
                          value={item.itemDescription}
                          onChange={(e) => handleItemChange(index, e)}
                          disabled={isSubmitting || isReadOnly}
                          className="rounded-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`itemNumber-${index}`}>
                            Item / Unit Number
                          </Label>
                          <Input
                            id={`itemNumber-${index}`}
                            name="itemNumber"
                            value={item.itemNumber}
                            onChange={(e) => handleItemChange(index, e)}
                            disabled={isSubmitting || isReadOnly}
                            className="rounded-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`modelNumber-${index}`}>
                            Model Number
                          </Label>
                          <Input
                            id={`modelNumber-${index}`}
                            name="modelNumber"
                            value={item.modelNumber}
                            onChange={(e) => handleItemChange(index, e)}
                            disabled={isSubmitting || isReadOnly}
                            className="rounded-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`serialNumber-${index}`}>
                            Serial Number
                          </Label>
                          <Input
                            id={`serialNumber-${index}`}
                            name="serialNumber"
                            value={item.serialNumber}
                            onChange={(e) => handleItemChange(index, e)}
                            disabled={isSubmitting || isReadOnly}
                            className="rounded-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`amount-${index}`}>Amount ($) *</Label>
                        <Input
                          id={`amount-${index}`}
                          type="text"
                          inputMode="decimal"
                          name="amount"
                          value={item.amount}
                          onChange={(e) => handleItemChange(index, e)}
                          disabled={isSubmitting || isReadOnly}
                          className="rounded-sm"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addInvoiceItem}
                    className="mt-2"
                    disabled={isSubmitting}
                  >
                    + Add Another Item
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Additional Charges */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">Additional Charges</CardTitle>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={toggleAdditionalCharges}
                      disabled={isSubmitting}
                    >
                      {showAdditionalCharges ? "- Hide" : "+ Show"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {showAdditionalCharges && (
                <CardContent className="space-y-6">
                  {additionalCharges.map((charge, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-neutral-750 rounded-lg relative"
                    >
                      {!isReadOnly && additionalCharges.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="absolute top-2 right-2 p-1 h-8 w-8 text-neutral-500 hover:text-destructive"
                          onClick={() => deleteAdditionalCharge(index)}
                          disabled={isSubmitting}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-full h-full"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </Button>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor={`chargeDescription-${index}`}>
                          Description
                        </Label>
                        <Input
                          id={`chargeDescription-${index}`}
                          name="description"
                          value={charge.description}
                          onChange={(e) => handleChargeChange(index, e)}
                          disabled={isSubmitting || isReadOnly}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`chargeAmount-${index}`}>
                          Amount ($)
                        </Label>
                        <Input
                          id={`chargeAmount-${index}`}
                          type="text"
                          inputMode="decimal"
                          name="amount"
                          value={charge.amount}
                          onChange={(e) => handleChargeChange(index, e)}
                          disabled={isSubmitting || isReadOnly}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>
                    </div>
                  ))}

                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addAdditionalCharge}
                      disabled={isSubmitting}
                    >
                      + Add Additional Charge
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6 flex justify-between items-end">
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Subtotal:
                    </span>{" "}
                    ${calculateSubtotal().toFixed(2)}
                  </div>

                  {showAdditionalCharges && (
                    <div className="mb-2">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        Additional Charges:
                      </span>{" "}
                      ${calculateAdditionalChargesTotal().toFixed(2)}
                    </div>
                  )}

                  <div className="font-bold text-lg">
                    <span>Total:</span> ${calculateTotal().toFixed(2)}
                  </div>
                </div>

                <div className="flex space-x-3">
                  {isReadOnly ? (
                    <Link to="/invoices">
                      <Button variant="outline">Back to Invoices</Button>
                    </Link>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={previewInvoice}
                        disabled={isSubmitting}
                      >
                        Preview
                      </Button>
                      <Button
                        type="button"
                        onClick={finalizeInvoice}
                        disabled={isSubmitting}
                      >
                        Finalize Invoice
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditInvoice;
