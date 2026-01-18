# ============================================
# PeopleBooster Staging Environment
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
    key            = "staging/terraform.tfstate"
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
  single_nat_gateway   = true # Cost optimization for staging
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
  create_backups_bucket = false # Not needed for staging
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
  
  instance_class        = "db.t3.small"
  allocated_storage     = 20
  max_allocated_storage = 50
  multi_az              = false
  master_password       = var.db_password
  
  backup_retention_period      = 3
  performance_insights_enabled = false
  monitoring_interval          = 0
  
  alarm_sns_topic_arns = []
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
  
  node_type                  = "cache.t3.micro"
  num_cache_clusters         = 1
  transit_encryption_enabled = false
  
  alarm_sns_topic_arns = []
  tags                 = local.tags
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
  backend_cpu           = 256
  backend_memory        = 512
  backend_desired_count = 1
  backend_min_count     = 1
  backend_max_count     = 2
  
  # Frontend Configuration
  frontend_image         = var.frontend_image
  frontend_cpu           = 256
  frontend_memory        = 512
  frontend_desired_count = 1
  frontend_min_count     = 1
  frontend_max_count     = 2
  
  # Environment Variables
  database_url_secret_arn = module.rds.database_url_secret_arn
  redis_url_secret_arn    = module.elasticache.redis_url_secret_arn
  
  # SSL Certificate
  acm_certificate_arn = var.acm_certificate_arn
  
  # Logging
  logs_bucket = module.s3.logs_bucket_id
  
  alarm_sns_topic_arns = []
  tags                 = local.tags
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
  
  cors_allowed_origins = var.cors_allowed_origins
  logs_bucket          = module.s3.logs_bucket_id
  
  tags = local.tags
}
