'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface BarDataPoint {
  name?: string;
  value?: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface BarChartProps {
  data: BarDataPoint[] | { [key: string]: string | number | undefined }[];
  dataKey?: string;
  xAxisKey?: string;
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  layout?: 'vertical' | 'horizontal';
  barColor?: string;
  color?: string;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

// Default colors for bars
const defaultColors = [
  'hsl(221.2 83.2% 53.3%)', // primary blue
  'hsl(142.1 76.2% 36.3%)', // green
  'hsl(262.1 83.3% 57.8%)', // purple
  'hsl(24.6 95% 53.1%)', // orange
  'hsl(346.8 77.2% 49.8%)', // red
  'hsl(199.4 95.5% 53.8%)', // cyan
  'hsl(47.9 95.8% 53.1%)', // yellow
  'hsl(280.1 81.3% 60%)', // violet
];

export function BarChart({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  className,
  title,
  description,
  showLegend = false,
  showGrid = true,
  showTooltip = true,
  layout = 'horizontal',
  barColor,
  color,
  height = 300,
  xAxisLabel,
  yAxisLabel,
}: BarChartProps) {
  const actualBarColor = barColor || color;
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        )}
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              label={xAxisLabel ? { value: xAxisLabel, position: 'bottom' } : undefined}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'left' } : undefined}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              dataKey={xAxisKey}
              type="category"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              width={100}
            />
          </>
        )}
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value) => [String(value), '値']}
          />
        )}
        {showLegend && <Legend />}
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={(entry as BarDataPoint).color || actualBarColor || defaultColors[index % defaultColors.length]}
            />
          ))}
        </Bar>
      </RechartsBarChart>
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

// Stacked bar chart for multiple data series
interface StackedBarChartProps {
  data: BarDataPoint[];
  dataKeys: { key: string; name: string; color?: string }[];
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  height?: number;
}

export function StackedBarChart({
  data,
  dataKeys,
  className,
  title,
  description,
  showLegend = true,
  height = 300,
}: StackedBarChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        {showLegend && <Legend />}
        {dataKeys.map((dk, index) => (
          <Bar
            key={dk.key}
            dataKey={dk.key}
            name={dk.name}
            stackId="a"
            fill={dk.color || defaultColors[index % defaultColors.length]}
            radius={index === dataKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </RechartsBarChart>
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

// Horizontal distribution chart (for thinking/behavior patterns)
interface DistributionChartProps {
  data: { name: string; value: number; color?: string }[];
  className?: string;
  title?: string;
  description?: string;
  height?: number;
}

export function DistributionChart({
  data,
  className,
  title,
  description,
  height = 250,
}: DistributionChartProps) {
  return (
    <BarChart
      data={data}
      layout="vertical"
      title={title}
      description={description}
      className={className}
      height={height}
      showGrid={false}
    />
  );
}

export default BarChart;
