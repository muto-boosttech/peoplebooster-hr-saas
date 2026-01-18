# ============================================
# PeopleBooster Production Environment
# ============================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "peoplebooster-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "peoplebooster-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ============================================
# Local Variables
# ============================================
locals {
  project_name = var.project_name
  environment  = var.environment
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ============================================
# SNS Topic for Alarms
# ============================================
resource "aws_sns_topic" "alarms" {
  name = "${local.project_name}-${local.environment}-alarms"
  tags = local.tags
}

# ============================================
# VPC Module
# ============================================
module "vpc" {
  source = "../../modules/vpc"

  project_name         = local.project_name
  environment          = local.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  enable_nat_gateway   = true
  single_nat_gateway   = false # High availability for production
  tags                 = local.tags
}

# ============================================
# S3 Module
# ============================================
module "s3" {
  source = "../../modules/s3"

  project_name          = local.project_name
  environment           = local.environment
  cors_allowed_origins  = var.cors_allowed_origins
  create_backups_bucket = true
  tags                  = local.tags
}

# ============================================
# RDS Module
# ============================================
module "rds" {
  source = "../../modules/rds"

  project_name               = local.project_name
  environment                = local.environment
  vpc_id                     = module.vpc.vpc_id
  database_subnet_ids        = module.vpc.database_subnet_ids
  allowed_security_group_ids = [module.ecs.backend_security_group_id]
  
  instance_class        = "db.r6g.large"
  allocated_storage     = 100
  max_allocated_storage = 500
  multi_az              = true
  master_password       = var.db_password
  
  backup_retention_period      = 7
  performance_insights_enabled = true
  monitoring_interval          = 60
  
  # Read Replica for production
  create_read_replica    = var.create_read_replica
  replica_instance_class = "db.r6g.large"
  
  alarm_sns_topic_arns = [aws_sns_topic.alarms.arn]
  tags                 = local.tags
}

# ============================================
# ElastiCache Module
# ============================================
module "elasticache" {
  source = "../../modules/elasticache"

  project_name               = local.project_name
  environment                = local.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.ecs.backend_security_group_id]
  
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 2 # Primary + Replica for HA
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  
  notification_topic_arn = aws_sns_topic.alarms.arn
  alarm_sns_topic_arns   = [aws_sns_topic.alarms.arn]
  tags                   = local.tags
}

# ============================================
# ECS Module
# ============================================
module "ecs" {
  source = "../../modules/ecs"

  project_name = local.project_name
  environment  = local.environment
  vpc_id       = module.vpc.vpc_id
  
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  
  # Backend Configuration
  backend_image         = var.backend_image
  backend_cpu           = 1024
  backend_memory        = 2048
  backend_desired_count = 2
  backend_min_count     = 2
  backend_max_count     = 10
  
  # Frontend Configuration
  frontend_image         = var.frontend_image
  frontend_cpu           = 512
  frontend_memory        = 1024
  frontend_desired_count = 2
  frontend_min_count     = 2
  frontend_max_count     = 10
  
  # Environment Variables
  database_url_secret_arn = module.rds.database_url_secret_arn
  redis_url_secret_arn    = module.elasticache.redis_url_secret_arn
  
  # SSL Certificate
  acm_certificate_arn = var.acm_certificate_arn
  
  # Logging
  logs_bucket = module.s3.logs_bucket_id
  
  alarm_sns_topic_arns = [aws_sns_topic.alarms.arn]
  tags                 = local.tags
}

# ============================================
# WAF Module
# ============================================
resource "aws_wafv2_web_acl" "main" {
  name        = "${local.project_name}-${local.environment}-waf"
  description = "WAF for ${local.project_name} ${local.environment}"
  scope       = "CLOUDFRONT"

  provider = aws.us_east_1

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate Limiting
  rule {
    name     = "RateLimitRule"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.project_name}-${local.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = local.tags
}

# ============================================
# CloudFront Module
# ============================================
module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name = local.project_name
  environment  = local.environment
  
  static_bucket_id                   = module.s3.static_bucket_id
  static_bucket_arn                  = module.s3.static_bucket_arn
  static_bucket_regional_domain_name = module.s3.static_bucket_regional_domain_name
  
  alb_dns_name      = module.ecs.alb_dns_name
  cloudfront_secret = var.cloudfront_secret
  
  domain_aliases      = var.domain_aliases
  acm_certificate_arn = var.cloudfront_acm_certificate_arn
  route53_zone_id     = var.route53_zone_id
  waf_web_acl_arn     = aws_wafv2_web_acl.main.arn
  
  cors_allowed_origins = var.cors_allowed_origins
  logs_bucket          = module.s3.logs_bucket_id
  
  tags = local.tags
}
