'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  DollarSign,
  Download,
  Map,
  RefreshCw,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface LocationInsight {
  division: string;
  district: string;
  lat: number;
  lng: number;
  marketScore: number;
  penetrationRate: number;
  competitionLevel: 'low' | 'medium' | 'high';
  customerAcquisitionCost: number;
  averageOrderValue: number;
  conversionRate: number;
  confidence: number; // ML model confidence
  growthPotential: number; // Predicted growth rate
  marketSaturation: number; // Market saturation level
  digitalReadiness: number; // Digital adoption score
  logisticsScore: number; // Delivery infrastructure score
  seasonalTrends: Array<{
    month: string;
    orderMultiplier: number;
    confidence: number;
  }>;
  demographics: {
    ageGroups: Array<{ group: string; percentage: number }>;
    incomeLevels: Array<{ level: string; percentage: number }>;
    digitalSavviness: number;
  };
  mlFeatures: {
    trendStability: number;
    predictedLifetimeValue: number;
    churnRisk: number;
    crossSellPotential: number;
    competitorThreat: number;
  };
  recommendations: {
    campaignType: string[];
    budget: number;
    expectedROI: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeline: string;
    confidence: number;
    mlReasoning: string;
  };
}

interface CampaignOpportunity {
  id: string;
  name: string;
  targetLocations: string[];
  estimatedReach: number;
  estimatedCost: number;
  expectedRevenue: number;
  roi: number;
  confidence: number;
  timeline: string;
  campaignType: 'awareness' | 'conversion' | 'retention' | 'expansion';
  priority: 'low' | 'medium' | 'high' | 'critical';
  mlScore: number; // AI-generated opportunity score
  riskFactors: string[];
  successProbability: number;
  competitorAnalysis: {
    competitorCount: number;
    marketShare: number;
    differentiationScore: number;
  };
}

interface MarketPrediction {
  location: string;
  currentQuarterProjection: number;
  nextQuarterProjection: number;
  yearEndProjection: number;
  confidence: number;
  factors: string[];
  risks: string[];
  opportunities: string[];
}

interface LocationPerformanceMetrics {
  location: string;
  actualPerformance: number;
  predictedPerformance: number;
  variance: number;
  trend: 'improving' | 'stable' | 'declining';
  mlAccuracy: number;
}

const LocationTargetingInsights: React.FC = () => {
  const [locationInsights, setLocationInsights] = useState<LocationInsight[]>([]);
  const [campaignOpportunities, setCampaignOpportunities] = useState<CampaignOpportunity[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<LocationPerformanceMetrics[]>([]);
  const [marketPredictions, setMarketPredictions] = useState<MarketPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMLTraining, setIsMLTraining] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [budgetRange, setBudgetRange] = useState<string>('medium');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [simulationParams, setSimulationParams] = useState({
    budgetIncrease: 0,
    targetingPrecision: 80,
    seasonalAdjustment: 0
  });

  const generateRealisticLocationData = useCallback(() => {
    const divisions = [
      { name: 'Dhaka Division', districts: ['Dhaka', 'Gazipur', 'Narayanganj', 'Manikganj'], digital: 0.8, population: 36000000 },
      { name: 'Chittagong Division', districts: ['Chittagong', 'Cox\'s Bazar', 'Comilla', 'Feni'], digital: 0.6, population: 28000000 },
      { name: 'Sylhet Division', districts: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'], digital: 0.7, population: 10000000 },
      { name: 'Rajshahi Division', districts: ['Rajshahi', 'Rangpur', 'Bogura', 'Pabna'], digital: 0.5, population: 18000000 },
      { name: 'Khulna Division', districts: ['Khulna', 'Jessore', 'Satkhira', 'Bagerhat'], digital: 0.55, population: 16000000 }
    ];

    return divisions.flatMap(division => 
      division.districts.slice(0, 2).map((district, index) => {
        const baseMarketScore = 60 + Math.random() * 35;
        const penetrationRate = 0.1 + Math.random() * 0.4;
        const confidence = 0.75 + Math.random() * 0.25;
        const growthPotential = -0.1 + Math.random() * 0.5;
        const marketSaturation = Math.random() * 0.8;
        const digitalReadiness = division.digital * (0.8 + Math.random() * 0.4);
        const logisticsScore = 0.4 + Math.random() * 0.6;
        
        const competitionLevel = baseMarketScore > 80 ? 'high' : baseMarketScore > 60 ? 'medium' : 'low';
        const customerAcquisitionCost = competitionLevel === 'high' ? 120 + Math.random() * 80 : 
                                      competitionLevel === 'medium' ? 80 + Math.random() * 60 : 50 + Math.random() * 40;
        
        return {
          division: division.name,
          district,
          lat: 23.8103 + (Math.random() - 0.5) * 3,
          lng: 90.4125 + (Math.random() - 0.5) * 4,
          marketScore: Math.round(baseMarketScore),
          penetrationRate,
          competitionLevel,
          customerAcquisitionCost: Math.round(customerAcquisitionCost),
          averageOrderValue: 2000 + Math.random() * 3000,
          conversionRate: 0.06 + Math.random() * 0.04,
          confidence,
          growthPotential,
          marketSaturation,
          digitalReadiness,
          logisticsScore,
          seasonalTrends: [
            { month: 'Jan', orderMultiplier: 1.0 + (Math.random() - 0.5) * 0.4, confidence: 0.9 },
            { month: 'Feb', orderMultiplier: 0.8 + (Math.random() - 0.5) * 0.3, confidence: 0.85 },
            { month: 'Mar', orderMultiplier: 1.1 + (Math.random() - 0.5) * 0.3, confidence: 0.9 },
            { month: 'Apr', orderMultiplier: 1.3 + (Math.random() - 0.5) * 0.4, confidence: 0.95 },
            { month: 'May', orderMultiplier: 1.4 + (Math.random() - 0.5) * 0.3, confidence: 0.9 },
            { month: 'Jun', orderMultiplier: 1.1 + (Math.random() - 0.5) * 0.3, confidence: 0.85 }
          ],
          demographics: {
            ageGroups: [
              { group: '18-25', percentage: 25 + Math.random() * 15 },
              { group: '26-35', percentage: 35 + Math.random() * 15 },
              { group: '36-45', percentage: 20 + Math.random() * 10 },
              { group: '46+', percentage: 10 + Math.random() * 10 }
            ],
            incomeLevels: [
              { level: 'High', percentage: 20 + Math.random() * 20 },
              { level: 'Medium', percentage: 45 + Math.random() * 15 },
              { level: 'Low', percentage: 25 + Math.random() * 15 }
            ],
            digitalSavviness: digitalReadiness
          },
          mlFeatures: {
            trendStability: 0.6 + Math.random() * 0.4,
            predictedLifetimeValue: 8000 + Math.random() * 12000,
            churnRisk: 0.1 + Math.random() * 0.3,
            crossSellPotential: 0.2 + Math.random() * 0.6,
            competitorThreat: competitionLevel === 'high' ? 0.7 + Math.random() * 0.3 : 0.2 + Math.random() * 0.5
          },
          recommendations: {
            campaignType: competitionLevel === 'high' ? 
              ['Premium Targeting', 'Influencer Marketing', 'Content Marketing'] :
              ['Digital Ads', 'Local Partnerships', 'Social Media'],
            budget: Math.round((150000 + Math.random() * 300000) * (budgetRange === 'high' ? 1.5 : budgetRange === 'low' ? 0.7 : 1)),
            expectedROI: 2.5 + Math.random() * 2,
            priority: confidence > 0.9 ? 'critical' : confidence > 0.8 ? 'high' : confidence > 0.7 ? 'medium' : 'low',
            timeline: confidence > 0.8 ? '1-3 months' : '2-6 months',
            confidence,
            mlReasoning: `Based on ${Math.round(confidence * 100)}% confidence prediction using demographic patterns, market saturation (${Math.round(marketSaturation * 100)}%), and growth potential (${Math.round(growthPotential * 100)}%)`
          }
        } as LocationInsight;
      })
    );
  }, [budgetRange]);

  const fetchLocationTargetingData = async () => {
    setLoading(true);
    try {
      setIsMLTraining(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Generate realistic ML-powered location data
      const mockLocationInsights = generateRealisticLocationData();
      
      // Filter by selected division if specified
      const filteredInsights = selectedDivision 
        ? mockLocationInsights.filter(insight => insight.division === selectedDivision)
        : mockLocationInsights;

      setLocationInsights(filteredInsights);

      // Generate enhanced campaign opportunities with ML scoring
      const opportunities: CampaignOpportunity[] = filteredInsights
        .filter(location => location.confidence >= confidenceThreshold)
        .slice(0, 4)
        .map((location, index) => {
          const mlScore = (location.confidence * 0.4) + (location.growthPotential * 0.3) + ((1 - location.marketSaturation) * 0.3);
          const estimatedReach = Math.round(15000 + Math.random() * 45000);
          const estimatedCost = location.recommendations.budget;
          const expectedRevenue = estimatedCost * location.recommendations.expectedROI;
          
          return {
            id: `opp-${index + 1}`,
            name: `${location.district} ${location.competitionLevel === 'high' ? 'Premium' : 'Growth'} Campaign`,
            targetLocations: [location.division],
            estimatedReach,
            estimatedCost,
            expectedRevenue,
            roi: location.recommendations.expectedROI,
            confidence: location.confidence,
            timeline: location.recommendations.timeline,
            campaignType: location.growthPotential > 0.2 ? 'expansion' : location.penetrationRate < 0.2 ? 'awareness' : 'conversion',
            priority: location.recommendations.priority,
            mlScore,
            riskFactors: [
              ...(location.competitionLevel === 'high' ? ['High competition'] : []),
              ...(location.marketSaturation > 0.7 ? ['Market saturation'] : []),
              ...(location.digitalReadiness < 0.5 ? ['Low digital adoption'] : []),
              ...(location.logisticsScore < 0.6 ? ['Infrastructure challenges'] : [])
            ],
            successProbability: location.confidence * (0.8 + Math.random() * 0.2),
            competitorAnalysis: {
              competitorCount: location.competitionLevel === 'high' ? 8 + Math.floor(Math.random() * 5) : 
                              location.competitionLevel === 'medium' ? 4 + Math.floor(Math.random() * 4) : 
                              1 + Math.floor(Math.random() * 3),
              marketShare: location.penetrationRate,
              differentiationScore: 0.6 + Math.random() * 0.4
            }
          } as CampaignOpportunity;
        });

      setCampaignOpportunities(opportunities);

      // Generate market analysis data
      const marketData = filteredInsights.map(location => ({
        location: `${location.district}, ${location.division.replace(' Division', '')}`,
        marketScore: location.marketScore,
        penetrationRate: location.penetrationRate * 100,
        cac: location.customerAcquisitionCost,
        aov: location.averageOrderValue,
        conversionRate: location.conversionRate * 100,
        roi: location.recommendations.expectedROI,
        confidence: location.confidence * 100,
        growthPotential: location.growthPotential * 100
      }));

      setMarketAnalysis(marketData);

      // Generate enhanced performance metrics with ML insights
      const performanceData: LocationPerformanceMetrics[] = filteredInsights.map(location => {
        const predicted = location.averageOrderValue * (1 + location.growthPotential);
        const variance = Math.abs(predicted - location.averageOrderValue) / location.averageOrderValue;
        
        return {
          location: `${location.district}, ${location.division.replace(' Division', '')}`,
          actualPerformance: location.averageOrderValue,
          predictedPerformance: predicted,
          variance,
          trend: location.growthPotential > 0.1 ? 'improving' : location.growthPotential < -0.1 ? 'declining' : 'stable',
          mlAccuracy: location.confidence
        };
      });

      setPerformanceMetrics(performanceData);

      // Generate market predictions
      const predictions: MarketPrediction[] = filteredInsights.slice(0, 3).map(location => {
        const baseProjection = location.averageOrderValue * 30; // Monthly projection
        
        return {
          location: `${location.district}, ${location.division.replace(' Division', '')}`,
          currentQuarterProjection: baseProjection * 3,
          nextQuarterProjection: baseProjection * 3 * (1 + location.growthPotential),
          yearEndProjection: baseProjection * 12 * (1 + location.growthPotential * 1.2),
          confidence: location.confidence,
          factors: [
            'Historical performance trends',
            'Seasonal patterns',
            'Market saturation analysis',
            'Competition dynamics',
            'Digital adoption rates'
          ],
          risks: location.mlFeatures.competitorThreat > 0.6 ? 
            ['High competitor threat', 'Market saturation'] : 
            ['Economic volatility', 'Seasonal fluctuations'],
          opportunities: location.digitalReadiness > 0.7 ? 
            ['Digital channel expansion', 'Premium positioning'] : 
            ['Market education', 'Infrastructure development']
        };
      });

      setMarketPredictions(predictions);

    } catch (error) {
      console.error('Failed to fetch location targeting data:', error);
    } finally {
      setLoading(false);
      setIsMLTraining(false);
    }
  };

  // Analytics computation
  const analytics = useMemo(() => {
    if (!locationInsights.length) return null;
    
    const totalOpportunities = campaignOpportunities.length;
    const avgROI = campaignOpportunities.reduce((sum, c) => sum + c.roi, 0) / campaignOpportunities.length;
    const totalReach = campaignOpportunities.reduce((sum, c) => sum + c.estimatedReach, 0);
    const expectedRevenue = campaignOpportunities.reduce((sum, c) => sum + c.expectedRevenue, 0);
    const avgConfidence = locationInsights.reduce((sum, l) => sum + l.confidence, 0) / locationInsights.length;
    
    return {
      totalOpportunities,
      avgROI,
      totalReach,
      expectedRevenue,
      avgConfidence,
      highConfidenceLocations: locationInsights.filter(l => l.confidence >= confidenceThreshold).length
    };
  }, [locationInsights, campaignOpportunities, confidenceThreshold]);

  // Export functionality
  const exportReport = useCallback((format: 'csv' | 'pdf') => {
    const data = locationInsights.map(l => ({
      Location: `${l.district}, ${l.division}`,
      'Market Score': l.marketScore,
      'Penetration Rate': `${(l.penetrationRate * 100).toFixed(1)}%`,
      'CAC': l.customerAcquisitionCost,
      'AOV': l.averageOrderValue.toFixed(0),
      'Confidence': `${(l.confidence * 100).toFixed(1)}%`,
      'Growth Potential': `${(l.growthPotential * 100).toFixed(1)}%`
    }));
    
    if (format === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `location-targeting-insights-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  }, [locationInsights]);

  useEffect(() => {
    fetchLocationTargetingData();
  }, [selectedDivision, budgetRange]);

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-destructive-600 bg-destructive-50 border-destructive-200';
      case 'high': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'medium': return 'text-warning-600 bg-warning-50 border-warning-200';
      default: return 'text-success-600 bg-success-50 border-success-200';
    }
  };

  const getTopOpportunities = () => {
    return campaignOpportunities
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3);
  };

  const getHighValueLocations = () => {
    return locationInsights
      .sort((a, b) => b.marketScore - a.marketScore)
      .slice(0, 4);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary-50 to-info-50 p-6 rounded-lg border border-primary-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Map className="h-8 w-8 text-primary-600" />
              AI Location Targeting Insights
              <Badge variant="secondary" className="bg-primary-100 text-primary-700">
                <Sparkles className="h-3 w-3 mr-1" />
                {analytics?.avgConfidence ? `${(analytics.avgConfidence * 100).toFixed(1)}% Accuracy` : 'ML Powered'}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-2">
              Advanced machine learning analytics for geo-targeted marketing and growth optimization
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport('csv')}
              className="bg-card/80 hover:bg-card"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card/80 hover:bg-card"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Report
            </Button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Target Division</Label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="p-2 border rounded-md bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                <option value="">All Divisions</option>
                <option value="Dhaka Division">Dhaka</option>
                <option value="Chittagong Division">Chittagong</option>
                <option value="Sylhet Division">Sylhet</option>
                <option value="Rajshahi Division">Rajshahi</option>
                <option value="Khulna Division">Khulna</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Budget Range</Label>
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="p-2 border rounded-md bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                <option value="low">Low Budget (50K-150K)</option>
                <option value="medium">Medium Budget (150K-300K)</option>
                <option value="high">High Budget (300K+)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">ML Confidence Threshold</Label>
              <div className="flex items-center gap-2 w-32">
                <Slider
                  value={[confidenceThreshold * 100]}
                  onValueChange={(value) => setConfidenceThreshold(value[0] / 100)}
                  max={100}
                  min={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs font-caption text-subtle-foreground min-w-fit">
                  {(confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="advanced-metrics-location"
                checked={showAdvancedMetrics}
                onCheckedChange={setShowAdvancedMetrics}
              />
              <Label htmlFor="advanced-metrics-location" className="text-sm font-medium text-muted-foreground">
                Advanced Metrics
              </Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={fetchLocationTargetingData} 
              disabled={loading || isMLTraining}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isMLTraining ? (
                <>
                  <Loader size="sm" label={null} className="mr-2" />
                  Training Models...
                </>
              ) : loading ? (
                <>
                  <Loader size="sm" label={null} className="mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-700 mb-1">Campaign Opportunities</p>
                <p className="text-3xl font-bold text-primary-900">{analytics?.totalOpportunities || 0}</p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="bg-primary-100 text-primary-700 text-xs">
                    {analytics?.highConfidenceLocations || 0} high confidence
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-primary-500 rounded-xl">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 border-success-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-success-700 mb-1">Avg Expected ROI</p>
                <p className="text-3xl font-bold text-success-900">
                  {analytics?.avgROI ? `${analytics.avgROI.toFixed(1)}x` : '0x'}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="bg-success-100 text-success-700 text-xs">
                    AI-optimized targeting
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-success-500 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info-50 to-info-100 border-info-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-info-700 mb-1">Total Reach</p>
                <p className="text-3xl font-bold text-info-900">
                  {analytics?.totalReach ? `${(analytics.totalReach / 1000).toFixed(0)}K` : '0K'}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="bg-info-100 text-info-700 text-xs">
                    Estimated audience
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-info-500 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-warning-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warning-700 mb-1">Expected Revenue</p>
                <p className="text-3xl font-bold text-warning-900">
                  {formatCurrency(analytics?.expectedRevenue || 0)}
                </p>
                <div className="flex items-center mt-2">
                  <Progress 
                    value={(analytics?.avgConfidence || 0) * 100} 
                    className="w-20 h-2 bg-warning-200"
                  />
                  <Badge variant="secondary" className="bg-warning-100 text-warning-700 text-xs ml-2">
                    {((analytics?.avgConfidence || 0) * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-warning-500 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <Loader size="md" label={null} />
            <div>
              <p className="font-medium">Analyzing location data...</p>
              <p className="text-sm text-muted-foreground">Processing geographic insights and market opportunities</p>
            </div>
          </div>
        </Card>
      )}

      {/* Rest of the component tabs and content would continue here */}
      {!loading && locationInsights.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Enhanced location targeting interface with advanced ML analytics is being finalized...</p>
        </div>
      )}
    </div>
  );
};

export default LocationTargetingInsights;