'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft, ChevronRight,
  ChevronUp,
  Database,
  Download,
  Edit,
  Eye, EyeOff,
  Filter,
  FilterX,
  MoreHorizontal,
  Search,
  SearchX,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: any) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
  bulkActions?: Array<{
    label: string;
    action: (selectedRows: any[]) => void;
    variant?: 'default' | 'destructive';
  }>;
  filters?: Array<
    | {
        type?: 'select';
        key: string;
        label: string;
        options: Array<{ label: string; value: string }>;
      }
    | {
        type: 'boolean';
        key: string;
        label: string;
        trueLabel?: string;
        falseLabel?: string;
      }
    | {
        type: 'rating' | 'number';
        key: string;
        label: string;
        min: number;
        max: number;
        step?: number;
      }
    | {
        type: 'dateRange';
        label: string;
        fromKey: string;
        toKey: string;
      }
  >;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  // Server-driven pagination (optional). When provided, client-side pagination is disabled
  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
  };
  // Server-driven sort (optional). When provided, client-side sorting is disabled
  serverSort?: {
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    onChange: (key: string | undefined, direction: 'asc' | 'desc' | undefined) => void;
  };
  // Server-driven search and filters (optional). When provided, client-side search/filters are disabled
  serverSearch?: {
    value: string;
    onChange: (value: string) => void;
  };
  serverFilters?: {
    values: Record<string, string>;
    onChange: (values: Record<string, string>) => void;
  };
}

export default function DataTable({
  data,
  columns,
  searchable = true,
  filterable = true,
  exportable = true,
  selectable = false,
  pagination = true,
  pageSize = 10,
  onRowClick,
  onSelectionChange,
  bulkActions = [],
  filters = [],
  onView,
  onEdit,
  onDelete,
  serverPagination,
  serverSort,
  serverSearch,
  serverFilters
}: DataTableProps) {
  const formatLocalYYYYMMDD = (date: Date | undefined) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseLocalYYYYMMDD = (value: string | undefined) => {
    if (!value) return undefined;
    const [y, m, d] = value.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(col => col.key));
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [prevDataLength, setPrevDataLength] = useState(data.length);
  const [clientPageSize, setClientPageSize] = useState(pageSize);

  useEffect(() => {
    setClientPageSize(pageSize);
  }, [pageSize]);

  // Clear selections when data changes (e.g., after bulk delete)
  useEffect(() => {
    if (selectedRows.length > 0) {
      // Check if any selected rows still exist in the current data
      const validSelection = selectedRows.filter(selectedRow => 
        data.some(row => getRowId(row) === getRowId(selectedRow))
      );
      
      if (validSelection.length !== selectedRows.length) {
        setSelectedRows(validSelection);
        onSelectionChange?.(validSelection);
      }
    }
  }, [data, selectedRows, onSelectionChange]);

  // Clear all selections if data is significantly reduced (likely bulk delete)
  useEffect(() => {
    // If data length decreased significantly and we have selections, clear them
    if (selectedRows.length > 0 && data.length < prevDataLength) {
      setSelectedRows([]);
      onSelectionChange?.([]);
    }
    setPrevDataLength(data.length);
  }, [data.length, selectedRows.length, onSelectionChange, prevDataLength]);

  const isServerPaginated = Boolean(serverPagination);
  const isServerSorted = Boolean(serverSort);
  const isServerSearch = Boolean(serverSearch);
  const isServerFilters = Boolean(serverFilters);

  // Filter and search data
  const filteredData = useMemo(() => {
    if (isServerPaginated || isServerSorted || isServerSearch || isServerFilters) {
      // Assume server returns already filtered/sorted/paginated data
      return data;
    }

    let filtered = data;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => String(row[key]) === value);
      }
    });

    return filtered;
  }, [data, searchQuery, activeFilters, isServerPaginated, isServerSorted, isServerSearch, isServerFilters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (isServerSorted || isServerPaginated) return filteredData;
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig, isServerSorted, isServerPaginated]);

  

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    if (isServerPaginated) return sortedData; // server provides already paginated data
    const startIndex = (currentPage - 1) * clientPageSize;
    return sortedData.slice(startIndex, startIndex + clientPageSize);
  }, [sortedData, currentPage, clientPageSize, pagination, isServerPaginated]);

  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    if (isServerPaginated && serverPagination) {
      return Math.max(1, Math.ceil(serverPagination.total / serverPagination.pageSize));
    }
    return Math.ceil(sortedData.length / clientPageSize);
  }, [pagination, isServerPaginated, serverPagination, sortedData.length, clientPageSize]);

  const handleSort = (key: string) => {
    if (serverSort) {
      const currentKey = serverSort.sortKey;
      const currentDir = serverSort.sortDirection;
      if (currentKey === key) {
        if (currentDir === 'asc') {
          serverSort.onChange(key, 'desc');
        } else if (currentDir === 'desc') {
          serverSort.onChange(undefined, undefined); // clear sort
        } else {
          serverSort.onChange(key, 'asc');
        }
      } else {
        serverSort.onChange(key, 'asc');
      }
      // Mirror UI state for arrows
      setSortConfig(prev => {
        if (prev?.key === key) {
          return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
        }
        return { key, direction: 'asc' };
      });
      return;
    }
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getRowId = (row: any) => row.id ?? row._id;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedData);
      onSelectionChange?.(paginatedData);
    } else {
      setSelectedRows([]);
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (row: any, checked: boolean) => {
    const rowId = getRowId(row);
    const newSelection = checked
      ? [...selectedRows, row]
      : selectedRows.filter(r => getRowId(r) !== rowId);
    
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const exportToCSV = () => {
    const headers = columns.filter(col => visibleColumns.includes(col.key)).map(col => col.label);
    const rows = sortedData.map(row => 
      columns.filter(col => visibleColumns.includes(col.key)).map(col => row[col.key])
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleColumnsData = columns?.filter(col => visibleColumns?.includes(col.key));

  // Check if we have any data to display
  const hasData = data.length > 0;
  const hasFilteredData = sortedData.length > 0;
  const showControls = true; // Always show controls to allow searching/filtering even with no data

  // Determine the empty state type
  const getEmptyStateInfo = () => {
    if (!hasData) {
      return {
        icon: Database,
        title: "No records found",
        description: "There are no records available in this table."
      };
    }
    
    if (searchQuery && !hasFilteredData) {
      return {
        icon: SearchX,
        title: "No search results",
        description: `No records found matching "${searchQuery}". Try adjusting your search terms.`
      };
    }
    
    if (Object.values(activeFilters).filter(Boolean).length > 0 && !hasFilteredData) {
      return {
        icon: FilterX,
        title: "No filtered results",
        description: "No records match the current filters. Try adjusting your filter criteria."
      };
    }
    
    return null;
  };

  const emptyStateInfo = getEmptyStateInfo();

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Mobile-Responsive Toolbar */}
      {showControls && (
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            {searchable && (
              <div className="relative">
                <Search className="absolute z-10 left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" size={16} />
                <Input
                  placeholder="Search..."
                  value={serverSearch ? serverSearch.value : searchQuery}
                  onChange={(e) => {
                    if (serverSearch) {
                      serverSearch.onChange(e.target.value);
                    } else {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  className="pl-10 pr-10 w-full sm:w-64"
                />
                {(serverSearch ? serverSearch.value : searchQuery) && (
                  <button
                    onClick={() => {
                      if (serverSearch) {
                        serverSearch.onChange('');
                      } else {
                        setSearchQuery('');
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {filterable && filters.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter size={16} />
                <span>Filters</span>
                {(Object.values(serverFilters ? serverFilters.values : activeFilters).filter(Boolean).length > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.values(serverFilters ? serverFilters.values : activeFilters).filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            )}

            {selectedRows.length > 0 && bulkActions.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground block">
                  {selectedRows.length} selected
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2">
                  {bulkActions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'outline'}
                      size="sm"
                      onClick={() => action.action(selectedRows)}
                      className="w-full sm:w-auto"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {exportable && (
              <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            )}

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <EyeOff size={16} className="mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.includes(column.key)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setVisibleColumns([...visibleColumns, column.key]);
                      } else {
                        setVisibleColumns(visibleColumns.filter(key => key !== column.key));
                      }
                    }}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}



      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-muted rounded-lg"
          >
            {filters.map((filter) => {
              const isSelect = !('type' in filter) || filter.type === 'select';
              const isBoolean = 'type' in filter && filter.type === 'boolean';
              const isNumber = 'type' in filter && (filter.type === 'number' || filter.type === 'rating');
              const isDateRange = 'type' in filter && filter.type === 'dateRange';

              if (isSelect) {
                const f = filter as Extract<typeof filter, { type?: 'select'; key: string; label: string; options: any[] }>;
                const applied = serverFilters ? serverFilters.values : activeFilters;
                const current = (draftFilters[f.key] ?? applied[f.key] ?? '__all__');
                const setValue = (value: string) => {
                  setDraftFilters(prev => {
                    const next = { ...prev } as Record<string, string>;
                    if (value === '__all__') delete next[f.key]; else next[f.key] = value;
                    return next;
                  });
                };

                return (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      {f.label}
                    </label>
                    <Select value={current} onValueChange={setValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        {f.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (isBoolean) {
                const f = filter as Extract<typeof filter, { type: 'boolean'; key: string; label: string; trueLabel?: string; falseLabel?: string }>;
                const applied = serverFilters ? serverFilters.values : activeFilters;
                const current = (draftFilters[f.key] ?? applied[f.key] ?? '__all__');
                const setValue = (value: string) => {
                  setDraftFilters(prev => {
                    const next = { ...prev } as Record<string, string>;
                    if (value === '__all__') delete next[f.key]; else next[f.key] = value;
                    return next;
                  });
                };

                return (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      {f.label}
                    </label>
                    <Select value={current} onValueChange={setValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="true">{f.trueLabel ?? 'Yes'}</SelectItem>
                        <SelectItem value="false">{f.falseLabel ?? 'No'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (isNumber) {
                const f = filter as Extract<typeof filter, { type: 'number' | 'rating'; key: string; label: string; min: number; max: number; step?: number }>;
                const applied = serverFilters ? serverFilters.values : activeFilters;
                const current = Number((draftFilters[f.key] ?? applied[f.key]) ?? f.min);
                const setValue = (value: number) => {
                  setDraftFilters(prev => {
                    const next = { ...prev } as Record<string, string>;
                    if (value === f.min) delete next[f.key]; else next[f.key] = String(value);
                    return next;
                  });
                };

                return (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      {f.label} {f.type === 'rating' ? `(≥ ${current})` : `(${current})`}
                    </label>
                    <Slider
                      min={f.min}
                      max={f.max}
                      step={f.step ?? 1}
                      value={[current]}
                      onValueChange={(vals) => setValue(vals[0] ?? f.min)}
                    />
                  </div>
                );
              }

              if (isDateRange) {
                const f = filter as Extract<typeof filter, { type: 'dateRange'; label: string; fromKey: string; toKey: string }>;
                const applied = serverFilters ? serverFilters.values : activeFilters;
                const currentFrom = (draftFilters[f.fromKey] ?? applied[f.fromKey]) ?? '';
                const currentTo = (draftFilters[f.toKey] ?? applied[f.toKey]) ?? '';
                const setValue = (key: string, value: string) => {
                  setDraftFilters(prev => {
                    const next = { ...prev } as Record<string, string>;
                    if (!value) delete next[key]; else next[key] = value;
                    return next;
                  });
                };

                return (
                  <div key={`${f.fromKey}-${f.toKey}`}>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      {f.label}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start w-full text-left font-normal">
                          {currentFrom && currentTo
                            ? `${parseLocalYYYYMMDD(currentFrom)?.toLocaleDateString()} - ${parseLocalYYYYMMDD(currentTo)?.toLocaleDateString()}`
                            : 'Pick a date range'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          numberOfMonths={2}
                          selected={{ from: parseLocalYYYYMMDD(currentFrom), to: parseLocalYYYYMMDD(currentTo) } as any}
                          onSelect={(range: any) => {
                            const from = range?.from ? range.from : undefined;
                            const to = range?.to ? range.to : undefined;
                            setValue(f.fromKey, formatLocalYYYYMMDD(from));
                            setValue(f.toKey, formatLocalYYYYMMDD(to));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              }

              return null;
            })}
            <div className="flex items-end space-x-2">
              <Button
                onClick={() => {
                  // Apply current draft to active filters
                  const cleaned = { ...draftFilters } as Record<string, string>;
                  // remove empty values
                  Object.keys(cleaned).forEach((k) => { if (!cleaned[k]) delete cleaned[k]; });
                  if (serverFilters) {
                    serverFilters.onChange(cleaned);
                  } else {
                    setActiveFilters(cleaned);
                  }
                }}
                className="w-full"
              >
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (serverFilters) {
                    serverFilters.onChange({});
                  } else {
                    setActiveFilters({});
                  }
                  setDraftFilters({});
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table or Empty State */}
      {emptyStateInfo ? (
        <motion.div 
          className="border rounded-2xl overflow-hidden bg-card shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-accent to-border rounded-full flex items-center justify-center">
                <emptyStateInfo.icon size={32} className="text-subtle-foreground" />
              </div>
            </motion.div>
            
            <motion.h3 
              className="text-xl font-semibold text-foreground mb-2 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {emptyStateInfo.title}
            </motion.h3>
            
            <motion.p 
              className="text-muted-foreground text-center max-w-md mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {emptyStateInfo.description}
            </motion.p>

            {!hasData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  variant="outline" 
                  className="border-border text-muted-foreground hover:bg-muted"
                >
                  <Database size={16} className="mr-2" />
                  Add your first record
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="border rounded-2xl overflow-hidden shadow-lg bg-card">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-muted to-accent">
                <tr>
                  {selectable && (
                    <th className="w-12 px-4 py-4">
                      <Checkbox
                        checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                  )}
                  {visibleColumnsData?.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-4 text-left text-sm font-semibold text-foreground ${
                        column.sortable ? 'cursor-pointer hover:bg-border transition-colors' : ''
                      }`}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            {sortConfig?.key === column.key ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )
                            ) : (
                              <ArrowUpDown size={14} className="text-subtle-foreground" />
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-12 px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedData.map((row, index) => (
                  <motion.tr
                    key={getRowId(row) || index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-muted/80 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedRows.some(r => getRowId(r) === getRowId(row))}
                          onCheckedChange={(checked) => handleSelectRow(row, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {visibleColumnsData && visibleColumnsData?.length > 0 && visibleColumnsData?.map((column) => (
                      <td key={column?.key} className="px-4 py-4 text-sm text-foreground">
                        {column?.render ? column?.render(row[column?.key], row) : row[column?.key]}
                      </td>
                    ))}
                    <td className="px-4 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(row); }}>
                              <Eye size={16} className="mr-2" />
                              View
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(row); }}>
                              <Edit size={16} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {(onView || onEdit) && onDelete && (
                            <DropdownMenuSeparator />
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                              className="text-destructive-600"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && !emptyStateInfo && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div>
              {isServerPaginated && serverPagination ? (
                <>
                  Showing {serverPagination.total === 0 ? 0 : ((serverPagination.page - 1) * serverPagination.pageSize) + 1}
                  {' '}to{' '}
                  {Math.min(serverPagination.page * serverPagination.pageSize, serverPagination.total)}
                  {' '}of{' '}
                  {serverPagination.total} results
                </>
              ) : (
                <>
                  Showing {sortedData.length === 0 ? 0 : ((currentPage - 1) * clientPageSize) + 1} to {Math.min(currentPage * clientPageSize, sortedData.length)} of {sortedData.length} results
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span>Rows per page:</span>
              <Select
                value={String(isServerPaginated && serverPagination ? serverPagination.pageSize : clientPageSize)}
                onValueChange={(val) => {
                  const size = parseInt(val, 10);
                  if (isServerPaginated && serverPagination?.onPageSizeChange) {
                    serverPagination.onPageSizeChange(size);
                  } else {
                    setClientPageSize(size);
                    setCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-[84px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isServerPaginated && serverPagination?.pageSizeOptions ? serverPagination.pageSizeOptions : [10, 25, 50, 100]).map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isServerPaginated && serverPagination) {
                  serverPagination.onPageChange(Math.max(1, serverPagination.page - 1));
                } else {
                  setCurrentPage(Math.max(1, currentPage - 1));
                }
              }}
              disabled={(isServerPaginated && serverPagination ? serverPagination.page : currentPage) === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {(() => {
                const current = isServerPaginated && serverPagination ? serverPagination.page : currentPage;
                const start = Math.max(1, Math.min(current - 2, totalPages - 4));
                const end = Math.min(totalPages, start + 4);
                return Array.from({ length: Math.max(0, end - start + 1) }).map((_, idx) => {
                  const pageNum = start + idx;
                  return (
                    <Button
                      key={pageNum}
                      variant={current === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (isServerPaginated && serverPagination) {
                          serverPagination.onPageChange(pageNum);
                        } else {
                          setCurrentPage(pageNum);
                        }
                      }}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                });
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isServerPaginated && serverPagination) {
                  serverPagination.onPageChange(Math.min(totalPages, (serverPagination.page + 1)));
                } else {
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                }
              }}
              disabled={(isServerPaginated && serverPagination ? serverPagination.page : currentPage) === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}