# ============================================
# S3 Module Variables
# ============================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "create_backups_bucket" {
  description = "Create backups bucket"
  type        = bool
  default     = true
}

variable "elb_account_id" {
  description = "ELB account ID for ALB logging (varies by region)"
  type        = string
  default     = "582318560864" # ap-northeast-1
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
