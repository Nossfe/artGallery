const { v2: cloudinary } = require('cloudinary');
const { cloudinary: cfg } = require('./env');

cloudinary.config({
  cloud_name: cfg.cloudName,
  api_key: cfg.apiKey,
  api_secret: cfg.apiSecret,
  secure: true,
});

const isConfigured = Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);

module.exports = { cloudinary, isConfigured };
