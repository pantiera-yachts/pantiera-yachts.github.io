/* f1-reels · 16/11 · a mesa dos reels pousa uma vez, quando chega ao ecrã (o CSS só anima com
   prefers-reduced-motion: no-preference). O texto em duas tintas já vive em js/20-comuns.js. */
(() => {
  const mesa = document.querySelector('[data-f1-mesa]'); if (!mesa) return;
  if (!('IntersectionObserver' in window)) { mesa.classList.add('pousou'); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { mesa.classList.add('pousou'); io.disconnect(); }
  }), { threshold: 0.18 });
  io.observe(mesa);
})();
