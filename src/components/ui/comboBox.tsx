"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ComboboxItem = {
  value: string;
  label: string;
  tags?: string[];
  isCustom?: boolean;
};

interface ComboboxProps {
  title: string;
  placeholder?: string;
  emptyText?: string;
  data: ComboboxItem[];
  className?: string;
  value?: string;
  onSelect?: (value: string) => void;
  onCreateNew?: (searchTerm: string) => void;
  onOpen?: () => void;
}

export function Combobox({
  title,
  placeholder = "Search...",
  data = [],
  className,
  value: controlledValue,
  onSelect,
  onCreateNew,
  onOpen,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(controlledValue || "");
  const [inputValue, setInputValue] = React.useState("");

  // Update internal value when controlled value changes
  React.useEffect(() => {
    setValue(controlledValue || "");
  }, [controlledValue]);

  // Reset the input value when the popover closes
  React.useEffect(() => {
    if (!open) {
      // Don't clear immediately to prevent flashing
      const timeout = setTimeout(() => {
        if (!open) setInputValue("");
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      // Special case for "create-new" option
      if (currentValue === "create-new" && onCreateNew && inputValue.trim()) {
        onCreateNew(inputValue.trim());
        setValue("");
        setOpen(false);
        return;
      }

      setValue(currentValue === value ? "" : currentValue);
      setOpen(false);
      if (onSelect) {
        onSelect(currentValue === value ? "" : currentValue);
      }
    },
    [value, onSelect, onCreateNew, inputValue]
  );

  // Filter data based on input value
  const filteredData = React.useMemo(() => {
    if (!inputValue.trim()) return data;
    const searchTerm = inputValue.toLowerCase().trim();
    return data.filter((item) => item.label.toLowerCase().includes(searchTerm));
  }, [data, inputValue]);

  // Function to handle input change
  const handleInputChange = React.useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && onOpen) {
      onOpen();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value ? data.find((item) => item.value === value)?.label : title}
          <ChevronsUpDown className="opacity-50 h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", className)}
        align="start"
        side="bottom"
        sideOffset={5}
        avoidCollisions={false}
        // onOpenAutoFocus={(e) => {
        //   // Prevent the default auto-focusing of the first item
        //   e.preventDefault();
        // }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
            onBlur={() => setOpen(false)}
          />
          <CommandList>
            <>
              {filteredData.length > 0 && (
                <CommandGroup heading="Existing exercises">
                  {filteredData.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={handleSelect}
                    >
                      <div className="flex flex-col">
                        <span>{item.label}</span>
                        {item.tags && item.tags.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {item.tags.join(", ")}
                          </span>
                        )}
                      </div>
                      {item.isCustom && (
                        <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-sm">
                          Custom
                        </span>
                      )}
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          value === item.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Create new">
                <CommandItem
                  value="create-new"
                  onSelect={handleSelect}
                  className="text-blue-600 dark:text-blue-400 data-[selected=true]:text-blue-600 dark:data-[selected=true]:text-blue-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create &quot;{inputValue.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            </>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
