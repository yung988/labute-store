'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';

export interface OrderFilters {
  search?: string;
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface OrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onClearFilters: () => void;
  totalResults?: number;
}

export default function OrderFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  totalResults,
}: OrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof OrderFilters, value: any) => {
    const newFilters = { ...filters };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const activeFiltersCount = Object.keys(filters).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtry objednávek
            {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalResults !== undefined && <Badge variant="outline">{totalResults} výsledků</Badge>}
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Skrýt filtry' : 'Rozšířené filtry'}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Vymazat
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Filters - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Hledat</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="search"
                placeholder="Jméno, email, ID objednávky..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny statusy</SelectItem>
                <SelectItem value="new">Nová</SelectItem>
                <SelectItem value="pending">Čeká na zpracování</SelectItem>
                <SelectItem value="processing">Zpracovává se</SelectItem>
                <SelectItem value="shipped">Odesláno</SelectItem>
                <SelectItem value="delivered">Doručeno</SelectItem>
                <SelectItem value="cancelled">Zrušeno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerId">ID zákazníka</Label>
            <Input
              id="customerId"
              placeholder="Zadejte ID zákazníka..."
              value={filters.customerId || ''}
              onChange={(e) => updateFilter('customerId', e.target.value)}
            />
          </div>
        </div>

        {/* Advanced Filters - Expandable */}
        {isExpanded && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Datum od</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Datum do</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimální částka (Kč)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  placeholder="0"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAmount">Maximální částka (Kč)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="10000"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    updateFilter('maxAmount', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Aktivní filtry:</span>
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Hledání: {filters.search}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('search', undefined)}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('status', undefined)}
                  />
                </Badge>
              )}
              {filters.customerId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Zákazník: {filters.customerId}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('customerId', undefined)}
                  />
                </Badge>
              )}
              {filters.dateFrom && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Od: {filters.dateFrom}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('dateFrom', undefined)}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Do: {filters.dateTo}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('dateTo', undefined)}
                  />
                </Badge>
              )}
              {(filters.minAmount || filters.maxAmount) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Částka: {filters.minAmount || 0} - {filters.maxAmount || '∞'} Kč
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => {
                      updateFilter('minAmount', undefined);
                      updateFilter('maxAmount', undefined);
                    }}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
