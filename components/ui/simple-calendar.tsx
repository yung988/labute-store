'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SimpleCalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  orderDates?: Date[]; // Dny s objednávkami pro vizuální indikátory
  orderCounts?: Record<string, number>; // Počet objednávek pro každý den
}

const MONTHS = [
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
];

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function SimpleCalendar({
  selected,
  onSelect,
  className,
  orderDates = [],
  orderCounts = {},
}: SimpleCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(() => selected || new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  // Convert to Monday = 0, Sunday = 6
  const firstDayWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Create array of dates for the calendar
  const calendarDays: (Date | null)[] = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayWeek; i++) {
    calendarDays.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onSelect?.(today);
  };

  const clearSelection = () => {
    onSelect?.(undefined as any); // Clear selection
  };

  const handleDateClick = (date: Date) => {
    onSelect?.(date);
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    return date.toDateString() === selected.toDateString();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasOrders = (date: Date) => {
    return orderDates.some((orderDate) => orderDate.toDateString() === date.toDateString());
  };

  const getOrderCount = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return orderCounts[dateStr] || 0;
  };

  return (
    <div className={cn('p-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium">
            {MONTHS[month]} {year}
          </h3>
          {selected && (
            <p className="text-xs text-muted-foreground">{selected.toLocaleDateString('cs-CZ')}</p>
          )}
        </div>

        <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mb-3">
        <Button variant="outline" size="sm" className="h-6 text-xs flex-1" onClick={goToToday}>
          Dnes
        </Button>
        {selected && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={clearSelection}
            title="Zrušit výběr"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="h-6 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <div key={index} className="h-8 flex items-center justify-center">
            {date ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0 text-xs relative',
                  isSelected(date) &&
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  isToday(date) && !isSelected(date) && 'bg-accent text-accent-foreground',
                  hasOrders(date) && !isSelected(date) && 'font-semibold'
                )}
                onClick={() => handleDateClick(date)}
                title={hasOrders(date) ? `${getOrderCount(date)} objednávek` : undefined}
              >
                {date.getDate()}
                {hasOrders(date) && (
                  <div
                    className={cn(
                      'absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full',
                      isSelected(date) ? 'bg-primary-foreground' : 'bg-primary'
                    )}
                  />
                )}
              </Button>
            ) : (
              <div className="h-8 w-8" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      {orderDates.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Objednávky</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
