// File: src/utils/invoicePrinter.js

/**
 * Print multiple invoices
 * @param {Array} invoices - Array of invoice data
 * @param {Object} options - Printing options
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */

export async function printInvoice(options = {}) {
  const {
    elementId = "invoice-preview-content",
    title = "Invoice",
    styles = {},
  } = options;

  try {
    // Get the element to print
    const content = document.getElementById(elementId);
    if (!content) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Create print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Please allow pop-ups to print the invoice");
    }

    // Build print document
    const printDocument = createPrintDocument(content, title, styles);

    // Write content to print window
    printWindow.document.write(printDocument);
    printWindow.document.close();

    // Wait for content to load before printing
    printWindow.onload = function () {
      printWindow.focus();
      printWindow.print();
    };

    return { success: true, error: null };
  } catch (error) {
    console.error("Error printing invoice:", error);
    return { success: false, error };
  }
}

/**
 * Create a formatted document for printing
 * @param {HTMLElement} content - The content to print
 * @param {string} title - Document title
 * @param {Object} customStyles - Custom styles
 * @returns {string} HTML document for printing
 */
function createPrintDocument(content, title, customStyles = {}) {
  const defaultStyles = `
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: black;
      background-color: white;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1em;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .invoice-header {
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .invoice-info {
      font-size: 14px;
    }
    .company-info {
      margin-bottom: 20px;
    }
    .client-info {
      margin-bottom: 20px;
    }
    .totals {
      text-align: right;
      margin-top: 20px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body {
        margin: 0;
        padding: 10mm;
      }
      .no-print {
        display: none !important;
      }
      @page {
        margin: 0;
        size: A4;
      }
    }
  `;

  // Merge default and custom styles
  const combinedStyles = { ...defaultStyles, ...customStyles };
  const styleString = Object.entries(combinedStyles)
    .map(([selector, rules]) => `${selector} { ${rules} }`)
    .join("\n");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <style>
          ${styleString}
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `;
}

/**
 * Show print preview in a modal
 * @param {Object} options - Preview options
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function showPrintPreview(options = {}) {
  const {
    elementId = "invoice-preview-content",
    onConfirm,
    onCancel,
  } = options;

  try {
    // Create preview modal
    const modal = document.createElement("div");
    modal.className = "print-preview-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    // Create preview container
    const container = document.createElement("div");
    container.style.cssText = `
      background: white;
      width: 80%;
      height: 80%;
      max-width: 800px;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement("div");
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <h3 style="margin: 0;">Print Preview</h3>
      <div>
        <button id="print-cancel" style="margin-right: 8px;">Cancel</button>
        <button id="print-confirm">Print</button>
      </div>
    `;

    // Create preview area
    const previewArea = document.createElement("div");
    previewArea.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 20px;
      background: #f5f5f5;
    `;

    // Get content and clone it
    const content = document.getElementById(elementId);
    if (!content) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const clonedContent = content.cloneNode(true);
    previewArea.appendChild(clonedContent);

    // Assemble modal
    container.appendChild(header);
    container.appendChild(previewArea);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Setup event handlers
    document.getElementById("print-confirm").onclick = async () => {
      document.body.removeChild(modal);
      if (onConfirm) {
        await onConfirm();
      } else {
        await printInvoice(options);
      }
    };

    document.getElementById("print-cancel").onclick = () => {
      document.body.removeChild(modal);
      if (onCancel) onCancel();
    };

    return { success: true, error: null };
  } catch (error) {
    console.error("Error showing print preview:", error);
    return { success: false, error };
  }
}

/**
 * Print multiple invoices
 * @param {Array} invoices - Array of invoice data
 * @param {Object} options - Printing options
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function printMultipleInvoices(invoices, options = {}) {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Please allow pop-ups to print invoices");
    }

    // Extract options
    const {
      title = "Multiple Invoices",
      pageBreaks = true,
      styles = {},
    } = options;

    // Create combined document
    let combinedHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              .page-break {
                page-break-after: always;
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: black;
              background-color: white;
            }
            ${Object.entries(styles)
              .map(([selector, rules]) => `${selector} { ${rules} }`)
              .join("\n")}
          </style>
        </head>
        <body>
    `;

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const isLastInvoice = i === invoices.length - 1;

      // Add page break class if enabled and not the last invoice
      const pageBreakClass = pageBreaks && !isLastInvoice ? "page-break" : "";

      combinedHTML += `
        <div class="${pageBreakClass}">
          <!-- Invoice content goes here -->
          <h1>Invoice ${invoice.invoice_num}</h1>
          <!-- More invoice details -->
        </div>
      `;
    }

    combinedHTML += `
        </body>
      </html>
    `;

    printWindow.document.write(combinedHTML);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.focus();
      printWindow.print();
    };

    return { success: true, error: null };
  } catch (error) {
    console.error("Error printing multiple invoices:", error);
    return { success: false, error };
  }
}
