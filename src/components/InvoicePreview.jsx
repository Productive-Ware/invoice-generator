// File: src/components/InvoicePreview.jsx

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

function InvoicePreview({
  open,
  onClose,
  invoiceData,
  invoiceItems,
  additionalCharges,
  clientData,
  branchData,
  driverData,
  onPrint,
  onDownload,
  onSaveAsDraft,
}) {
  // Calculate totals
  const calculateSubtotal = () => {
    return invoiceItems.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0);
    }, 0);
  };

  const calculateAdditionalChargesTotal = () => {
    return additionalCharges.reduce((total, charge) => {
      return total + (parseFloat(charge.amount) || 0);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateAdditionalChargesTotal();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-10 bg-background pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Invoice Preview</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Review your invoice before finalizing
              </DialogDescription>
            </div>
            <div className="flex space-x-2">
              {invoiceData.invoice_status === "Pending Billing" && (
                <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-md text-sm font-medium">
                  DRAFT
                </span>
              )}
              <Button variant="outline" onClick={onClose}>
                Edit
              </Button>
              {onSaveAsDraft && (
                <Button variant="secondary" onClick={onSaveAsDraft}>
                  Save as Draft
                </Button>
              )}
              <Button onClick={onPrint}>Print</Button>
              <Button onClick={onDownload}>Download PDF</Button>
            </div>
          </div>
        </DialogHeader>

        <div
          id="invoice-preview-content"
          className="p-6 bg-white text-black rounded-md"
          style={{
            color: "#000000",
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* Invoice Header */}
          <div className="flex justify-between border-b border-neutral-200 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">INVOICE</h1>
              <p className="text-neutral-600">
                <span className="font-bold">Invoice Number:</span>{" "}
                {invoiceData.invoiceNumber}
              </p>
              {invoiceData.poNumber && (
                <p className="text-neutral-500">
                  <span className="font-bold">PO Number:</span>{" "}
                  {invoiceData.poNumber}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-neutral-500">
                <span className="font-bold">Invoice Date:</span>{" "}
                {formatDate(invoiceData.invoiceDate)}
              </p>
              {invoiceData.dueDate && (
                <p className="text-neutral-500">
                  Due Date: {formatDate(invoiceData.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Client and Company Information */}
          <div className="grid grid-cols-2 gap-10 mb-6">
            <div>
              <h2 className="font-bold text-neutral-700 mb-2">Bill To:</h2>
              {clientData ? (
                <div>
                  <p className="font-medium">{clientData.client_name}</p>
                  {branchData && (
                    <p>
                      {branchData.branch_name}{" "}
                      <em className="text-sm text-neutral-500">(Branch)</em>
                    </p>
                  )}
                  {branchData && branchData.branch_address && (
                    <p className="text-sm">{branchData.branch_address}</p>
                  )}
                </div>
              ) : (
                <p className="text-neutral-500">No client selected</p>
              )}
            </div>
            <div>
              <h2 className="font-bold text-neutral-700 mb-2">From:</h2>
              <p className="font-medium">
                Split Second Towing & Transport, inc.
              </p>
              <p className="text-sm">7203 E. Broadway Ave.</p>
              <p className="text-sm">Tampa, FL 33619</p>
              <p className="text-sm">(813) 661-0660 • (813) 808-3018</p>
              {/* Driver Information if available */}
              {driverData && (
                <div className="mb-6 bg-neutral-50 rounded-md mt-2">
                  <h2 className="font-bold text-neutral-700 mb-2">
                    Driver:{" "}
                    <span className="font-light">
                      {driverData.profiles?.full_name || "Unknown Driver"}
                    </span>
                  </h2>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-6">
            <h2 className="font-bold text-neutral-700 mb-2">Invoice Items:</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-200 text-neutral-700">
                  <th className="py-2 px-2 text-left">Description</th>
                  <th className="py-2 px-2 text-left">Item/Model/Serial</th>
                  <th className="py-2 px-2 text-left">Pickup Location</th>
                  <th className="py-2 px-2 text-left">Destination</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-neutral-200 align-text-top"
                  >
                    <td className="py-2 px-2">
                      {item.itemDescription || "N/A"}
                    </td>
                    <td className="py-2 px-2">
                      {item.itemNumber && (
                        <div className="text-nowrap mb-1">
                          Item: {item.itemNumber}
                        </div>
                      )}
                      {item.modelNumber && (
                        <div className="text-nowrap mb-1">
                          Model: {item.modelNumber}
                        </div>
                      )}
                      {item.serialNumber && (
                        <div className="text-nowrap">
                          Serial: {item.serialNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {item.pickupLocation || "N/A"}
                    </td>
                    <td className="py-2 px-4">
                      {item.dropoffLocation || "N/A"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      ${parseFloat(item.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional Charges if any */}
          {additionalCharges &&
            additionalCharges.length > 0 &&
            additionalCharges[0].description && (
              <div className="mb-6">
                <h2 className="font-bold text-neutral-700 mb-2">
                  Additional Charges:
                </h2>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-700">
                      <th className="py-2 px-4 text-left">Description</th>
                      <th className="py-2 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {additionalCharges.map((charge, index) => (
                      <tr key={index} className="border-b border-neutral-200">
                        <td className="py-2 px-4">
                          {charge.description || "N/A"}
                        </td>
                        <td className="py-2 px-4 text-right">
                          ${parseFloat(charge.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              {additionalCharges &&
                additionalCharges.length > 0 &&
                additionalCharges[0].description && (
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Additional Charges:</span>
                    <span>${calculateAdditionalChargesTotal().toFixed(2)}</span>
                  </div>
                )}
              <div className="flex justify-between py-2 border-t border-neutral-200 font-bold">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoiceData.notes && (
            <div className="mt-8 pt-4 border-t border-neutral-200">
              <h2 className="font-bold text-neutral-700 mb-2">Notes:</h2>
              <p>{invoiceData.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-neutral-200 text-center text-neutral-500 text-sm">
            <p>Thank you for choosing Split Second!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InvoicePreview;
