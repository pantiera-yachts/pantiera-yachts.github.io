/* 16/11: carrossel simples, sem palco preso ao scroll (js/51-pausas.js fica sem efeito: já não há reels-pin nem banda).
   13/11 (João: «todos os reels possíveis, com o design e a UI do carrossel da Liz Salvados, adaptado à Pantiera,
   com o vidro da Apple»). Os 18 reels oficiais do canal da Pantiera: o do centro grande e a tocar, os outros atrás,
   mais pequenos e desfocados, de cada lado. Setas de vidro, contador, arrastar com o dedo, teclado, som por reel.
   Só se pede o vídeo do centro e dos dois vizinhos; nada toca enquanto a secção não está à vista. */
(() => {
  const raiz = document.querySelector('[data-reels]'); if (!raiz) return;
  const palco = raiz.querySelector('[data-reels-palco]');
  const reais = JSON.parse(document.getElementById('reels-dados').textContent);
  // com poucos reels, repetem-se para a pirâmide ficar igual dos dois lados (2 à esquerda, 2 à direita)
  const dados = reais.length < 6 ? reais.concat(reais) : reais; const R = reais.length;
  const num = raiz.querySelector('[data-reels-num]');
  const N = dados.length;
  const svgSom = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="off" d="m16 9.5 5 5m0-5-5 5"/></svg>';
  const lis = dados.map((r, i) => {
    const li = document.createElement('li');
    li.className = 'reels-cartao';
    li.innerHTML = `<video muted playsinline preload="none" poster="${r.src || 'media/reels/'}${r.id}.webp" data-src="${r.src || 'media/reels/'}${r.id}.mp4" width="540" height="960" aria-label="Reel: ${r.t.replace(/"/g, '&quot;')}"></video>
      <button type="button" class="reels-som" aria-pressed="false" aria-label="Activar sonido">${svgSom}</button>
      <a class="reels-titulo" href="${r.u}" target="_blank" rel="noopener">${r.t}</a>`;
    li.addEventListener('click', (e) => { if (cur !== i && !e.target.closest('a')) { e.preventDefault(); vai(i); } });
    li.querySelector('video').addEventListener('ended', () => { if (cur === i) vai(i + 1); }); // acaba um, entra o seguinte
    palco.appendChild(li);
    return li;
  });
  let cur = 0, dentro = false, comSom = -1;
  // 13/11 (João: «com áudio e autoplay»): o reel do centro toca com som. Os browsers só deixam o som depois do primeiro
  // gesto da pessoa na página; até lá toca mudo e o som entra sozinho no primeiro toque, scroll ou tecla.
  // 14/11 (João e Fábio: «o som só funciona ao clicar 2 vezes»). O som entrava sozinho no primeiro scroll, mas o browser
  // só deixa ligar o som dentro de um toque: o vídeo ficava mudo e o botão já dizia «com som», por isso o 1.º toque
  // «desligava» um som que nunca tocou. Agora: começa sempre mudo, o botão mostra mudo, e um toque liga o som logo
  // (dentro do próprio toque). O botão segue sempre o estado real do vídeo (volumechange), nunca uma intenção.
  let somLigado = false, gesto = false;
  // (validação 13/11) o toque no botão do som não conta aqui: é o próprio botão que decide (ver em baixo)
  const aoGesto = (e) => { if (e && e.target && e.target.closest && e.target.closest('.reels-som')) return; gesto = true; ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((t) => removeEventListener(t, aoGesto, true)); pinta(); };
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((t) => addEventListener(t, aoGesto, { capture: true, passive: true }));
  const pinta = () => {
    const largo = innerWidth >= 900;
    lis.forEach((li, i) => {
      let d = i - cur; if (d > N / 2) d -= N; if (d < -N / 2) d += N; const a = Math.abs(d); // em roda: há sempre cartões dos dois lados
      // 16/11 (cliente: «reels em escala reduzida, ligeiramente inclinados como na versão antiga»): fotografias pousadas
      // numa mesa. O do centro inteiro e inclinado 1,5°; os vizinhos espreitam dos lados, mais pequenos e com outro ângulo.
      // Sem desfoque (o filtro em vídeo custa e suja a imagem): a hierarquia faz-se com escala e opacidade.
      const x = d * (largo ? 74 : 66); // em % da largura do próprio cartão
      const rot = a === 0 ? 1.5 : (d < 0 ? -2 : 2.5) * (a === 1 ? 1 : 0.6);
      li.style.transform = `translate3d(${x}%,0,0) scale(${Math.max(0.7, 1 - a * 0.13)}) rotate(${rot}deg)`;
      li.style.zIndex = String(50 - a);
      const max = 1; li.style.opacity = a > max ? '0' : '1';
      li.style.filter = 'none';
      li.style.pointerEvents = a > max ? 'none' : 'auto';
      li.classList.toggle('frente', a === 0);
      li.setAttribute('aria-hidden', a ? 'true' : 'false');
      li.querySelectorAll('a,button').forEach((el) => (el.tabIndex = a ? -1 : 0));
      const v = li.querySelector('video');
      if (a <= 1 && !v.getAttribute('src')) v.src = v.dataset.src;
      // (13/11) o do centro carrega já; os dois vizinhos pré-carregam o início para a troca de reel ser instantânea
      if (a <= 1 && dentro) v.preload = a === 0 ? 'auto' : 'metadata';
      // se o browser recusar o som (outro reel sem toque), toca mudo e o som fica desligado: o botão volta a «mudo»
      if (a === 0 && dentro) { v.muted = !somLigado; v.play().catch(() => { if (lis[cur] === li) { somLigado = false; v.muted = true; v.play().catch(() => {}); } }); } else { v.pause(); v.muted = true; }
      botao(li);
    });
    num.textContent = `${String((cur % R) + 1).padStart(2, '0')} / ${String(R).padStart(2, '0')}`;
  };
  function botao(li) {
    const v = li.querySelector('video'), b = li.querySelector('.reels-som'); const ouve = !v.muted && !v.paused;
    b.setAttribute('aria-pressed', String(ouve)); b.setAttribute('aria-label', ouve ? 'Silenciar' : 'Activar sonido');
  }
  lis.forEach((li) => { const v = li.querySelector('video'); ['volumechange', 'play', 'pause'].forEach((t) => v.addEventListener(t, () => botao(li))); });
  const vai = (i) => { cur = (i + N) % N; pinta(); };
  raiz.querySelector('[data-reels-ant]').addEventListener('click', () => vai(cur - 1));
  raiz.querySelector('[data-reels-seg]').addEventListener('click', () => vai(cur + 1));
  raiz.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') vai(cur - 1); if (e.key === 'ArrowRight') vai(cur + 1); });
  palco.addEventListener('click', (e) => {
    const b = e.target.closest('.reels-som'); if (!b) return;
    // o botão mostra o que se ouve: se estava calado (mesmo antes do primeiro gesto), o toque liga o som
    // tudo dentro do toque (o iOS só deixa o som aqui): o vídeo do centro muda já, sem esperar pelo desenho
    const li = b.closest('li'), v = li && li.querySelector('video'); if (!v) return;
    somLigado = v.muted; gesto = true;
    if (!v.getAttribute('src')) v.src = v.dataset.src;
    v.muted = !somLigado;
    if (somLigado) v.play().catch(() => { somLigado = false; v.muted = true; v.play().catch(() => {}); });
    pinta();
  });
  // arrastar com o dedo ou o rato
  let x0 = null;
  palco.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') x0 = e.clientX; }, { passive: true });
  addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) vai(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  // 13/11 (João: «scroll com o dedo para o lado, no trackpad e no telefone»): o gesto horizontal do trackpad muda de reel
  // (um de cada vez, com pausa), e no telefone o dedo para o lado também; o scroll vertical da página fica livre.
  // Ouve-se no carrossel inteiro (.reels: cartões, vídeos, painel de vidro), não só no palco, para o gesto nunca cair
  // num filho sem ouvinte. Só se trava o gesto quando é claramente horizontal; o vertical segue para a página.
  let gestoTrav = false, acum = 0, tAcum = 0;
  raiz.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // pinça de zoom do trackpad
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerWidth : 1;
    const dx = e.deltaX * k, dy = e.deltaY * k;
    if (Math.abs(dx) <= Math.abs(dy) * 1.1) return;
    e.preventDefault(); // também trava o «voltar atrás» do Chrome/Safari com dois dedos
    acum += dx;
    // um gesto (com a inércia do trackpad) muda no máximo um reel: enquanto chegarem eventos, o bloqueio estica-se;
    // só se solta depois de ~200 ms sem eventos horizontais.
    if (gestoTrav) { acum = 0; }
    else if (Math.abs(acum) > 28) { vai(cur + (acum > 0 ? 1 : -1)); acum = 0; gestoTrav = true; }
    clearTimeout(tAcum); tAcum = setTimeout(() => { acum = 0; gestoTrav = false; }, 200);
  }, { passive: false });
  let t0 = null;
  raiz.addEventListener('touchstart', (e) => { const t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY }; }, { passive: true });
  raiz.addEventListener('touchend', (e) => { if (!t0) return; const t = e.changedTouches[0]; const dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) vai(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  new IntersectionObserver(([e]) => { dentro = e.isIntersecting; pinta(); }, { threshold: 0.3 }).observe(raiz);
  // 14/11 (iPhone em modo de poupança de energia): o iOS só deixa um vídeo tocar dentro de um toque. Cada toque com os
  // reels à vista põe o do centro a andar, se o sistema o tiver parado.
  // o primeiro toque em qualquer sítio da página desbloqueia o primeiro reel (play e pausa dentro do toque): depois o iOS
  // deixa-o arrancar sozinho quando chega ao ecrã, mesmo em modo de poupança
  let desbloqueado = false;
  addEventListener('touchend', () => { if (desbloqueado || dentro) return; desbloqueado = true; const v = lis[cur].querySelector('video'); if (!v.getAttribute('src')) v.src = v.dataset.src; v.muted = true; const pr = v.play(); if (pr) pr.then(() => { if (!dentro) v.pause(); }, () => { desbloqueado = false; }); }, { capture: true, passive: true });
  addEventListener('touchend', () => { if (!dentro) return; const v = lis[cur].querySelector('video'); if (v.paused) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) lis[cur].querySelector('video').pause(); else pinta(); });
  addEventListener('resize', pinta);
    // 13/11 (João: «só a voz de um reel de cada vez»): em toda a página, quando um vídeo começa a tocar com som,
  // todos os outros com som param e calam-se. Nunca há duas vozes ao mesmo tempo.
  const umaVoz = (e) => { const m = e.target; if (!(m instanceof HTMLMediaElement) || m.muted || m.paused) return;
    document.querySelectorAll('video,audio').forEach((o) => { if (o !== m && !o.muted) { o.muted = true; if (!o.paused) o.pause(); } }); };
  document.addEventListener('play', umaVoz, true); document.addEventListener('playing', umaVoz, true); document.addEventListener('volumechange', umaVoz, true);
  pinta();
})();
