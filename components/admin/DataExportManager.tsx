'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Image,
  Map,
  Target,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { Loader } from '@/components/ui/loader';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  type: 'csv' | 'json' | 'pdf' | 'png' | 'excel';
  icon: React.ReactNode;
  category: 'data' | 'visualization' | 'report';
  estimatedSize: string;
}

const DataExportManager: React.FC = () => {
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ [key: string]: boolean }>({});

  const exportOptions: ExportOption[] = [
    // Data Exports
    {
      id: 'orders-csv',
      label: 'Customer Orders (CSV)',
      description: 'All order data with geospatial coordinates',
      type: 'csv',
      icon: <FileText className="h-4 w-4" />,
      category: 'data',
      estimatedSize: '~2.5MB'
    },
    {
      id: 'analytics-json',
      label: 'Analytics Data (JSON)',
      description: 'Complete analytics results and metrics',
      type: 'json',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'data',
      estimatedSize: '~800KB'
    },
    {
      id: 'segments-excel',
      label: 'Customer Segments (Excel)',
      description: 'Detailed customer segmentation analysis',
      type: 'excel',
      icon: <Users className="h-4 w-4" />,
      category: 'data',
      estimatedSize: '~1.2MB'
    },
    {
      id: 'predictions-csv',
      label: 'ML Predictions (CSV)',
      description: 'Growth forecasts and confidence scores',
      type: 'csv',
      icon: <Brain className="h-4 w-4" />,
      category: 'data',
      estimatedSize: '~500KB'
    },

    // Visualization Exports
    {
      id: 'map-png',
      label: 'Interactive Map (PNG)',
      description: 'High-resolution map screenshot',
      type: 'png',
      icon: <Map className="h-4 w-4" />,
      category: 'visualization',
      estimatedSize: '~3MB'
    },
    {
      id: 'charts-png',
      label: 'Dashboard Charts (PNG)',
      description: 'All analytics charts as images',
      type: 'png',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'visualization',
      estimatedSize: '~2MB'
    },
    {
      id: 'animation-gif',
      label: 'Time Animation (GIF)',
      description: 'Time-series animation export',
      type: 'png',
      icon: <Clock className="h-4 w-4" />,
      category: 'visualization',
      estimatedSize: '~5MB'
    },

    // Report Exports
    {
      id: 'executive-pdf',
      label: 'Executive Summary (PDF)',
      description: 'Comprehensive business report',
      type: 'pdf',
      icon: <Target className="h-4 w-4" />,
      category: 'report',
      estimatedSize: '~1.5MB'
    },
    {
      id: 'detailed-pdf',
      label: 'Detailed Analytics (PDF)',
      description: 'Full analytics report with insights',
      type: 'pdf',
      icon: <FileText className="h-4 w-4" />,
      category: 'report',
      estimatedSize: '~4MB'
    },
    {
      id: 'ml-insights-pdf',
      label: 'ML Insights Report (PDF)',
      description: 'Machine learning analysis and recommendations',
      type: 'pdf',
      icon: <Brain className="h-4 w-4" />,
      category: 'report',
      estimatedSize: '~2MB'
    }
  ];

  const handleExportSelection = (exportId: string, checked: boolean) => {
    setSelectedExports(prev => 
      checked 
        ? [...prev, exportId]
        : prev.filter(id => id !== exportId)
    );
  };

  const handleSelectCategory = (category: string, checked: boolean) => {
    const categoryOptions = exportOptions
      .filter(option => option.category === category)
      .map(option => option.id);

    setSelectedExports(prev => {
      if (checked) {
        return [...new Set([...prev, ...categoryOptions])];
      } else {
        return prev.filter(id => !categoryOptions.includes(id));
      }
    });
  };

  const handleExport = async () => {
    if (!selectedExports.length) return;

    setExporting(true);
    setExportProgress({});

    for (const exportId of selectedExports) {
      try {
        // Simulate export process
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // In a real implementation, you would:
        // 1. Call the appropriate API endpoint
        // 2. Generate the file on the server
        // 3. Download the file to the client
        
        const option = exportOptions.find(opt => opt.id === exportId);
        if (option) {
          // Simulate file download
          const link = document.createElement('a');
          link.href = '#'; // In reality, this would be the file URL
          link.download = `${option.label.toLowerCase().replace(/\s+/g, '-')}.${option.type}`;
          // link.click(); // Uncomment in real implementation
        }

        setExportProgress(prev => ({ ...prev, [exportId]: true }));
      } catch (error) {
        console.error(`Failed to export ${exportId}:`, error);
      }
    }

    setExporting(false);
    
    // Show success message
    setTimeout(() => {
      setExportProgress({});
      setSelectedExports([]);
    }, 3000);
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'csv':
      case 'excel':
        return <FileText className="h-3 w-3" />;
      case 'json':
        return <BarChart3 className="h-3 w-3" />;
      case 'pdf':
        return <FileText className="h-3 w-3" />;
      case 'png':
        return <Image className="h-3 w-3" />;
      default:
        return <Download className="h-3 w-3" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'csv':
        return 'bg-success-100 text-success-800';
      case 'json':
        return 'bg-info-100 text-info-800';
      case 'pdf':
        return 'bg-destructive-100 text-destructive-800';
      case 'png':
        return 'bg-primary-100 text-primary-800';
      case 'excel':
        return 'bg-success-100 text-success-800';
      default:
        return 'bg-accent text-foreground';
    }
  };

  const categories = [
    { id: 'data', label: 'Data Exports', icon: <FileText className="h-4 w-4" /> },
    { id: 'visualization', label: 'Visualizations', icon: <Image className="h-4 w-4" /> },
    { id: 'report', label: 'Reports', icon: <Target className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Download className="h-6 w-6" />
            Data Export Manager
          </h2>
          <p className="text-muted-foreground">
            Export analytics data, visualizations, and comprehensive reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {selectedExports.length} selected
          </Badge>
          <Button 
            onClick={handleExport}
            disabled={!selectedExports.length || exporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export Selected'}
          </Button>
        </div>
      </div>

      {/* Quick Select Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Select by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map(category => {
              const categoryOptions = exportOptions.filter(opt => opt.category === category.id);
              const selectedCategoryCount = selectedExports.filter(id => 
                categoryOptions.some(opt => opt.id === id)
              ).length;
              const isFullySelected = selectedCategoryCount === categoryOptions.length;
              const isPartiallySelected = selectedCategoryCount > 0 && !isFullySelected;

              return (
                <div key={category.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={isFullySelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = isPartiallySelected;
                    }}
                    onCheckedChange={(checked) => 
                      handleSelectCategory(category.id, checked as boolean)
                    }
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {category.icon}
                    <div>
                      <p className="font-medium">{category.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategoryCount}/{categoryOptions.length} selected
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportOptions.map(option => {
          const isSelected = selectedExports.includes(option.id);
          const isCompleted = exportProgress[option.id];

          return (
            <Card key={option.id} className={`relative ${isSelected ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleExportSelection(option.id, checked as boolean)
                    }
                    disabled={exporting}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <h3 className="font-medium">{option.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getFileTypeColor(option.type)}`}
                      >
                        {getFileTypeIcon(option.type)}
                        <span className="ml-1">{option.type.toUpperCase()}</span>
                      </Badge>
                      <span className="text-xs font-caption text-muted-foreground">
                        {option.estimatedSize}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Export Progress */}
                {exporting && isSelected && (
                  <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-lg">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-success-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Completed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader size="sm" label={null} />
                        <span>Exporting...</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export Summary */}
      {selectedExports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-info-600">
                  {selectedExports.length}
                </div>
                <div className="text-sm text-muted-foreground">Files to Export</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">
                  {exportOptions
                    .filter(opt => selectedExports.includes(opt.id))
                    .reduce((acc, opt) => {
                      const size = parseFloat(opt.estimatedSize.replace(/[^\d.]/g, ''));
                      return acc + size;
                    }, 0)
                    .toFixed(1)}MB
                </div>
                <div className="text-sm text-muted-foreground">Estimated Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {Math.ceil(selectedExports.length * 1.5)}min
                </div>
                <div className="text-sm text-muted-foreground">Estimated Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">📋 Export Instructions</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Select the data formats and reports you need</li>
            <li>• Use category quick-select for bulk operations</li>
            <li>• Large exports may take several minutes to complete</li>
            <li>• Files will be downloaded automatically when ready</li>
            <li>• PDF reports include interactive charts and insights</li>
            <li>• CSV/Excel files are compatible with data analysis tools</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExportManager;
