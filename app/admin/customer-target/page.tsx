'use client';

import CustomerAnalyticsDashboard from '@/components/admin/CustomerAnalyticsDashboard';
import CustomerMap from '@/components/admin/CustomerMap';
import DataExportManager from '@/components/admin/DataExportManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Brain,
  Download,
  Map,
  MapPin,
  Settings,
  Share,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { useState } from 'react';

const CustomerTargetPage = () => {
  const [activeTab, setActiveTab] = useState('map');

  const handleExportData = () => {
    setActiveTab('export');
  };

  const handleShareDashboard = () => {
    // Implementation for sharing dashboard
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Customer Targeting & Geospatial Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Interactive Bangladesh map with customer order visualization, density analysis, and ML-powered growth predictions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" onClick={handleShareDashboard}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info-100 rounded-lg">
                <Map className="h-5 w-5 text-info-600" />
              </div>
              <div>
                <p className="font-medium">Interactive Map</p>
                <p className="text-sm text-muted-foreground">Markers, clusters & heatmaps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <Users className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="font-medium">Customer Segments</p>
                <p className="text-sm text-muted-foreground">Behavioral analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Brain className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium">ML Predictions</p>
                <p className="text-sm text-muted-foreground">Growth forecasting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <p className="font-medium">Regional Analytics</p>
                <p className="text-sm text-muted-foreground">Division & district insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Interactive Map
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Data Export
          </TabsTrigger>
        </TabsList>

        {/* Interactive Map Tab */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Bangladesh Customer Order Map
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Real-time Data</Badge>
                  <Badge variant="outline">MapLibre GL JS</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerMap className="w-full" />
            </CardContent>
          </Card>

          {/* Map Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">✅ Visualization Modes</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Individual order markers</li>
                  <li>• Smart clustering for dense areas</li>
                  <li>• Heatmap density visualization</li>
                  <li>• Choropleth boundary maps</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">🎯 Advanced Filtering</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Division & district filters</li>
                  <li>• Customer segment targeting</li>
                  <li>• Date range analysis</li>
                  <li>• Order status filtering</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">📊 Interactive Popups</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Order details on click</li>
                  <li>• Customer information</li>
                  <li>• Revenue metrics</li>
                  <li>• Location details</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">⚡ Performance Features</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Supercluster optimization</li>
                  <li>• Viewport-based loading</li>
                  <li>• Real-time updates</li>
                  <li>• Responsive design</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Dashboard Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <CustomerAnalyticsDashboard />

          {/* Analytics Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Customer Segmentation
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• High-value frequent customers</li>
                  <li>• New customer identification</li>
                  <li>• Churned customer analysis</li>
                  <li>• Behavioral pattern recognition</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  ML Predictions
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Growth rate forecasting</li>
                  <li>• High-potential regions</li>
                  <li>• Trend analysis</li>
                  <li>• Confidence scoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Business Intelligence
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Regional performance metrics</li>
                  <li>• Time-series analysis</li>
                  <li>• Density hotspot identification</li>
                  <li>• Revenue optimization insights</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <DataExportManager />
        </TabsContent>
      </Tabs>

      {/* Implementation Notes */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Implementation Status & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3 text-success-600">✅ Completed Features</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  Backend API endpoints for geospatial queries
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  Customer order analytics with filtering
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  Interactive map with MapLibre GL JS
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  Clustering and heatmap visualization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  Customer segmentation analytics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  ML-powered growth predictions
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-3 text-info-600">🔄 Enhancement Opportunities</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                  Add Bangladesh GeoJSON boundaries for choropleth
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                  Implement time-series animation slider
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                  Add export to PDF/Excel functionality
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                  Enhanced ML models with TensorFlow.js
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                  Real-time WebSocket updates
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                  Marketing campaign integration
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerTargetPage;