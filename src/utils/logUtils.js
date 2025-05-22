// File: src/utils/logUtils.js

import supabase from "./supabaseClient";

/**
 * Invoice change types enum
 * @readonly
 * @enum {string}
 */
export const INVOICE_CHANGE_TYPES = {
  CREATE: "create", // Initial creation
  DRAFT_CREATE: "draft_create", // Specifically created as draft
  DRAFT_UPDATE: "draft_update", // Update while in draft status
  FINALIZE: "finalize", // Change from draft to finalized
  UPDATE: "update", // General update
  STATUS_CHANGE: "status_change", // Any status change
  PAYMENT: "payment", // Payment recorded
  DELETE: "delete", // Invoice deleted
  VIEW: "view", // Invoice viewed
  PDF_GENERATED: "pdf_generated", // PDF generated
  PRINT: "print", // Invoice printed
  EMAIL: "email", // Invoice emailed
  USER_LOGIN: "user_login", // User logged in
  USER_LOGOUT: "user_logout", // User logged out
  USER_UPDATE: "user_update", // User info updated
  USER_PASSWORD_CHANGE: "user_password_change", // Password changed
  ROLE_CHANGE: "role_change", // User role changed
  DRIVER_ASSIGNED: "driver_assigned", // Driver assigned to invoice
  DRIVER_REMOVED: "driver_removed", // Driver removed from invoice
};

/**
 * Log an action to the system_logs table
 * @param {Object} logData - The log data
 * @param {string} logData.userId - The ID of the user performing the action
 * @param {string} logData.action - The action being performed (e.g., "login", "create", "update")
 * @param {string} logData.entityType - The type of entity affected (e.g., "user", "invoice")
 * @param {string} logData.entityId - The ID of the entity affected
 * @param {Object} logData.details - Additional details about the action
 * @param {string} [logData.description] - Optional description of the action
 * @returns {Promise<Object>} - The result from Supabase
 */
export async function logSystemAction(logData) {
  try {
    const { userId, action, entityType, entityId, details, description } =
      logData;

    if (!userId || !action || !entityType) {
      console.error("Missing required log data parameters");
      return { error: "Missing required parameters" };
    }

    const { data, error } = await supabase.from("system_logs").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: {
        ...details,
        description: description || `${action} on ${entityType}`,
      },
    });

    if (error) {
      console.error("Error logging action:", error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error("Exception logging action:", err);
    return { error: err };
  }
}

/**
 * Log an invoice change
 * @param {Object} logData - The log data
 * @param {string} logData.invoiceId - The ID of the invoice
 * @param {string} logData.userId - The ID of the user making the change
 * @param {Object} logData.previousData - The previous state of the invoice
 * @param {Object} logData.newData - The new state of the invoice
 * @param {string} logData.changeType - The type of change (create, update, finalize)
 * @param {string} [logData.description] - Optional description of the change
 * @returns {Promise<Object>} - The result from Supabase
 */
export async function logInvoiceChange(logData) {
  try {
    const {
      invoiceId,
      userId,
      previousData,
      newData,
      changeType,
      description,
    } = logData;

    if (!invoiceId || !userId || !changeType) {
      console.error("Missing required invoice log parameters");
      return { error: "Missing required parameters" };
    }

    // First log to invoice_change_logs for detailed changes
    const { data, error } = await supabase.from("invoice_change_logs").insert({
      invoice_id: invoiceId,
      changed_by: userId,
      previous_data: previousData || null,
      new_data: newData || null,
      change_type: changeType,
      description: description || null,
    });

    if (error) {
      console.error("Error logging invoice change:", error);
      return { error };
    }

    // Also log to the general system logs for a consolidated view
    await logSystemAction({
      userId,
      action: changeType,
      entityType: "invoice",
      entityId: invoiceId,
      details: {
        invoiceId,
        changeType,
        previousStatus: previousData?.invoice_status,
        newStatus: newData?.invoice_status,
        invoiceNumber: newData?.invoice_num || previousData?.invoiceNumber, // Add this line
      },
      description,
    });

    return { data };
  } catch (err) {
    console.error("Exception logging invoice change:", err);
    return { error: err };
  }
}

/**
 * Log user actions like login, logout, settings changes
 * @param {Object} logData - The log data
 * @param {string} logData.userId - The ID of the user
 * @param {string} logData.actionType - The type of action (login, logout, update)
 * @param {Object} [logData.details] - Additional details about the action
 * @returns {Promise<Object>} - The result from Supabase
 */
export async function logUserAction(logData) {
  try {
    const { userId, actionType, details } = logData;

    if (!userId || !actionType) {
      console.error("Missing required user log parameters");
      return { error: "Missing required parameters" };
    }

    return await logSystemAction({
      userId,
      action: actionType,
      entityType: "user",
      entityId: userId,
      details: details || {},
      description: `User ${actionType}`,
    });
  } catch (err) {
    console.error("Exception logging user action:", err);
    return { error: err };
  }
}

/**
 * Log when an invoice is viewed
 * @param {string} invoiceId - The ID of the invoice
 * @param {string} userId - The ID of the user viewing the invoice
 * @param {string} invoiceNumber - The invoice number (for logging)
 * @returns {Promise<Object>} - The result from Supabase
 */
export async function logInvoiceView(invoiceId, userId, invoiceNumber) {
  try {
    return await logSystemAction({
      userId,
      action: INVOICE_CHANGE_TYPES.VIEW,
      entityType: "invoice",
      entityId: invoiceId,
      details: { invoiceNumber },
      description: `Viewed invoice ${invoiceNumber}`,
    });
  } catch (err) {
    console.error("Exception logging invoice view:", err);
    return { error: err };
  }
}

/**
 * Log when an invoice PDF is generated or printed
 * @param {string} invoiceId - The ID of the invoice
 * @param {string} userId - The ID of the user
 * @param {string} actionType - Either "pdf_generated" or "print"
 * @param {string} invoiceNumber - The invoice number
 * @returns {Promise<Object>} - The result from Supabase
 */
export async function logInvoiceDocument(
  invoiceId,
  userId,
  actionType,
  invoiceNumber
) {
  try {
    const actionMap = {
      [INVOICE_CHANGE_TYPES.PDF_GENERATED]: "Generated PDF for",
      [INVOICE_CHANGE_TYPES.PRINT]: "Printed",
      [INVOICE_CHANGE_TYPES.EMAIL]: "Emailed",
    };

    const description = `${
      actionMap[actionType] || actionType
    } invoice ${invoiceNumber}`;

    return await logSystemAction({
      userId,
      action: actionType,
      entityType: "invoice",
      entityId: invoiceId,
      details: { invoiceNumber },
      description,
    });
  } catch (err) {
    console.error(`Exception logging invoice ${actionType}:`, err);
    return { error: err };
  }
}

/**
 * Helper function to determine the appropriate change type based on invoice status
 * @param {Object} previousData - Previous invoice data
 * @param {Object} newData - New invoice data
 * @returns {string} - The appropriate change type
 */
export function determineInvoiceChangeType(previousData, newData) {
  // If there's no previous data, it's a creation
  if (!previousData) {
    return newData.invoice_status === "Pending Billing"
      ? INVOICE_CHANGE_TYPES.DRAFT_CREATE
      : INVOICE_CHANGE_TYPES.CREATE;
  }

  // If status changed, determine what kind of change
  if (previousData.invoice_status !== newData.invoice_status) {
    // If changing from "Pending Billing" to something else
    if (previousData.invoice_status === "Pending Billing") {
      return INVOICE_CHANGE_TYPES.FINALIZE;
    }
    // If changing to "Pending Billing" from something else
    if (newData.invoice_status === "Pending Billing") {
      return INVOICE_CHANGE_TYPES.DRAFT_CREATE;
    }
    // Any other status change
    return INVOICE_CHANGE_TYPES.STATUS_CHANGE;
  }

  // If status is the same but still "Pending Billing", it's a draft update
  if (newData.invoice_status === "Pending Billing") {
    return INVOICE_CHANGE_TYPES.DRAFT_UPDATE;
  }

  // Otherwise it's a regular update
  return INVOICE_CHANGE_TYPES.UPDATE;
}
