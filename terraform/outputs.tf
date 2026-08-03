output "site_url" {
  description = "Live Production Site URL"
  value       = "https://timeline.kokoszka.cloud"
}

output "github_pages_cname" {
  description = "Target CNAME for GitHub Pages"
  value       = "j-kokoszka.github.io"
}

output "supabase_project_url" {
  description = "Configured Supabase Endpoint"
  value       = var.supabase_project_url
}
