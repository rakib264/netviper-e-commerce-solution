'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { DeckGL } from '@deck.gl/react';
import {
  Calendar,
  Clock,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { MapRef } from 'react-map-gl/maplibre';
import { Loader } from '@/components/ui/loader';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface TimeSeriesData {
  _id: {
    year: number;
    month: number;
    day: number;
    division?: string;
  };
  orderCount: number;
  revenue: number;
  coordinates: Array<{
    lat: number;
    lng: number;
    divisionName?: string;
    district?: string;
  }>;
}

interface AnimationFrame {
  date: Date;
  orders: Array<{
    lat: number;
    lng: number;
    division?: string;
    district?: string;
    count: number;
    revenue: number;
  }>;
  totalOrders: number;
  totalRevenue: number;
}

const INITIAL_VIEW_STATE = {
  longitude: 90.4125,
  latitude: 23.8103,
  zoom: 7,
  pitch: 0,
  bearing: 0
};

const TimeSeriesAnimationMap: React.FC = () => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [animationFrames, setAnimationFrames] = useState<AnimationFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  const mapRef = React.useRef<MapRef>(null);

  // Fetch time series data
  const fetchTimeSeriesData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'time-series',
        timeframe: '12',
        ...(selectedDivision ? { division: selectedDivision } : {})
      });

      const response = await fetch(`/api/admin/geospatial/analytics?${params}`);
      const data = await response.json();
      setTimeSeriesData(data.timeSeries || []);
    } catch (error) {
      console.error('Failed to fetch time series data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDivision]);

  useEffect(() => {
    fetchTimeSeriesData();
  }, [fetchTimeSeriesData]);

  // Process time series data into animation frames
  useEffect(() => {
    if (!timeSeriesData.length) return;

    const frames: AnimationFrame[] = [];
    const dateMap: { [key: string]: TimeSeriesData[] } = {};

    // Group data by date
    timeSeriesData.forEach(item => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      dateMap[dateKey].push(item);
    });

    // Sort dates and create cumulative frames
    const sortedDates = Object.keys(dateMap).sort();
    let cumulativeOrders: { [key: string]: { 
      lat: number; 
      lng: number; 
      division?: string; 
      district?: string; 
      count: number; 
      revenue: number; 
    } } = {};

    sortedDates.forEach(dateKey => {
      const dayData = dateMap[dateKey];
      
      dayData.forEach(item => {
        item.coordinates.forEach(coord => {
          const locationKey = `${coord.lat}-${coord.lng}`;
          
          if (!cumulativeOrders[locationKey]) {
            cumulativeOrders[locationKey] = {
              lat: coord.lat,
              lng: coord.lng,
              division: coord.divisionName,
              district: coord.district,
              count: 0,
              revenue: 0
            };
          }
          
          const location = cumulativeOrders[locationKey];
          location.count += item.orderCount;
          location.revenue += item.revenue;
        });
      });

      const frameOrders = Object.values(cumulativeOrders);
      const totalOrders = frameOrders.reduce((sum, order) => sum + order.count, 0);
      const totalRevenue = frameOrders.reduce((sum, order) => sum + order.revenue, 0);

      frames.push({
        date: new Date(dateKey),
        orders: frameOrders,
        totalOrders,
        totalRevenue
      });
    });

    setAnimationFrames(frames);
    setCurrentFrameIndex(0);
  }, [timeSeriesData]);

  // Animation control
  useEffect(() => {
    if (!isPlaying || !animationFrames.length) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => {
        if (prev >= animationFrames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, animationFrames.length, playbackSpeed]);

  // Current frame data
  const currentFrame = animationFrames[currentFrameIndex];

  // Deck.GL layers for animation
  const layers = useMemo(() => {
    if (!currentFrame) return [];

    return [
      new ScatterplotLayer({
        id: 'animated-orders',
        data: currentFrame.orders,
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius: (d: any) => Math.max(200, Math.sqrt(d.count) * 100),
        getFillColor: (d: any) => {
          // Color intensity based on order count
          const intensity = Math.min(255, (d.count / 50) * 255);
          return [255, 255 - intensity, 0, 180];
        },
        getLineColor: [255, 255, 255],
        getLineWidth: 2,
        pickable: true,
        radiusUnits: 'meters',
        updateTriggers: {
          getRadius: [currentFrameIndex],
          getFillColor: [currentFrameIndex]
        }
      }),

      // Growth arcs (showing order flow over time)
      new ArcLayer({
        id: 'growth-arcs',
        data: currentFrame.orders.slice(0, 20), // Top 20 locations
        getSourcePosition: (d: any) => [90.4125, 23.8103], // Dhaka center
        getTargetPosition: (d: any) => [d.lng, d.lat],
        getSourceColor: [0, 128, 255, 100],
        getTargetColor: [255, 128, 0, 200],
        getWidth: (d: any) => Math.max(1, Math.sqrt(d.count) / 10),
        updateTriggers: {
          getWidth: [currentFrameIndex]
        }
      })
    ];
  }, [currentFrame, currentFrameIndex]);

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  const handlePlay = () => {
    if (currentFrameIndex >= animationFrames.length - 1) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  return (
    <div className="w-full h-full space-y-4">
      {/* Animation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time-Series Order Animation
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {currentFrame ? currentFrame.date.toLocaleDateString() : 'Loading...'}
              </Badge>
              {currentFrame && (
                <Badge variant="outline">
                  {currentFrame.totalOrders.toLocaleString()} orders
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlay}
                  disabled={isPlaying || loading}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  disabled={!isPlaying}
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm">Progress:</span>
                <Slider
                  value={[currentFrameIndex]}
                  onValueChange={([value]) => setCurrentFrameIndex(value)}
                  max={animationFrames.length - 1}
                  step={1}
                  className="flex-1"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">
                  {currentFrameIndex + 1} / {animationFrames.length}
                </span>
              </div>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-4">
              <span className="text-sm">Speed:</span>
              <div className="flex items-center gap-2">
                {[500, 1000, 2000].map(speed => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlaybackSpeed(speed)}
                  >
                    {speed === 500 ? '2x' : speed === 1000 ? '1x' : '0.5x'}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm">Division:</span>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="p-1 border rounded text-sm"
                  disabled={loading}
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
              </div>
            </div>

            {/* Current Frame Stats */}
            {currentFrame && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-info-600">
                    {currentFrame.totalOrders.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600">
                    {formatCurrency(currentFrame.totalRevenue)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {currentFrame.orders.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Locations</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        >
          <DeckGL
            viewState={viewState}
            layers={layers}
            controller={true}
          />
        </Map>

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Loader size="sm" label={null} />
                <span className="text-white">Loading time series data...</span>
              </div>
            </Card>
          </div>
        )}

        {/* Date Display */}
        {currentFrame && (
          <div className="absolute top-4 left-4">
            <Card className="p-3 bg-black/80 text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {currentFrame.date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4">
          <Card className="p-3 bg-card/95 backdrop-blur">
            <div className="space-y-2">
              <div className="font-medium text-sm">Order Volume</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-warning-500"></div>
                <span>Low (1-10)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-warning-500"></div>
                <span>Medium (11-50)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-destructive-500"></div>
                <span>High (50+)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesAnimationMap;
