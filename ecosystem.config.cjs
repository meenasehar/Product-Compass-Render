module.exports = {
  apps: [
    {
      name: 'product-compass',
      script: 'server-dist/index.js',
      env_file: '.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
