// STILL — cadenas de interfaz en inglés y español.
// El idioma se guarda en localStorage ('still_lang'): 'en' | 'es'.

const STR = {
  en: {
    tagline: 'A tiny game for noisy minds.',
    size: 'SIZE',
    brush: 'BRUSH',
    start: 'Start',
    footerStill: '20 figures · 3–7 min',
    footerSilence: 'endless · no score',
    silence: 'SILENCE',
    still: 'STILL',
    exit: 'exit',
    sessionDone: 'Session complete',
    record: 'Best',
    again: 'Again',
    home: 'home',
    donate: 'Support STILL',
    donateExplain: 'Your support keeps STILL free and independent, and helps fund future updates and improvements.',
    donateSubtext: 'If STILL helped you find a little silence, you can support it.',
    back: 'Back',
    sizeLabels: { small: 'SMALL', medium: 'MEDIUM', large: 'LARGE' },
    brushLabels: { small: 'FINE', medium: 'MEDIUM', large: 'THICK' },
  },
  es: {
    tagline: 'Un pequeño juego para mentes ruidosas.',
    size: 'TAMAÑO',
    brush: 'PINCEL',
    start: 'Empezar',
    footerStill: '20 figuras · 3–7 min',
    footerSilence: 'sin fin · sin puntos',
    silence: 'SILENCE',
    still: 'STILL',
    exit: 'salir',
    sessionDone: 'Sesión completa',
    record: 'Récord',
    again: 'Otra vez',
    home: 'inicio',
    donate: 'Apoya STILL',
    donateExplain: 'Tu apoyo mantiene STILL gratuito e independiente, y ayuda a financiar futuras actualizaciones y mejoras.',
    donateSubtext: 'Si STILL te ayudó a encontrar un poco de silencio, puedes apoyarlo.',
    back: 'Volver',
    sizeLabels: { small: 'PEQUEÑO', medium: 'MEDIO', large: 'GRANDE' },
    brushLabels: { small: 'FINO', medium: 'MEDIO', large: 'GRUESO' },
  },
};

export const getLang = () => (localStorage.getItem('still_lang') === 'es' ? 'es' : 'en');
export const t = () => STR[getLang()] || STR.en;