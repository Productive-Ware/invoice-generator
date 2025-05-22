// File: src/pages/CreateInvoice.jsx

import InvoicePreview from "@/components/InvoicePreview";
import AddressAutocomplete, {
  calculateDistance,
} from "@/components/ui/address-autocomplete";
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
import { useAuth } from "@/hooks/useAuth";
import {
  generateInvoiceNumber as generateInvoiceNumberUtil,
  generatePlaceholderInvoiceNumber,
} from "@/utils/invoiceNumberGenerator";
import { generateEnhancedInvoicePDF } from "@/utils/invoicePdfGenerator";
import { printInvoice as printInvoiceUtil } from "@/utils/invoicePrinter";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../utils/supabaseClient";

function CreateInvoice() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for form data
  const [formData, setFormData] = useState({
    id: null,
    invoiceNumber: "",
    poNumber: "",
    invoiceDate: format(new Date(), "yyyy-MM-dd"), // Use date-fns format
    dueDate: "",
    clientId: "",
    branchId: "",
    driverId: "",
    notes: "",
    files: [],
  });

  // State for invoice items (repeater)
  const [invoiceItems, setInvoiceItems] = useState([
    {
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

  // Add these new state variables for invoice preview
  const [showPreview, setShowPreview] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Debug useEffect to track when fuel estimates are present
  useEffect(() => {
    if (invoiceItems.some((item) => item.fuelEstimate)) {
      console.log("Current invoiceItems with fuel estimates:", invoiceItems);
    }
  }, [invoiceItems]);

  // Initialize invoice on mount
  useEffect(() => {
    const initializeInvoice = async () => {
      try {
        // Initialize with a placeholder invoice number
        const placeholderInvoiceNumber = generatePlaceholderInvoiceNumber();

        setFormData((prev) => ({
          ...prev,
          invoiceNumber: placeholderInvoiceNumber,
        }));
      } catch (err) {
        console.error("Error in initializeInvoice:", err);
        // Set a fallback invoice number if something goes wrong
        const fallbackNum = `INV-temporary-${new Date().getTime()}`;
        setFormData((prev) => ({ ...prev, invoiceNumber: fallbackNum }));
      }
    };

    console.log("Component mounted, initializing...");
    initializeInvoice();
    fetchClients();
    fetchDrivers();
  }, []);

  // Fetch clients
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching clients...");

      // First try without any filters to see if we get any clients at all
      const { data: allClients, error: allClientsError } = await supabase
        .from("clients")
        .select("*");

      console.log(
        "All clients (without filter):",
        allClients,
        "Error:",
        allClientsError
      );

      // If we got clients without a filter, use those
      if (allClients && allClients.length > 0) {
        console.log("Using clients without filter");
        const activeClients = allClients.filter(
          (client) => client.client_status === true
        );
        setClients(activeClients);
      } else {
        // Try with the original filter
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("client_status", true)
          .order("client_name");

        if (error) {
          console.error("Error fetching clients:", error);
          alert(`Error fetching clients: ${error.message}`);
        } else {
          console.log("Clients data received (with filter):", data);
          setClients(data || []);
        }
      }
    } catch (err) {
      console.error("Exception in fetchClients:", err);
      alert(`Exception in fetchClients: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch branches based on selected client
  const fetchBranches = async (clientId) => {
    if (!clientId) {
      setBranches([]);
      setSelectedBranch(null);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("client_branches")
      .select("*")
      .eq("client_id", clientId)
      .eq("branch_status", true)
      .eq("is_acquired", true)
      .order("branch_name");

    if (error) {
      console.error("Error fetching branches:", error);
    } else {
      setBranches(data || []);
    }
    setIsLoading(false);
  };

  // Fetch drivers
  const fetchDrivers = async () => {
    setIsLoading(true);
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

    if (error) {
      console.error("Error fetching drivers:", error);
    } else {
      setDrivers(data || []);
    }
    setIsLoading(false);
  };

  // **************************************
  // >>>>>>>>>> Handle form input change
  // **************************************
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ***************************************
  // Handle invoice item change
  // ***************************************
  const handleItemChange = (index, eOrName, value) => {
    setInvoiceItems((prevItems) => {
      const newItems = [...prevItems];
      if (typeof eOrName === "string") {
        // Called as (index, fieldName, value)
        newItems[index] = { ...newItems[index], [eOrName]: value };

        // Calculate distance when both pickup and dropoff locations are available
        const item = newItems[index];
        if (
          (eOrName === "pickupLocation" || eOrName === "dropoffLocation") &&
          item.pickupLocation &&
          item.dropoffLocation
        ) {
          calculateDistance(item.pickupLocation, item.dropoffLocation)
            .then((result) => {
              if (result && result.status === "OK") {
                console.log("Distance result received:", result);
                setInvoiceItems((currentItems) => {
                  const updatedItems = [...currentItems];
                  updatedItems[index] = {
                    ...updatedItems[index],
                    distance: result.distance,
                    duration: result.duration,
                    fuelEstimate: result.fuelEstimate,
                  };
                  console.log(
                    "Updated item with fuel estimate:",
                    updatedItems[index]
                  );
                  return updatedItems;
                });
              }
            })
            .catch((error) =>
              console.error("Error calculating distance:", error)
            );
        }
      } else {
        // Called as (index, event)
        const { name, value } = eOrName.target;
        newItems[index] = { ...newItems[index], [name]: value };

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
                console.log("Distance result received:", result);
                setInvoiceItems((currentItems) => {
                  const updatedItems = [...currentItems];
                  updatedItems[index] = {
                    ...updatedItems[index],
                    distance: result.distance,
                    duration: result.duration,
                    fuelEstimate: result.fuelEstimate,
                  };
                  console.log(
                    "Updated item with fuel estimate:",
                    updatedItems[index]
                  );
                  return updatedItems;
                });
              }
            })
            .catch((error) =>
              console.error("Error calculating distance:", error)
            );
        }
      }
      return newItems;
    });
  };

  // Add another invoice item
  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
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
    const { name, value } = e.target;
    const newCharges = [...additionalCharges];
    newCharges[index] = { ...newCharges[index], [name]: value };
    setAdditionalCharges(newCharges);
  };

  // Add another additional charge
  const addAdditionalCharge = () => {
    setAdditionalCharges([
      ...additionalCharges,
      {
        description: "",
        amount: "",
      },
    ]);
  };

  // Delete an additional charge
  const deleteAdditionalCharge = (index) => {
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
    setShowAdditionalCharges(!showAdditionalCharges);
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    const itemsTotal = invoiceItems.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0);
    }, 0);

    return itemsTotal;
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

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, files }));
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

  // Log invoice changes
  const logInvoiceChange = async (
    invoiceId,
    previousData,
    newData,
    changeType
  ) => {
    try {
      const { error } = await supabase.from("invoice_change_logs").insert({
        invoice_id: invoiceId,
        changed_by: user.id,
        previous_data: previousData,
        new_data: newData,
        change_type: changeType,
      });

      if (error) {
        console.error("Error logging invoice change:", error);
      }
    } catch (err) {
      console.error("Exception logging invoice change:", err);
    }
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
      invoice_status: "Pending Billing",
      updated_at: new Date().toISOString(),
    };

    // If we have an existing draft ID, update it
    if (formData.id) {
      const { data, error } = await supabase
        .from("invoices")
        .update(invoiceData)
        .eq("id", formData.id)
        .select()
        .single();

      // Also log the change
      if (!error) {
        await logInvoiceChange(formData.id, null, invoiceData, "update");
      }

      return { data, error };
    } else {
      // Otherwise create a new draft
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      // If successful, save the invoice items and log the change
      if (!error && data) {
        // Save invoice items
        const invoiceItemsData = invoiceItems.map((item) => ({
          invoice_id: data.id,
          pickup_address: item.pickupLocation,
          dropoff_address: item.dropoffLocation,
          equip_desc: item.itemDescription,
          equip_num: item.itemNumber,
          model_num: item.modelNumber,
          serial_num: item.serialNumber,
          amount: parseFloat(item.amount) || 0,
          status_type: "Pending",
          estimated_distance_miles: item.distance
            ? parseFloat(item.distance.text.replace(" mi", "").replace(",", ""))
            : null,
          estimated_duration_minutes: item.duration
            ? Math.round(parseFloat(item.duration.value) / 60)
            : null,
          estimated_fuel_gallons: item.fuelEstimate
            ? item.fuelEstimate.gallons
            : null,
          estimated_fuel_cost: item.fuelEstimate
            ? item.fuelEstimate.cost
            : null,
          fuel_price_per_gallon: item.fuelEstimate
            ? item.fuelEstimate.pricePerGallon
            : null,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItemsData);

        if (itemsError) {
          console.error("Error creating invoice items:", itemsError);
        }

        // Save additional charges if any
        if (showAdditionalCharges && additionalCharges.length > 0) {
          const additionalChargesData = additionalCharges.map((charge) => ({
            invoice_id: data.id,
            description: charge.description,
            amount: parseFloat(charge.amount) || 0,
          }));

          const { error: chargesError } = await supabase
            .from("additional_charges")
            .insert(additionalChargesData);

          if (chargesError) {
            console.error("Error creating additional charges:", chargesError);
          }
        }

        // Handle file uploads if any
        if (formData.files.length > 0) {
          // Upload each file to Supabase Storage
          for (const file of formData.files) {
            const fileExt = file.name.split(".").pop();
            const fileName = `${data.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("invoice_attachments") // Using your existing bucket
              .upload(fileName, file);

            if (uploadError) {
              console.error("Error uploading file:", uploadError);
              // Don't throw here, just log the error (files are optional)
            }
          }
        }

        // Log the change
        await logInvoiceChange({
          invoiceId: data.id,
          userId: user.id,
          previousData: null,
          newData: invoiceData,
          changeType: INVOICE_CHANGE_TYPES.DRAFT_CREATE,
          description: "Initial draft creation",
        });
      }

      return { data, error };
    }
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
      const { data: draft, error } = await saveDraft();

      if (error) throw error;

      // Update any state needed with the returned draft data
      if (draft) {
        // Update the invoice number if it was generated on the server
        setFormData((prev) => ({
          ...prev,
          id: draft.id, // Store the draft ID for future updates
          invoiceNumber: draft.invoice_num || prev.invoiceNumber,
        }));
      }

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

      // Update or create draft
      const { error } = await saveDraft();

      if (error) throw error;

      // Redirect to invoice list - this should only happen when explicitly called
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

  /**
   * Handles changes to the invoice date picker
   * @param {Date|null} date - The selected date from DatePicker or null if cleared
   */
  const handleInvoiceDateChange = (date) => {
    if (!date) return;

    try {
      // Format date as YYYY-MM-DD string to avoid timezone issues
      // This ensures the date is stored consistently regardless of user's timezone
      const formattedDate = format(date, "yyyy-MM-dd");

      setFormData((prev) => ({
        ...prev,
        invoiceDate: formattedDate,
      }));
    } catch (error) {
      console.error("Error formatting invoice date:", error);
      // Could add more robust error handling here
    }
  };

  /**
   * Handles changes to the due date picker
   * @param {Date|null} date - The selected date from DatePicker or null if cleared
   */
  const handleDueDateChange = (date) => {
    // Handle null case (date cleared)
    if (!date) {
      setFormData((prev) => ({
        ...prev,
        dueDate: "",
      }));
      return;
    }

    try {
      // Format date as YYYY-MM-DD string to avoid timezone issues
      const formattedDate = format(date, "yyyy-MM-dd");

      setFormData((prev) => ({
        ...prev,
        dueDate: formattedDate,
      }));
    } catch (error) {
      console.error("Error formatting due date:", error);
    }
  };

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

  return (
    <div>
      <div className="mb-6 p-0">
        <h1 className="text-2xl font-bold text-[hsl(var(--primary))]">
          Create Invoice
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] font-light">
          Fill out the form to create a new invoice
        </p>
      </div>

      {/* Add the InvoicePreview component */}
      <InvoicePreview
        open={showPreview}
        onClose={() => setShowPreview(false)} // Only close the preview, don't reset form
        invoiceData={{ ...formData, invoice_status: "Pending Billing" }}
        invoiceItems={invoiceItems}
        additionalCharges={showAdditionalCharges ? additionalCharges : []}
        clientData={selectedClient}
        branchData={selectedBranch}
        driverData={selectedDriver}
        onPrint={printInvoice} // Should not reset form
        onDownload={downloadInvoice} // Should not reset form
        onSaveAsDraft={saveAsDraftAndRedirect} // This one does redirect intentionally
      />

      <div className="max-w-[1060px] mx-auto mb-20">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl leading-6">
                Invoice Information
              </CardTitle>
              <CardDescription className="font-light">
                Enter the basic information for this invoice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    readOnly
                    value={formData.invoiceNumber.toUpperCase()}
                    className="bg-[hsl(var(--muted))] invoice-number-font-light"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="poNumber">PO #</Label>
                  <Input
                    id="poNumber"
                    name="poNumber"
                    className="invoice-number-font-light"
                    value={formData.poNumber}
                    onChange={handleChange}
                    placeholder="Purchase Order Number"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <DatePicker
                    value={safeParseDate(formData.invoiceDate) || new Date()}
                    onChange={handleInvoiceDateChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <DatePicker
                    value={safeParseDate(formData.dueDate)}
                    onChange={handleDueDateChange}
                    placeholder="Select due date"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clientId">Client *</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={async (value) => {
                      console.log("Selected client ID:", value);

                      // Find and store the selected client object
                      const client = clients.find((c) => c.id === value);
                      console.log("Selected client object:", client);

                      setSelectedClient(client);

                      // Update form data
                      setFormData((prev) => ({ ...prev, clientId: value }));

                      // Fetch branches
                      console.log("Fetching branches for client:", value);
                      fetchBranches(value);

                      // Generate a new invoice number based on the selected client
                      console.log(
                        "Generating invoice number for client:",
                        value
                      );

                      // Use the value directly instead of formData.clientId
                      try {
                        const { invoiceNumber, error } =
                          await generateInvoiceNumberUtil(value);

                        if (error) {
                          console.error(
                            "Error generating invoice number:",
                            error
                          );
                        } else {
                          console.log(
                            "Generated invoice number:",
                            invoiceNumber
                          );
                          setFormData((prev) => ({ ...prev, invoiceNumber }));
                        }
                      } catch (err) {
                        console.error(
                          "Exception generating invoice number:",
                          err
                        );
                        const fallbackNum = `INV-error-${new Date().getTime()}`;
                        setFormData((prev) => ({
                          ...prev,
                          invoiceNumber: fallbackNum,
                        }));
                      }
                    }}
                    disabled={isLoading || isSubmitting}
                  >
                    <SelectTrigger id="clientId" className="w-full">
                      <SelectValue
                        placeholder={
                          isLoading ? "Loading clients..." : "Select Client"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="no-clients" disabled>
                          No clients available
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.client_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="branchId">Branch *</Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => {
                      // Find and store the selected branch object
                      const branch = branches.find((b) => b.id === value);
                      setSelectedBranch(branch);

                      // Update form data
                      setFormData((prev) => ({ ...prev, branchId: value }));
                    }}
                    disabled={!formData.clientId || isLoading || isSubmitting}
                  >
                    <SelectTrigger id="branchId" className="w-full">
                      <SelectValue
                        placeholder={
                          isLoading ? "Loading branches..." : "Select Branch"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.length === 0 ? (
                        <SelectItem value="no-branches" disabled>
                          No branches available for this client
                        </SelectItem>
                      ) : (
                        branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.clientId && branches.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      This client has no branches. Please add a branch for this
                      client first.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driverId">Assigned Driver</Label>
                <Select
                  value={formData.driverId}
                  onValueChange={(value) => {
                    // Find and store the selected driver object
                    const driver = drivers.find((d) => d.id === value);
                    setSelectedDriver(driver);

                    // Update form data
                    setFormData((prev) => ({ ...prev, driverId: value }));
                  }}
                  disabled={isLoading || isSubmitting}
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

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add any relevant notes here"
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fileUpload">File Upload</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-sm text-lg"
                />
                <p className="text-sm text-neutral-500 mt-1 font-light pl-1">
                  Accepted formats: csv, doc, docx, jpeg, jpg, md, odt, pdf,
                  png, txt, webp, xlsx (max 10MB)
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl leading-6">
                Invoice Items
              </CardTitle>
              <CardDescription className={"font-extralight"}>
                Add items to this invoice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {invoiceItems.map((item, index) => (
                <Card
                  key={index}
                  className="border border-neutral-750 relative shadow-xl"
                >
                  {invoiceItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="absolute top-4 right-2 p-2 h-8 w-8 text-neutral-500 hover:text-destructive"
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
                  <CardContent className="space-y-4"></CardContent>

                  {/* ************************************ */}
                  {/* >>>>> Pickup Location >>>>> */}
                  {/* ************************************ */}
                  <CardContent className="p-4 pt-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor={`pickupLocation-${index}`}>
                          Pickup Location *
                        </Label>
                        <AddressAutocomplete
                          id={`pickupLocation-${index}`}
                          value={item.pickupLocation}
                          onChange={(value) =>
                            handleItemChange(index, "pickupLocation", value)
                          }
                          disabled={isSubmitting}
                          placeholder="Enter pickup address"
                          className="rounded-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`dropoffLocation-${index}`}>
                          Drop-off Location *
                        </Label>
                        <AddressAutocomplete
                          id={`dropoffLocation-${index}`}
                          value={item.dropoffLocation}
                          onChange={(value) =>
                            handleItemChange(index, "dropoffLocation", value)
                          }
                          disabled={isSubmitting}
                          placeholder="Enter drop-off address"
                          className="rounded-sm"
                        />
                      </div>
                    </div>

                    {/* Display distance, duration, and fuel cost if available */}
                    {item.distance && item.duration && (
                      <div className="col-span-2">
                        <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-md">
                          <div className="flex flex-wrap gap-2">
                            <span>
                              <span className="font-medium">Distance:</span>{" "}
                              {item.distance.text}
                            </span>
                            <span className="mx-1">•</span>
                            <span>
                              <span className="font-medium">Est. time:</span>{" "}
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
                        disabled={isSubmitting}
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
                          disabled={isSubmitting}
                          className="rounded-sm invoice-number-font-light"
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
                          disabled={isSubmitting}
                          className="rounded-sm invoice-number-font-light"
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
                          disabled={isSubmitting}
                          className="rounded-sm invoice-number-font-light"
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
                        disabled={isSubmitting}
                        className="rounded-sm"
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addInvoiceItem}
                className="mt-2"
                disabled={isSubmitting}
              >
                + Add Another Item
              </Button>
            </CardContent>
          </Card>

          {/* Additional Charges */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Additional Charges</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleAdditionalCharges}
                  disabled={isSubmitting}
                >
                  {showAdditionalCharges ? "- Hide" : "+ Show"}
                </Button>
              </div>
            </CardHeader>
            {showAdditionalCharges && (
              <CardContent className="space-y-6">
                {additionalCharges.map((charge, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-neutral-750 rounded-lg relative"
                  >
                    {additionalCharges.length > 1 && (
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addAdditionalCharge}
                  disabled={isSubmitting}
                >
                  + Add Additional Charge
                </Button>
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
                <Button
                  type="button"
                  onClick={previewInvoice}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Preview"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CreateInvoice;
