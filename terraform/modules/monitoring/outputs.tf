# ============================================
# CloudWatch Monitoring Module Outputs
# ============================================

output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "dashboard_arn" {
  description = "CloudWatch dashboard ARN"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "application_log_group_name" {
  description = "Application log group name"
  value       = aws_cloudwatch_log_group.application.name
}

output "access_log_group_name" {
  description = "Access log group name"
  value       = aws_cloudwatch_log_group.access.name
}

output "error_log_group_name" {
  description = "Error log group name"
  value       = aws_cloudwatch_log_group.error.name
}

output "audit_log_group_name" {
  description = "Audit log group name"
  value       = aws_cloudwatch_log_group.audit.name
}

output "alarm_arns" {
  description = "List of CloudWatch alarm ARNs"
  value = [
    aws_cloudwatch_metric_alarm.backend_cpu_high.arn,
    aws_cloudwatch_metric_alarm.backend_memory_high.arn,
    aws_cloudwatch_metric_alarm.frontend_cpu_high.arn,
    aws_cloudwatch_metric_alarm.frontend_memory_high.arn,
    aws_cloudwatch_metric_alarm.alb_5xx_errors.arn,
    aws_cloudwatch_metric_alarm.alb_response_time.arn,
    aws_cloudwatch_metric_alarm.alb_unhealthy_hosts.arn,
    aws_cloudwatch_metric_alarm.rds_cpu_high.arn,
    aws_cloudwatch_metric_alarm.rds_connections_high.arn,
    aws_cloudwatch_metric_alarm.rds_storage_low.arn,
    aws_cloudwatch_metric_alarm.redis_cpu_high.arn,
    aws_cloudwatch_metric_alarm.redis_memory_high.arn,
    aws_cloudwatch_metric_alarm.redis_evictions.arn,
    aws_cloudwatch_metric_alarm.error_rate_high.arn,
  ]
}
