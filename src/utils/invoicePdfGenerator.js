// File: src/utils/invoicePdfGenerator.js

import jsPDF from "jspdf";

/**
 * Generate a professional invoice PDF with enhanced formatting
 * @param {Object} invoiceData - The invoice data
 * @param {Object} options - Generation options
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function generateEnhancedInvoicePDF(invoiceData, options = {}) {
  const {
    fileName = `Invoice-${invoiceData.invoiceNumber}.pdf`,
    elementId = "invoice-preview-content",
    addWatermark = false,
    watermarkText = "DRAFT",
  } = options;

  try {
    // Get the invoice content element
    const content = document.getElementById(elementId);
    if (!content) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Extract all necessary data from the invoice preview element
    const extractedData = extractInvoiceData(content, invoiceData);

    // Create the PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Add metadata
    pdf.setProperties({
      title: `Invoice ${extractedData.invoiceNumber}`,
      subject: `Invoice for ${extractedData.clientName}`,
      author: "Split Second Towing & Transport, Inc.",
      creator: "Invoice Generator System",
    });

    // Generate professional invoice directly in PDF
    createProfessionalInvoice(pdf, extractedData);

    // Add watermark if requested
    if (addWatermark && watermarkText) {
      addPDFWatermark(pdf, watermarkText);
    }

    // Add page numbers
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    pdf.save(fileName);

    return { success: true, error: null };
  } catch (error) {
    console.error("Error generating enhanced PDF:", error);

    // Try fallback method
    try {
      return await generateSimplePDF(invoiceData, options);
    } catch (fallbackError) {
      console.error("Fallback PDF generation also failed:", fallbackError);
      return { success: false, error };
    }
  }
}

/**
 * Extract invoice data from HTML content
 * @param {HTMLElement} content - The invoice HTML content
 * @param {Object} invoiceData - Basic invoice data passed to the function
 * @returns {Object} Extracted invoice data
 */
function extractInvoiceData(content, invoiceData) {
  try {
    const extractedData = {
      invoiceNumber: invoiceData.invoiceNumber || "",
      clientName: invoiceData.clientName || "Client",
      date: "",
      dueDate: "",
      notes: "",
      items: [],
      additionalCharges: [],
      totals: {
        subtotal: 0,
        additionalChargesTotal: 0,
        total: 0,
      },
    };

    // Extract dates
    const dateElements = content.querySelectorAll("p, div, span");
    for (const el of dateElements) {
      const text = el.textContent.trim();

      if (text.includes("Invoice Date:")) {
        extractedData.date = text.replace("Invoice Date:", "").trim();
      }

      if (text.includes("Due Date:")) {
        extractedData.dueDate = text.replace("Due Date:", "").trim();
      }
    }

    // Try to extract invoice items
    const tables = content.querySelectorAll("table");
    if (tables.length > 0) {
      // Assume the first table contains invoice items
      const itemsTable = tables[0];
      const rows = itemsTable.querySelectorAll("tr");

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll("td");

        if (cells.length >= 5) {
          // Adjust based on your table structure
          const item = {
            description: cells[0].textContent.trim(),
            itemDetails: cells[1].textContent.trim(),
            pickupLocation: cells[2].textContent.trim(),
            dropoffLocation: cells[3].textContent.trim(),
            amount: cells[4].textContent
              .trim()
              .replace("$", "")
              .replace(",", ""),
          };

          extractedData.items.push(item);

          // Add to subtotal
          extractedData.totals.subtotal += parseFloat(item.amount) || 0;
        }
      }
    }

    // Extract additional charges if available
    if (tables.length > 1) {
      const chargesTable = tables[1];
      const rows = chargesTable.querySelectorAll("tr");

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll("td");

        if (cells.length >= 2) {
          const charge = {
            description: cells[0].textContent.trim(),
            amount: cells[1].textContent
              .trim()
              .replace("$", "")
              .replace(",", ""),
          };

          extractedData.additionalCharges.push(charge);

          // Add to additional charges total
          extractedData.totals.additionalChargesTotal +=
            parseFloat(charge.amount) || 0;
        }
      }
    }

    // Extract total
    const totalElements = content.querySelectorAll("div, span");
    for (const el of totalElements) {
      const text = el.textContent.trim();

      if (text.includes("Total:")) {
        const totalMatch = text.match(/Total:\s*\$?([\d,.]+)/);
        if (totalMatch) {
          extractedData.totals.total = parseFloat(
            totalMatch[1].replace(",", "")
          );
        }
      }
    }

    // If we couldn't extract the total, calculate it
    if (!extractedData.totals.total) {
      extractedData.totals.total =
        extractedData.totals.subtotal +
        extractedData.totals.additionalChargesTotal;
    }

    // Extract notes if available
    const notesElements = content.querySelectorAll("div, p");
    for (const el of notesElements) {
      const text = el.textContent.trim();

      if (text.includes("Notes:")) {
        extractedData.notes = text.replace("Notes:", "").trim();
      }
    }

    return extractedData;
  } catch (error) {
    console.warn("Error extracting invoice data:", error);

    // Return a minimal data structure if extraction fails
    return {
      invoiceNumber: invoiceData.invoiceNumber || "",
      clientName: invoiceData.clientName || "Client",
      date: new Date().toLocaleDateString(),
      items: [],
      totals: {
        subtotal: 0,
        additionalChargesTotal: 0,
        total: 0,
      },
    };
  }
}

/**
 * Create a professional invoice in the PDF
 * @param {jsPDF} pdf - The PDF document
 * @param {Object} data - The invoice data
 */
function createProfessionalInvoice(pdf, data) {
  // Set basic properties
  pdf.setFont("helvetica");
  pdf.setTextColor(0, 0, 0);

  // Add invoice header
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE", 105, 20, { align: "center" });

  // Add company information and client information sections
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  // Invoice info block
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Invoice Number:", 15, 35);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.invoiceNumber, 50, 35);

  pdf.setFont("helvetica", "bold");
  pdf.text("Date:", 15, 42);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.date || new Date().toLocaleDateString(), 50, 42);

  if (data.dueDate) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Due Date:", 15, 49);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.dueDate, 50, 49);
  }

  // Draw a line under the header section
  pdf.setDrawColor(200, 200, 200);
  pdf.line(15, 55, 195, 55);

  // Company info ("From")
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("From:", 15, 65);
  pdf.setFont("helvetica", "bold");
  pdf.text("Split Second Towing & Transport, Inc.", 15, 72);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("7203 E. Broadway Ave.", 15, 78);
  pdf.text("Tampa, FL 33619", 15, 84);
  pdf.text("(813) 661-0660 • (813) 808-3018", 15, 90);

  // Client info ("Bill To")
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Bill To:", 115, 65);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.clientName, 115, 72);
  pdf.setFont("helvetica", "normal");

  // Branch information if available
  if (data.branchName) {
    pdf.setFontSize(10);
    pdf.text(`${data.branchName} (Branch)`, 115, 78);
  }

  if (data.branchAddress) {
    pdf.setFontSize(10);
    pdf.text(data.branchAddress, 115, 84);
  }

  // Draw a line under the company and client information
  pdf.line(15, 100, 195, 100);

  // Items table header
  let yPos = 110;

  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPos, 180, 8, "F");

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Description", 17, yPos + 6);
  pdf.text("Details", 70, yPos + 6);
  pdf.text("Pickup", 100, yPos + 6);
  pdf.text("Destination", 140, yPos + 6);
  pdf.text("Amount", 190, yPos + 6, { align: "right" });

  // Draw a line under the header
  pdf.line(15, yPos + 8, 195, yPos + 8);

  // Items table rows
  yPos += 12;
  pdf.setFont("helvetica", "normal");

  // Draw items
  data.items.forEach((item, index) => {
    // Check if we need a page break (allow 40mm for totals section)
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;

      // Add continuation header
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Invoice Items (continued)", 105, yPos, { align: "center" });
      yPos += 10;

      // Draw header line
      pdf.line(15, yPos, 195, yPos);
      yPos += 5;
    }

    // Description (max 30 chars)
    const description = item.description || "N/A";
    const shortDesc =
      description.length > 30
        ? description.substring(0, 27) + "..."
        : description;
    pdf.text(shortDesc, 17, yPos);

    // Item details (model/serial numbers)
    const details = item.itemDetails || "";
    const shortDetails =
      details.length > 15 ? details.substring(0, 12) + "..." : details;
    pdf.text(shortDetails, 70, yPos);

    // Pickup location
    const pickup = item.pickupLocation || "N/A";
    const shortPickup =
      pickup.length > 20 ? pickup.substring(0, 17) + "..." : pickup;
    pdf.text(shortPickup, 100, yPos);

    // Destination
    const destination = item.dropoffLocation || "N/A";
    const shortDestination =
      destination.length > 20
        ? destination.substring(0, 17) + "..."
        : destination;
    pdf.text(shortDestination, 140, yPos);

    // Amount
    const amount = parseFloat(item.amount) || 0;
    pdf.text(`$${amount.toFixed(2)}`, 190, yPos, { align: "right" });

    // Increment position and draw a light separator line
    yPos += 8;

    // Add a light separator line between items
    if (index < data.items.length - 1) {
      pdf.setDrawColor(220, 220, 220);
      pdf.line(15, yPos - 4, 195, yPos - 4);
    }
  });

  // Additional charges section if present
  if (data.additionalCharges && data.additionalCharges.length > 0) {
    // Check if we need a page break
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    }

    // Add some space
    yPos += 5;

    // Section header
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Additional Charges", 15, yPos);
    yPos += 5;

    // Draw a line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, yPos, 195, yPos);
    yPos += 5;

    // Headers for additional charges
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPos, 180, 7, "F");
    pdf.text("Description", 17, yPos + 5);
    pdf.text("Amount", 190, yPos + 5, { align: "right" });
    yPos += 10;

    // Add additional charges
    pdf.setFont("helvetica", "normal");
    data.additionalCharges.forEach((charge) => {
      const description = charge.description || "N/A";
      const shortDesc =
        description.length > 50
          ? description.substring(0, 47) + "..."
          : description;
      pdf.text(shortDesc, 17, yPos);

      const amount = parseFloat(charge.amount) || 0;
      pdf.text(`$${amount.toFixed(2)}`, 190, yPos, { align: "right" });

      yPos += 8;
    });

    // Add some space
    yPos += 5;
  }

  // Totals section
  // Check if we need a page break
  if (yPos > 250) {
    pdf.addPage();
    yPos = 30;
  }

  // Draw a line above totals
  pdf.setDrawColor(200, 200, 200);
  pdf.line(120, yPos, 195, yPos);
  yPos += 8;

  // Subtotal
  pdf.setFont("helvetica", "normal");
  pdf.text("Subtotal:", 150, yPos);
  pdf.text(`$${data.totals.subtotal.toFixed(2)}`, 190, yPos, {
    align: "right",
  });
  yPos += 8;

  // Additional charges total if any
  if (data.totals.additionalChargesTotal > 0) {
    pdf.text("Additional Charges:", 150, yPos);
    pdf.text(`$${data.totals.additionalChargesTotal.toFixed(2)}`, 190, yPos, {
      align: "right",
    });
    yPos += 8;
  }

  // Total
  pdf.setDrawColor(200, 200, 200);
  pdf.line(150, yPos - 3, 195, yPos - 3);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total:", 150, yPos + 5);
  pdf.text(`$${data.totals.total.toFixed(2)}`, 190, yPos + 5, {
    align: "right",
  });

  // Notes section if present
  if (data.notes) {
    yPos += 15;
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes:", 15, yPos);
    pdf.setFont("helvetica", "normal");

    // Split long notes into multiple lines
    const noteLines = splitTextToLines(data.notes, 160, pdf);
    noteLines.forEach((line) => {
      yPos += 7;
      pdf.text(line, 15, yPos);
    });
  }

  // Footer
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Thank you for your business!", 105, 280, { align: "center" });
}

/**
 * Split text into multiple lines to fit width
 * @param {string} text - Text to split
 * @param {number} maxWidth - Maximum width in points
 * @param {jsPDF} pdf - PDF document for text measurement
 * @returns {string[]} Array of lines
 */
function splitTextToLines(text, maxWidth, pdf) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width =
      pdf.getStringUnitWidth(currentLine + " " + word) * pdf.getFontSize();

    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Add watermark to PDF
 * @param {jsPDF} pdf - The PDF document
 * @param {string} text - Watermark text
 */
function addPDFWatermark(pdf, text) {
  const pageCount = pdf.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(80);
    pdf.setFont("helvetica", "bold");

    // Add diagonal watermark
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.3 }));
    pdf.text(
      text,
      pdf.internal.pageSize.getWidth() / 2,
      pdf.internal.pageSize.getHeight() / 2,
      {
        angle: 45,
        align: "center",
      }
    );
    pdf.restoreGraphicsState();

    // Reset to default text color
    pdf.setTextColor(0, 0, 0);
  }
}

/**
 * Extremely simplified PDF generation as last resort
 * @param {Object} invoiceData - The invoice data
 * @param {Object} options - PDF options
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
async function generateSimplePDF(invoiceData, options = {}) {
  try {
    const pdf = new jsPDF();

    // Very simple invoice with minimal formatting
    pdf.setFontSize(22);
    pdf.text("INVOICE", 105, 20, { align: "center" });

    pdf.setFontSize(12);
    pdf.text(`Invoice #: ${invoiceData.invoiceNumber || "N/A"}`, 20, 40);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);

    pdf.text("Split Second Towing & Transport, Inc.", 20, 70);
    pdf.text(`Client: ${invoiceData.clientName || "Client"}`, 20, 80);

    pdf.text("This is a simplified invoice generated due to", 20, 100);
    pdf.text("formatting limitations.", 20, 110);

    pdf.save(options.fileName || "invoice.pdf");

    return { success: true, error: null };
  } catch (error) {
    console.error("Simple PDF generation failed:", error);
    return { success: false, error };
  }
}

/**
 * Generate a PDF with multiple invoices
 * @param {Array} invoicesData - Array of invoice data objects
 * @param {Object} options - Generation options
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function generateMultipleInvoicesPDF(invoicesData, options = {}) {
  const {
    fileName = `Invoices-Batch-${new Date().toISOString().split("T")[0]}.pdf`,
    addPageNumbers = true,
    tableOfContents = true,
  } = options;

  try {
    // Create PDF document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Add metadata
    pdf.setProperties({
      title: "Invoice Batch",
      subject: "Multiple Invoice Document",
      author: "Split Second Towing & Transport, Inc.",
      creator: "Invoice Generator System",
    });

    // Add table of contents if requested
    if (tableOfContents) {
      // Add title
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Invoices - Table of Contents", 105, 20, { align: "center" });

      // Add invoice list
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      let yPos = 40;

      // Add a line for each invoice
      invoicesData.forEach((data, index) => {
        const invoice = data.invoice;
        const client = data.client;
        const invoiceText = `${index + 1}. Invoice ${invoice.invoice_num} - ${
          client.client_name
        }`;

        // If we're running out of space on the page, go to next page
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.text(invoiceText, 20, yPos);
        yPos += 10;
      });

      // Add a page for the start of invoices
      pdf.addPage();
    }

    // Process each invoice
    for (let i = 0; i < invoicesData.length; i++) {
      const data = invoicesData[i];
      const invoice = data.invoice;
      const items = data.items;
      const charges = data.charges;
      const client = data.client;
      const branch = data.branch;

      // Add a new page for each invoice except the first one if we're starting on a fresh page
      if (i > 0 || tableOfContents) {
        pdf.addPage();
      }

      // Create invoice data object
      const invoiceData = {
        invoiceNumber: invoice.invoice_num,
        clientName: client.client_name,
        branchName: branch?.branch_name || "",
        branchAddress: branch?.branch_address || "",
        date: new Date(invoice.invoice_date).toLocaleDateString(),
        dueDate: invoice.invoice_due
          ? new Date(invoice.invoice_due).toLocaleDateString()
          : "",
        notes: invoice.invoice_notes || "",
        items: items.map((item) => ({
          description: item.equip_desc || "",
          itemDetails: [
            item.equip_num ? `Item: ${item.equip_num}` : "",
            item.model_num ? `Model: ${item.model_num}` : "",
            item.serial_num ? `Serial: ${item.serial_num}` : "",
          ]
            .filter(Boolean)
            .join(", "),
          pickupLocation: item.pickup_address || "",
          dropoffLocation: item.dropoff_address || "",
          amount: item.amount || 0,
        })),
        additionalCharges:
          charges?.map((charge) => ({
            description: charge.description || "",
            amount: charge.amount || 0,
          })) || [],
        totals: {
          subtotal: items.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0),
            0
          ),
          additionalChargesTotal:
            charges?.reduce(
              (sum, charge) => sum + (parseFloat(charge.amount) || 0),
              0
            ) || 0,
          total: invoice.total || 0,
        },
      };

      // Ensure total is correct
      if (!invoiceData.totals.total) {
        invoiceData.totals.total =
          invoiceData.totals.subtotal +
          invoiceData.totals.additionalChargesTotal;
      }

      // Create the invoice in the PDF
      createProfessionalInvoice(pdf, invoiceData);

      // Add draft watermark if needed
      if (invoice.invoice_status === "Pending Billing") {
        addPDFWatermark(pdf, "DRAFT");
      }
    }

    // Add page numbers if requested
    if (addPageNumbers) {
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
    }

    // Save the PDF
    pdf.save(fileName);

    return { success: true, error: null };
  } catch (error) {
    console.error("Error generating multiple invoices PDF:", error);
    return { success: false, error };
  }
}

/**
 * Legacy function kept for backward compatibility
 */
export async function generateInvoicePDF(options) {
  console.warn(
    "generateInvoicePDF is deprecated, use generateEnhancedInvoicePDF instead"
  );
  return generateEnhancedInvoicePDF({ invoiceNumber: "Unknown" }, options);
}

/**
 * Generate and email invoice PDF
 * @param {Object} invoiceData - The invoice data
 * @param {string} recipientEmail - Email address to send to
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function generateAndEmailInvoicePDF(invoiceData, recipientEmail) {
  try {
    // Generate PDF first
    const pdfResult = await generateEnhancedInvoicePDF(invoiceData, {
      fileName: `Invoice-${invoiceData.invoiceNumber}.pdf`,
    });

    if (!pdfResult.success) {
      throw pdfResult.error;
    }

    // TODO: Implement email functionality using your backend service
    // This would typically involve sending the PDF to your backend
    // which would then email it using a service like SendGrid

    console.log(`Invoice PDF would be emailed to: ${recipientEmail}`);

    return { success: true, error: null };
  } catch (error) {
    console.error("Error generating and emailing PDF:", error);
    return { success: false, error };
  }
}
