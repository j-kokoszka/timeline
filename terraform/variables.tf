variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token for DNS management"
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for kokoszka.cloud"
  default     = ""
}

variable "enable_cloudflare_dns" {
  type        = bool
  description = "Set to true if managing DNS via Cloudflare OpenTofu provider"
  default     = false
}

variable "supabase_project_url" {
  type        = string
  description = "Supabase Project URL"
  default     = "https://your-project.supabase.co"
}

variable "supabase_anon_key" {
  type        = string
  description = "Supabase Anon Public Key"
  sensitive   = true
  default     = ""
}
