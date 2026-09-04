'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Award,
  Brain,
  Calendar,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface MLPrediction {
  division: string;
  district: string;
  lat: number;
  lng: number;
  currentMonthlyOrders: number;
  predictedMonthlyOrders: number;
  growthRate: number;
  trend: 'growing' | 'declining' | 'stable';
  confidence: number;
  seasonality: number;
  marketSaturation: number;
  competitionScore: number;
  modelAccuracy: number; // Historical prediction accuracy
  predictionInterval: { lower: number; upper: number }; // 95% confidence interval
  featureImportance: { [key: string]: number }; // Feature importance scores
  mlModel: {
    algorithm: string;
    trainingDate: string;
    dataPoints: number;
    crossValidationScore: number;
  };
  riskFactors: string[];
  opportunities: string[];
  lastUpdated: string;
}

interface CustomerLifetimeValue {
  segment: string;
  currentValue: number;
  predictedValue: number;
  churnProbability: number;
  recommendedActions: string[];
  confidence: number;
  predictionHorizon: string; // '12 months', '24 months', etc.
  valueDrivers: string[]; // Key factors driving LTV
  riskSegments: string[]; // Risk categories
  retentionStrategy: {
    primaryTactic: string;
    expectedUplift: number;
    investmentRequired: number;
    timeframe: string;
  };
}

interface MarketOpportunity {
  location: string;
  opportunityScore: number;
  marketSize: number;
  penetrationRate: number;
  recommendedInvestment: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeToROI: number; // months
  confidence: number;
  mlInsights: {
    demandPattern: string;
    seasonalFactors: number;
    competitiveAdvantage: string[];
    marketBarriers: string[];
  };
  projectedRevenue: {
    year1: number;
    year2: number;
    year3: number;
  };
}

interface ModelPerformanceMetrics {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mape: number; // Mean Absolute Percentage Error
  lastTrainingDate: string;
  dataQuality: number;
  predictionDrift: number;
  status: 'healthy' | 'degrading' | 'needs_retraining';
}

interface ExplainableAI {
  prediction: number;
  explanation: {
    topFactors: Array<{
      feature: string;
      contribution: number;
      description: string;
    }>;
    baselineValue: number;
    totalContribution: number;
  };
  counterfactuals: Array<{
    scenario: string;
    change: string;
    newPrediction: number;
    feasibility: number;
  }>;
}

const MLPredictionEngine: React.FC = () => {
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [customerLTV, setCustomerLTV] = useState<CustomerLifetimeValue[]>([]);
  const [marketOpportunities, setMarketOpportunities] = useState<MarketOpportunity[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformanceMetrics[]>([]);
  const [explainableAI, setExplainableAI] = useState<ExplainableAI[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMLTraining, setIsMLTraining] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('12');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [autoRetraining, setAutoRetraining] = useState(true);

  // Advanced ML Analytics
  const advancedAnalytics = useMemo(() => {
    if (!predictions.length) return null;

    // Market saturation analysis
    const saturatedMarkets = predictions.filter(p => 
      p.marketSaturation && p.marketSaturation > 0.8
    );

    // High-growth potential markets
    const highGrowthMarkets = predictions.filter(p => 
      p.growthRate > 0.2 && p.confidence > 0.7
    );

    // Underperforming markets
    const underperformingMarkets = predictions.filter(p => 
      p.growthRate < -0.1 && p.trend === 'declining'
    );

    // Risk assessment
    const riskScore = predictions.reduce((acc, p) => {
      const risk = (1 - p.confidence) * Math.abs(p.growthRate);
      return acc + risk;
    }, 0) / predictions.length;

    return {
      saturatedMarkets,
      highGrowthMarkets,
      underperformingMarkets,
      averageGrowthRate: predictions.reduce((acc, p) => acc + p.growthRate, 0) / predictions.length,
      averageConfidence: predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length,
      riskScore
    };
  }, [predictions]);

  const fetchMLPredictions = async () => {
    setLoading(true);
    try {
      // Enhanced predictions with advanced ML features
      const response = await fetch(`/api/admin/geospatial/analytics?type=growth-prediction&timeframe=${selectedTimeframe}`);
      const data = await response.json();
      
      // Simulate advanced ML features (in production, these would come from your ML pipeline)
      const enhancedPredictions = (data.predictions || []).map((pred: any) => ({
        ...pred,
        seasonality: Math.random() * 0.3 + 0.1, // 10-40% seasonal variation
        marketSaturation: Math.random() * 0.9 + 0.1, // 10-100% market saturation
        competitionScore: Math.random() * 0.8 + 0.2 // 20-100% competition intensity
      }));

      setPredictions(enhancedPredictions);

      // Generate customer LTV predictions
      const ltvData: CustomerLifetimeValue[] = [
        {
          segment: 'High-Value Frequent',
          currentValue: 15000,
          predictedValue: 18500,
          churnProbability: 0.05,
          recommendedActions: ['VIP program enrollment', 'Personalized offers'],
          confidence: 0.92,
          predictionHorizon: '12 months',
          valueDrivers: ['Purchase frequency', 'AOV'],
          riskSegments: ['low'],
          retentionStrategy: {
            primaryTactic: 'VIP loyalty program',
            expectedUplift: 0.12,
            investmentRequired: 50000,
            timeframe: 'Q1'
          }
        },
        {
          segment: 'High-Value Occasional',
          currentValue: 8000,
          predictedValue: 9200,
          churnProbability: 0.15,
          recommendedActions: ['Engagement campaigns', 'Frequency incentives'],
          confidence: 0.88,
          predictionHorizon: '12 months',
          valueDrivers: ['Recency', 'Seasonality'],
          riskSegments: ['medium'],
          retentionStrategy: {
            primaryTactic: 'Reactivation email + offers',
            expectedUplift: 0.08,
            investmentRequired: 30000,
            timeframe: 'Q1'
          }
        },
        {
          segment: 'Low-Value Frequent',
          currentValue: 3000,
          predictedValue: 3600,
          churnProbability: 0.25,
          recommendedActions: ['Upselling campaigns', 'Loyalty rewards'],
          confidence: 0.82,
          predictionHorizon: '12 months',
          valueDrivers: ['Frequency', 'Discount sensitivity'],
          riskSegments: ['medium'],
          retentionStrategy: {
            primaryTactic: 'Tiered loyalty incentives',
            expectedUplift: 0.06,
            investmentRequired: 20000,
            timeframe: 'Q2'
          }
        },
        {
          segment: 'New Customers',
          currentValue: 500,
          predictedValue: 2500,
          churnProbability: 0.35,
          recommendedActions: ['Onboarding program', 'First purchase incentives'],
          confidence: 0.8,
          predictionHorizon: '12 months',
          valueDrivers: ['Onboarding completion', 'First-90-day activity'],
          riskSegments: ['high'],
          retentionStrategy: {
            primaryTactic: 'Onboarding + welcome series',
            expectedUplift: 0.1,
            investmentRequired: 15000,
            timeframe: 'First 90 days'
          }
        }
      ];
      setCustomerLTV(ltvData);

      // Generate market opportunities
      const opportunities: MarketOpportunity[] = enhancedPredictions
        .filter((pred: any) => pred.growthRate > 0.1)
        .slice(0, 5)
        .map((pred: any) => ({
          location: `${pred.district}, ${pred.division.replace(' Division', '')}`,
          opportunityScore: Math.min(100, (pred.growthRate * 100) + (pred.confidence * 50)),
          marketSize: Math.floor(Math.random() * 500000) + 100000,
          penetrationRate: Math.random() * 0.3 + 0.05,
          recommendedInvestment: Math.floor(Math.random() * 1000000) + 200000,
          riskLevel: pred.confidence > 0.8 ? 'low' : pred.confidence > 0.6 ? 'medium' : 'high',
          timeToROI: Math.floor(Math.random() * 12) + 6
        }));
      setMarketOpportunities(opportunities);

    } catch (error) {
      console.error('Failed to fetch ML predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLPredictions();
  }, [selectedTimeframe]);

  const getPredictionChartData = () => {
    return predictions.slice(0, 10).map(pred => ({
      location: `${pred.district}`,
      current: pred.currentMonthlyOrders,
      predicted: pred.predictedMonthlyOrders,
      confidence: pred.confidence * 100,
      growth: pred.growthRate * 100
    }));
  };

  const getLTVChartData = () => {
    return customerLTV.map(ltv => ({
      segment: ltv.segment.replace(' ', '\n'),
      current: ltv.currentValue,
      predicted: ltv.predictedValue,
      churnRisk: ltv.churnProbability * 100
    }));
  };

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary-600" />
            ML Prediction Engine
            <Badge variant="secondary">AI-Powered</Badge>
          </h2>
          <p className="text-muted-foreground">
            Advanced machine learning analytics for business intelligence and growth forecasting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="6">6 Months</option>
            <option value="12">12 Months</option>
            <option value="24">24 Months</option>
          </select>
          <Button onClick={fetchMLPredictions} disabled={loading}>
            {loading ? 'Training Models...' : 'Refresh Predictions'}
          </Button>
        </div>
      </div>

      {/* ML Insights Overview */}
      {advancedAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="font-medium">Avg Growth Rate</p>
                  <p className="text-xl font-bold text-success-600">
                    {(advancedAnalytics.averageGrowthRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info-100 rounded-lg">
                  <Award className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <p className="font-medium">Model Confidence</p>
                  <p className="text-xl font-bold text-info-600">
                    {(advancedAnalytics.averageConfidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Target className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium">High Growth Markets</p>
                  <p className="text-xl font-bold text-primary-600">
                    {advancedAnalytics.highGrowthMarkets.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                </div>
                <div>
                  <p className="font-medium">Risk Score</p>
                  <p className="text-xl font-bold text-warning-600">
                    {(advancedAnalytics.riskScore * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions">Growth Forecasting</TabsTrigger>
          <TabsTrigger value="ltv">Customer LTV</TabsTrigger>
          <TabsTrigger value="opportunities">Market Opportunities</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        {/* Growth Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prediction Accuracy vs Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={getPredictionChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="growth" name="Growth Rate %" />
                    <YAxis dataKey="confidence" name="Confidence %" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="confidence" fill="hsl(var(--chart-3))" />
                    <ReferenceLine x={0} stroke="#666" strokeDasharray="2 2" />
                    <ReferenceLine y={70} stroke="#666" strokeDasharray="2 2" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current vs Predicted Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getPredictionChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="current" stroke="hsl(var(--chart-1))" name="Current" />
                    <Line type="monotone" dataKey="predicted" stroke="hsl(var(--chart-2))" name="Predicted" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* High Confidence Predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                High Confidence Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predictions
                  .filter(pred => pred.confidence > 0.8)
                  .slice(0, 5)
                  .map((pred, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-success-100 rounded-full">
                          <Award className="h-4 w-4 text-success-600" />
                        </div>
                        <div>
                          <p className="font-medium">{pred.district}, {pred.division.replace(' Division', '')}</p>
                          <p className="text-sm text-muted-foreground">
                            {pred.currentMonthlyOrders} → {pred.predictedMonthlyOrders} orders/month
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-success-500" />
                          <span className="text-success-600 font-medium">
                            {(pred.growthRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs font-caption text-muted-foreground">
                          {(pred.confidence * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer LTV Tab */}
        <TabsContent value="ltv" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Lifetime Value Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getLTVChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Area type="monotone" dataKey="current" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} name="Current LTV" />
                    <Area type="monotone" dataKey="predicted" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} name="Predicted LTV" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Churn Risk by Segment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerLTV.map((ltv, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{ltv.segment}</span>
                        <Badge variant={
                          ltv.churnProbability < 0.1 ? 'default' :
                          ltv.churnProbability < 0.3 ? 'secondary' : 'destructive'
                        }>
                          {(ltv.churnProbability * 100).toFixed(1)}% risk
                        </Badge>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            ltv.churnProbability < 0.1 ? 'bg-success-500' :
                            ltv.churnProbability < 0.3 ? 'bg-warning-500' : 'bg-destructive-500'
                          }`}
                          style={{ width: `${ltv.churnProbability * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LTV Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Segment-Specific Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerLTV.map((ltv, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">{ltv.segment}</h3>
                    <div className="text-sm text-muted-foreground mb-3">
                      Current: {formatCurrency(ltv.currentValue)} → 
                      Predicted: {formatCurrency(ltv.predictedValue)}
                    </div>
                    <ul className="space-y-1">
                      {ltv.recommendedActions.map((action, actionIndex) => (
                        <li key={actionIndex} className="text-sm flex items-center gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full"></div>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Market Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketOpportunities.map((opp, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{opp.location}</h3>
                      <Badge variant={
                        opp.riskLevel === 'low' ? 'default' :
                        opp.riskLevel === 'medium' ? 'secondary' : 'destructive'
                      }>
                        {opp.riskLevel} risk
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Opportunity Score</div>
                        <div className="font-medium">{opp.opportunityScore.toFixed(0)}/100</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Market Size</div>
                        <div className="font-medium">{opp.marketSize.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Investment Needed</div>
                        <div className="font-medium">{formatCurrency(opp.recommendedInvestment)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Time to ROI</div>
                        <div className="font-medium">{opp.timeToROI} months</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
                    <h4 className="font-medium text-success-800 mb-2">🎯 High Priority Actions</h4>
                    <ul className="space-y-1 text-sm text-success-700">
                      <li>• Focus marketing budget on Dhaka & Chittagong divisions</li>
                      <li>• Implement retention campaigns for high-value segments</li>
                      <li>• Expand delivery network in high-growth districts</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-info-50 border border-info-200 rounded-lg">
                    <h4 className="font-medium text-info-800 mb-2">📈 Growth Opportunities</h4>
                    <ul className="space-y-1 text-sm text-info-700">
                      <li>• Launch premium product lines in saturated markets</li>
                      <li>• Introduce subscription models for frequent customers</li>
                      <li>• Partner with local businesses in underserved areas</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <h4 className="font-medium text-warning-800 mb-2">⚠️ Risk Mitigation</h4>
                    <ul className="space-y-1 text-sm text-warning-700">
                      <li>• Monitor declining markets for early intervention</li>
                      <li>• Diversify product portfolio in high-risk regions</li>
                      <li>• Implement dynamic pricing in competitive areas</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Implementation Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-success-500 pl-4">
                    <h4 className="font-medium">Month 1-2: Quick Wins</h4>
                    <p className="text-sm text-muted-foreground">
                      Launch retention campaigns and optimize high-performing regions
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-info-500 pl-4">
                    <h4 className="font-medium">Month 3-6: Strategic Growth</h4>
                    <p className="text-sm text-muted-foreground">
                      Expand to new markets and implement advanced customer segmentation
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary-500 pl-4">
                    <h4 className="font-medium">Month 6-12: Scale & Optimize</h4>
                    <p className="text-sm text-muted-foreground">
                      Full market penetration and advanced AI-driven personalization
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLPredictionEngine;
