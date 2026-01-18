'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface PieDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface PieChartProps {
  data: PieDataPoint[];
  className?: string;
  title?: string;
  description?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

// Default colors for pie slices
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

// Custom label renderer
const renderCustomLabel = (props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}) => {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function PieChart({
  data,
  className,
  title,
  description,
  showLegend = true,
  showTooltip = true,
  showLabels = true,
  height = 300,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomLabel : undefined}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || defaultColors[index % defaultColors.length]}
            />
          ))}
        </Pie>
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [String(value), String(name)]}
          />
        )}
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
            )}
          />
        )}
      </RechartsPieChart>
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

// Donut chart variant
interface DonutChartProps extends Omit<PieChartProps, 'innerRadius'> {
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  data,
  className,
  title,
  description,
  showLegend = true,
  showTooltip = true,
  showLabels = false,
  height = 300,
  outerRadius = 80,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomLabel : undefined}
          innerRadius={outerRadius * 0.6}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || defaultColors[index % defaultColors.length]}
            />
          ))}
        </Pie>
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [String(value), String(name)]}
          />
        )}
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
            )}
          />
        )}
        {/* Center text */}
        {(centerLabel || centerValue) && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {centerValue && (
              <tspan
                x="50%"
                dy="-0.5em"
                fontSize={24}
                fontWeight="bold"
                fill="hsl(var(--foreground))"
              >
                {centerValue}
              </tspan>
            )}
            {centerLabel && (
              <tspan
                x="50%"
                dy={centerValue ? '1.5em' : '0'}
                fontSize={12}
                fill="hsl(var(--muted-foreground))"
              >
                {centerLabel}
              </tspan>
            )}
          </text>
        )}
      </RechartsPieChart>
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

// Type distribution chart (for personality types)
interface TypeDistributionChartProps {
  data: { type: string; count: number; color?: string }[];
  className?: string;
  title?: string;
  description?: string;
}

export function TypeDistributionChart({
  data,
  className,
  title = 'タイプ分布',
  description,
}: TypeDistributionChartProps) {
  const chartData: PieDataPoint[] = data.map((item) => ({
    name: item.type,
    value: item.count,
    color: item.color,
  }));

  return (
    <DonutChart
      data={chartData}
      title={title}
      description={description}
      className={className}
      centerValue={data.reduce((sum, item) => sum + item.count, 0)}
      centerLabel="総数"
    />
  );
}

export default PieChart;
