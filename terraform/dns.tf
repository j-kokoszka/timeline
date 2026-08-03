# Cloudflare DNS CNAME Record for timeline.kokoszka.cloud
resource "cloudflare_record" "timeline_domain" {
  count   = var.enable_cloudflare_dns ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "timeline"
  content = "j-kokoszka.github.io"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}
