'use client';

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface LineDataPoint {
  name?: string;
  [key: string]: string | number | undefined;
}

interface LineChartProps {
  data: LineDataPoint[] | { [key: string]: string | number }[];
  dataKey?: string;
  xAxisKey?: string;
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  lineColor?: string;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showDots?: boolean;
  curved?: boolean;
}

// Default colors for lines
const defaultColors = [
  'hsl(221.2 83.2% 53.3%)', // primary blue
  'hsl(142.1 76.2% 36.3%)', // green
  'hsl(262.1 83.3% 57.8%)', // purple
  'hsl(24.6 95% 53.1%)', // orange
  'hsl(346.8 77.2% 49.8%)', // red
];

export function LineChart({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  className,
  title,
  description,
  showLegend = false,
  showGrid = true,
  showTooltip = true,
  lineColor = defaultColors[0],
  height = 300,
  xAxisLabel,
  yAxisLabel,
  showDots = true,
  curved = true,
}: LineChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        )}
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
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
        )}
        {showLegend && <Legend />}
        <Line
          type={curved ? 'monotone' : 'linear'}
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={2}
          dot={showDots ? { fill: lineColor, strokeWidth: 2 } : false}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
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

// Multi-line chart for comparing multiple data series
interface MultiLineChartProps {
  data: LineDataPoint[] | { [key: string]: string | number }[];
  lines: { key: string; name: string; color?: string }[];
  xAxisKey?: string;
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  height?: number;
  showDots?: boolean;
  curved?: boolean;
}

export function MultiLineChart({
  data,
  lines,
  xAxisKey = 'name',
  className,
  title,
  description,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  height = 300,
  showDots = true,
  curved = true,
}: MultiLineChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
        )}
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.key}
            type={curved ? 'monotone' : 'linear'}
            dataKey={line.key}
            name={line.name}
            stroke={line.color || defaultColors[index % defaultColors.length]}
            strokeWidth={2}
            dot={showDots ? { fill: line.color || defaultColors[index % defaultColors.length], strokeWidth: 2 } : false}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
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

// Area chart variant
interface AreaChartProps {
  data: LineDataPoint[];
  dataKey?: string;
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  height?: number;
  fillColor?: string;
  strokeColor?: string;
}

export function AreaChart({
  data,
  dataKey = 'value',
  className,
  title,
  description,
  showLegend = false,
  height = 300,
  fillColor = 'hsl(221.2 83.2% 53.3%)',
  strokeColor = 'hsl(221.2 83.2% 53.3%)',
}: AreaChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#colorGradient)"
          dot={false}
        />
      </RechartsLineChart>
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

export default LineChart;
