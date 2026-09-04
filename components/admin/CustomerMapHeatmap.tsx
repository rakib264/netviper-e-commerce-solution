'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import {
  BarChart3,
  Filter,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from '@/components/ui/loader';

interface PostalCodeData {
  postalCode: string;
  locationName: string;
  orders: number;
}

interface DistrictData {
  districtId: number;
  districtName: string;
  orders: number;
  postalCodes: PostalCodeData[];
}

interface HeatmapFilters {
  district: string;
  postalCode: string;
  orderRangeMin: string;
  orderRangeMax: string;
  dateFrom: string;
  dateTo: string;
}

interface CustomerMapHeatmapProps {
  className?: string;
}

const CustomerMapHeatmap: React.FC<CustomerMapHeatmapProps> = ({ className }) => {
  const { palette } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const mapChartRef = useRef<am5map.MapChart | null>(null);
  const polygonSeriesRef = useRef<am5map.MapPolygonSeries | null>(null);
  
  const [data, setData] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [filters, setFilters] = useState<HeatmapFilters>({
    district: '',
    postalCode: '',
    orderRangeMin: '',
    orderRangeMax: '',
    dateFrom: '',
    dateTo: ''
  });

  // Sequential ramp for the choropleth. amCharts needs a concrete colour rather
  // than a CSS variable, so the steps come from the theme's generated `info`
  // scale — which means the map re-themes with the rest of the UI.
  const getColorForOrders = useCallback(
    (orders: number): am5.Color => {
      const step = (token: string, fallback: string) =>
        am5.color(palette[token] || fallback);

      if (orders === 0) return step('--muted', '#e2e8f0');
      if (orders <= 50) return step('--info-200', '#93c5fd');
      if (orders <= 100) return step('--info-400', '#3b82f6');
      if (orders <= 200) return step('--info-500', '#1d4ed8');
      if (orders <= 300) return step('--info-600', '#1e40af');
      if (orders <= 400) return step('--info-700', '#1e3a8a');
      if (orders <= 500) return step('--info-800', '#172554');
      return step('--info-900', '#0f172a');
    },
    [palette],
  );

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/admin/heatmap/districts?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initialize amCharts5 map
  useEffect(() => {
    if (!chartRef.current) return;

    // Create root element
    const root = am5.Root.new(chartRef.current);
    rootRef.current = root;

    // Set themes
    root.setThemes([am5themes_Animated.new(root)]);

    // Enable tooltips globally
    root.tooltipContainer.onPrivate("visible", function(visible) {
      console.log("Tooltip visibility changed:", visible);
    });

    // Create map chart
    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: 'translateX',
        panY: 'translateY',
        projection: am5map.geoMercator(),
        homeZoomLevel: 7,
        homeGeoPoint: { longitude: 90.4125, latitude: 23.8103 }
      })
    );
    // Disable zoom interactions to avoid inconsistencies
    chart.setAll({ wheelX: 'none', wheelY: 'none' });
    mapChartRef.current = chart;

    // Create main polygon series for countries
    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: undefined, // Will be loaded dynamically
        valueField: 'orders',
        calculateAggregates: true,
        exclude: ['AQ']
      })
    );
    polygonSeriesRef.current = polygonSeries;

    // Configure polygon appearance
    polygonSeries.mapPolygons.template.setAll({
      tooltipText: '{name_en}',
      interactive: true,
      fill: am5.color(palette['--muted'] || '#e2e8f0'),
      stroke: am5.color(palette['--border'] || '#cbd5e1'),
      strokeWidth: 1
    });

    // Add hover effects
    polygonSeries.mapPolygons.template.states.create('hover', {
      fill: am5.color(palette['--warning'] || '#f59e0b'),
      stroke: am5.color(palette['--warning-700'] || '#d97706'),
      strokeWidth: 2
    });


    // Load Bangladesh GeoJSON data
    am5.net.load('/geo-json/district_wise_bangla_name.json').then(function(result) {
      const geoData = am5.JSONParser.parse(result.response || '{}');
      console.log('GeoJSON loaded successfully:', geoData);
      polygonSeries.set('geoJSON', geoData);
      
      // Wait for polygons to be created, then mark map as ready
      const checkPolygons = () => {
        console.log('Checking polygons, count:', polygonSeries.mapPolygons.length);
        if (polygonSeries.mapPolygons.length > 0) {
          console.log('Map is ready, polygon count:', polygonSeries.mapPolygons.length);
          setMapReady(true);
        } else {
          console.log('Polygons not ready yet, retrying...');
          setTimeout(checkPolygons, 500);
        }
      };
      
      setTimeout(checkPolygons, 1000);
    }).catch(function(error) {
      console.error('Failed to load GeoJSON:', error);
    });

    // Cleanup function
    return () => {
      if (rootRef.current) {
        rootRef.current.dispose();
      }
    };
  }, []);

  // Memoize district data mapping for performance
  const districtDataMap = useMemo(() => {
    if (!data.length) return {};
    
    return data.reduce((acc, district) => {
      // Skip invalid districts
      if (!district.districtName || district.districtName.trim().length < 3) {
        return acc;
      }
      
      // Create comprehensive name variations for matching
      const variations = [
        district.districtName.toLowerCase().trim(),
        district.districtName.toLowerCase().replace(/\s+/g, ''),
        district.districtName.toLowerCase().replace('chattogram', 'chittagong'),
        district.districtName.toLowerCase().replace('chittagong', 'chattogram'),
        district.districtName.toLowerCase().replace("cox's bazar", "cox's bazar"),
        district.districtName.toLowerCase().replace("coxs bazar", "cox's bazar"),
        district.districtName.toLowerCase().replace("cox bazar", "cox's bazar"),
        // Handle common spelling variations
        district.districtName.toLowerCase().replace('bogra', 'bogura'),
        district.districtName.toLowerCase().replace('bogura', 'bogra'),
        district.districtName.toLowerCase().replace('jessore', 'jashore'),
        district.districtName.toLowerCase().replace('jashore', 'jessore')
      ];
      
      variations.forEach(variation => {
        if (variation.trim()) {
          acc[variation] = district;
        }
      });
      return acc;
    }, {} as { [key: string]: DistrictData });
  }, [data]);

  // Update map data when data changes
  useEffect(() => {
    if (!polygonSeriesRef.current || !mapReady) {
      return;
    }

    // Check if polygons are actually loaded
    if (polygonSeriesRef.current.mapPolygons.length === 0) {
      return;
    }

    console.log('Updating map with data for', data.length, 'districts');

    // Reset colors and update based on data
    const updatePolygonData = () => {
      let updatedCount = 0;
      
      polygonSeriesRef.current!.mapPolygons.each((polygon, index) => {
        const dataItem = polygon.dataItem;
        let geoDistrictName = '';
        let geoData: any = null;
        
        // Get GeoJSON data efficiently
        if (dataItem) {
          geoData = (dataItem as any).geometryData || 
                   (dataItem as any).geoData || 
                   dataItem.dataContext ||
                   (polygon as any).dataItem?.properties;
        }
        
        // Extract district name from GeoJSON
        if (geoData?.properties) {
          geoDistrictName = (geoData.properties.name_en || geoData.properties.name || '').toLowerCase().trim();
        } else if (geoData?.name_en) {
          geoDistrictName = geoData.name_en.toLowerCase().trim();
        }
        
        if (geoDistrictName) {
          // Look up district data efficiently
          const geoDistrictNameNoSpace = geoDistrictName.replace(/\s+/g, '');
          let districtData = districtDataMap[geoDistrictName] || 
                           districtDataMap[geoDistrictNameNoSpace] || 
                           districtDataMap[geoDistrictName.replace('chattogram', 'chittagong')] ||
                           districtDataMap[geoDistrictName.replace('chittagong', 'chattogram')];

          const orders = districtData?.orders || 0;
          const color = getColorForOrders(orders);
          
          // Update polygon appearance
          polygon.set('fill', color);
          
          if (districtData) {
            updatedCount++;
            
            // Create efficient tooltip
            // Show full postcode/location breakdown for the district
            const postalBreakdown = (districtData.postalCodes || [])
              .map(pc => `${pc.locationName} (${pc.postalCode}): ${pc.orders} orders`)
              .join('\n');

            const tooltipText = `${districtData.districtName}: ${districtData.orders} orders\n${postalBreakdown}`;
            polygon.set('tooltipText', tooltipText);
          } else {
            // Default tooltip for districts with no data
            const districtDisplayName = geoData?.properties?.name_en || geoData?.name_en || geoDistrictName || 'Unknown';
            polygon.set('tooltipText', `${districtDisplayName}: 0 orders`);
          }
        }
      });
      
      console.log(`Efficiently updated ${updatedCount} districts out of ${data.length} total`);
    };

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(updatePolygonData);
    
  }, [data, mapReady, districtDataMap]);

  // Fetch data on component mount and filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger data update when map becomes ready
  useEffect(() => {
    if (mapReady && data.length > 0) {
      console.log('Map ready - forcing data update');
      // Trigger a re-run of the data effect
      setData(prev => [...prev]);
    }
  }, [mapReady]);

  const handleFilterChange = (key: keyof HeatmapFilters, value: string) => {
    // Handle clearing the filter when selecting "All Districts" 
    const actualValue = value === 'all' || value === '' || value.trim() === '' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: actualValue }));
  };

  const clearFilters = () => {
    setFilters({
      district: '',
      postalCode: '',
      orderRangeMin: '',
      orderRangeMax: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const totalOrders = data.reduce((sum, district) => sum + district.orders, 0);
  const totalDistricts = data.length;

  return (
    <div className={`w-full h-full space-y-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-info-50 to-info-100 border-info-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info-500 rounded-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-info-900">{totalDistricts}</p>
                <p className="text-sm text-info-600">Active Districts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 border-success-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-500 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success-900">{totalOrders}</p>
                <p className="text-sm text-success-600">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-900">
                  {totalDistricts > 0 ? Math.round(totalOrders / totalDistricts) : 0}
                </p>
                <p className="text-sm text-primary-600">Avg per District</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-warning-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning-900">
                  {data.reduce((sum, d) => sum + d.postalCodes.length, 0)}
                </p>
                <p className="text-sm text-warning-600">Postal Areas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Heatmap Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? (
                  <Loader size="sm" label={null} className="mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="district">District</Label>
                <Select value={filters.district || 'all'} onValueChange={(value) => handleFilterChange('district', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All Districts</SelectItem>
                    <SelectItem value="Bagerhat">Bagerhat</SelectItem>
                    <SelectItem value="Bandarban">Bandarban</SelectItem>
                    <SelectItem value="Barguna">Barguna</SelectItem>
                    <SelectItem value="Barisal">Barisal</SelectItem>
                    <SelectItem value="Bhola">Bhola</SelectItem>
                    <SelectItem value="Bogra">Bogra</SelectItem>
                    <SelectItem value="Brahmanbaria">Brahmanbaria</SelectItem>
                    <SelectItem value="Chandpur">Chandpur</SelectItem>
                    <SelectItem value="Chittagong">Chittagong</SelectItem>
                    <SelectItem value="Chuadanga">Chuadanga</SelectItem>
                    <SelectItem value="Comilla">Comilla</SelectItem>
                    <SelectItem value="Cox's Bazar">Cox's Bazar</SelectItem>
                    <SelectItem value="Dhaka">Dhaka</SelectItem>
                    <SelectItem value="Dinajpur">Dinajpur</SelectItem>
                    <SelectItem value="Faridpur">Faridpur</SelectItem>
                    <SelectItem value="Feni">Feni</SelectItem>
                    <SelectItem value="Gaibandha">Gaibandha</SelectItem>
                    <SelectItem value="Gazipur">Gazipur</SelectItem>
                    <SelectItem value="Gopalganj">Gopalganj</SelectItem>
                    <SelectItem value="Habiganj">Habiganj</SelectItem>
                    <SelectItem value="Jamalpur">Jamalpur</SelectItem>
                    <SelectItem value="Jessore">Jessore</SelectItem>
                    <SelectItem value="Jhalokati">Jhalokati</SelectItem>
                    <SelectItem value="Jhenaidah">Jhenaidah</SelectItem>
                    <SelectItem value="Joypurhat">Joypurhat</SelectItem>
                    <SelectItem value="Khagrachhari">Khagrachhari</SelectItem>
                    <SelectItem value="Khulna">Khulna</SelectItem>
                    <SelectItem value="Kishoreganj">Kishoreganj</SelectItem>
                    <SelectItem value="Kurigram">Kurigram</SelectItem>
                    <SelectItem value="Kushtia">Kushtia</SelectItem>
                    <SelectItem value="Lakshmipur">Lakshmipur</SelectItem>
                    <SelectItem value="Lalmonirhat">Lalmonirhat</SelectItem>
                    <SelectItem value="Madaripur">Madaripur</SelectItem>
                    <SelectItem value="Magura">Magura</SelectItem>
                    <SelectItem value="Manikganj">Manikganj</SelectItem>
                    <SelectItem value="Meherpur">Meherpur</SelectItem>
                    <SelectItem value="Moulvibazar">Moulvibazar</SelectItem>
                    <SelectItem value="Munshiganj">Munshiganj</SelectItem>
                    <SelectItem value="Mymensingh">Mymensingh</SelectItem>
                    <SelectItem value="Naogaon">Naogaon</SelectItem>
                    <SelectItem value="Narail">Narail</SelectItem>
                    <SelectItem value="Narayanganj">Narayanganj</SelectItem>
                    <SelectItem value="Narsingdi">Narsingdi</SelectItem>
                    <SelectItem value="Natore">Natore</SelectItem>
                    <SelectItem value="Nawabganj">Nawabganj</SelectItem>
                    <SelectItem value="Netrokona">Netrokona</SelectItem>
                    <SelectItem value="Nilphamari">Nilphamari</SelectItem>
                    <SelectItem value="Noakhali">Noakhali</SelectItem>
                    <SelectItem value="Pabna">Pabna</SelectItem>
                    <SelectItem value="Panchagarh">Panchagarh</SelectItem>
                    <SelectItem value="Patuakhali">Patuakhali</SelectItem>
                    <SelectItem value="Pirojpur">Pirojpur</SelectItem>
                    <SelectItem value="Rajbari">Rajbari</SelectItem>
                    <SelectItem value="Rajshahi">Rajshahi</SelectItem>
                    <SelectItem value="Rangamati">Rangamati</SelectItem>
                    <SelectItem value="Rangpur">Rangpur</SelectItem>
                    <SelectItem value="Satkhira">Satkhira</SelectItem>
                    <SelectItem value="Shariatpur">Shariatpur</SelectItem>
                    <SelectItem value="Sherpur">Sherpur</SelectItem>
                    <SelectItem value="Sirajganj">Sirajganj</SelectItem>
                    <SelectItem value="Sunamganj">Sunamganj</SelectItem>
                    <SelectItem value="Sylhet">Sylhet</SelectItem>
                    <SelectItem value="Tangail">Tangail</SelectItem>
                    <SelectItem value="Thakurgaon">Thakurgaon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="e.g., 1207"
                  value={filters.postalCode}
                  onChange={(e) => handleFilterChange('postalCode', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="orderRangeMin">Min Orders</Label>
                <Input
                  id="orderRangeMin"
                  type="number"
                  placeholder="e.g., 50"
                  value={filters.orderRangeMin}
                  onChange={(e) => handleFilterChange('orderRangeMin', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="orderRangeMax">Max Orders</Label>
                <Input
                  id="orderRangeMax"
                  type="number"
                  placeholder="e.g., 500"
                  value={filters.orderRangeMax}
                  onChange={(e) => handleFilterChange('orderRangeMax', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleFilterChange('district', 'Dhaka')}>
                Dhaka Only
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleFilterChange('district', 'Chittagong')}>
                Chittagong Only
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleFilterChange('district', 'Sylhet')}>
                Sylhet Only
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                handleFilterChange('orderRangeMin', '100');
                handleFilterChange('orderRangeMax', '500');
              }}>
                Medium Volume (100-500)
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                handleFilterChange('orderRangeMin', '500');
                handleFilterChange('orderRangeMax', '');
              }}>
                High Volume (500+)
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Map Container */}
      <Card className="relative">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Bangladesh District Heatmap</span>
              {filters.district && filters.district !== '' && (
                <Badge variant="secondary" className="bg-info-100 text-info-800">
                  {filters.district} District
                </Badge>
              )}
              {(!filters.district || filters.district === '') && (
                <Badge variant="outline" className="bg-success-50 text-success-700">
                  All Districts
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-info-50">
                amCharts5
              </Badge>
              {loading && (
                <Badge variant="outline" className="bg-warning-50">
                  Loading...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <div 
              ref={chartRef} 
              className="w-full h-[600px] bg-gradient-to-br from-muted to-info-50"
            />
            
            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Order Volume</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-border rounded"></div>
                    <span>0 orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-200 rounded"></div>
                    <span>1-50</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-400 rounded"></div>
                    <span>51-100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-500 rounded"></div>
                    <span>101-200</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-600 rounded"></div>
                    <span>201-300</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-700 rounded"></div>
                    <span>301-400</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-800 rounded"></div>
                    <span>401-500</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-info-900 rounded"></div>
                    <span>500+</span>
                  </div>
                </div>
              </div>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-card/70 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-card rounded-lg p-6 shadow-lg border">
                  <div className="flex items-center gap-3">
                    <Loader size="md" label={null} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium">Loading heatmap data...</p>
                      <p className="text-sm text-muted-foreground">Processing district analytics</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Districts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Districts by Order Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.slice(0, 10).map((district, index) => (
              <div key={district.districtId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-info-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{district.districtName}</p>
                    <p className="text-sm text-muted-foreground">{district.postalCodes.length} postal areas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{district.orders}</p>
                  <p className="text-sm text-muted-foreground">orders</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerMapHeatmap;
