module.exports = {
  apps: [
    // ==========================================
    // 1. HELPDESK RSAM (UTAMA)
    // ==========================================
    {
      name: "helpdesk-web",
      cwd: "C:/laragon/www/helpdesk-rsam",
      script: "artisan",
      interpreter: "php",
      args: "serve --host=0.0.0.0 --port=8000",
      autorestart: true,
      watch: false
    },
    {
      name: "helpdesk-reverb",
      cwd: "C:/laragon/www/helpdesk-rsam",
      script: "artisan",
      interpreter: "php",
      args: "reverb:start",
      autorestart: true,
      watch: false
    },
    {
      name: "helpdesk-email-fetcher",
      cwd: "C:/laragon/www/helpdesk-rsam",
      script: "artisan",
      interpreter: "php",
      args: "helpdesk:fetch-emails --watch",
      autorestart: true,
      watch: false
    },
    {
      name: "helpdesk-queue",
      cwd: "C:/laragon/www/helpdesk-rsam",
      script: "artisan",
      interpreter: "php",
      args: "queue:work --sleep=3 --tries=3 --max-time=3600",
      autorestart: true,
      watch: false
    },

    // ==========================================
    // 2. HELPDESK LITE (PORT 8001 & 8082)
    // ==========================================
    {
      name: "helpdesk-lite-web",
      cwd: "C:/laragon/www/helpdesk-lite",
      script: "artisan",
      interpreter: "php",
      args: "serve --host=0.0.0.0 --port=8001",
      autorestart: true,
      watch: false
    },
    {
      name: "helpdesk-lite-reverb",
      cwd: "C:/laragon/www/helpdesk-lite",
      script: "artisan",
      interpreter: "php",
      args: "reverb:start --host=0.0.0.0 --port=8082",
      autorestart: true,
      watch: false
    }
  ]
};