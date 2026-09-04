'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Brain,
    Calendar,
    Clock,
    MapPin,
    Package,
    Target,
    TrendingDown,
    TrendingUp,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import MLPredictionEngine from './MLPredictionEngine';
import TimeSeriesAnimationMap from './TimeSeriesAnimationMap';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface CustomerSegment {
  'high-value-frequent': any[];
  'high-value-occasional': any[];
  'low-value-frequent': any[];
  'low-value-occasional': any[];
  'new-customers': any[];
  'churned-customers': any[];
}

interface GrowthPrediction {
  division: string;
  district: string;
  lat: number;
  lng: number;
  currentMonthlyOrders: number;
  predictedMonthlyOrders: number;
  growthRate: number;
  trend: 'growing' | 'declining' | 'stable';
  confidence: number;
}

const CustomerAnalyticsDashboard: React.FC = () => {
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment | null>(null);
  const [growthPredictions, setGrowthPredictions] = useState<GrowthPrediction[]>([]);
  const [choroplethData, setChoroplethData] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [densityAnalysis, setDensityAnalysis] = useState<any[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async (type: string, params: any = {}) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        type,
        ...params
      });

      const response = await fetch(`/api/admin/geospatial/analytics?${searchParams}`);
      const data = await response.json();

      switch (type) {
        case 'customer-segments':
          setCustomerSegments(data.segments);
          break;
        case 'growth-prediction':
          setGrowthPredictions(data.predictions || []);
          break;
        case 'choropleth-data':
          setChoroplethData(data);
          break;
        case 'time-series':
          setTimeSeriesData(data.timeSeries || []);
          break;
        case 'density-analysis':
          setDensityAnalysis(data.densityGrid || []);
          break;
      }
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics('customer-segments');
    fetchAnalytics('growth-prediction', { timeframe: '12' });
    fetchAnalytics('choropleth-data');
    fetchAnalytics('time-series', { timeframe: '12' });
    fetchAnalytics('density-analysis');
  }, []);

  const segmentColors = {
    'high-value-frequent': 'hsl(var(--success))',
    'high-value-occasional': 'hsl(var(--chart-1))',
    'low-value-frequent': 'hsl(var(--chart-4))',
    'low-value-occasional': 'hsl(var(--muted-foreground))',
    'new-customers': 'hsl(var(--chart-3))',
    'churned-customers': 'hsl(var(--destructive))'
  };

  const segmentLabels = {
    'high-value-frequent': 'High-Value Frequent',
    'high-value-occasional': 'High-Value Occasional',
    'low-value-frequent': 'Low-Value Frequent',
    'low-value-occasional': 'Low-Value Occasional',
    'new-customers': 'New Customers',
    'churned-customers': 'Churned Customers'
  };

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  const getSegmentPieData = () => {
    if (!customerSegments) return [];
    
    return Object.entries(customerSegments).map(([key, customers]) => ({
      name: segmentLabels[key as keyof typeof segmentLabels],
      value: customers.length,
      color: segmentColors[key as keyof typeof segmentColors]
    }));
  };

  const getDivisionBarData = () => {
    if (!choroplethData?.divisions) return [];
    
    return choroplethData.divisions.map((division: any) => ({
      name: division.name.replace(' Division', ''),
      orders: division.orderCount,
      revenue: division.totalRevenue,
      avgOrder: division.avgOrderValue
    }));
  };

  const getGrowthChartData = () => {
    return growthPredictions.slice(0, 10).map(prediction => ({
      location: `${prediction.district}, ${prediction.division.replace(' Division', '')}`,
      current: prediction.currentMonthlyOrders,
      predicted: prediction.predictedMonthlyOrders,
      growthRate: (prediction.growthRate * 100).toFixed(1)
    }));
  };

  const getTimeSeriesChartData = () => {
    const aggregatedData = timeSeriesData.reduce((acc: any, item: any) => {
      const date = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      
      if (!acc[date]) {
        acc[date] = { date, orders: 0, revenue: 0 };
      }
      
      acc[date].orders += item.orderCount;
      acc[date].revenue += item.revenue;
      
      return acc;
    }, {});

    return Object.values(aggregatedData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Geospatial insights and predictive analytics for customer targeting
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="">All Divisions</option>
            <option value="Dhaka Division">Dhaka</option>
            <option value="Chittagong Division">Chittagong</option>
            <option value="Rajshahi Division">Rajshahi</option>
            <option value="Khulna Division">Khulna</option>
            <option value="Barisal Division">Barisal</option>
            <option value="Sylhet Division">Sylhet</option>
            <option value="Rangpur Division">Rangpur</option>
            <option value="Mymensingh Division">Mymensingh</option>
          </select>
          <Button
            onClick={() => {
              fetchAnalytics('customer-segments', selectedDivision ? { division: selectedDivision } : {});
              fetchAnalytics('growth-prediction', { 
                timeframe: '12', 
                ...(selectedDivision ? { division: selectedDivision } : {})
              });
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="segments">Customer Segments</TabsTrigger>
          <TabsTrigger value="predictions">Growth Predictions</TabsTrigger>
          <TabsTrigger value="regions">Regional Analysis</TabsTrigger>
          <TabsTrigger value="trends">Time Trends</TabsTrigger>
          <TabsTrigger value="density">Density Analysis</TabsTrigger>
          <TabsTrigger value="animation">Time Animation</TabsTrigger>
          <TabsTrigger value="ml-engine">ML Engine</TabsTrigger>
        </TabsList>

        {/* Customer Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Segment Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Segment Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getSegmentPieData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getSegmentPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Segment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Segment Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customerSegments && Object.entries(customerSegments).map(([key, customers]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: segmentColors[key as keyof typeof segmentColors] }}
                        />
                        <div>
                          <p className="font-medium">{segmentLabels[key as keyof typeof segmentLabels]}</p>
                          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {((customers.length / Object.values(customerSegments).flat().length) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Growth Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Growth Predictions Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  ML-Powered Growth Predictions
                  <Badge variant="secondary">AI Insights</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getGrowthChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="location" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" fill="hsl(var(--chart-1))" name="Current Monthly Orders" />
                    <Bar dataKey="predicted" fill="hsl(var(--chart-2))" name="Predicted Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Growth Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Growth Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {growthPredictions.slice(0, 5).map((prediction, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{prediction.district}, {prediction.division.replace(' Division', '')}</p>
                          <p className="text-sm text-muted-foreground">
                            {prediction.currentMonthlyOrders} → {prediction.predictedMonthlyOrders} orders/month
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {prediction.growthRate > 0 ? (
                            <TrendingUp className="h-4 w-4 text-success-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive-500" />
                          )}
                          <span className={prediction.growthRate > 0 ? 'text-success-600' : 'text-destructive-600'}>
                            {(prediction.growthRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {(prediction.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Regional Analysis Tab */}
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Division-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getDivisionBarData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value as number) : value,
                    name
                  ]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="hsl(var(--chart-1))" name="Total Orders" />
                  <Bar yAxisId="right" dataKey="revenue" fill="hsl(var(--chart-2))" name="Revenue (BDT)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Trends Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={getTimeSeriesChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name
                    ]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                    name="Daily Orders"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Daily Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Density Analysis Tab */}
        <TabsContent value="density" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                High-Density Order Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {densityAnalysis.slice(0, 10).map((zone, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-warning-100 rounded-full">
                        <Package className="h-4 w-4 text-warning-600" />
                      </div>
                      <div>
                        <p className="font-medium">{zone.district}, {zone.division}</p>
                        <p className="text-sm text-muted-foreground">
                          Lat: {zone.lat?.toFixed(4)}, Lng: {zone.lng?.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{zone.orderCount} orders</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(zone.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Series Animation Tab */}
        <TabsContent value="animation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Order Growth Animation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesAnimationMap />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ML Prediction Engine Tab */}
        <TabsContent value="ml-engine" className="space-y-4">
          <MLPredictionEngine />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerAnalyticsDashboard;
