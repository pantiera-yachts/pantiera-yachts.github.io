(() => {
  const { $, $$, reduz, clamp, vh } = DA;
  /* ---------- HERO: o filme ---------- */
  const hero = $('[data-hero]'), video = $('[data-hero-video]'), texto = $('[data-hero-texto]'), poster = $('[data-hero-poster]');
  const hl0 = $('[data-hero-logo]');
  // 14/11: a abertura do logótipo só sai quando o hero já anda (filme a tocar ou o filme em canvas), no máximo 5,6 s
  let heroPronto; DA.heroPronto = new Promise((r) => (heroPronto = r));
  // 14/11 (Fábio, dados móveis: «parece 360p»): no telemóvel em pé o logótipo espera também que o filme alto tenha
  // buffer para seguir sem parar (canplaythrough); o canvas do modo de poupança também o liberta
  let filmeAguenta; const aguenta = new Promise((r) => (filmeAguenta = r));
  // 13/11: sem zoom no cartaz (o João não quer zoom no hero); o cartaz desliza devagar de lado (estilo.css, .hero-poster)
  const fimDoLogo = () => {};

  /* ---------- 13/11: o filme oficial do Pantiera 32 (visto de cima, a abrir a esteira) ----------
     Pedido só depois do load e da abertura, para não entrar na conta do LCP. Escolhe vertical ou horizontal
     e o tamanho pelos píxeis reais do ecrã; pára fora do ecrã e com o separador escondido. */
  if (!video || reduz) { heroPronto(); filmeAguenta(); }
  if (video && !reduz) {
    const escolhe = () => {
      const vert = matchMedia('(max-width: 899px) and (orientation: portrait)').matches;
      const lista = (vert ? video.dataset.v : video.dataset.h).split(',').map((s) => { const [u, w] = s.trim().split(' '); return { u, w: +w }; });
      // 14/11 (Fábio): no telemóvel em pé vai sempre o filme alto (1080), em wifi ou em dados. O iPhone mostra o filme
      // a 1424 px de largura e o 720 ficava ampliado 2x. O leve (720) só com «Poupança de dados» (Save-Data) ligada.
      // 15/11 (Ricardo: «o vídeo de fundo parece ter pouca qualidade»): os filmes foram refeitos mais nítidos (sufixo s);
      // em rede móvel lenta (3G ou pior, segundo o browser) o telemóvel leva o 1080, que arranca mais depressa;
      // o número de Mb/s do Chrome não serve (no arranque diz 1,35 mesmo em wifi rápida)
      const cx = navigator.connection;
      if (vert) return (cx && cx.saveData ? lista[0] : cx && /(^|-)[23]g$/.test(cx.effectiveType || '') ? lista[lista.length - 2] : lista[lista.length - 1]).u;
      // 13/11 (João: «máximo 4K possível»): os píxeis reais do ecrã; 15/11: os filmes limpos com IA já chegam nítidos
      // no tamanho exato, por isso um ecrã de 1920 leva o 1920 (mais leve) e só os ecrãs retina ou 4K levam o 2560
      const precisa = innerWidth * Math.min(devicePixelRatio || 1, 2);
      return (lista.find((o) => o.w >= precisa) || lista[lista.length - 1]).u;
    };
    let visivel = true;
    // 13/11 (João: «impossível ver imagens paradas no hero»). O cartaz tem movimento próprio (CSS, desde a primeira
    // pintura) e o filme só passa à frente quando está provado que anda (o tempo avançou duas vezes). Se encravar
    // (rede lenta) ou parar, volta o cartaz em movimento até o filme andar outra vez. Assim nunca há imagem parada.
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
    let tAnt = -1, avancos = 0, ultimoAvanco = 0, vivo = false;
    let pase = null, marca = null;
    // 14/11 (hero V3 do telemóvel): cada filme tem os seus tempos do lema; a palavra é a de maior tempo já passado
    let palavra = () => 0;
    const poeVivo = (v) => { if (v === vivo) return; vivo = v; video.classList.toggle('a-tocar', v); video.classList.toggle('cai', !v); hero.classList.toggle('vivo', v); if (v) heroPronto(); };
    /* 14/11 (João, iPhone em modo de poupança de energia: «nada está a funcionar»). Nesse modo o iOS proíbe qualquer
       vídeo de tocar sozinho e o hero ficava parado no cartaz. Quando o play é recusado, o hero passa pelas cenas do
       próprio filme (2 imagens por cena, tiradas do vídeo), em fundidos com um deslize lento, e o lema acende com elas.
       As imagens só se pedem neste caso. Ao primeiro toque o filme arranca e passa à frente (classe .vivo). */
    const iniciaPase = () => {
      if (pase || vivo) return;
      filmeAguenta();
      const vert = matchMedia('(max-width: 899px) and (orientation: portrait)').matches;
      pase = document.createElement('div'); pase.className = 'hero-pase'; pase.setAttribute('aria-hidden', 'true');
      video.before(pase);
      if (vert) return filmeEmCanvas();
      // computador: as cenas em fundidos (2 imagens por cena)
      const imgs = [0, 1, 2, 3, 4, 5].map((i) => { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = `media/pase/p${i}.webp`; pase.appendChild(im); return im; });
      let k = -1;
      const passa = () => { if (vivo || document.hidden) return; k = (k + 1) % imgs.length; imgs.forEach((im, j) => im.classList.toggle('on', j === k)); if (marca) marca(Math.floor(k / 2)); };
      (imgs[0].decode ? imgs[0].decode() : Promise.resolve()).catch(() => {}).then(() => { passa(); heroPronto(); setInterval(passa, 2800); });
    };
    /* 14/11 (João: «refaz o hero»): no telemóvel, com o vídeo proibido, o próprio filme corre imagem a imagem num canvas
       (161 imagens a 12 por segundo, misturadas duas a duas para andar liso). O iOS não bloqueia um canvas. As imagens
       ficam comprimidas e só ±6 descomprimidas; se a rede atrasar, o filme espera em vez de saltar. */
    const filmeEmCanvas = () => {
      // 14/11: o filme do telemóvel diz no HTML onde estão as suas imagens e quantas são (hero V3: 258, 21,5 s)
      const N = +video.dataset.paseN || 258, FPS = 12, DUR = N / FPS, J = 6, PASTA = video.dataset.pase || 'media/heroq/v3/';
      const tela = document.createElement('canvas'); tela.className = 'hero-pase-tela'; pase.appendChild(tela);
      const ctx = tela.getContext('2d', { alpha: false });
      const blobs = [], bms = new Map(), caminho = new Set();
      const url = (i) => `${PASTA}${String(i).padStart(4, '0')}.webp`;
      let prox = 0, ativos = 0, t0 = 0, pos = 0, ultimo = 0, chave = '', pronto = false;
      const pede = () => { while (ativos < 6 && prox < N) { const i = prox++; ativos++; fetch(url(i)).then((r) => (r.ok ? r.blob() : null)).then((bl) => { if (bl) blobs[i] = bl; }, () => {}).finally(() => { ativos--; pede(); }); } };
      pede();
      const janela = (c) => {
        for (let d = 0; d <= J; d++) { const i = (c + d) % N; if (!blobs[i] || bms.has(i) || caminho.has(i)) continue; caminho.add(i); createImageBitmap(blobs[i]).then((bm) => { caminho.delete(i); bms.set(i, bm); }, () => caminho.delete(i)); }
        for (const [i, bm] of bms) { const dist = (i - c + N) % N; if (dist > J + 2) { bm.close(); bms.delete(i); } }
      };
      const tick = (t) => {
        requestAnimationFrame(tick);
        if (vivo) { pase.classList.add('fora'); return; }
        if (document.hidden) { ultimo = t; return; }
        const dt = ultimo ? Math.min(100, t - ultimo) : 0; ultimo = t;
        const a = Math.floor(pos), b = (a + 1) % N;
        // só avança se a imagem seguinte já cá estiver (rede lenta: espera, nunca salta)
        // arranca com 18 imagens já cá (1,5 s de filme), para não engasgar logo no início; depois só avança se a seguinte existir
        if (!pronto) pronto = blobs.slice(0, 18).filter(Boolean).length >= 18;
        if (pronto && bms.has(b)) pos = (pos + dt * FPS / 1000) % N;
        const i = Math.floor(pos), f = pos - i, j = (i + 1) % N;
        janela(i);
        const base = bms.get(i); if (!base) return;
        const k = i + ':' + Math.round(f * 8); if (k === chave) return; chave = k;
        if (tela.width !== base.width) { tela.width = base.width; tela.height = base.height; }
        ctx.globalAlpha = 1; ctx.drawImage(base, 0, 0);
        if (f > 0.06 && bms.has(j)) { ctx.globalAlpha = f; ctx.drawImage(bms.get(j), 0, 0); ctx.globalAlpha = 1; }
        if (!pase.classList.contains('on')) { pase.classList.add('on'); heroPronto(); }
        if (marca) marca(palavra(pos / FPS));
      };
      requestAnimationFrame(tick);
    };
    // 14/11 (João, iPhone: «o vídeo do hero não está a funcionar»): o iOS espaça os 'timeupdate' e a vigia escondia um
    // filme que estava a tocar. Agora lê-se o tempo do filme diretamente, a cada 150 ms.
    setInterval(() => {
      const t = video.currentTime, agora = performance.now();
      if (t !== tAnt) { if (t > tAnt || t < 0.3) avancos++; tAnt = t; ultimoAvanco = agora; if (avancos >= 2 && !video.paused) poeVivo(true); }
      else if (vivo && !video.seeking && !video.paused && agora - ultimoAvanco > 1500) { avancos = 0; poeVivo(false); }
    }, 150);
    // (validação 13/11) um 'waiting' curto (a volta do filme no Android, micro-pausas) não pode trazer o cartaz de
    // volta: isso fazia uma imagem dupla. Só a pausa a sério ou a vigia (sem avançar há mais de 600 ms) o fazem.
    ['pause', 'emptied'].forEach((ev) => video.addEventListener(ev, () => { avancos = 0; poeVivo(false); }));
    // modo de poupança de energia e browsers das apps: o filme só arranca com um gesto que conta para o sistema
    // (o iOS só aceita touchend/click). Os ouvintes só saem quando o play resultar; se falhar, ficam à espera do próximo.
    const GESTOS = ['touchend', 'pointerup', 'click', 'keydown'];
    let armado = false;
    const tira = () => { GESTOS.forEach((t) => removeEventListener(t, desbloqueio, true)); armado = false; };
    const desbloqueio = () => { if (!video.getAttribute('src')) video.src = escolhe(); if (video.readyState === 0) video.load(); video.play().then(tira).catch(() => {}); };
    const pedeGesto = () => { iniciaPase(); if (armado) return; armado = true; GESTOS.forEach((t) => addEventListener(t, desbloqueio, { capture: true, passive: true })); };
    const toca = () => { if (visivel && !document.hidden) video.play().catch(pedeGesto); };
    const arranca = () => {
      const vert = matchMedia('(max-width: 899px) and (orientation: portrait)').matches;
      // 14/11 (Fábio): no telemóvel em pé o filme alto carrega todo por baixo da abertura. Se a rede atrasar, fica o cartaz
      // em movimento até o filme andar. O canvas do modo de poupança (540 px) já não entra por a rede ser lenta, só
      // quando o iOS recusa o play: era ele o «360p» dos dados móveis, e as 258 imagens tiravam rede ao filme.
      if (vert) { video.preload = 'auto'; video.addEventListener('canplaythrough', filmeAguenta, { once: true }); }
      video.src = escolhe();
      toca();
      if (!vert) setTimeout(() => { if (!vivo) iniciaPase(); }, 3000);
      new IntersectionObserver(([e]) => { visivel = e.isIntersecting; visivel ? toca() : video.pause(); }).observe(hero);
      document.addEventListener('visibilitychange', () => (document.hidden ? video.pause() : toca()));
    };
    // 13/11: o slogan oficial («Salir, acelerar. Sentir, fondear, moverse y… volver a salir») acende cena a cena
    const lema = $('[data-hero-lema]');
    if (lema) {
      const pals = [...lema.children]; let ativa = -1;
      marca = (i) => { if (i !== ativa) { if (ativa >= 0) pals[ativa].classList.remove('on'); pals[i].classList.add('on'); ativa = i; } };
      // telemóvel em pé: data-de-v (o filme vertical tem outra ordem de cenas); computador: data-de, como sempre
      palavra = (t) => {
        const vert = matchMedia('(max-width: 899px) and (orientation: portrait)').matches;
        let i = 0, melhor = -1;
        pals.forEach((p, k) => { const d = +(vert && p.dataset.deV !== undefined ? p.dataset.deV : p.dataset.de); if (t >= d && d > melhor) { melhor = d; i = k; } });
        return i;
      };
      video.addEventListener('timeupdate', () => marca(palavra(video.currentTime)));
    }
    // 13/11 (João: «o vídeo começa antes da abertura total do logótipo»): arranca no load, por baixo da abertura,
    // para já estar a correr quando o logótipo voa para o cabeçalho; nunca antes do load, para não pesar no LCP
    // 13/11 (porta de velocidade): espera também pelo primeiro LCP, para o filme não entrar na conta dele;
    // o LCP chega por volta dos 2,5 s, antes do fim da abertura (~3,2 s), por isso o pedido do João mantém-se.
    // 13/11 (auditoria do telemóvel): já não espera pelo load inteiro (em rede lenta chegava depois da abertura).
    // Arranca depois do primeiro LCP ou, no máximo, 1,5 s depois do HTML. O cartaz em movimento cobre a espera.
    let foi = false;
    const vai = () => { if (!foi) { foi = true; arranca(); } };
    const temLCP = (PerformanceObserver.supportedEntryTypes || []).includes('largest-contentful-paint');
    if (temLCP) { try { new PerformanceObserver(() => vai()).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { vai(); } }
    else vai();
    // 14/11 (porta de velocidade no ar: telemóvel 88, LCP 3,6 s): o relógio de 0,7 s pedia o filme antes do LCP
    // (1,2 s contra 1,6 s) e o filme roubava a rede ao primeiro ecrã. Onde há LCP (Chrome) espera por ele, com 3 s de
    // teto; o Safari do iPhone não tem LCP e pede logo, como antes. A abertura dura pelo menos 3,1 s: o filme chega a tempo.
    setTimeout(vai, temLCP ? 3000 : 0);
  }

  /* ---------- abertura: a linha de água risca o ecrã, as letras emergem, o logótipo voa para o cabeçalho ---------- */
  const hl = hl0, alvo = $('[data-logo-alvo]');
  // outras secções podem adiar trabalho pesado até o logótipo pousar: DA.abertura.then(...) ou o evento 'da:aberto'
  let acabou; DA.abertura = new Promise((r) => (acabou = r));
  const avisa = () => { acabou(); document.dispatchEvent(new Event('da:aberto')); fimDoLogo(); };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const quadros = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  // todos os tempos saem do token --t-toque, os mesmos que o CSS usa
  const T = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-toque')) || 200;
  const RISCA = T * 6, VOO = T * 14, VOA = T * 6; // RISCA é a --t-cena da linha de água no CSS

  const ab = $('[data-abertura]'), raiz = document.documentElement;
  if (reduz || !ab) {
    document.body.classList.remove('a-abrir'); hero.classList.add('pronto'); ab && ab.remove();
    texto.classList.add('entra', 'vivo', 'assente'); avisa();
  } else {
    // abertura Pantiera: a linha vermelha desce do topo, abre-se em dois ramos e enche as duas ondas; as letras sobem; o logótipo voa para o cabeçalho
    scrollTo(0, 0); hero.classList.add('pronto');
    raiz.style.overflow = 'hidden';
  const logo = $('[data-abertura-logo]'), svg = $('.logo', logo);
  const ctm = svg.getScreenCTM();
  const ecra = (x, y) => ({ x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f });
  // centro do símbolo, para onde o escuro se recolhe
  const sb = $('#simbolo', svg).getBBox();
  const c = ecra(sb.x + sb.width * 0.5, sb.y + sb.height * 0.55);
  document.body.style.setProperty('--ab-x', `${(c.x / innerWidth) * 100}%`);
  document.body.style.setProperty('--ab-y', `${(c.y / innerHeight) * 100}%`);
  // a linha: um tronco que desce do topo do ecrã à esquerda do símbolo e, a meia altura, abre-se em dois ramos;
  // cada ramo entra na base da sua onda pela tangente do eixo e continua pelo eixo até à ponta
  // abertura C+E: a grelha do ecrã inteiro aperta-se até à caixa do logótipo; círculos de traçado encaixam nas curvas
  // do símbolo; as ondas desenham-se por cima; o nome sobe letra a letra; um fio vermelho fecha; o traçado apaga-se
  const linhas = $('[data-linhas-svg]'), NS = 'http://www.w3.org/2000/svg', vw = innerWidth, vh = innerHeight;
  linhas.setAttribute('viewBox', `0 0 ${vw} ${vh}`); linhas.innerHTML = '';
  const BB = svg.getBoundingClientRect(), SB = $('#simbolo', svg).getBoundingClientRect();
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sg = (t, a, b) => cl((t - a) / (b - a));
  const eo = (x) => 1 - Math.pow(1 - x, 3), eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const novo = (d, cor, w, extra) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.style.stroke = cor; p.style.strokeWidth = w + 'px'; p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1 1'; if (extra) p.setAttribute('stroke-linecap', extra); linhas.append(p); return p; };
  // grelha: 9 verticais e 9 horizontais; cada uma guarda de onde parte (ecrã) e onde pousa (caixa do logótipo)
  const gv = [], gh = []; // a grelha saiu: o dono escolheu só a construção (C)
  // círculos de construção à volta do símbolo e uma cruz de eixos
  const cx = SB.left + SB.width * 0.55, cy = SB.top + SB.height * 0.42, r = SB.width * 0.62;
  const circ = (x, y, rr) => `M${x + rr} ${y} A${rr} ${rr} 0 1 1 ${x + rr - 0.01} ${y - 0.5}`;
  const cs = [[cx, cy, r, '#9198a2'], [cx + r * 0.18, cy - r * 0.1, r * 0.62, '#9198a2'], [cx - r * 0.05, cy + r * 0.2, r * 1.05, '#9198a2'], [cx, cy, r * 1.62, '#dc0532']]
    .map(([x, y, rr, cor]) => novo(circ(x, y, rr), cor, 1));
  const eixoH = novo(`M${SB.left - 40} ${cy} L${BB.right + 40} ${cy}`, '#59606a', 1), eixoV = novo(`M${cx} ${SB.top - 60} L${cx} ${SB.bottom + 60}`, '#59606a', 1);
  const mks = $$('.mk', svg), letrasA = $$('#palavra .letra', svg), yachts = $('#yachts', svg);
  mks.forEach((m) => { m.style.animation = 'none'; m.style.strokeDasharray = '1 1'; m.style.strokeDashoffset = 1; });
  letrasA.forEach((l) => { l.style.animation = 'none'; l.style.opacity = 0; });
  if (yachts) yachts.style.opacity = 0;
  const dash = (p, v, op) => { p.style.strokeDashoffset = 1 - v; p.style.opacity = op; };
  const t0 = performance.now();
  const quadro = (now) => {
    const t = (now - t0) / 1000;
    const og = 1 - sg(t, 1.9, 2.5);
    cs.forEach((p, i) => dash(p, eio(sg(t, 0.05 + i * 0.14, 0.9 + i * 0.14)), 0.8 * og));
    dash(eixoH, eio(sg(t, 0, 0.7)), 0.6 * og); dash(eixoV, eio(sg(t, 0.05, 0.75)), 0.6 * og);
    mks.forEach((m) => { const menor = m.dataset.eixo === 'menor'; m.style.strokeDashoffset = 1 - eo(sg(t, menor ? 0.7 : 0.8, menor ? 1.4 : 1.5)); });
    letrasA.forEach((l, i) => { const v = eo(sg(t, 1.25 + i * 0.045, 1.8 + i * 0.045)); l.style.opacity = v; l.style.clipPath = `inset(${((1 - v) * 100).toFixed(1)}% 0 0 0)`; l.style.transform = `translateY(${((1 - v) * 30).toFixed(1)}%)`; });
    if (yachts) yachts.style.opacity = eo(sg(t, 2.05, 2.55));
    if (t < 3.05) requestAnimationFrame(quadro);
    else { letrasA.forEach((l) => { l.style.clipPath = ''; l.style.transform = ''; l.style.opacity = ''; }); if (yachts) yachts.style.opacity = ''; mks.forEach((m) => { m.style.strokeDashoffset = 0; }); }
  };
  requestAnimationFrame(quadro);
    const al = $('svg', alvo);
    // o logótipo só voa quando o hero já anda (nunca se entra num hero parado), entre 3,1 e 5,6 s
    // 14/11 (Fábio): no telemóvel em pé, entre 3,1 e 7 s, com o filme alto a tocar e com buffer para seguir
    const emPe = matchMedia('(max-width: 899px) and (orientation: portrait)').matches;
    Promise.all([espera(3100), Promise.race([emPe ? Promise.all([DA.heroPronto, aguenta]) : DA.heroPronto, espera(emPe ? 7000 : 5600)])]).then(() => {
      const a = al.getBoundingClientRect(), b = logo.getBoundingClientRect();
      logo.style.transition = 'transform .85s cubic-bezier(.7,0,.2,1)';
      logo.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
      texto.classList.add('entra');
      setTimeout(() => { document.body.classList.remove('a-abrir'); ab.remove(); raiz.style.overflow = ''; texto.classList.add('vivo'); avisa(); setTimeout(() => texto.classList.add('assente'), 2200); }, 900);
    });
  }

  // o --q escreve-se só nas folhas que o usam (cartaz, filme, texto) e está registado sem herança (10-hero.css):
  // mudar o valor não recalcula o estilo de nada por baixo. Onde o browser tem animation-timeline, o CSS anima
  // o parallax no compositor (cola ao scroll do dedo) e aqui fica só o que é estado: fora e sobre-hero.
  const folhas = [poster].filter(Boolean);
  const peloCSS = !reduz && CSS.supports && CSS.supports('animation-timeline: scroll()');
  let ultimo = -1, altHero = hero.offsetHeight, qAnt = '', qtAnt = '', foraAnt = null, sobreAnt = null;
  addEventListener('resize', () => { altHero = hero.offsetHeight; ultimo = -1; }, { passive: true });
  DA.aCada((t, ecra) => {
    const y = ecra.y, h = ecra.h;
    if (y === ultimo || y > h * 1.2 && ultimo > h * 1.2) { ultimo = y; return; }
    ultimo = y;
    const qt = clamp(y / (h * 0.7));
    if (!peloCSS) {
      const s = (reduz ? 0 : qt).toFixed(4), st = qt.toFixed(4);
      if (s !== qAnt) { qAnt = s; folhas.forEach((f) => f.style.setProperty('--q', s)); }
      if (st !== qtAnt) { qtAnt = st; texto.style.setProperty('--q', st); }
    }
    const fora = qt > 0.6;
    if (fora !== foraAnt) { foraAnt = fora; texto.classList.toggle('fora', fora); }
    // enquanto o hero está por baixo do cabeçalho, o cabeçalho não usa difference (ver 10-hero.css)
    const sobre = y < altHero * 0.82;
    if (sobre !== sobreAnt) { sobreAnt = sobre; document.body.classList.toggle('sobre-hero', sobre); }
  });
})();
