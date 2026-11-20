import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Valores de prueba: no dependen del .env real (dotenv no sobrescribe variables ya definidas).
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
      JWT_SECRET: 'secreto-solo-para-pruebas-0123456789abcdef',
      JWT_EXPIRES_IN: '2h',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: '',
      CORS_ORIGIN: 'http://origen-permitido.test',
    },
  },
});
