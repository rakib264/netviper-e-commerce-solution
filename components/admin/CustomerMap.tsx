'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import { DeckGL } from '@deck.gl/react';
import {
  BarChart3,
  DollarSign,
  Filter,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { MapRef, Popup } from 'react-map-gl/maplibre';
import supercluster from 'supercluster';
import { Loader } from '@/components/ui/loader';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface OrderData {
  id: string;
  orderNumber: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  division: string;
  district: string;
  thana?: string;
  placeName?: string;
  postalCode?: string;
  customerName: string;
  customerEmail?: string;
  itemCount: number;
  createdAt: string;
}

interface CustomerMapProps {
  className?: string;
}

const INITIAL_VIEW_STATE = {
  longitude: 90.4125,
  latitude: 23.8103,
  zoom: 6.5,
  pitch: 0,
  bearing: 0
};

const CustomerMap: React.FC<CustomerMapProps> = ({ className }) => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [filters, setFilters] = useState({
    division: '',
    district: '',
    customerSegment: '',
    dateFrom: '',
    dateTo: ''
  });
  const [visualizationMode, setVisualizationMode] = useState<'markers' | 'heatmap' | 'clusters' | 'choropleth'>('clusters');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDebounceTimer, setFilterDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const mapRef = React.useRef<MapRef>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      params.append('includeCounts', 'true');
      params.append('includeHeatmap', 'true');

      const response = await fetch(`/api/admin/geospatial/orders?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const ordersData = data.orders || [];
      setOrders(ordersData);
      setAnalytics(data.analytics || null);
      setHeatmapData(data.heatmap || []);
    } catch (error) {
      console.error('Failed to fetch map data:', error);
      // Create some test data if API fails
      const testOrders: OrderData[] = [
        {
          id: 'test-1',
          orderNumber: 'TEST-001',
          coordinates: [90.4125, 23.8103],
          lat: 23.8103,
          lng: 90.4125,
          total: 5000,
          paymentStatus: 'paid',
          orderStatus: 'delivered',
          division: 'Dhaka Division',
          district: 'Dhaka',
          customerName: 'Test Customer',
          itemCount: 2,
          createdAt: new Date().toISOString()
        }
      ];
      setOrders(testOrders);
      setAnalytics(null);
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Filter effect with debouncing
  useEffect(() => {
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      fetchData();
    }, 300); // 300ms debounce
    
    setFilterDebounceTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [filters]);

  // Initial fetch only once
  useEffect(() => {
    fetchData();
  }, []);

  // Create clusters
  const clusters = useMemo(() => {
    if (!orders.length) {
      return [];
    }

    try {
      const cluster = new supercluster({
        radius: 40,
        maxZoom: 16,
        minZoom: 0,
        minPoints: 2
      });

      const points = orders.map((order, index) => {
        if (!order.coordinates || !Array.isArray(order.coordinates) || order.coordinates.length !== 2) {
          console.warn(`Order ${order.id} has invalid coordinates:`, order.coordinates);
          return null;
        }
        return {
          type: 'Feature' as const,
          properties: {
            cluster: false,
            orderId: order.id,
            orderData: order
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [order.coordinates[0], order.coordinates[1]]
          }
        };
      }).filter(Boolean) as any[];

      if (points.length === 0) {
        return [];
      }

      cluster.load(points);

      // Always show at least all points for better visualization
      const zoom = Math.floor(viewState.zoom);
      
      // Use full Bangladesh bounds if no map bounds available
      const bounds = mapRef.current?.getBounds();
      const bbox: [number, number, number, number] = bounds ? [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ] : [86.0, 20.0, 95.0, 27.0]; // Bangladesh bounds

      const clusteredPoints = cluster.getClusters(bbox, zoom);
      return clusteredPoints;
    } catch (error) {
      console.error('Clustering error:', error);
      return [];
    }
  }, [orders, viewState]);

  // Deck.GL layers
  const layers = useMemo(() => {
    const deckLayers: any[] = [];
    
    switch (visualizationMode) {
      case 'markers':
        if (orders.length > 0) {
          deckLayers.push(
            new ScatterplotLayer({
              id: 'orders-scatter',
              data: orders,
              getPosition: (d: OrderData) => [d.lng, d.lat],
              getRadius: (d: OrderData) => Math.max(120, Math.min(300, Math.sqrt(d.total) / 4)),
              getFillColor: (d: OrderData) => {
                switch (d.orderStatus) {
                  case 'delivered': return [34, 197, 94, 180];
                  case 'shipped': return [59, 130, 246, 180];
                  case 'processing': return [251, 191, 36, 180];
                  case 'cancelled': return [239, 68, 68, 180];
                  default: return [156, 163, 175, 180];
                }
              },
              getLineColor: (d: OrderData) => {
                switch (d.orderStatus) {
                  case 'delivered': return [22, 163, 74, 255];
                  case 'shipped': return [37, 99, 235, 255];
                  case 'processing': return [245, 158, 11, 255];
                  case 'cancelled': return [220, 38, 38, 255];
                  default: return [107, 114, 128, 255];
                }
              },
              getLineWidth: 2,
              stroked: true,
              filled: true,
              pickable: true,
              autoHighlight: true,
              highlightColor: [255, 255, 255, 150],
              radiusScale: 1,
              radiusMinPixels: 8,
              radiusMaxPixels: 30,
              onHover: (info: any) => {
                // Add subtle hover effect
                return true;
              },
              onClick: (info: any) => info.object && setSelectedOrder(info.object)
            })
          );
        }
        break;

      case 'heatmap':
        if (heatmapData.length > 0) {
          deckLayers.push(
            new HeatmapLayer({
              id: 'orders-heatmap',
              data: heatmapData,
              getPosition: (d: any) => d.coordinates,
              getWeight: (d: any) => d.weight || 1,
              radiusPixels: 80,
              intensity: 3,
              threshold: 0.03,
              colorRange: [
                [255, 255, 204, 0],    // Transparent yellow (no data)
                [255, 237, 160, 80],   // Light yellow
                [254, 217, 118, 120],  // Yellow
                [254, 178, 76, 160],   // Orange
                [253, 141, 60, 200],   // Dark orange
                [252, 78, 42, 240],    // Red orange
                [227, 26, 28, 255],    // Red
                [177, 0, 38, 255]      // Dark red
              ],
              aggregation: 'SUM'
            })
          );
        } else if (orders.length > 0) {
          // Enhanced fallback with better visual appeal
          deckLayers.push(
            new HeatmapLayer({
              id: 'orders-heatmap-fallback',
              data: orders,
              getPosition: (d: OrderData) => [d.lng, d.lat],
              getWeight: (d: OrderData) => Math.log(d.total / 100) + 1,
              radiusPixels: 85,
              intensity: 2.5,
              threshold: 0.02,
              colorRange: [
                [68, 0, 84, 0],        // Transparent purple (no data)
                [72, 40, 120, 80],     // Dark purple
                [62, 74, 137, 120],    // Purple blue
                [49, 104, 142, 160],   // Blue
                [38, 130, 142, 200],   // Teal
                [31, 158, 137, 240],   // Green teal
                [53, 183, 121, 255],   // Green
                [109, 205, 89, 255],   // Light green
                [180, 222, 44, 255],   // Yellow green
                [253, 231, 37, 255]    // Yellow
              ],
              aggregation: 'SUM'
            })
          );
        }
        break;

      case 'clusters':
        if (clusters.length > 0) {
          deckLayers.push(
            new ScatterplotLayer({
              id: 'clusters',
              data: clusters,
              getPosition: (d: any) => d.geometry.coordinates,
              getRadius: (d: any) => {
                if (d.properties.cluster) {
                  return Math.max(35, Math.min(150, d.properties.point_count * 6));
                }
                return 25;
              },
              getFillColor: (d: any) => {
                if (d.properties.cluster) {
                  const count = d.properties.point_count;
                  if (count > 20) return [220, 38, 127, 200];      // Pink
                  if (count > 10) return [248, 113, 113, 200];     // Light red
                  if (count > 5) return [251, 191, 36, 200];       // Yellow
                  return [34, 197, 94, 200];                       // Green
                }
                const order = d.properties.orderData;
                switch (order?.orderStatus) {
                  case 'delivered': return [34, 197, 94, 220];
                  case 'shipped': return [59, 130, 246, 220];
                  case 'processing': return [251, 191, 36, 220];
                  case 'cancelled': return [239, 68, 68, 220];
                  default: return [156, 163, 175, 220];
                }
              },
              getLineColor: (d: any) => {
                if (d.properties.cluster) {
                  return [255, 255, 255, 255];
                }
                return [255, 255, 255, 200];
              },
              getLineWidth: 3,
              stroked: true,
              filled: true,
              pickable: true,
              autoHighlight: true,
              highlightColor: [255, 255, 255, 100],
              onHover: (info: any) => {
                // Could add hover effects here if needed
                return true;
              },
              onClick: (info: any) => {
                if (info.object?.properties.cluster) {
                  const zoom = Math.min(16, viewState.zoom + 2);
                  setViewState(prev => ({
                    ...prev,
                    longitude: info.object.geometry.coordinates[0],
                    latitude: info.object.geometry.coordinates[1],
                    zoom,
                    transitionDuration: 800,
                    transitionInterpolator: 'linear'
                  }));
                } else if (info.object?.properties.orderData) {
                  setSelectedOrder(info.object.properties.orderData);
                }
              }
            })
          );
        }
        break;

      case 'choropleth':
        if (orders.length > 0) {
          // Enhanced hexagon layer with better visuals
          deckLayers.push(
            new HexagonLayer({
              id: 'hexagon-layer',
              data: orders,
              getPosition: (d: OrderData) => [d.lng, d.lat],
              getWeight: (d: OrderData) => Math.log(d.total + 1),
              radius: 6000,
              elevationScale: 20,
              extruded: true,
              coverage: 0.9,
              colorRange: [
                [26, 152, 80, 120],    // Green
                [102, 189, 99, 140],   // Light green  
                [166, 217, 106, 160],  // Yellow green
                [217, 239, 139, 180],  // Light yellow
                [255, 255, 191, 200],  // Yellow
                [254, 224, 139, 220],  // Orange yellow
                [253, 174, 97, 240],   // Orange
                [244, 109, 67, 255],   // Red orange
                [215, 48, 39, 255]     // Red
              ],
              upperPercentile: 95,
              lowerPercentile: 5,
              pickable: true,
              autoHighlight: true,
              highlightColor: [255, 255, 255, 80],
              onHover: (info: any) => {
                // Add hover information
                return true;
              },
              onClick: (info: any) => {
                if (info.object && info.object.points && info.object.points.length > 0) {
                  // Select the first order in the hexagon
                  setSelectedOrder(info.object.points[0].source);
                }
                return true;
              }
            })
          );
        }
        break;
    }

    return deckLayers;
  }, [orders, heatmapData, clusters, visualizationMode, viewState]);

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Migration Notice */}
      <div className="mb-4 p-4 bg-info-50 border border-info-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-info-100 text-info-700">New!</Badge>
          <p className="text-sm text-info-700">
            <strong>Enhanced Heatmap Available:</strong> Check out the new "District Heatmap" tab for amCharts5-powered Bangladesh district analytics with postal code breakdowns.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Visualization Mode Controls */}
        <Card className="bg-card/90 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualization Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: 'markers', icon: '📍', label: 'Markers', color: 'bg-info-500' },
                { mode: 'clusters', icon: '🎯', label: 'Clusters', color: 'bg-success-500' },
                { mode: 'heatmap', icon: '🔥', label: 'Heatmap', color: 'bg-destructive-500' },
                { mode: 'choropleth', icon: '🗺️', label: 'Regions', color: 'bg-primary-500' }
              ] as const).map(({ mode, icon, label, color }) => (
                <Button
                  key={mode}
                  variant={visualizationMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizationMode(mode)}
                  className={`h-auto p-3 flex flex-col items-center gap-2 transition-all hover:scale-105 ${
                    visualizationMode === mode 
                      ? `${color} text-white shadow-lg` 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="bg-gradient-to-br from-info-50 to-info-100 border-info-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-info-800 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Live Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-info-900">{orders.length}</div>
              <div className="text-xs text-info-600">Orders Shown</div>
            </div>
            {analytics && (
              <div className="text-center">
                <div className="text-lg font-bold text-success-700">
                  {formatCurrency(analytics.totalRevenue)}
                </div>
                <div className="text-xs text-success-600">Total Revenue</div>
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-caption text-muted-foreground">Live Data</span>
            </div>
          </CardContent>
        </Card>

        {/* Filter Controls Card */}
        <Card className="bg-card/90 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Quick Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full transition-all hover:scale-105"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewState(INITIAL_VIEW_STATE)}
              className="w-full transition-all hover:scale-105"
            >
              🇧🇩 Reset View
            </Button>
            <div className="grid grid-cols-2 gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters(prev => ({ ...prev, division: 'Dhaka Division' }))}
                className="text-xs px-2 py-1"
              >
                🏙️ Dhaka
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters(prev => ({ ...prev, customerSegment: 'high-value' }))}
                className="text-xs px-2 py-1"
              >
                💎 High Value
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics Card */}
        <Card className="bg-gradient-to-br from-success-50 to-success-100 border-success-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-success-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-success-600">Conversion Rate</span>
                <span className="text-sm font-bold text-success-800">7.8%</span>
              </div>
              <div className="w-full bg-success-200 rounded-full h-2">
                <div className="bg-success-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-success-600">Avg Order Value</span>
                <span className="text-sm font-bold text-success-800">{formatCurrency(2450)}</span>
              </div>
              <div className="w-full bg-success-200 rounded-full h-2">
                <div className="bg-success-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Container - Now full width without overlays */}
      <div className="relative w-full h-[700px] rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl bg-gradient-to-br from-info-50 to-info-100">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          // Disable zoom to avoid inconsistencies
          minZoom={INITIAL_VIEW_STATE.zoom}
          maxZoom={INITIAL_VIEW_STATE.zoom}
          maxBounds={[
            [86.0, 20.0], // Southwest coordinates of Bangladesh
            [95.0, 27.0]  // Northeast coordinates of Bangladesh
          ]}
        >
          <DeckGL
            viewState={viewState}
            layers={layers}
            // Disable all interactive controls (zoom, rotate, pan) except needed map pan from Map component
            controller={false}
          />

          {/* Enhanced Order Details Popup */}
          {selectedOrder && (
            <Popup
              longitude={selectedOrder.lng}
              latitude={selectedOrder.lat}
              anchor="bottom"
              onClose={() => setSelectedOrder(null)}
              closeButton={true}
              closeOnClick={false}
            >
              <Card className="w-80 shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-3 bg-gradient-to-r from-info-50 to-info-50">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Order #{selectedOrder.orderNumber}</span>
                    <Badge variant={
                      selectedOrder.orderStatus === 'delivered' ? 'default' :
                      selectedOrder.orderStatus === 'shipped' ? 'secondary' :
                      selectedOrder.orderStatus === 'cancelled' ? 'destructive' : 'outline'
                    } className="shadow-sm">
                      {selectedOrder.orderStatus}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-info-100 rounded-lg">
                      <Users className="h-4 w-4 text-info-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedOrder.customerName}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.customerEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-bold text-success-700">{formatCurrency(selectedOrder.total)}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.itemCount} items</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <MapPin className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedOrder.district}, {selectedOrder.division}</p>
                      {selectedOrder.thana && (
                        <p className="text-xs text-muted-foreground">
                          {selectedOrder.thana}, {selectedOrder.placeName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">
                      Ordered on {new Date(selectedOrder.createdAt).toLocaleDateString('en-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Popup>
          )}
        </Map>

        {/* Floating Legend */}
        <div className="absolute bottom-4 right-4">
          <Card className="p-3 bg-card/90 backdrop-blur-sm shadow-lg">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Legend</h3>
              <div className="space-y-1 text-xs">
                {visualizationMode === 'markers' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                      <span>Delivered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-info-500 rounded-full"></div>
                      <span>Shipped</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                      <span>Processing</span>
                    </div>
                  </>
                )}
                {visualizationMode === 'heatmap' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive-500 rounded-full"></div>
                      <span>High Density</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                      <span>Medium Density</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-info-500 rounded-full"></div>
                      <span>Low Density</span>
                    </div>
                  </>
                )}
                {visualizationMode === 'clusters' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-secondary-600 rounded-full"></div>
                      <span>20+ Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive-400 rounded-full"></div>
                      <span>10-20 Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                      <span>5-10 Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                      <span>Single Orders</span>
                    </div>
                  </>
                )}
                {visualizationMode === 'choropleth' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive-600 rounded-sm"></div>
                      <span>Highest Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning-500 rounded-sm"></div>
                      <span>High Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning-400 rounded-sm"></div>
                      <span>Medium Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-success-500 rounded-sm"></div>
                      <span>Lower Revenue</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Enhanced Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Card className="p-6 bg-card/90 backdrop-blur-sm shadow-2xl">
              <div className="flex items-center gap-3">
                <Loader size="md" label={null} />
                <div>
                  <p className="font-medium">Loading map data...</p>
                  <p className="text-sm text-muted-foreground">Processing geographical insights</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Advanced Filters</span>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader size="sm" label={null} />
                  Filtering...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Division</label>
                <select
                  value={filters.division}
                  onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-info-500 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="">🇧🇩 All Divisions</option>
                  <option value="Dhaka Division">🏙️ Dhaka Division</option>
                  <option value="Chittagong Division">🚢 Chittagong Division</option>
                  <option value="Rajshahi Division">🌾 Rajshahi Division</option>
                  <option value="Khulna Division">🌊 Khulna Division</option>
                  <option value="Barisal Division">🛶 Barisal Division</option>
                  <option value="Sylhet Division">🍃 Sylhet Division</option>
                  <option value="Rangpur Division">🌱 Rangpur Division</option>
                  <option value="Mymensingh Division">🌾 Mymensingh Division</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Customer Segment</label>
                <select
                  value={filters.customerSegment}
                  onChange={(e) => setFilters(prev => ({ ...prev, customerSegment: e.target.value }))}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-info-500 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="">👥 All Customers</option>
                  <option value="frequent">⭐ Frequent Customers</option>
                  <option value="new">🆕 New Customers</option>
                  <option value="high-value">💎 High Value</option>
                  <option value="low-value">📦 Regular Value</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-info-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-info-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Quick Filter Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({ division: '', district: '', customerSegment: '', dateFrom: '', dateTo: '' })}
                disabled={loading}
              >
                🔄 Clear All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters(prev => ({ ...prev, division: 'Dhaka Division' }))}
                disabled={loading}
              >
                🏙️ Dhaka Only
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters(prev => ({ ...prev, customerSegment: 'high-value' }))}
                disabled={loading}
              >
                💎 High Value
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }));
                }}
                disabled={loading}
              >
                📅 Today
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerMap;
