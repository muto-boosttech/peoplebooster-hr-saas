# ============================================
# S3 Module Outputs
# ============================================

output "assets_bucket_id" {
  description = "Assets bucket ID"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "Assets bucket ARN"
  value       = aws_s3_bucket.assets.arn
}

output "assets_bucket_domain_name" {
  description = "Assets bucket domain name"
  value       = aws_s3_bucket.assets.bucket_domain_name
}

output "assets_bucket_regional_domain_name" {
  description = "Assets bucket regional domain name"
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}

output "logs_bucket_id" {
  description = "Logs bucket ID"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "Logs bucket ARN"
  value       = aws_s3_bucket.logs.arn
}

output "backups_bucket_id" {
  description = "Backups bucket ID"
  value       = var.create_backups_bucket ? aws_s3_bucket.backups[0].id : null
}

output "backups_bucket_arn" {
  description = "Backups bucket ARN"
  value       = var.create_backups_bucket ? aws_s3_bucket.backups[0].arn : null
}

output "static_bucket_id" {
  description = "Static assets bucket ID"
  value       = aws_s3_bucket.static.id
}

output "static_bucket_arn" {
  description = "Static assets bucket ARN"
  value       = aws_s3_bucket.static.arn
}

output "static_bucket_domain_name" {
  description = "Static assets bucket domain name"
  value       = aws_s3_bucket.static.bucket_domain_name
}

output "static_bucket_regional_domain_name" {
  description = "Static assets bucket regional domain name"
  value       = aws_s3_bucket.static.bucket_regional_domain_name
}
