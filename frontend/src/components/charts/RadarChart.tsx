'use client';

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Big Five personality traits data structure
export interface BigFiveData {
  openness: number; // 開放性
  conscientiousness: number; // 誠実性
  extraversion: number; // 外向性
  agreeableness: number; // 協調性
  neuroticism: number; // 神経症傾向
}

// Generic radar chart data
export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark?: number;
  [key: string]: string | number | undefined;
}

interface RadarChartProps {
  data: RadarDataPoint[] | { [key: string]: string | number }[];
  dataKey?: string;
  nameKey?: string;
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  fillColor?: string;
  strokeColor?: string;
  color?: string;
  height?: number;
}

export function RadarChart({
  data,
  dataKey = 'value',
  nameKey = 'subject',
  className,
  title,
  description,
  showLegend = false,
  showTooltip = true,
  fillColor,
  strokeColor,
  color = 'hsl(var(--primary))',
  height = 300,
}: RadarChartProps) {
  const actualFillColor = fillColor || color;
  const actualStrokeColor = strokeColor || color;
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey={nameKey}
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <Radar
          name="スコア"
          dataKey={dataKey}
          stroke={actualStrokeColor}
          fill={actualFillColor}
          fillOpacity={0.3}
          strokeWidth={2}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value) => [`${value}点`, 'スコア']}
          />
        )}
        {showLegend && <Legend />}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{chartContent}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{chartContent}</div>;
}

// Big Five specific radar chart
interface BigFiveRadarChartProps {
  data: BigFiveData;
  className?: string;
  title?: string;
  description?: string;
  showCard?: boolean;
}

export function BigFiveRadarChart({
  data,
  className,
  title = 'ビッグファイブ診断結果',
  description = '性格特性の5つの因子を表示しています',
  showCard = true,
}: BigFiveRadarChartProps) {
  const chartData: RadarDataPoint[] = [
    { subject: '開放性', value: data.openness, fullMark: 100 },
    { subject: '誠実性', value: data.conscientiousness, fullMark: 100 },
    { subject: '外向性', value: data.extraversion, fullMark: 100 },
    { subject: '協調性', value: data.agreeableness, fullMark: 100 },
    { subject: '情緒安定性', value: 100 - data.neuroticism, fullMark: 100 },
  ];

  if (showCard) {
    return (
      <RadarChart
        data={chartData}
        title={title}
        description={description}
        className={className}
        fillColor="hsl(221.2 83.2% 53.3%)"
        strokeColor="hsl(221.2 83.2% 53.3%)"
      />
    );
  }

  return (
    <RadarChart
      data={chartData}
      className={className}
      fillColor="hsl(221.2 83.2% 53.3%)"
      strokeColor="hsl(221.2 83.2% 53.3%)"
    />
  );
}

// Comparison radar chart (for comparing two datasets)
interface ComparisonRadarChartProps {
  data: RadarDataPoint[];
  dataKey1: string;
  dataKey2: string;
  name1?: string;
  name2?: string;
  className?: string;
  title?: string;
  description?: string;
  height?: number;
}

export function ComparisonRadarChart({
  data,
  dataKey1,
  dataKey2,
  name1 = 'データ1',
  name2 = 'データ2',
  className,
  title,
  description,
  height = 300,
}: ComparisonRadarChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <Radar
          name={name1}
          dataKey={dataKey1}
          stroke="hsl(221.2 83.2% 53.3%)"
          fill="hsl(221.2 83.2% 53.3%)"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Radar
          name={name2}
          dataKey={dataKey2}
          stroke="hsl(142.1 76.2% 36.3%)"
          fill="hsl(142.1 76.2% 36.3%)"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{chartContent}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{chartContent}</div>;
}

export default RadarChart;
