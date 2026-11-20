const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { createArtworksController } = require('../controllers/artworksController');

function createArtworksRouter(imageService) {
  const router = express.Router();
  const c = createArtworksController(imageService);

  // Públicas
  router.get('/', c.list);
  router.get('/:id', c.get);

  // Protegidas (admin). La autenticación va antes de procesar la subida.
  router.post('/', requireAuth, uploadImage, c.create);
  router.put('/:id', requireAuth, uploadImage, c.update);
  router.patch('/:id/sold', requireAuth, c.setSold);
  router.delete('/:id', requireAuth, c.remove);

  return router;
}

module.exports = { createArtworksRouter };
