// File: src/lib/form-utils.js

import * as React from "react";
import { useFormContext } from "react-hook-form";

// Create a context for form field state
export const FormFieldContext = React.createContext({});

// Create a context for form item state
export const FormItemContext = React.createContext({});

// Hook to access form field properties
export const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  };
};
