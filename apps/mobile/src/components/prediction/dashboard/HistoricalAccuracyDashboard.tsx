import React, { useMemo, useState } from 'react';
import { YStack, XStack, Text, View, Button, ScrollView } from '@tamagui/core';
import {
  LineChart,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  Bar,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle,
  Filter,
} from '@tamagui/lucide-icons';
import type { PredictionAccuracy, AccuracyRecord } from '@aura/shared-types';

interface HistoricalAccuracyDashboardProps {
  predictionAccuracy: PredictionAccuracy;
  accuracyHistory: AccuracyRecord[];
  predictionType: 'period' | 'ovulation' | 'both';
  timeRange: '3months' | '6months' | '1year' | 'all';
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  onTimeRangeChange?: (range: '3months' | '6months' | '1year' | 'all') => void;
  onFilterChange?: (filter: AccuracyFilter) => void;
}

interface AccuracyFilter {
  confidenceLevel?: number;
  errorRange?: [number, number];
  onlyCorrect?: boolean;
  predictionType?: 'period' | 'ovulation';
}

interface AccuracyAnalysis {
  overallAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  bestPerformingMonth: string;
  worstPerformingMonth: string;
  averageError: number;
  consistencyScore: number;
  errorDistribution: {
    early: number;
    onTime: number;
    late: number;
  };
  confidenceLevelPerformance: {
    high: { accuracy: number; count: number };
    medium: { accuracy: number; count: number };
    low: { accuracy: number; count: number };
  };
}

/**
 * Historical Accuracy Dashboard Component
 * Displays historical prediction vs actual event comparisons
 */
export const HistoricalAccuracyDashboard: React.FC<HistoricalAccuracyDashboardProps> = ({
  predictionAccuracy,
  accuracyHistory,
  predictionType,
  timeRange,
  stealthMode = false,
  culturalTheme = 'modern',
  onTimeRangeChange,
  onFilterChange,
}) => {
  const [activeFilter, setActiveFilter] = useState<AccuracyFilter>({});
  const [selectedMetric, setSelectedMetric] = useState<'accuracy' | 'error' | 'consistency'>(
    'accuracy'
  );

  // Analyze historical accuracy data
  const accuracyAnalysis = useMemo((): AccuracyAnalysis => {
    if (accuracyHistory.length === 0) {
      return {
        overallAccuracy: 0,
        trend: 'stable',
        bestPerformingMonth: '',
        worstPerformingMonth: '',
        averageError: 0,
        consistencyScore: 0,
        errorDistribution: { early: 0, onTime: 0, late: 0 },
        confidenceLevelPerformance: {
          high: { accuracy: 0, count: 0 },
          medium: { accuracy: 0, count: 0 },
          low: { accuracy: 0, count: 0 },
        },
      };
    }

    // Filter by time range
    const filteredHistory = filterHistoryByTimeRange(accuracyHistory, timeRange);

    // Calculate overall accuracy
    const correctPredictions = filteredHistory.filter(record => record.wasAccurate).length;
    const overallAccuracy = correctPredictions / filteredHistory.length;

    // Calculate trend
    const trend = calculateAccuracyTrend(filteredHistory);

    // Find best and worst performing months
    const monthlyPerformance = calculateMonthlyPerformance(filteredHistory);
    const bestMonth = Object.keys(monthlyPerformance).reduce(
      (a, b) => (monthlyPerformance[a].accuracy > monthlyPerformance[b].accuracy ? a : b),
      Object.keys(monthlyPerformance)[0] || ''
    );
    const worstMonth = Object.keys(monthlyPerformance).reduce(
      (a, b) => (monthlyPerformance[a].accuracy < monthlyPerformance[b].accuracy ? a : b),
      Object.keys(monthlyPerformance)[0] || ''
    );

    // Calculate average error
    const validErrors = filteredHistory
      .filter(record => record.errorDays !== null)
      .map(record => Math.abs(record.errorDays!));
    const averageError =
      validErrors.length > 0
        ? validErrors.reduce((sum, error) => sum + error, 0) / validErrors.length
        : 0;

    // Calculate consistency score (lower variance = higher consistency)
    const brierScores = filteredHistory.map(record => record.brierScore);
    const avgBrierScore = brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length;
    const brierVariance =
      brierScores.reduce((sum, score) => sum + Math.pow(score - avgBrierScore, 2), 0) /
      brierScores.length;
    const consistencyScore = Math.max(0, 1 - brierVariance);

    // Calculate error distribution
    const errorDistribution = calculateErrorDistribution(filteredHistory);

    // Calculate confidence level performance
    const confidenceLevelPerformance = calculateConfidenceLevelPerformance(filteredHistory);

    return {
      overallAccuracy,
      trend,
      bestPerformingMonth: bestMonth,
      worstPerformingMonth: worstMonth,
      averageError,
      consistencyScore,
      errorDistribution,
      confidenceLevelPerformance,
    };
  }, [accuracyHistory, timeRange]);

  function filterHistoryByTimeRange(history: AccuracyRecord[], range: string): AccuracyRecord[] {
    const now = new Date();
    const cutoffDate = new Date();

    switch (range) {
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return history;
    }

    return history.filter(record => new Date(record.predictionDate) >= cutoffDate);
  }

  function calculateAccuracyTrend(history: AccuracyRecord[]): 'improving' | 'stable' | 'declining' {
    if (history.length < 6) return 'stable';

    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    const firstHalfAccuracy = firstHalf.filter(r => r.wasAccurate).length / firstHalf.length;
    const secondHalfAccuracy = secondHalf.filter(r => r.wasAccurate).length / secondHalf.length;

    const improvement = secondHalfAccuracy - firstHalfAccuracy;

    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'declining';
    return 'stable';
  }

  function calculateMonthlyPerformance(
    history: AccuracyRecord[]
  ): Record<string, { accuracy: number; count: number }> {
    const monthlyData: Record<string, AccuracyRecord[]> = {};

    history.forEach(record => {
      const month = new Date(record.predictionDate).toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'short',
      });
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(record);
    });

    const monthlyPerformance: Record<string, { accuracy: number; count: number }> = {};
    Object.keys(monthlyData).forEach(month => {
      const records = monthlyData[month];
      const accuracy = records.filter(r => r.wasAccurate).length / records.length;
      monthlyPerformance[month] = { accuracy, count: records.length };
    });

    return monthlyPerformance;
  }

  function calculateErrorDistribution(history: AccuracyRecord[]): {
    early: number;
    onTime: number;
    late: number;
  } {
    let early = 0,
      onTime = 0,
      late = 0;

    history.forEach(record => {
      if (record.errorDays === null || record.errorDays === 0) {
        onTime++;
      } else if (record.errorDays < 0) {
        early++;
      } else {
        late++;
      }
    });

    const total = early + onTime + late;
    return {
      early: total > 0 ? early / total : 0,
      onTime: total > 0 ? onTime / total : 0,
      late: total > 0 ? late / total : 0,
    };
  }

  function calculateConfidenceLevelPerformance(
    history: AccuracyRecord[]
  ): AccuracyAnalysis['confidenceLevelPerformance'] {
    const high = history.filter(r => r.confidenceLevel >= 0.8);
    const medium = history.filter(r => r.confidenceLevel >= 0.5 && r.confidenceLevel < 0.8);
    const low = history.filter(r => r.confidenceLevel < 0.5);

    return {
      high: {
        accuracy: high.length > 0 ? high.filter(r => r.wasAccurate).length / high.length : 0,
        count: high.length,
      },
      medium: {
        accuracy: medium.length > 0 ? medium.filter(r => r.wasAccurate).length / medium.length : 0,
        count: medium.length,
      },
      low: {
        accuracy: low.length > 0 ? low.filter(r => r.wasAccurate).length / low.length : 0,
        count: low.length,
      },
    };
  }

  // Generate chart data
  const accuracyChartData = useMemo(() => {
    const filteredHistory = filterHistoryByTimeRange(accuracyHistory, timeRange);
    const monthlyPerformance = calculateMonthlyPerformance(filteredHistory);

    return Object.keys(monthlyPerformance).map(month => ({
      month,
      accuracy: Math.round(monthlyPerformance[month].accuracy * 100),
      predictions: monthlyPerformance[month].count,
    }));
  }, [accuracyHistory, timeRange]);

  const errorDistributionData = [
    {
      name: stealthMode ? 'Erken' : 'Erken Tahmin',
      value: accuracyAnalysis.errorDistribution.early * 100,
      color: '#F59E0B',
    },
    {
      name: stealthMode ? 'Doğru' : 'Doğru Zamanda',
      value: accuracyAnalysis.errorDistribution.onTime * 100,
      color: '#10B981',
    },
    {
      name: stealthMode ? 'Geç' : 'Geç Tahmin',
      value: accuracyAnalysis.errorDistribution.late * 100,
      color: '#EF4444',
    },
  ];

  const getThemeColors = () => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        background: '#f8f9fa',
        cardBg: '#ffffff',
      };
    }

    switch (culturalTheme) {
      case 'traditional':
        return {
          primary: '#8B4513',
          secondary: '#CD853F',
          success: '#228B22',
          warning: '#DAA520',
          danger: '#B22222',
          info: '#4682B4',
          background: '#FDF5E6',
          cardBg: '#FFFEF7',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          success: '#27AE60',
          warning: '#F39C12',
          danger: '#E74C3C',
          info: '#3498DB',
          background: '#FFFFFF',
          cardBg: '#F8F9FA',
        };
      default:
        return {
          primary: '#3B82F6',
          secondary: '#6B7280',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#06B6D4',
          background: '#F8FAFC',
          cardBg: '#FFFFFF',
        };
    }
  };

  const colors = getThemeColors();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return TrendingUp;
      case 'declining':
        return TrendingDown;
      default:
        return Target;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return colors.success;
      case 'declining':
        return colors.danger;
      default:
        return colors.info;
    }
  };

  const TrendIcon = getTrendIcon(accuracyAnalysis.trend);
  const trendColor = getTrendColor(accuracyAnalysis.trend);

  return (
    <ScrollView>
      <YStack space="$4" padding="$4" backgroundColor={colors.background}>
        {/* Header */}
        <YStack space="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$6" fontWeight="700" color={colors.primary}>
              {stealthMode ? 'Tahmin Başarı Analizi' : "Geçmiş Doğruluk Dashboard'u"}
            </Text>
            <Button
              size="$3"
              variant="outlined"
              borderColor={colors.primary}
              color={colors.primary}
              icon={Filter}
            >
              Filtrele
            </Button>
          </XStack>

          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode
              ? 'Geçmiş tahminlerin analizi ve trend değerlendirmesi'
              : 'Tahminlerin geçmiş performansı ve doğruluk trendleri'}
          </Text>
        </YStack>

        {/* Time Range Selector */}
        <XStack space="$2" justifyContent="center">
          {(['3months', '6months', '1year', 'all'] as const).map(range => (
            <Button
              key={range}
              size="$2"
              variant={timeRange === range ? 'solid' : 'outlined'}
              backgroundColor={timeRange === range ? colors.primary : 'transparent'}
              borderColor={colors.primary}
              color={timeRange === range ? 'white' : colors.primary}
              onPress={() => onTimeRangeChange?.(range)}
            >
              {range === '3months'
                ? '3 Ay'
                : range === '6months'
                  ? '6 Ay'
                  : range === '1year'
                    ? '1 Yıl'
                    : 'Tümü'}
            </Button>
          ))}
        </XStack>

        {/* Key Metrics Cards */}
        <XStack space="$3" justifyContent="space-around">
          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.success}
          >
            <CheckCircle size={24} color={colors.success} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              {stealthMode ? 'Genel Başarı' : 'Doğruluk Oranı'}
            </Text>
            <Text fontSize="$5" fontWeight="700" color={colors.success}>
              {Math.round(accuracyAnalysis.overallAccuracy * 100)}%
            </Text>
          </View>

          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={trendColor}
          >
            <TrendIcon size={24} color={trendColor} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              Trend
            </Text>
            <Text fontSize="$4" fontWeight="600" color={trendColor}>
              {accuracyAnalysis.trend === 'improving'
                ? 'İyileşiyor'
                : accuracyAnalysis.trend === 'declining'
                  ? 'Azalıyor'
                  : 'Sabit'}
            </Text>
          </View>

          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.warning}
          >
            <AlertCircle size={24} color={colors.warning} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              {stealthMode ? 'Ort. Fark' : 'Ortalama Hata'}
            </Text>
            <Text fontSize="$5" fontWeight="700" color={colors.warning}>
              ±{accuracyAnalysis.averageError.toFixed(1)}
            </Text>
            <Text fontSize="$1" color={colors.secondary}>
              gün
            </Text>
          </View>

          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.info}
          >
            <Target size={24} color={colors.info} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              Tutarlılık
            </Text>
            <Text fontSize="$5" fontWeight="700" color={colors.info}>
              {Math.round(accuracyAnalysis.consistencyScore * 100)}%
            </Text>
          </View>
        </XStack>

        {/* Accuracy Trend Chart */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
            {stealthMode ? 'Aylık Başarı Trendi' : 'Aylık Doğruluk Trendi'}
          </Text>

          <View height={200}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyChartData}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: colors.secondary }} />
                <YAxis tick={{ fontSize: 10, fill: colors.secondary }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.cardBg,
                    border: `1px solid ${colors.secondary}`,
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke={colors.primary}
                  strokeWidth={3}
                  dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                  name={stealthMode ? 'Başarı %' : 'Doğruluk %'}
                />
              </LineChart>
            </ResponsiveContainer>
          </View>
        </View>

        {/* Error Distribution Chart */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
            {stealthMode ? 'Tahmin Dağılımı' : 'Hata Dağılımı'}
          </Text>

          <View height={200}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={errorDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {errorDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </View>
        </View>

        {/* Confidence Level Performance */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
            {stealthMode ? 'Güven Seviyesi Performansı' : 'Güven Düzeyi Başarısı'}
          </Text>

          <YStack space="$3">
            {Object.entries(accuracyAnalysis.confidenceLevelPerformance).map(([level, data]) => (
              <XStack key={level} alignItems="center" justifyContent="space-between">
                <XStack space="$2" alignItems="center" flex={1}>
                  <Text fontSize="$3" color={colors.primary} width={70}>
                    {level === 'high' ? 'Yüksek' : level === 'medium' ? 'Orta' : 'Düşük'}
                  </Text>
                  <View
                    flex={1}
                    height={8}
                    backgroundColor={`${colors.primary}20`}
                    borderRadius={4}
                  >
                    <View
                      width={`${data.accuracy * 100}%`}
                      height="100%"
                      backgroundColor={
                        level === 'high'
                          ? colors.success
                          : level === 'medium'
                            ? colors.warning
                            : colors.danger
                      }
                      borderRadius={4}
                    />
                  </View>
                </XStack>
                <Text fontSize="$3" color={colors.secondary} width={60} textAlign="right">
                  {Math.round(data.accuracy * 100)}% ({data.count})
                </Text>
              </XStack>
            ))}
          </YStack>
        </View>

        {/* Best/Worst Performance */}
        {accuracyAnalysis.bestPerformingMonth && (
          <XStack space="$3">
            <View
              flex={1}
              padding="$3"
              backgroundColor={`${colors.success}10`}
              borderRadius="$4"
              borderLeftWidth={4}
              borderLeftColor={colors.success}
            >
              <Text fontSize="$3" fontWeight="500" color={colors.success}>
                {stealthMode ? 'En İyi Ay' : 'En Başarılı Ay'}
              </Text>
              <Text fontSize="$4" fontWeight="600" color={colors.primary}>
                {accuracyAnalysis.bestPerformingMonth}
              </Text>
            </View>

            {accuracyAnalysis.worstPerformingMonth && (
              <View
                flex={1}
                padding="$3"
                backgroundColor={`${colors.warning}10`}
                borderRadius="$4"
                borderLeftWidth={4}
                borderLeftColor={colors.warning}
              >
                <Text fontSize="$3" fontWeight="500" color={colors.warning}>
                  {stealthMode ? 'Gelişim Alanı' : 'İyileştirme Gereken Ay'}
                </Text>
                <Text fontSize="$4" fontWeight="600" color={colors.primary}>
                  {accuracyAnalysis.worstPerformingMonth}
                </Text>
              </View>
            )}
          </XStack>
        )}

        {/* Summary Insights */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.primary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$2">
            {stealthMode ? 'Özet Değerlendirme' : 'Performans Özeti'}
          </Text>

          <YStack space="$2">
            <Text fontSize="$3" color={colors.primary}>
              • {stealthMode ? 'Toplam' : 'Genel'} doğruluk oranınız %
              {Math.round(accuracyAnalysis.overallAccuracy * 100)}
            </Text>
            <Text fontSize="$3" color={colors.primary}>
              • Tahminleriniz ortalama ±{accuracyAnalysis.averageError.toFixed(1)} gün sapma
              gösteriyor
            </Text>
            <Text fontSize="$3" color={colors.primary}>
              •{' '}
              {accuracyAnalysis.trend === 'improving'
                ? 'Performansınız sürekli iyileşiyor'
                : accuracyAnalysis.trend === 'declining'
                  ? 'Son dönemde performans düşüşü var'
                  : 'Performansınız istikrarlı seviyelerde'}
            </Text>
          </YStack>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default HistoricalAccuracyDashboard;
