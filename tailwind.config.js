/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // Airbnb Design System
        rausch: {
          DEFAULT: '#FF5A5F',
          50:  '#FFF0F0',
          100: '#FFD6D7',
          200: '#FFACAE',
          300: '#FF8285',
          400: '#FF5A5F',
          500: '#E5484D',
          600: '#C73539',
          700: '#A02326',
        },
        babu: {
          DEFAULT: '#00A699',
          50:  '#E6F7F6',
          100: '#B3E8E5',
          200: '#66D1CB',
          300: '#00BAB2',
          400: '#00A699',
          500: '#008F83',
          600: '#00736A',
        },
        arches: {
          DEFAULT: '#FC642D',
          50:  '#FFF3EE',
          100: '#FDDCCC',
          200: '#FBB899',
          300: '#FD9266',
          400: '#FC642D',
          500: '#E04E16',
        },
        hof:     '#484848',
        foggy:   '#767676',
        hackney: '#EBEBEB',
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card:  '0 2px 8px rgba(0,0,0,0.08)',
        hover: '0 4px 16px rgba(0,0,0,0.12)',
        modal: '0 16px 48px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
}
