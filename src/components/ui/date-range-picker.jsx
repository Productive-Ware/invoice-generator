// File: src/components/ui/date-range-picker.jsx

import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DateRangePicker({
  className,
  value,
  onChange,
  placeholder = "Select date range",
  disabled = false,
  align = "start",
}) {
  const [open, setOpen] = useState(false);

  // Handler for clearing the date range
  const handleClear = (e) => {
    e.stopPropagation(); // Prevent the popover from opening
    onChange(null);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal p-4 h-4 rounded-xs relative",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              <>
                <span className="flex-1">
                  {value.to ? (
                    <>
                      {format(value.from, "LLL dd, y")} -{" "}
                      {format(value.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(value.from, "LLL dd, y")
                  )}
                </span>
                <div
                  role="button"
                  className="h-5 w-5 absolute right-3 hover:bg-neutral-700/10 rounded-full flex items-center justify-center cursor-pointer"
                  onClick={handleClear}
                  style={{
                    pointerEvents: disabled ? "none" : "auto",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Clear date range</span>
                </div>
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(newValue) => {
              onChange(newValue);
              if (newValue?.from && newValue?.to) {
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            disabled={disabled}
          />
          {value && (
            <div className="p-3 border-t border-border flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Reset
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
