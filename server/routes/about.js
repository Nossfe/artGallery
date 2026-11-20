const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createImageUpload } = require('../middleware/upload');
const { createAboutController } = require('../controllers/aboutController');

function createAboutRouter(imageService) {
  const router = express.Router();
  const c = createAboutController(imageService);
  const uploadFoto = createImageUpload('foto');

  router.get('/', c.get);
  router.put('/', requireAuth, uploadFoto, c.update);

  return router;
}

module.exports = { createAboutRouter };
