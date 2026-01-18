# ============================================
# CloudWatch Monitoring Module Variables
# ============================================

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

# ECS Configuration
variable "ecs_cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "backend_service_name" {
  description = "Backend ECS service name"
  type        = string
}

variable "frontend_service_name" {
  description = "Frontend ECS service name"
  type        = string
}

# ALB Configuration
variable "alb_arn_suffix" {
  description = "ALB ARN suffix"
  type        = string
}

variable "backend_target_group_arn_suffix" {
  description = "Backend target group ARN suffix"
  type        = string
}

variable "frontend_target_group_arn_suffix" {
  description = "Frontend target group ARN suffix"
  type        = string
}

# RDS Configuration
variable "rds_instance_identifier" {
  description = "RDS instance identifier"
  type        = string
}

variable "rds_max_connections" {
  description = "RDS max connections"
  type        = number
  default     = 100
}

# ElastiCache Configuration
variable "redis_cluster_id" {
  description = "Redis cluster ID"
  type        = string
}

# Logging Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Alerting Configuration
variable "alarm_sns_topic_arns" {
  description = "SNS topic ARNs for alarms"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
