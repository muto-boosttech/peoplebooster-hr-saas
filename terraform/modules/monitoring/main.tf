# ============================================
# CloudWatch Monitoring Module
# ============================================

# ============================================
# CloudWatch Dashboard
# ============================================
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = concat(
      # ECS Metrics
      [
        {
          type   = "text"
          x      = 0
          y      = 0
          width  = 24
          height = 1
          properties = {
            markdown = "# ECS Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 1
          width  = 12
          height = 6
          properties = {
            title  = "Backend CPU Utilization"
            region = var.aws_region
            metrics = [
              ["AWS/ECS", "CPUUtilization", "ServiceName", var.backend_service_name, "ClusterName", var.ecs_cluster_name, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 1
          width  = 12
          height = 6
          properties = {
            title  = "Backend Memory Utilization"
            region = var.aws_region
            metrics = [
              ["AWS/ECS", "MemoryUtilization", "ServiceName", var.backend_service_name, "ClusterName", var.ecs_cluster_name, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 7
          width  = 12
          height = 6
          properties = {
            title  = "Frontend CPU Utilization"
            region = var.aws_region
            metrics = [
              ["AWS/ECS", "CPUUtilization", "ServiceName", var.frontend_service_name, "ClusterName", var.ecs_cluster_name, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 7
          width  = 12
          height = 6
          properties = {
            title  = "Frontend Memory Utilization"
            region = var.aws_region
            metrics = [
              ["AWS/ECS", "MemoryUtilization", "ServiceName", var.frontend_service_name, "ClusterName", var.ecs_cluster_name, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 13
          width  = 8
          height = 6
          properties = {
            title  = "Running Task Count"
            region = var.aws_region
            metrics = [
              ["ECS/ContainerInsights", "RunningTaskCount", "ServiceName", var.backend_service_name, "ClusterName", var.ecs_cluster_name, { label = "Backend" }],
              ["ECS/ContainerInsights", "RunningTaskCount", "ServiceName", var.frontend_service_name, "ClusterName", var.ecs_cluster_name, { label = "Frontend" }]
            ]
            period = 60
          }
        }
      ],
      # ALB Metrics
      [
        {
          type   = "text"
          x      = 0
          y      = 19
          width  = 24
          height = 1
          properties = {
            markdown = "# ALB Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 20
          width  = 8
          height = 6
          properties = {
            title  = "Request Count"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 20
          width  = 8
          height = 6
          properties = {
            title  = "Target Response Time"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "Average" }],
              ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p99" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 20
          width  = 8
          height = 6
          properties = {
            title  = "HTTP Error Codes"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum", label = "4XX" }],
              ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum", label = "5XX" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 26
          width  = 12
          height = 6
          properties = {
            title  = "Healthy Host Count"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", var.backend_target_group_arn_suffix, "LoadBalancer", var.alb_arn_suffix, { label = "Backend" }],
              ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", var.frontend_target_group_arn_suffix, "LoadBalancer", var.alb_arn_suffix, { label = "Frontend" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 26
          width  = 12
          height = 6
          properties = {
            title  = "Active Connection Count"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "ActiveConnectionCount", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum" }]
            ]
            period = 60
          }
        }
      ],
      # RDS Metrics
      [
        {
          type   = "text"
          x      = 0
          y      = 32
          width  = 24
          height = 1
          properties = {
            markdown = "# RDS Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 33
          width  = 8
          height = 6
          properties = {
            title  = "Database Connections"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 33
          width  = 8
          height = 6
          properties = {
            title  = "CPU Utilization"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 33
          width  = 8
          height = 6
          properties = {
            title  = "Freeable Memory"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 39
          width  = 8
          height = 6
          properties = {
            title  = "Read/Write IOPS"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average", label = "Read" }],
              ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average", label = "Write" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 39
          width  = 8
          height = 6
          properties = {
            title  = "Read/Write Latency"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average", label = "Read" }],
              ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average", label = "Write" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 39
          width  = 8
          height = 6
          properties = {
            title  = "Free Storage Space"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_instance_identifier, { stat = "Average" }]
            ]
            period = 60
          }
        }
      ],
      # ElastiCache Metrics
      [
        {
          type   = "text"
          x      = 0
          y      = 45
          width  = 24
          height = 1
          properties = {
            markdown = "# ElastiCache (Redis) Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 46
          width  = 8
          height = 6
          properties = {
            title  = "Cache Hits/Misses"
            region = var.aws_region
            metrics = [
              ["AWS/ElastiCache", "CacheHits", "CacheClusterId", var.redis_cluster_id, { stat = "Sum", label = "Hits" }],
              ["AWS/ElastiCache", "CacheMisses", "CacheClusterId", var.redis_cluster_id, { stat = "Sum", label = "Misses" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 46
          width  = 8
          height = 6
          properties = {
            title  = "CPU Utilization"
            region = var.aws_region
            metrics = [
              ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.redis_cluster_id, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 46
          width  = 8
          height = 6
          properties = {
            title  = "Memory Usage"
            region = var.aws_region
            metrics = [
              ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", var.redis_cluster_id, { stat = "Average" }]
            ]
            period = 60
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 52
          width  = 12
          height = 6
          properties = {
            title  = "Current Connections"
            region = var.aws_region
            metrics = [
              ["AWS/ElastiCache", "CurrConnections", "CacheClusterId", var.redis_cluster_id, { stat = "Average" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 52
          width  = 12
          height = 6
          properties = {
            title  = "Evictions"
            region = var.aws_region
            metrics = [
              ["AWS/ElastiCache", "Evictions", "CacheClusterId", var.redis_cluster_id, { stat = "Sum" }]
            ]
            period = 60
          }
        }
      ],
      # Application Metrics
      [
        {
          type   = "text"
          x      = 0
          y      = 58
          width  = 24
          height = 1
          properties = {
            markdown = "# Application Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 59
          width  = 8
          height = 6
          properties = {
            title  = "API Response Time"
            region = var.aws_region
            metrics = [
              ["${var.project_name}/${var.environment}", "api_response_time", { stat = "Average", label = "Average" }],
              ["${var.project_name}/${var.environment}", "api_response_time", { stat = "p99", label = "p99" }]
            ]
            period = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 59
          width  = 8
          height = 6
          properties = {
            title  = "Diagnosis Completions"
            region = var.aws_region
            metrics = [
              ["${var.project_name}/${var.environment}", "diagnosis_completed", { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 59
          width  = 8
          height = 6
          properties = {
            title  = "Active Users"
            region = var.aws_region
            metrics = [
              ["${var.project_name}/${var.environment}", "active_users", { stat = "Average" }]
            ]
            period = 300
          }
        }
      ]
    )
  })
}

# ============================================
# CloudWatch Alarms - ECS
# ============================================
resource "aws_cloudwatch_metric_alarm" "backend_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend CPU utilization is above 80%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "backend_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend memory utilization is above 80%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "frontend_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-frontend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Frontend CPU utilization is above 80%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.frontend_service_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "frontend_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-frontend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Frontend memory utilization is above 80%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.frontend_service_name
  }

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - ALB
# ============================================
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5XX errors exceed threshold"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 3
  alarm_description   = "ALB response time exceeds 3 seconds"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "ALB has unhealthy hosts"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.backend_target_group_arn_suffix
  }

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - RDS
# ============================================
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is above 80%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = var.rds_max_connections * 0.8
  alarm_description   = "RDS connections exceed 80% of max"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240 # 10GB in bytes
  alarm_description   = "RDS free storage space is below 10GB"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - ElastiCache
# ============================================
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU utilization is above 75%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage is above 80%"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Redis evictions exceed threshold"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  tags = var.tags
}

# ============================================
# CloudWatch Log Groups
# ============================================
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/application"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "access" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/access"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "error" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/error"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/audit"
  retention_in_days = 365 # Audit logs retained for 1 year

  tags = var.tags
}

# ============================================
# CloudWatch Log Metric Filters
# ============================================
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${var.project_name}-${var.environment}-error-count"
  pattern        = "[timestamp, level=ERROR, ...]"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "ErrorCount"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "api_response_time" {
  name           = "${var.project_name}-${var.environment}-api-response-time"
  pattern        = "[timestamp, level, message, responseTime, ...]"
  log_group_name = aws_cloudwatch_log_group.access.name

  metric_transformation {
    name      = "api_response_time"
    namespace = "${var.project_name}/${var.environment}"
    value     = "$responseTime"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate_high" {
  alarm_name          = "${var.project_name}-${var.environment}-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ErrorCount"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Application error rate is high"
  alarm_actions       = var.alarm_sns_topic_arns
  ok_actions          = var.alarm_sns_topic_arns
  treat_missing_data  = "notBreaching"

  tags = var.tags
}
