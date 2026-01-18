# PeopleBooster Terraform Infrastructure Report

## Overview

PeopleBoosterのAWSインフラ構成をTerraformで実装しました。モジュール化された設計により、ステージング環境と本番環境で一貫したインフラを管理できます。

## Directory Structure

```
terraform/
├── bootstrap/              # Terraform state management setup
│   └── main.tf
├── modules/
│   ├── vpc/               # VPC, Subnets, NAT Gateway
│   ├── ecs/               # ECS Cluster, Services, ALB
│   ├── rds/               # PostgreSQL RDS
│   ├── elasticache/       # Redis ElastiCache
│   ├── s3/                # S3 Buckets
│   └── cloudfront/        # CloudFront Distribution
└── environments/
    ├── staging/           # Staging environment
    └── production/        # Production environment
```

## Modules

### VPC Module

| Resource | Description |
|----------|-------------|
| VPC | メインVPC（CIDR: 10.0.0.0/16） |
| Public Subnets | ALB、NAT Gateway用（3 AZ） |
| Private Subnets | ECS、ElastiCache用（3 AZ） |
| Database Subnets | RDS用（3 AZ） |
| NAT Gateway | プライベートサブネットからのインターネットアクセス |
| VPC Flow Logs | ネットワークトラフィックログ |

### ECS Module

| Resource | Description |
|----------|-------------|
| ECS Cluster | Fargateクラスター |
| Backend Service | Node.js APIサービス |
| Frontend Service | Next.jsフロントエンドサービス |
| ALB | Application Load Balancer |
| Auto Scaling | CPU/メモリベースのオートスケーリング |
| CloudWatch Logs | コンテナログ |

### RDS Module

| Resource | Description |
|----------|-------------|
| PostgreSQL | バージョン15.4 |
| Multi-AZ | 本番環境で有効 |
| Encryption | KMS暗号化 |
| Backup | 自動バックアップ（7日間保持） |
| Performance Insights | パフォーマンス監視 |
| Read Replica | 将来対応（オプション） |

### ElastiCache Module

| Resource | Description |
|----------|-------------|
| Redis | バージョン7.0 |
| Replication | 本番環境で2ノード構成 |
| Encryption | 転送中・保存時暗号化 |
| Auth Token | 認証トークン（本番環境） |

### S3 Module

| Bucket | Purpose |
|--------|---------|
| assets | レポートPDF、企業ロゴ |
| logs | ALB、CloudFrontログ |
| backups | バックアップ（本番のみ） |
| static | 静的アセット（CloudFront配信） |

### CloudFront Module

| Feature | Description |
|---------|-------------|
| Origin Access Control | S3へのセキュアアクセス |
| Cache Behaviors | 静的/動的コンテンツの最適化 |
| SSL/TLS | ACM証明書（TLS 1.2以上） |
| WAF | AWS Managed Rules（本番のみ） |

## Environment Comparison

| Feature | Staging | Production |
|---------|---------|------------|
| VPC CIDR | 10.1.0.0/16 | 10.0.0.0/16 |
| Availability Zones | 2 | 3 |
| NAT Gateway | Single | Multi-AZ |
| RDS Instance | db.t3.small | db.r6g.large |
| RDS Multi-AZ | No | Yes |
| Redis Node | cache.t3.micro | cache.r6g.large |
| Redis Nodes | 1 | 2 |
| ECS Backend | 256 CPU / 512 MB | 1024 CPU / 2048 MB |
| ECS Frontend | 256 CPU / 512 MB | 512 CPU / 1024 MB |
| Auto Scaling | 1-2 | 2-10 |
| WAF | No | Yes |
| Backups Bucket | No | Yes |

## Security Features

### Network Security

- **VPC Flow Logs**: すべてのネットワークトラフィックをログ記録
- **Security Groups**: 最小権限の原則に基づくアクセス制御
- **Private Subnets**: データベースとアプリケーションはプライベートサブネットに配置

### Data Security

- **RDS Encryption**: KMSによる保存時暗号化
- **Redis Encryption**: 転送中・保存時暗号化（本番環境）
- **S3 Encryption**: サーバーサイド暗号化
- **Secrets Manager**: 機密情報の安全な管理

### Application Security

- **WAF**: AWS Managed Rules（SQLi、XSS、Known Bad Inputs）
- **Rate Limiting**: IPベースのレート制限（2000 req/5min）
- **HTTPS Only**: すべての通信をHTTPS化
- **Security Headers**: HSTS、X-Frame-Options、CSP

## Monitoring & Alerting

### CloudWatch Alarms

| Alarm | Threshold |
|-------|-----------|
| RDS CPU | > 80% |
| RDS Storage | < 10GB |
| RDS Connections | > 80% of max |
| Redis CPU | > 75% |
| Redis Memory | > 80% |
| Redis Evictions | > 100/5min |
| ECS CPU | > 80% |
| ECS Memory | > 80% |
| ALB 5xx Errors | > 10/min |

### Logs

- **ECS**: CloudWatch Logs（30日間保持）
- **ALB**: S3（365日間保持）
- **CloudFront**: S3（365日間保持）
- **VPC Flow Logs**: CloudWatch Logs

## Deployment Instructions

### 1. Bootstrap (First Time Only)

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

### 2. Deploy Staging

```bash
cd terraform/environments/staging
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

### 3. Deploy Production

```bash
cd terraform/environments/production
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## Required Variables

### terraform.tfvars Example

```hcl
# Database
db_password = "your-secure-password"

# Redis (Production only)
redis_auth_token = "your-redis-auth-token"

# Docker Images
backend_image  = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/peoplebooster-backend:latest"
frontend_image = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/peoplebooster-frontend:latest"

# Domain
domain_aliases              = ["app.peoplebooster.com", "www.peoplebooster.com"]
acm_certificate_arn         = "arn:aws:acm:ap-northeast-1:123456789012:certificate/xxx"
cloudfront_acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxx"
route53_zone_id             = "Z1234567890ABC"
cloudfront_secret           = "your-cloudfront-secret"

# CORS
cors_allowed_origins = ["https://app.peoplebooster.com"]
```

## Cost Estimation

### Staging (Monthly)

| Service | Estimated Cost |
|---------|----------------|
| ECS Fargate | ~$30 |
| RDS (db.t3.small) | ~$30 |
| ElastiCache (cache.t3.micro) | ~$15 |
| NAT Gateway | ~$35 |
| ALB | ~$20 |
| CloudFront | ~$10 |
| S3 | ~$5 |
| **Total** | **~$145** |

### Production (Monthly)

| Service | Estimated Cost |
|---------|----------------|
| ECS Fargate | ~$200 |
| RDS (db.r6g.large, Multi-AZ) | ~$400 |
| ElastiCache (cache.r6g.large x2) | ~$300 |
| NAT Gateway (x3) | ~$105 |
| ALB | ~$30 |
| CloudFront | ~$50 |
| WAF | ~$10 |
| S3 | ~$20 |
| **Total** | **~$1,115** |

## Files Created

| File | Description |
|------|-------------|
| `terraform/modules/vpc/main.tf` | VPCモジュール |
| `terraform/modules/ecs/main.tf` | ECSモジュール |
| `terraform/modules/rds/main.tf` | RDSモジュール |
| `terraform/modules/elasticache/main.tf` | ElastiCacheモジュール |
| `terraform/modules/s3/main.tf` | S3モジュール |
| `terraform/modules/cloudfront/main.tf` | CloudFrontモジュール |
| `terraform/environments/staging/main.tf` | ステージング環境 |
| `terraform/environments/production/main.tf` | 本番環境 |
| `terraform/bootstrap/main.tf` | Terraformバックエンド初期化 |
