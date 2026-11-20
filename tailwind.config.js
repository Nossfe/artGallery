/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.{html,js}'],
  theme: {
    extend: {
      // Dirección visual: galería minimalista, paleta neutra cálida.
      colors: {
        lienzo: '#FAF8F5', // fondo general (lienzo/papel)
        marfil: '#F1EDE6', // superficies secundarias
        tinta: '#1F1D1A', // texto principal
        piedra: {
          DEFAULT: '#6B665F', // texto secundario (contraste AA sobre lienzo)
          claro: '#D9D3C9', // bordes
        },
        acento: {
          DEFAULT: '#8A6F4D', // bronce apagado: enlaces y detalles
          oscuro: '#6E573B',
        },
        vendida: '#8C2F39', // insignia de obra vendida
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        galeria: '0.18em',
      },
      boxShadow: {
        tarjeta: '0 1px 2px rgba(31,29,26,0.05), 0 8px 24px -12px rgba(31,29,26,0.15)',
      },
    },
  },
  plugins: [],
};
