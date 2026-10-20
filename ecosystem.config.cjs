module.exports = {
  apps: [
    {
      name: "helpdesk-web",
      script: "artisan",
      interpreter: "php",
      args: "serve --host=0.0.0.0 --port=8000",
      autorestart: true,
      watch: false
    },
    {
      name: "helpdesk-reverb",
      script: "artisan",
      interpreter: "php",
      args: "reverb:start",
      autorestart: true,
      watch: false
    },
    {
      name: "helpdesk-email-fetcher",
      script: "artisan",
      interpreter: "php",
      args: "helpdesk:fetch-emails --watch",
      autorestart: true,
      watch: false
    }
  ]
};