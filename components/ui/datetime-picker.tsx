'use client';

import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateTimePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  showTimeSelect?: boolean;
  dateFormat?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: boolean;
}

export default function DateTimePicker({
  selected,
  onChange,
  placeholder = "Select date...",
  showTimeSelect = true,
  dateFormat = "PPP at pp",
  className,
  disabled = false,
  minDate,
  maxDate,
  error = false
}: DateTimePickerProps) {
  return (
    <div className="relative">
      <DatePicker
        selected={selected}
        onChange={onChange}
        showTimeSelect={showTimeSelect}
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat={showTimeSelect ? "MM/dd/yyyy h:mm aa" : "MM/dd/yyyy"}
        placeholderText={placeholder}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive-500 focus-visible:ring-destructive-500",
          className
        )}
        popperClassName="z-50"
        calendarClassName="shadow-lg border border-border rounded-lg"
        wrapperClassName="w-full"
      />
      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtle-foreground pointer-events-none" />
    </div>
  );
}