"use client";

import React from 'react';
import { List } from 'react-window';
// @ts-expect-error - Missing type definitions
import InfiniteLoader from 'react-window-infinite-loader';
import { TableCell, TableHead, TableHeader, TableRow } from './table';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  width: number;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface VirtualizedTableProps<T> {
  items: T[];
  columns: Column<T>[];
  rowHeight?: number;
  containerHeight?: number;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => void;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  emptyMessage?: string;
}

/**
 * Virtualized table component for efficient rendering of large datasets
 * Uses react-window for virtualization and react-window-infinite-loader for infinite scrolling
 */
export function VirtualizedTable<T>({
  items,
  columns,
  rowHeight = 60,
  containerHeight = 600,
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage,
  onRowClick,
  className,
  emptyMessage = "Žádná data k zobrazení"
}: VirtualizedTableProps<T>) {

  // Check if item is loaded
  const isItemLoaded = (index: number) => {
    return !hasNextPage || index < items.length;
  };

  // Load more items when needed
  const loadMoreItems = isNextPageLoading ? () => {} : loadNextPage || (() => {});

  // Render individual row as React component
  const RowComponent = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];

    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="text-muted-foreground">
            {isNextPageLoading ? "Načítání..." : "Žádná data"}
          </div>
        </div>
      );
    }

    return (
      <div
        style={style}
        className={cn(
          "border-b hover:bg-muted/50 cursor-pointer transition-colors",
          onRowClick && "cursor-pointer"
        )}
        onClick={() => onRowClick?.(item, index)}
      >
        <TableRow className="flex w-full">
          {columns.map((column) => (
            <TableCell
              key={column.key}
              className={cn("flex-shrink-0 p-4", column.className)}
              style={{ width: column.width }}
            >
              {column.render(item, index)}
            </TableCell>
          ))}
        </TableRow>
      </div>
    );
  };

  // If no items and no loading, show empty message
  if (items.length === 0 && !isNextPageLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Table Header */}
      <div className="border-b bg-muted/30">
        <TableHeader>
          <TableRow className="flex w-full">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className="flex-shrink-0 p-4 font-semibold"
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </div>

      {/* Virtualized Table Body */}
      <div style={{ height: containerHeight }}>
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={hasNextPage ? items.length + 1 : items.length}
          loadMoreItems={loadMoreItems}
        >
          {({ onItemsRendered, ref }: { onItemsRendered: (...args: unknown[]) => void; ref: React.Ref<unknown> }) => (
            <List
              ref={ref}
              height={containerHeight}
              itemCount={hasNextPage ? items.length + 1 : items.length}
              itemSize={rowHeight}
              onItemsRendered={onItemsRendered}
              width="100%"
            >
              {/* @ts-expect-error - react-window children type mismatch */}
              {RowComponent}
            </List>
          )}
        </InfiniteLoader>
      </div>

      {/* Loading indicator at bottom */}
      {isNextPageLoading && (
        <div className="border-t p-4 text-center text-muted-foreground">
          Načítání dalších položek...
        </div>
      )}
    </div>
  );
}

export default VirtualizedTable;