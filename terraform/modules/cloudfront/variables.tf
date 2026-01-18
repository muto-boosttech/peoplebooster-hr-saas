# ============================================
# CloudFront Module Variables
# ============================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

# S3 Configuration
variable "static_bucket_id" {
  description = "Static assets S3 bucket ID"
  type        = string
}

variable "static_bucket_arn" {
  description = "Static assets S3 bucket ARN"
  type        = string
}

variable "static_bucket_regional_domain_name" {
  description = "Static assets S3 bucket regional domain name"
  type        = string
}

# ALB Configuration
variable "alb_dns_name" {
  description = "ALB DNS name"
  type        = string
}

variable "cloudfront_secret" {
  description = "Secret header value for ALB origin verification"
  type        = string
  sensitive   = true
}

# Domain Configuration
variable "domain_aliases" {
  description = "List of domain aliases"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1)"
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}

# Cache Configuration
variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_200"
}

# Security
variable "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

# Logging
variable "logs_bucket" {
  description = "S3 bucket name for CloudFront logs"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
