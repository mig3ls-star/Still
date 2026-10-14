import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLang, t } from '@/lib/i18n';

// ═══════════════════════════════════════════════════════════════
//  PAYPAL — Enlace oficial de donación
//  Sustituye el valor vacío por tu enlace real de PayPal, por ejemplo:
//  'https://www.paypal.com/donate/?hosted_button_id=TU_ID_AQUI'
//  Mientras esté vacío, el botón no abrirá ninguna página.
// ═══════════════════════════════════════════════════════════════
const PAYPAL_DONATION_URL = '';

export default function Support() {
  const navigate = useNavigate();
  const L = t();
  const [lang, setLang] = useState(getLang);

  const switchLang = (l) => {
    if (l === lang) return;
    localStorage.setItem('still_lang', l);
    setLang(l);
  };

  const openPaypal = () => {
    if (!PAYPAL_DONATION_URL) return;
    window.open(PAYPAL_DONATION_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative" style={{ background: '#0D0D0F' }}>
      <div className="absolute top-5 left-5 sm:top-6 sm:left-6">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 text-[10px] tracking-[0.3em] uppercase hover:text-white transition-colors"
        >
          {L.back}
        </button>
      </div>

      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex items-center gap-2 text-[10px] tracking-[0.3em]">
        <button onClick={() => switchLang('en')} className={lang === 'en' ? 'text-white' : 'text-white/40'}>EN</button>
        <span className="text-white/30">·</span>
        <button onClick={() => switchLang('es')} className={lang === 'es' ? 'text-white' : 'text-white/40'}>ES</button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-md"
      >
        <h1 className="text-white tracking-[0.4em] text-xs uppercase mb-6" style={{ fontWeight: 300 }}>{L.donate}</h1>

        <p className="text-white/60 text-[11px] tracking-[0.12em] leading-relaxed mb-6 max-w-[300px]">
          {L.donateExplain}
        </p>

        <p className="text-white/45 text-[11px] leading-relaxed mb-10 max-w-[300px]" style={{ fontWeight: 300 }}>
          {L.donateSubtext}
        </p>

        <button
          onClick={openPaypal}
          className="text-white tracking-[0.4em] text-xs uppercase border border-white/40 px-10 py-3 hover:border-white transition-colors"
          style={{ fontWeight: 300 }}
        >
          {L.donate}
        </button>
      </motion.div>
    </div>
  );
}