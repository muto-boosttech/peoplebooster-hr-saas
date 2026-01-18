# ============================================
# ECS Module Variables
# ============================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
}

variable "ecr_repository_url_backend" {
  description = "ECR repository URL for backend"
  type        = string
}

variable "ecr_repository_url_frontend" {
  description = "ECR repository URL for frontend"
  type        = string
}

variable "secrets_arn_prefix" {
  description = "Secrets Manager ARN prefix"
  type        = string
}

variable "api_url" {
  description = "API URL for frontend"
  type        = string
}

variable "cors_origin" {
  description = "CORS origin for backend"
  type        = string
}

# Backend Configuration
variable "backend_cpu" {
  description = "CPU units for backend task"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend task (MB)"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Desired count for backend service"
  type        = number
  default     = 2
}

variable "backend_min_count" {
  description = "Minimum count for backend service"
  type        = number
  default     = 1
}

variable "backend_max_count" {
  description = "Maximum count for backend service"
  type        = number
  default     = 10
}

# Frontend Configuration
variable "frontend_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend task (MB)"
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Desired count for frontend service"
  type        = number
  default     = 2
}

variable "frontend_min_count" {
  description = "Minimum count for frontend service"
  type        = number
  default     = 1
}

variable "frontend_max_count" {
  description = "Maximum count for frontend service"
  type        = number
  default     = 10
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention days"
  type        = number
  default     = 30
}

variable "enable_container_insights" {
  description = "Enable Container Insights"
  type        = bool
  default     = true
}

variable "alb_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
