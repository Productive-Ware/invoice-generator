// File: src/components/DatePickerTest.jsx

import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

function DatePickerTest() {
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(null);
  const [formValues, setFormValues] = useState({
    invoiceNumber: "INV-2025-05-06-001",
    poNumber: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", {
      ...formValues,
      invoiceDate,
      dueDate,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Date Picker Test</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formValues.invoiceNumber}
                  onChange={handleInputChange}
                  readOnly
                  className="bg-[hsl(var(--muted))]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="poNumber">PO #</Label>
                <Input
                  id="poNumber"
                  name="poNumber"
                  value={formValues.poNumber}
                  onChange={handleInputChange}
                  placeholder="Purchase Order Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <DatePicker value={invoiceDate} onChange={setInvoiceDate} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="Select due date"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Submit Test Form</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Display current values */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Current Values</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-neutral-800 p-4 rounded-md overflow-auto">
            {JSON.stringify(
              {
                ...formValues,
                invoiceDate: invoiceDate?.toISOString(),
                dueDate: dueDate?.toISOString(),
              },
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default DatePickerTest;
