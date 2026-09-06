// Acessibilidade: Aplicar preferências salvas antes do render completo para evitar FOUC
(function applySavedA11y() {
  try {
    if (localStorage.getItem('mb_high_contrast') === 'true') {
      document.documentElement.classList.add('high-contrast');
    }
    const savedSize = localStorage.getItem('mb_font_size');
    if (savedSize && ['sm', 'md', 'lg', 'xl'].includes(savedSize)) {
      document.documentElement.classList.add('font-size-' + savedSize);
    }
  } catch (_) {}
})();

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  root.classList.remove('no-js');

  const accessibilityBar = document.querySelector('.accessibility-bar');
  const accessibilityToggle = document.querySelector('[data-a11y-panel-toggle]');
  if (accessibilityBar && accessibilityToggle) {
    accessibilityBar.classList.add('has-disclosure');
    function setAccessibilityPanel(open) {
      accessibilityToggle.setAttribute('aria-expanded', String(open));
      accessibilityBar.classList.toggle('is-expanded', open);
      window.dispatchEvent(new Event('resize'));
    }
    accessibilityToggle.addEventListener('click', () => {
      setAccessibilityPanel(accessibilityToggle.getAttribute('aria-expanded') !== 'true');
    });
    accessibilityBar.addEventListener('keydown', event => {
      if (event.key === 'Escape' && accessibilityBar.classList.contains('is-expanded')) {
        setAccessibilityPanel(false);
        accessibilityToggle.focus();
      }
    });
  }

  /* ── Barra de Acessibilidade Governamental (e-MAG) ── */
  const a11yContrastBtn = document.querySelector('[data-a11y-contrast]');
  const a11yFontButtons = document.querySelectorAll('[data-a11y-font]');
  const a11yLive = document.getElementById('a11y-live-feedback');

  function announceA11y(message) {
    if (a11yLive) {
      a11yLive.textContent = '';
      setTimeout(() => {
        a11yLive.textContent = message;
      }, 50);
    }
  }

  // 1. Alto Contraste
  const isHighContrast = root.classList.contains('high-contrast');
  if (a11yContrastBtn) {
    a11yContrastBtn.setAttribute('aria-pressed', String(isHighContrast));
    a11yContrastBtn.addEventListener('click', () => {
      const active = root.classList.toggle('high-contrast');
      a11yContrastBtn.setAttribute('aria-pressed', String(active));
      try {
        localStorage.setItem('mb_high_contrast', String(active));
      } catch (_) {}
      announceA11y(active ? 'Modo de alto contraste ativado' : 'Modo de alto contraste desativado');
    });
  }

  // 2. Controle de Tamanho de Fonte (sm, md, lg, xl)
  const fontSizes = ['sm', 'md', 'lg', 'xl'];
  let currentFontIndex = fontSizes.indexOf(localStorage.getItem('mb_font_size') || 'md');
  if (currentFontIndex === -1) currentFontIndex = 1; // 'md' por padrão

  function setFontSize(newIndex, announce = true) {
    newIndex = Math.max(0, Math.min(fontSizes.length - 1, newIndex));
    currentFontIndex = newIndex;
    const currentSize = fontSizes[currentFontIndex];

    fontSizes.forEach(size => root.classList.remove('font-size-' + size));
    if (currentSize !== 'md') {
      root.classList.add('font-size-' + currentSize);
    }

    try {
      localStorage.setItem('mb_font_size', currentSize);
    } catch (_) {}

    if (announce) {
      if (currentSize === 'md') {
        announceA11y('Tamanho da fonte restaurado para o padrão');
      } else if (newIndex > 1) {
        announceA11y('Tamanho da fonte aumentado');
      } else {
        announceA11y('Tamanho da fonte reduzido');
      }
    }
  }

  a11yFontButtons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.a11yFont;
      if (action === 'increase') {
        setFontSize(currentFontIndex + 1);
      } else if (action === 'decrease') {
        setFontSize(currentFontIndex - 1);
      } else if (action === 'reset') {
        setFontSize(1);
      }
    });
  });

  // 3. Tradutor de Libras (VLibras)
  const a11yLibrasBtn = document.querySelector('[data-a11y-vlibras]');
  if (a11yLibrasBtn) {
    a11yLibrasBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // 1. Se o controlador global window.vlibras já estiver disponível
      if (window.vlibras && typeof window.vlibras.setOpen === 'function') {
        const nextState = !window.vlibras.isOpen;
        window.vlibras.setOpen(nextState);
        announceA11y(nextState ? 'Tradutor de Libras ativado' : 'Tradutor de Libras desativado');
        return;
      }

      // 2. Se o botão oficial do VLibras dentro do Shadow DOM estiver disponível
      const accessWrapper = document.getElementById('vlibras-access-wrapper');
      const floatingBtn = accessWrapper?.shadowRoot?.getElementById('vlibras-button') ||
                          accessWrapper?.shadowRoot?.querySelector('button, [role="button"], img');
      if (floatingBtn) {
        floatingBtn.click();
        announceA11y('Tradutor de Libras acionado');
        return;
      }

      // 3. Se a instância VLibrasWidget foi instanciada pela tag script
      if (window.VLibrasWidget && typeof window.VLibrasWidget.open === 'function') {
        window.VLibrasWidget.open();
        // Garante a abertura assim que window.vlibras carregar
        const checkReady = setInterval(() => {
          if (window.vlibras && typeof window.vlibras.setOpen === 'function') {
            clearInterval(checkReady);
            window.vlibras.setOpen(true);
          }
        }, 150);
        setTimeout(() => clearInterval(checkReady), 6000);
        announceA11y('Tradutor de Libras acionado');
        return;
      }

      // 4. Se a classe global VLibras estiver disponível mas o widget ainda não foi criado
      if (window.VLibras && typeof window.VLibras.Widget === 'function') {
        try {
          window.VLibrasWidget = new window.VLibras.Widget('https://vlibras.gov.br/app');
          window.VLibrasWidget.open?.();
        } catch (_) {}
      }

      announceA11y('Carregando tradutor de Libras');
    });
  }

  // 4. Menu Dropdown "Mais" na Navegação Desktop
  const navDropdowns = document.querySelectorAll('[data-nav-dropdown]');
  navDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    const items = dropdown.querySelectorAll('.dropdown-item');

    function closeDropdown() {
      dropdown.classList.remove('is-open');
      trigger?.setAttribute('aria-expanded', 'false');
    }

    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    });

    items.forEach(item => {
      item.addEventListener('click', () => {
        closeDropdown();
      });
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        closeDropdown();
      }
    });

    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
        trigger?.focus();
      }
    });
  });

  const header = document.querySelector('[data-site-header]');
  const progress = document.querySelector('[data-scroll-progress]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  const menuOpen = document.querySelector('[data-menu-open]');
  const menuClose = document.querySelector('[data-menu-close]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // A prévia usa telas reais; a escolha permanece até a próxima interação.
  const showcase = document.querySelector('.hero-showcase');
  if (showcase) {
    const screens = {
      home: ['app-home-atual.webp', 'Tela inicial do aplicativo Marinha do Brasil', 'Tudo começa aqui.', 'O essencial do seu dia, em uma só tela.'],
      jobs: ['app-concursos.webp', 'Tela de concursos da Marinha', 'Seu próximo passo está aqui.', 'Explore editais e oportunidades na Marinha.'],
      search: ['app-busca-cha.webp', 'Busca do aplicativo por CHA', 'Uma busca. Muitas respostas.', 'Encontre serviços por nome, sigla ou assunto.'],
      radio: ['app-radio-player.webp', 'Player da Rádio Marinha no aplicativo', 'Dê play na sua companhia.', 'Conheça a experiência da Rádio Marinha.']
    };
    const tabs = [...showcase.querySelectorAll('[data-hero-tab]')];
    const preview = showcase.querySelector('[data-hero-screen]');
    let selection = 0;
    let transition;
    async function selectScreen(index, focus = false) {
      const tab = tabs[index];
      if (!tab) return;
      const screen = screens[tab.dataset.heroTab];
      if (!screen) return;
      const request = ++selection;
      const asset = new Image();
      asset.src = 'assets/images/' + screen[0];
      try { await asset.decode(); } catch { return; }
      if (request !== selection) return;
      transition?.cancel();
      preview.src = asset.src;
      preview.alt = screen[1];
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      const heroPreview = showcase.querySelector('#hero-preview');
      if (heroPreview && tab.id) heroPreview.setAttribute('aria-labelledby', tab.id);
      const labelEl = showcase.querySelector('[data-hero-label]');
      if (labelEl) labelEl.textContent = screen[2];
      const descEl = showcase.querySelector('[data-hero-description]');
      if (descEl) descEl.textContent = screen[3];
      if (!reducedMotion.matches) transition = preview.animate([{ opacity: .25, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' });
      if (focus) tab.focus({ preventScroll: true });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectScreen(index));
      tab.addEventListener('keydown', event => {
        const keys = {
          ArrowRight: (index + 1) % tabs.length,
          ArrowDown: (index + 1) % tabs.length,
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowUp: (index + tabs.length - 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1
        };
        if (event.key in keys) {
          event.preventDefault();
          selectScreen(keys[event.key], true);
        }
      });
    });
    showcase.querySelectorAll('[data-hero-shortcut]:not([data-hero-tab])').forEach(shortcut => {
      shortcut.addEventListener('click', () => {
        const targetIndex = tabs.findIndex(tab => tab.dataset.heroTab === shortcut.dataset.heroShortcut);
        if (targetIndex !== -1) selectScreen(targetIndex);
      });
    });
    const stage = showcase.querySelector('.showcase-stage');
    if (stage) {
      stage.addEventListener('pointermove', event => {
        if (reducedMotion.matches || event.pointerType !== 'mouse') return;
        const bounds = stage.getBoundingClientRect();
        stage.style.setProperty('--tilt-y', ((event.clientX - bounds.left) / bounds.width - .5) * 4 + 'deg');
        stage.style.setProperty('--tilt-x', -((event.clientY - bounds.top) / bounds.height - .5) * 3 + 'deg');
        stage.style.setProperty('--glass-x', (event.clientX - bounds.left) / bounds.width * 100 + '%');
      });
      stage.addEventListener('pointerleave', () => {
        stage.style.removeProperty('--tilt-x');
        stage.style.removeProperty('--tilt-y');
        stage.style.removeProperty('--glass-x');
      });
    }
  }

  const pageContent = document.querySelector('main');
  const footer = document.querySelector('.site-footer');
  const mobileDownload = document.querySelector('[data-mobile-download]');
  let menuReturnFocus = null;

  let frameRequested = false;

  /* ── Smooth Parallax (Apple-style lerp) ── */
  const parallaxElements = new Map();

  document.querySelectorAll('[data-parallax]').forEach((el) => {
    parallaxElements.set(el, { current: 0, target: 0 });
  });

  function lerpParallax() {
    if (reducedMotion.matches) return;
    parallaxElements.forEach((state, el) => {
      if (!el.classList.contains('is-visible')) return;
      const speed = Number(el.dataset.speed ?? 0.08);
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
      state.target = Math.max(-72, Math.min(72, -offset));
      state.current += (state.target - state.current) * 0.08;
      if (Math.abs(state.current - state.target) < 0.15) state.current = state.target;
      el.style.setProperty('--parallax-y', `${state.current}px`);
    });
  }

  /* ── Scroll-linked Background Scale ── */
  const scaleElements = document.querySelectorAll('[data-scroll-scale]');

  function updateScrollScale() {
    if (reducedMotion.matches) return;
    scaleElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const progress = 1 - Math.max(0, Math.min(1,
        (rect.top + rect.height) / (window.innerHeight + rect.height)
      ));
      const scaleVal = 1.08 - progress * 0.06;
      el.style.transform = `scale(${scaleVal})`;
    });
  }

  function renderScroll() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 16);
    }
    if (progress) {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, y / scrollable) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }

    lerpParallax();
    updateScrollScale();

    frameRequested = false;
  }

  function requestRender() {
    if (!frameRequested) {
      requestAnimationFrame(renderScroll);
      frameRequested = true;
    }
  }

  /* Continuous lerp loop for ultra-smooth parallax */
  let lerpRaf;
  function lerpLoop() {
    lerpParallax();
    lerpRaf = requestAnimationFrame(lerpLoop);
  }
  if (!reducedMotion.matches) {
    lerpLoop();
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && lerpRaf) {
      cancelAnimationFrame(lerpRaf);
    } else {
      lerpLoop();
    }
  });

  /* ── Menu ── */
  function positionMobileMenu() {
    if (!header || !mobileMenu || mobileMenu.hidden) return;
    const top = Math.max(0, header.getBoundingClientRect().bottom);
    mobileMenu.style.setProperty('--menu-top', `${top}px`);
  }
  window.addEventListener('resize', positionMobileMenu, { passive: true });
  window.addEventListener('scroll', positionMobileMenu, { passive: true });
  window.visualViewport?.addEventListener('resize', positionMobileMenu);
  if (header && 'ResizeObserver' in window) {
    new ResizeObserver(positionMobileMenu).observe(header);
  }

  function setMenu(open) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    const srOnly = menuToggle.querySelector('.sr-only');
    if (srOnly) {
      srOnly.textContent = open ? 'Fechar menu' : 'Abrir menu';
    }
    mobileMenu.hidden = !open;
    positionMobileMenu();
    if (menuOpen) menuOpen.toggleAttribute('hidden', open);
    if (menuClose) menuClose.toggleAttribute('hidden', !open);
    root.classList.toggle('menu-open', open);
    [pageContent, footer].forEach((element) => {
      if (!element) return;
      if (open) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    });
    if (open) {
      menuReturnFocus = document.activeElement;
      const firstLink = mobileMenu.querySelector('a');
      if (firstLink) firstLink.focus();
    } else if (menuReturnFocus instanceof HTMLElement) {
      menuReturnFocus.focus();
    }
  }

  menuToggle?.addEventListener('click', () => {
    const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
    setMenu(willOpen);
    trackEvent(willOpen ? 'menu_open' : 'menu_close');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuToggle.focus();
    }
    if (event.key === 'Tab' && menuToggle?.getAttribute('aria-expanded') === 'true' && mobileMenu) {
      const focusable = [menuToggle, ...mobileMenu.querySelectorAll('a, button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      trackEvent('menu_navigation', { destination: link.getAttribute('href') });
      setMenu(false);
    });
  });

  // Indica a seção atual nas duas versões da navegação.
  const sectionLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"], .mobile-menu nav a[href^="#"]')];
  const navSections = [...new Set(sectionLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean))];
  let navFrame = 0;
  function updateSectionNavigation() {
    navFrame = 0;
    const marker = (header?.getBoundingClientRect().bottom || 0) + innerHeight * .25;
    let active = null;
    navSections.forEach(section => {
      const bounds = section.getBoundingClientRect();
      if (bounds.top <= marker && bounds.bottom > marker) active = section.id;
    });
    sectionLinks.forEach(link => {
      if (active && link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleSectionNavigation() {
    if (!navFrame) navFrame = requestAnimationFrame(updateSectionNavigation);
  }
  window.addEventListener('scroll', scheduleSectionNavigation, { passive: true });
  window.addEventListener('resize', scheduleSectionNavigation, { passive: true });
  updateSectionNavigation();

  const watchSection = document.getElementById('apple-watch');
  if (watchSection) {
    const choices = [...watchSection.querySelectorAll('[data-watch-select]')];
    const descriptions = {
      corrida: 'Tempo, distância, ritmo e batimentos.',
      ciclismo: 'Acompanhe sua atividade pelo relógio.',
      controle_hidrico: 'Registre a água consumida e acompanhe sua meta.',
      prev_tempo: 'Consulte a previsão do tempo.',
      radio_1: 'Acompanhe a Rádio Marinha no seu pulso.'
    };
    let active = 0, visible = !('IntersectionObserver' in window), timer;
    function selectWatch(index) {
      active = index;
      const button = choices[index], key = button.dataset.watchSelect;
      const title = button.querySelector('span').textContent;
      const screen = watchSection.querySelector('[data-watch-screen]');
      screen.src = `assets/images/watch/${key}.jpg`;
      screen.alt = `Tela de ${title} no aplicativo para Apple Watch`;
      watchSection.querySelector('[data-watch-title]').textContent = title;
      watchSection.querySelector('[data-watch-description]').textContent = descriptions[key];
      choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    }
    function syncWatch() {
      clearInterval(timer);
      const motionActive = visible && !document.hidden && !reducedMotion.matches;
      watchSection.classList.toggle('is-atmosphere-active', motionActive);
      if (motionActive) {
        timer = setInterval(() => selectWatch((active + 1) % choices.length), 6500);
      }
    }
    choices.forEach((button, index) => button.addEventListener('click', () => { selectWatch(index); syncWatch(); }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncWatch(); }, { threshold: .25 }).observe(watchSection);
    }
    syncWatch();
    document.addEventListener('visibilitychange', syncWatch);
    reducedMotion.addEventListener('change', syncWatch);
  }

  /* ── Intersection Observers ── */
  if ('IntersectionObserver' in window) {
    /* Parallax visibility */
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
      requestRender();
    }, { rootMargin: '120px 0px' });
    document.querySelectorAll('[data-parallax]').forEach((element) => visibilityObserver.observe(element));

    /* Reveal observer — Apple-style with stagger support */
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element));

  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
  }

  /* ── Auto-stagger for grids ── */
  function applyStagger(containerSelector, childSelector, baseDelay = 80) {
    document.querySelectorAll(containerSelector).forEach((grid) => {
      grid.querySelectorAll(childSelector).forEach((child, i) => {
        child.style.setProperty('--reveal-delay', `${i * baseDelay}ms`);
      });
    });
  }

  applyStagger('.feature-grid', '.feature-card[data-reveal]', 100);
  applyStagger('.trust-grid', 'article[data-reveal]', 120);

  /* ── Hero split text — word-by-word reveal ── */
  function splitHeroText() {
    if (reducedMotion.matches) return;
    const heroTitle = document.querySelector('.home-hero h1[data-hero-animate]');
    if (!heroTitle) return;

    const lines = heroTitle.querySelectorAll('em');
    const mainText = heroTitle.childNodes;
    const fragment = document.createDocumentFragment();
    let wordIndex = 0;

    mainText.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const words = node.textContent.split(/(\s+)/);
        words.forEach((word) => {
          if (word.trim()) {
            const span = document.createElement('span');
            span.className = 'hero-word';
            span.style.setProperty('--word-index', String(wordIndex));
            span.textContent = word;
            fragment.appendChild(span);
            wordIndex++;
          } else if (word) {
            fragment.appendChild(document.createTextNode(word));
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        const words = node.textContent.split(/(\s+)/);
        words.forEach((word) => {
          if (word.trim()) {
            const span = document.createElement('span');
            span.className = 'hero-word';
            span.style.setProperty('--word-index', String(wordIndex));
            span.textContent = word;
            clone.appendChild(span);
            wordIndex++;
          } else if (word) {
            clone.appendChild(document.createTextNode(word));
          }
        });
        fragment.appendChild(clone);
      }
    });

    heroTitle.innerHTML = '';
    heroTitle.appendChild(fragment);
  }

  splitHeroText();

  // Libera propriedades de animação do hero showcase após o término da entrada
  document.querySelectorAll('.hero-showcase [data-hero-animate]').forEach((el) => {
    el.addEventListener('animationend', () => {
      el.style.animation = 'none';
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.transform = '';
    }, { once: true });
  });

  /* ── Radio ── */
  document.querySelectorAll('[data-radio-toggle]').forEach((button) => {
    const selector = button.dataset.radioToggle;
    const audio = selector ? document.querySelector(selector) : null;
    if (!audio) return;
    button.addEventListener('click', async () => {
      const label = button.querySelector('[data-play-label]');
      const status = document.querySelector('[data-radio-status]');
      if (audio.paused) {
        try {
          button.dataset.state = 'loading';
          button.setAttribute('aria-busy', 'true');
          if (label) label.textContent = 'Conectando…';
          if (status) status.textContent = 'Conectando à Rádio Marinha.';
          await audio.play();
          button.dataset.state = 'playing';
          button.removeAttribute('aria-busy');
          button.setAttribute('aria-label', 'Pausar Rádio Marinha');
          if (label) label.textContent = 'Pausar ao vivo';
          if (status) status.textContent = 'A Rádio Marinha está tocando ao vivo.';
          trackEvent('radio_play');
        } catch (e) {
          button.dataset.state = 'paused';
          button.removeAttribute('aria-busy');
          if (label) label.textContent = 'Tentar novamente';
          if (status) status.textContent = 'Não foi possível iniciar a Rádio Marinha. Verifique sua conexão e tente novamente.';
          trackEvent('radio_error');
        }
      } else {
        audio.pause();
        button.dataset.state = 'paused';
        button.setAttribute('aria-label', 'Ouvir Rádio Marinha ao vivo');
        if (label) label.textContent = 'Ouvir ao vivo';
        if (status) status.textContent = 'Rádio Marinha pausada.';
        trackEvent('radio_pause');
      }
    });
    audio.addEventListener('waiting', () => {
      const label = button.querySelector('[data-play-label]');
      button.dataset.state = 'loading';
      button.setAttribute('aria-busy', 'true');
      if (label) label.textContent = 'Reconectando…';
    });
    audio.addEventListener('playing', () => {
      const label = button.querySelector('[data-play-label]');
      button.dataset.state = 'playing';
      button.removeAttribute('aria-busy');
      if (label) label.textContent = 'Pausar transmissão';
    });
    audio.addEventListener('error', () => {
      const label = button.querySelector('[data-play-label]');
      const status = document.querySelector('[data-radio-status]');
      button.dataset.state = 'paused';
      button.removeAttribute('aria-busy');
      if (label) label.textContent = 'Tentar novamente';
      if (status) status.textContent = 'A transmissão está indisponível no momento. Tente novamente em instantes.';
    });
  });

  /* ── Analytics ── */
  function trackEvent(name, properties = {}) {
    const detail = { event: name, ...properties };
    window.dispatchEvent(new CustomEvent('marinha:analytics', { detail }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
  }

  document.querySelectorAll('a[href*="apps.apple.com"], a[href*="play.google.com"]').forEach((link) => {
    link.addEventListener('click', () => {
      trackEvent('store_click', {
        store: link.href.includes('apple.com') ? 'app_store' : 'google_play',
        placement: link.closest('.home-hero') ? 'hero' : link.closest('.mobile-download') ? 'sticky_mobile' : 'page'
      });
    });
  });

  /* ── Demo Tabs ── */
  document.querySelectorAll('[data-demo-tab]').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => selectDemoTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      selectDemoTab(next);
    });
  });

  function selectDemoTab(tab) {
    const image = document.querySelector('[data-demo-image]');
    const panel = document.querySelector('#demo-panel');
    document.querySelectorAll('[data-demo-tab]').forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    if (!image || !panel) return;
    const phone = image.closest('.demo-phone');
    phone?.classList.add('is-changing');
    window.setTimeout(() => {
      image.src = tab.dataset.image;
      image.alt = tab.dataset.alt;
      panel.setAttribute('aria-labelledby', tab.id);
      const label = document.querySelector('[data-demo-label]');
      const description = document.querySelector('[data-demo-description]');
      if (label) label.textContent = tab.dataset.label;
      if (description) description.textContent = tab.dataset.description;
      phone?.classList.remove('is-changing');
    }, reducedMotion.matches ? 0 : 150);
    trackEvent('demo_view', { screen: tab.dataset.label });
  }

  document.querySelectorAll('[data-open-demo]').forEach((link) => {
    link.addEventListener('click', () => {
      const tab = document.getElementById(link.dataset.openDemo);
      if (tab) selectDemoTab(tab);
    });
  });

  document.querySelector('[data-radio-page]')?.addEventListener('click', () => {
    trackEvent('radio_page_click', { destination: 'radio_marinha' });
  });

  /* ── Mobile Download Banner ── */
  if (mobileDownload) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const link = mobileDownload.querySelector('[data-mobile-store-link]');
    const label = mobileDownload.querySelector('[data-mobile-store-label]');
    if (isIOS && link) {
      link.href = 'https://apps.apple.com/app/marinha-do-brasil/id6763670491';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (label) label.textContent = 'Disponível na App Store';
    } else if (isAndroid && link) {
      link.href = 'https://play.google.com/store/apps/details?id=br.gov.marinhaoficial.app';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (label) label.textContent = 'Disponível no Google Play';
    }
    const storeButtons = document.querySelector('.download-panel .store-buttons');
    if (storeButtons && (isIOS || isAndroid)) {
      const preferredStore = storeButtons.querySelector(isIOS ? 'a[href*="apps.apple.com"]' : 'a[href*="play.google.com"]');
      if (preferredStore) storeButtons.prepend(preferredStore);
    }
    link?.addEventListener('click', () => {
      trackEvent('store_click', {
        store: isIOS ? 'app_store' : isAndroid ? 'google_play' : 'store_selector',
        placement: 'sticky_mobile'
      });
    });
    let downloadDismissed = false;
    try { downloadDismissed = sessionStorage.getItem('mobile-download-dismissed') === 'true'; } catch (_) {}
    function updateDownloadBanner(inDownloadSection = false) {
      mobileDownload.hidden = downloadDismissed || inDownloadSection;
      document.body.classList.toggle('has-mobile-download', !mobileDownload.hidden);
    }
    mobileDownload.querySelector('[data-mobile-download-close]')?.addEventListener('click', () => {
      downloadDismissed = true;
      try { sessionStorage.setItem('mobile-download-dismissed', 'true'); } catch (_) {}
      updateDownloadBanner();
    });
    updateDownloadBanner();
    const downloadPanel = document.querySelector('#download');
    if (downloadPanel && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        updateDownloadBanner(entry.isIntersecting);
      }, { threshold: 0.15 }).observe(downloadPanel);
    }
  }

  /* ── Scroll Depth ── */
  const reachedDepth = new Set();
  window.addEventListener('scroll', () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const percent = Math.round((window.scrollY / scrollable) * 100);
    [25, 50, 75, 100].forEach((depth) => {
      if (percent >= depth && !reachedDepth.has(depth)) {
        reachedDepth.add(depth);
        trackEvent('scroll_depth', { percent: depth });
      }
    });
  }, { passive: true });

  /* ── Legal TOC ── */
  const tocLinks = [...document.querySelectorAll('.legal-toc a[href^="#"]')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const tocById = new Map(tocLinks.map((link) => [link.getAttribute('href').slice(1), link]));
    const tocObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach((link) => link.removeAttribute('aria-current'));
      tocById.get(visible.target.id)?.setAttribute('aria-current', 'true');
    }, { rootMargin: '-20% 0px -68% 0px' });
    tocById.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) tocObserver.observe(section);
    });
  }

  /* ── Realistic iPhone 15 Search & BottomSheet Interactive Demo ── */
  const iphoneScreen = document.getElementById('iphone-screen');
  const appSearchQuery = document.getElementById('app-search-query');
  const appSearchClearBtn = document.getElementById('app-search-clear-btn');
  const appBottomSheet = document.getElementById('app-bottom-sheet');
  const appSheetCloseHandle = document.getElementById('app-sheet-close-handle');
  const appResultsCard = document.querySelector('.app-results-card');
  const appSheetScrollable = appBottomSheet ? appBottomSheet.querySelector('.app-sheet-scrollable') : null;

  if (iphoneScreen && appSearchQuery && appBottomSheet && appResultsCard) {
    const demoTimers = new Set();
    let isDemoVisible = false;
    let currentScenario = 0;

    // ── Definição dos 3 Cenários ──────────────────────────────────────────────
    const SCENARIOS = [
      {
        query: 'cha',
        keys: ['c', 'h', 'a'],
        keyIds: ['ios-key-c', 'ios-key-h', 'ios-key-a'],
        results: [
          { icon: 'id-card', bg: 'purple', title: 'Carteira de Habilitação de Amador <span class="app-highlight-cha">(CHA)</span>', sub: 'Capitanias • habilitação para esporte e recreio', interactive: true },
          { icon: 'anchor', bg: 'blue',   title: 'Comando do 4º Distrito Naval',        sub: 'Com4ºDN • PA' },
          { icon: 'anchor', bg: 'blue',   title: 'Delegacia da Capitania dos Portos em La...', sub: 'DelLaguna • SC' },
          { icon: 'hotel',  bg: 'brown',  title: 'Hotel de Trânsito Rio Negro',          sub: 'Comando do 9º Distrito Naval • AMAZONAS - AM' },
          { icon: 'hotel',  bg: 'brown',  title: 'Hotel de Trânsito da Marinha em Belém', sub: 'Comando do 4º Distrito Naval • PARÁ - PA' },
          { icon: 'anchor', bg: 'blue',   title: 'Unidade Integrada de Saúde Mental',    sub: 'UISM • RJ' },
        ],
        sheet: {
          eyebrow: 'HABILITAÇÃO NÁUTICA',
          title: 'CARTEIRA DE HABILITAÇÃO DE AMADOR (CHA)',
          iconPath: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M7 17h10"/><path d="M10 4V2h4v2"/>',
          lead: 'Serviço oficial para obter a Carteira de Habilitação de Amador ou ascender de categoria. A CHA habilita o cidadão a conduzir embarcações de esporte ou recreio, em caráter não profissional.',
          checkItems: ['Documento oficial de identificação com foto', 'CPF', 'Comprovante de residência/endereço', 'Comprovante de pagamento da GRU, quando houver taxa'],
          steps: ['Consultar a NORMAM de amadores para verificar a categoria desejada.', 'Acessar a Plataforma de Serviços Digitais da Marinha pelo Gov.br.', 'Emitir e pagar a GRU quando o serviço exigir taxa.', 'Comparecer à Capitania, Delegacia ou Agência responsável.', 'Acompanhar o processo pela plataforma oficial.'],
        },
      },
      {
        query: 'quadro técnico',
        keys: ['q', 'u', 'a', 'd'],
        keyIds: ['ios-key-q', 'ios-key-u', 'ios-key-a', 'ios-key-d'],
        results: [
          { icon: 'graduation', bg: 'blue',   title: '<span class="app-hl">Quadro Técnico</span> de Oficiais (QT / CP-T)', badge: 'EM ANDAMENTO • Inscrição Encerrada', sub: '', interactive: true },
          { icon: 'graduation', bg: 'olive',  title: 'Status dos Concursos',                 sub: 'A serem abertos, inscrições abertas e em andame...' },
          { icon: 'graduation', bg: 'purple', title: '<span class="app-hl">Quadro Técnico</span> de Oficiais (QT / CP-T)', sub: 'Nível Superior • Oficiais de carreira para áreas de a...' },
          { icon: 'anchor',     bg: 'red',    title: 'Praças da Armada (QTPA)',               sub: 'Nível Médio Técnico • Especialização técnica em s...' },
          { icon: 'graduation', bg: 'olive',  title: 'Concursos MB (Formas de Ingresso)',     sub: 'Central completa: Fundamental, Médio, Técnico e ...' },
          { icon: 'graduation', bg: 'purple', title: 'Concursos de Nível Superior',           sub: 'Quadro Técnico, Engenheiros, Médicos, Dentistas, ...' },
        ],
        sheet: {
          template: 'concurso',
          title: 'Concurso Público para Ingresso no Quadro Técnico do Corpo Auxiliar (CP-T) - 2026',
          vagas: '32',
          taxa: 'R$ 150,00',
          posto: 'Primeiro-Tenente',
          prova: '24/05/26',
          abertura: '10/03/26',
          encerramento: '14/04/26',
          local: 'Internet',
          atencao: 'É importante que os candidatos leiam atentamente o Edital. No dia da prova não esqueça o DOCUMENTO OFICIAL DE IDENTIFICAÇÃO, EM MEIO FÍSICO, COM FOTOGRAFIA (NA QUAL POSSA SER RECONHECIDO), ASSINATURA E DENTRO DA VALIDADE.',
          documentos: [
            { data: '03/09/26', nome: 'Retificação de Edital - 008' },
            { data: '26/08/26', nome: 'Chamada PCAD Complementar' },
            { data: '26/08/26', nome: 'Retificação de Edital - 007' },
            { data: '13/08/26', nome: 'Notas PO e Redação' },
            { data: '04/08/26', nome: 'Eliminados e Ausentes' },
            { data: '15/07/26', nome: 'Retificação de Edital - 006' },
            { data: '13/07/26', nome: 'Chamada PCAD' },
            { data: '07/07/26', nome: 'Gabarito Final' },
          ],
        },
      },
      {
        query: 'corrida',
        keys: ['c', 'o', 'r'],
        keyIds: ['ios-key-c', 'ios-key-o', 'ios-key-r'],
        results: [
          { icon: 'run',       bg: 'red',    title: '<span class="app-hl">Corrida</span>',   sub: 'Painel de corrida e desempenho', interactive: true },
          { icon: 'bar-chart', bg: 'olive',  title: 'Ranking de <span class="app-hl">Corrida</span>', sub: 'Classificação individual e por OM' },
          { icon: 'play',      bg: 'orange', title: 'Iniciar <span class="app-hl">corrida</span>', sub: 'Começar uma nova atividade de corrida' },
          { icon: 'history',   bg: 'slate',  title: 'Histórico de <span class="app-hl">Corrida</span>', sub: 'Consulte suas corridas anteriores' },
          { icon: 'run',       bg: 'red',    title: 'Esportes',                               sub: 'Todas as modalidades esportivas' },
          { icon: 'hotel',     bg: 'brown',  title: 'ARES <span class="app-hl">A</span> Ressurgência', sub: 'DEPARTAMENTO REGIONAL DO ABRIGO DO MAR...' },
        ],
        sheet: {
          template: 'corrida',
          recordes: { distancia: '6.3 km', corridas: '30', pace: '01:29 /km' },
          desafio: { titulo: 'DESAFIO DO MARUJO', distancia: '2,4 KM', tempo: '15m00s', subtitulo: 'TESTE DE APTIDÃO FÍSICA — MARINHA DO BRASIL' },
        },
      },
    ];

    const smartDemoTitle = document.querySelector('[data-smart-demo-title]');
    const smartScenarioTabs = document.querySelectorAll('[data-smart-scenario]');
    const scenarioLabels = ['Orientações para sua habilitação náutica', 'Concursos, editais e formas de ingresso', 'Seus treinos e sua evolução por perto'];

    function setScenarioControlState(index) {
      smartScenarioTabs.forEach((tab) => {
        const selected = Number(tab.dataset.smartScenario) === index;
        tab.setAttribute('aria-pressed', String(selected));
      });
      if (smartDemoTitle) smartDemoTitle.textContent = scenarioLabels[index];
    }

    // ── Ícones SVG por tipo ──────────────────────────────────────────────────
    function getIconSvg(type) {
      const icons = {
        'id-card':    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M7 17h10"/><path d="M10 4V2h4v2"/>',
        'anchor':     '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 5a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"/>',
        'hotel':      '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="6" cy="11" r="2"/>',
        'ship':       '<path d="M3 17l2.5-6h13L21 17"/><path d="M21 17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2"/><path d="M12 3v8"/><path d="M8 9h8"/>',
        'star':       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        'run':        '<path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m7 21 3-6 2-3 3 2 4 1"/><path d="m8 8 4-1 3 3"/><path d="m10 15-3-2-3 3"/>',
        'graduation': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
        'bar-chart':  '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
        'play':       '<polygon points="5 3 19 12 5 21 5 3"/>',
        'history':    '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
        'building':   '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      };
      return icons[type] || icons['anchor'];
    }

    // ── Renderizar resultados dinamicamente ───────────────────────────────────
    function renderResults(scenario) {
      appResultsCard.innerHTML = '';
      scenario.results.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'app-result-row' + (item.interactive ? ' is-interactive-target' : '');
        if (item.interactive) {
          row.id = 'app-first-result';
          row.setAttribute('tabindex', '0');
          row.setAttribute('role', 'button');
          row.setAttribute('aria-label', 'Abrir detalhes');
        }
        const subOrBadge = item.badge
          ? `<span class="app-result-badge">${item.badge}</span>`
          : `<span class="app-result-sub">${item.sub}</span>`;
        row.innerHTML = `
          <div class="app-result-icon bg-${item.bg}">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIconSvg(item.icon)}</svg>
          </div>
          <div class="app-result-content">
            <strong class="app-result-title">${item.title}</strong>
            ${subOrBadge}
          </div>
          <svg class="app-result-chevron" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          ${item.interactive ? '<span class="app-tap-indicator"></span>' : ''}
        `;
        if (item.interactive) {
          row.addEventListener('click', () => {
            holdDemo();
            openBottomSheet();
          });
          row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              row.click();
            }
          });
        }
        appResultsCard.appendChild(row);
      });
    }

    // ── Renderizar conteúdo do Bottom Sheet dinamicamente ─────────────────────
    function renderSheet(scenario) {
      if (!appSheetScrollable) return;
      const s = scenario.sheet;
      const tpl = s.template || 'service';
      appBottomSheet.classList.toggle('is-corrida-page', tpl === 'corrida');
      appSheetScrollable.scrollTop = 0;

      if (tpl === 'concurso') {
        const docs = s.documentos.map(d => `
          <div class="app-doc-row">
            <span class="app-doc-date">${d.data}</span>
            <span class="app-doc-name">${d.nome}</span>
            <span class="app-doc-dl">⬇</span>
          </div>`).join('');
        appSheetScrollable.innerHTML = `
          <div class="app-concurso-header">
            <span class="app-concurso-status">● CONCURSO ATIVO</span>
            <h3 class="app-concurso-title">${s.title}</h3>
          </div>
          <div class="app-stats-grid">
            <div class="app-stat-cell">
              <span class="app-stat-label">VAGAS</span>
              <span class="app-stat-val gold">${s.vagas}</span>
            </div>
            <div class="app-stat-cell">
              <span class="app-stat-label">TAXA</span>
              <span class="app-stat-val">${s.taxa}</span>
            </div>
            <div class="app-stat-cell">
              <span class="app-stat-label">GRADUAÇÃO/POSTO</span>
              <span class="app-stat-val sm">${s.posto}</span>
            </div>
            <div class="app-stat-cell">
              <span class="app-stat-label">PROVA ESCRITA</span>
              <span class="app-stat-val sm">${s.prova}</span>
            </div>
          </div>
          <div class="app-cronograma">
            <h4>CRONOGRAMA DE INSCRIÇÕES</h4>
            <div class="app-crono-row">
              <div><span class="app-crono-label">Abertura</span><span class="app-crono-val">${s.abertura}</span></div>
              <div class="app-crono-line"></div>
              <div><span class="app-crono-label">Encerramento</span><span class="app-crono-val orange">${s.encerramento}</span></div>
            </div>
            <p class="app-crono-local">📍 Local de Inscrição: ${s.local}</p>
          </div>
          <div class="app-atencao-box">
            <span class="app-atencao-icon">⚠</span>
            <div><strong>OBSERVAÇÃO / ATENÇÃO</strong><p>${s.atencao}</p></div>
          </div>
          <button class="app-btn-primary">🔔 ACOMPANHAR CONCURSO</button>
          <div class="app-btn-row">
            <button class="app-btn-sec">👤 Área do Candidato</button>
            <button class="app-btn-sec">🧾 Comprovante</button>
          </div>
          <h4 class="app-docs-title">DOCUMENTOS E COMUNICADOS</h4>
          <div class="app-docs-list">${docs}</div>
        `;
        return;
      }

      if (tpl === 'corrida') {
        const r = s.recordes;
        const d = s.desafio;
        const trophy = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 4h-3V2H8v2H5a2 2 0 0 0-2 2v2a5 5 0 0 0 5 5h.09A6 6 0 0 0 11 15.91V19H7v2h10v-2h-4v-3.09A6 6 0 0 0 15.91 13H16a5 5 0 0 0 5-5V6a2 2 0 0 0-2-2ZM5 8V6h3v5a3 3 0 0 1-3-3Zm14 0a3 3 0 0 1-3 3V6h3v2Z"/></svg>';
        const runner = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.49 5.48a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.89 19.38 10.89 15l2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2a5.3 5.3 0 0 1-4.6-2.6l-1-1.6a2 2 0 0 0-1.7-.9c-.3 0-.5.1-.8.1L6 8.1V13h2V9.4l1.8-.7-1.6 8.1-4.9-1 .4 2 6.19 1.58Z"/></svg>';
        const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>';
        const school = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 11 6-11 6L1 9l11-6ZM5 13v5l7 4 7-4v-5l-7 4-7-4Zm16-2v7h2v-8l-2 1Z"/></svg>';
        appSheetScrollable.innerHTML = `
          <div class="run-dashboard">
          <div class="run-status" aria-hidden="true"><b>18:53</b><span class="run-status-icons"><svg class="run-signal" viewBox="0 0 24 18" fill="currentColor"><rect x="0" y="12" width="4" height="6" rx="1.5"/><rect x="6" y="8" width="4" height="10" rx="1.5"/><rect x="12" y="4" width="4" height="14" rx="1.5"/><rect x="18" y="0" width="4" height="18" rx="1.5"/></svg>4G <span class="run-battery">56ϟ</span></span></div>
          <div class="app-corrida-header">
            <button type="button" class="run-back" aria-label="Voltar à busca de corrida"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>
            <div class="app-corrida-icon">${runner}</div>
            <div>
              <h3 class="app-corrida-title">CORRIDA</h3>
              <span class="app-corrida-sub">REGISTRO DE TREINOS</span>
            </div>
          </div>
          <div class="app-section-header">
            <h4><svg class="run-flag" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3h8l1 2h6v13h-8l-1-2H6v6H3V5a2 2 0 0 1 2-2Z"/></svg> DESAFIOS</h4>
            <span class="app-rankings-btn">${trophy} RANKINGS</span>
          </div>
          <div class="run-challenges">
          <div class="app-desafio-card">
            <div class="app-desafio-meta">
              <span class="app-desafio-tag">TEMPO MÁXIMO<br><b>${d.tempo}</b></span>
              <span class="app-desafio-tag right">DISTÂNCIA<br><b>${d.distancia}</b></span>
            </div>
            <div class="app-desafio-body">
              <p class="app-desafio-sub">${d.subtitulo}</p>
              <span class="app-desafio-cta">TOQUE PARA INICIAR</span>
            </div>
            <span class="run-challenge-arrow" aria-hidden="true">${arrow}</span>
          </div>
          <div class="run-next-challenge" aria-hidden="true"><span class="app-desafio-tag">TEMPO MÁXIMO<br><b>15m00s</b></span><div class="app-desafio-body"><p class="app-desafio-sub">TESTE FÍSICO DOS<br>FUZILEIROS NAVAIS</p><span class="app-desafio-cta">TOQUE PARA INICIAR</span></div></div>
          </div>
          <div class="run-pagination" aria-hidden="true"><i></i><i></i><i></i></div>
          <h4 class="app-section-title">${trophy} RECORDES</h4>
          <div class="app-recordes-grid">
            <div class="app-recorde-item"><span class="app-recorde-val">${r.distancia}</span><span class="app-recorde-label">MAIOR DISTÂNCIA</span></div>
            <div class="app-recorde-item"><span class="app-recorde-val">${r.corridas}</span><span class="app-recorde-label">CORRIDAS</span></div>
            <div class="app-recorde-item"><span class="app-recorde-val">${r.pace}</span><span class="app-recorde-label">MELHOR PACE</span></div>
          </div>
          <div class="app-orientacao-card">
            <div class="app-orientacao-icon">${school}</div>
            <div>
              <span class="app-orientacao-eyebrow">ORIENTAÇÃO PARA O TREINO</span>
              <strong>Aprimore sua técnica</strong>
              <p>Antes da próxima corrida, conheça os conteúdos do CEFAN Treina+ sobre exercícios e preparo físico.</p>
              <span class="app-orientacao-link">ABRIR O CEFAN TREINA+ ${arrow}</span>
            </div>
          </div>
          <div class="app-ranking-row">
            <div class="app-ranking-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M3 22v-4c0-6 18-6 18 0v4Z"/></svg></div>
            <div><strong>RANKING INDIVIDUAL</strong><span>Classificação geral dos corredores</span></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div class="app-btn-corrida">${runner} INICIAR CORRIDA</div>
          <div class="run-home-indicator" aria-hidden="true"></div>
          </div>
        `;
        appSheetScrollable.querySelector('.run-back').addEventListener('click', () => {
          holdDemo();
          closeBottomSheet();
        });
        return;
      }

      // template 'service' (padrão)
      const checks = s.checkItems.map(t => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> ${t}</li>`).join('');
      const steps = s.steps.map((t, i) => `<li><span>${i + 1}</span> ${t}</li>`).join('');
      appSheetScrollable.innerHTML = `
        <div class="app-sheet-header">
          <div class="app-sheet-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.iconPath}</svg>
          </div>
          <div>
            <span class="app-sheet-eyebrow">${s.eyebrow}</span>
            <h3 class="app-sheet-title">${s.title}</h3>
          </div>
        </div>
        <p class="app-sheet-lead">${s.lead}</p>
        <div class="app-sheet-block">
          <h4>DETALHES / REQUISITOS</h4>
          <ul class="app-sheet-checklist">${checks}</ul>
        </div>
        <div class="app-sheet-block">
          <h4>PASSO A PASSO</h4>
          <ol class="app-sheet-steps">${steps}</ol>
        </div>
      `;
    }

    // Um único conjunto de temporizadores mantém a sequência automática consistente.
    const smartVisual = document.querySelector('.smart-visual');
    const stageSteps = document.querySelectorAll('[data-smart-step]');
    const allKeys = [...document.querySelectorAll('.smart-visual .ios-key')];
    let currentStage = 1;

    function canRunDemo() {
      return isDemoVisible && !document.hidden && !reducedMotion.matches;
    }

    function clearDemoTimers() {
      demoTimers.forEach(clearTimeout);
      demoTimers.clear();
      allKeys.forEach(key => key.classList.remove('is-pressed'));
      appResultsCard.querySelector('.has-touch')?.classList.remove('has-touch');
    }

    function scheduleDemo(callback, delay) {
      const timer = setTimeout(() => {
        demoTimers.delete(timer);
        if (canRunDemo()) callback();
      }, delay);
      demoTimers.add(timer);
    }

    function setStage(stage) {
      currentStage = stage;
      stageSteps.forEach(step => {
        if (Number(step.dataset.smartStep) === stage) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
    }

    function setResultsPending(pending) {
      appResultsCard.classList.toggle('is-pending', pending);
      appResultsCard.inert = pending;
    }

    function updateDemoStatus() {
      smartVisual.classList.toggle('is-paused', !canRunDemo());
      document.querySelector('[data-smart-status]').textContent = reducedMotion.matches
        ? 'Prévia do aplicativo' : 'Demonstração automática';
    }

    // Cliques e leitura têm oito segundos antes de a sequência retomar sozinha.
    function holdDemo() {
      clearDemoTimers();
      if (currentStage === 0) {
        appSearchQuery.textContent = SCENARIOS[currentScenario].query;
        setResultsPending(false);
        setStage(1);
      }
      scheduleDemo(runDemoCycle, 8000);
    }

    function openBottomSheet() {
      const sc = SCENARIOS[currentScenario];
      renderSheet(sc);
      appBottomSheet.inert = false;
      appBottomSheet.classList.add('is-open');
      setStage(2);
      trackEvent('iphone_demo_open_sheet', { scenario: sc.query });
    }

    function closeBottomSheet(restoreFocus = false) {
      if (restoreFocus && appBottomSheet.contains(document.activeElement)) {
        appResultsCard.querySelector('.is-interactive-target')?.focus({ preventScroll: true });
      }
      appBottomSheet.classList.remove('is-open');
      appBottomSheet.inert = true;
      setStage(1);
    }

    appSheetCloseHandle?.addEventListener('click', () => {
      holdDemo();
      closeBottomSheet(true);
    });
    appBottomSheet.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        holdDemo();
        closeBottomSheet(true);
      }
    });
    iphoneScreen.addEventListener('pointerdown', holdDemo);
    iphoneScreen.addEventListener('keydown', holdDemo);
    appSheetScrollable?.addEventListener('wheel', holdDemo, { passive: true });
    appSheetScrollable?.addEventListener('touchstart', holdDemo, { passive: true });

    appSearchClearBtn?.addEventListener('click', event => {
      event.stopPropagation();
      holdDemo();
      closeBottomSheet();
      appSearchQuery.textContent = '';
      setResultsPending(true);
      setStage(0);
    });

    function showStaticExample() {
      closeBottomSheet();
      appSearchQuery.textContent = SCENARIOS[currentScenario].query;
      renderResults(SCENARIOS[currentScenario]);
      setResultsPending(false);
      setScenarioControlState(currentScenario);
    }

    smartScenarioTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const index = Number(tab.dataset.smartScenario);
        if (!Number.isInteger(index) || !SCENARIOS[index]) return;
        currentScenario = index;
        clearDemoTimers();
        showStaticExample();
        if (canRunDemo()) runDemoCycle();
        if (window.matchMedia('(max-width: 760px)').matches) {
          smartVisual.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        }
        trackEvent('iphone_demo_select_example', { scenario: SCENARIOS[index].query });
      });
    });

    function runDemoCycle() {
      clearDemoTimers();
      if (!canRunDemo()) return;
      closeBottomSheet();
      appSearchQuery.textContent = '';
      const scenario = SCENARIOS[currentScenario];
      setScenarioControlState(currentScenario);
      renderResults(scenario);
      setResultsPending(true);
      setStage(0);

      const query = [...scenario.query];
      query.forEach((char, index) => {
        scheduleDemo(() => {
          appSearchQuery.textContent = query.slice(0, index + 1).join('');
          const key = allKeys.find(item => item.dataset.key === char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
          if (key) {
            key.classList.add('is-pressed');
            scheduleDemo(() => key.classList.remove('is-pressed'), 100);
          }
        }, 600 + index * 155);
      });
      const resultsAt = 1000 + query.length * 155;
      scheduleDemo(() => {
        setResultsPending(false);
        setStage(1);
      }, resultsAt);
      scheduleDemo(() => {
        appResultsCard.querySelector('.is-interactive-target')?.classList.add('has-touch');
      }, resultsAt + 2400);
      scheduleDemo(openBottomSheet, resultsAt + 3000);
      scheduleDemo(() => closeBottomSheet(), resultsAt + 9500);
      scheduleDemo(() => {
        currentScenario = (currentScenario + 1) % SCENARIOS.length;
        runDemoCycle();
      }, resultsAt + 10300);
    }

    function syncDemo() {
      clearDemoTimers();
      updateDemoStatus();
      if (reducedMotion.matches) showStaticExample();
      else if (canRunDemo()) runDemoCycle();
    }

    showStaticExample();
    if ('IntersectionObserver' in window) {
      const demoObserver = new IntersectionObserver(([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= .25;
        if (visible === isDemoVisible) return;
        isDemoVisible = visible;
        syncDemo();
      }, { threshold: .25 });
      demoObserver.observe(iphoneScreen);
    } else isDemoVisible = true;
    document.addEventListener('visibilitychange', syncDemo);
    reducedMotion.addEventListener('change', syncDemo);
    syncDemo();
  }

  // Rotação e conteúdo interativo de Qualidade de Vida (Hidratação, Corrida, Ciclismo)
  const wellness = document.querySelector('.wellness-devices');
  if (wellness) {
    const phones = [...wellness.querySelectorAll('[data-wellness-phone]')];
    const choices = [...document.querySelectorAll('[data-wellness-select]')];
    let active = 0;
    let elapsed = 0;
    let tick = 0;
    let visible = false;
    let timer;
    let manualSelection = false;
    let rideSimulationSeconds = 0;
    let rideSeconds = 0;
    let rideDistance = 0;
    let rideSpeed = 0;
    const cycleSpeed = wellness.querySelector('[data-cycle-speed]');
    const cycleDistance = wellness.querySelector('[data-cycle-distance]');
    const cycleTime = wellness.querySelector('[data-cycle-time]');
    const cycleNeedle = wellness.querySelector('[data-cycle-needle]');
    const cycleArc = wellness.querySelector('[data-cycle-arc]');
    const cycleTicks = [...wellness.querySelectorAll('[data-cycle-tick]')];

    function select(index) {
      active = index;
      elapsed = 0;
      phones.forEach(phone => {
        const phoneIdx = Number(phone.dataset.wellnessPhone);
        if (phoneIdx === active) {
          phone.dataset.position = 'center';
        } else if (phoneIdx === (active + 1) % 3) {
          phone.dataset.position = 'right';
        } else {
          phone.dataset.position = 'left';
        }
      });
      choices.forEach(choice => {
        const choiceIdx = Number(choice.dataset.wellnessSelect);
        const isSelected = choiceIdx === active;
        choice.setAttribute('aria-pressed', String(isSelected));
        choice.setAttribute('aria-selected', String(isSelected));
      });
    }

    function animateContent(deltaSeconds) {
      tick++;
      const volume = 1000 + Math.floor((tick % 32) / 8) * 250;
      const percent = Math.round((volume / 2608) * 100);
      const volEl = wellness.querySelector('.hydration-volume');
      const pctEl = wellness.querySelector('.hydration-percent');
      const lvlEl = wellness.querySelector('.hydration-level');
      const descEl = wellness.querySelector('#hydration-preview-description');
      if (volEl) volEl.textContent = volume;
      if (pctEl) pctEl.textContent = percent + '%';
      if (lvlEl) lvlEl.setAttribute('transform', 'translate(240 ' + (-(percent - 38) * 5.6) + ')');
      if (descEl) descEl.textContent = 'Demonstração ilustrativa: ' + volume + ' de 2608 ml, ' + percent + '% da meta.';
      if (active === 2) {
        rideSimulationSeconds += deltaSeconds;
        const nextSpeed = (1 - Math.exp(-rideSimulationSeconds / 8)) * (21 + Math.sin(rideSimulationSeconds / 9) * 3 + Math.sin(rideSimulationSeconds / 23));
        // No app o relógio só avança em movimento (> 0,5 km/h).
        if (nextSpeed > .5) rideSeconds += deltaSeconds;
        // Integra km/h pelo tempo real, preservando a distância entre seleções.
        rideDistance += (rideSpeed + nextSpeed) / 2 * deltaSeconds / 3600;
        rideSpeed = nextSpeed;
        if (cycleSpeed) cycleSpeed.textContent = rideSpeed.toFixed(1);
        if (cycleDistance) cycleDistance.textContent = rideDistance.toFixed(2);
        const seconds = Math.floor(rideSeconds);
        const hours = Math.floor(seconds / 3600);
        if (cycleTime) cycleTime.textContent = (hours ? String(hours).padStart(2, '0') + ':' : '') + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
        // Mesmas faixas do _buildCyclingSpeedometer: 0–20, 20–40, etc.
        const rangeStart = Math.max(0, Math.min(9, Math.floor((Math.min(rideSpeed, 200) - .000001) / 20))) * 20;
        const progress = Math.max(0, Math.min(1, (rideSpeed - rangeStart) / 20));
        cycleTicks.forEach(label => { label.textContent = rangeStart + Number(label.dataset.cycleTick); });
        if (cycleNeedle) cycleNeedle.setAttribute('transform', 'rotate(' + (progress * 240).toFixed(2) + ' 450 470)');
        if (cycleArc) cycleArc.setAttribute('stroke-dasharray', (progress * 100).toFixed(2) + ' 100');
      }
    }

    function sync() {
      clearInterval(timer);
      const playing = visible && !document.hidden && !reducedMotion.matches;
      wellness.classList.toggle('is-demo-playing', playing);
      wellness.querySelector('.phone-hydration')?.classList.toggle('is-water-playing', playing);
      if (playing) {
        let previousTime = performance.now();
        timer = setInterval(() => {
          const now = performance.now();
          const deltaSeconds = Math.min((now - previousTime) / 1000, 2);
          previousTime = now;
          animateContent(deltaSeconds);
          elapsed++;
          if (!manualSelection && elapsed >= 7) select((active + 1) % 3);
        }, 1000);
      }
    }

    // Clique nas pílulas / botões de seleção
    choices.forEach((choice) => {
      choice.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = Number(choice.dataset.wellnessSelect);
        if (!isNaN(idx)) {
          manualSelection = true;
          select(idx);
          sync();
        }
      });
    });

    // Clique direto nos próprios mockups de smartphone
    phones.forEach((phone) => {
      phone.addEventListener('click', () => {
        const phoneIdx = Number(phone.dataset.wellnessPhone);
        if (!isNaN(phoneIdx) && phoneIdx !== active) {
          manualSelection = true;
          select(phoneIdx);
          sync();
        }
      });
    });

    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }, { threshold: 0.1 }).observe(wellness);
    } else {
      visible = true;
      sync();
    }

    select(0);
    sync();
  }

  /* ── Patrimônio Naval 3D Stage & Interactive Tabs ── */
  const heritageSection = document.getElementById('patrimonio');
  if (heritageSection) {
    const heritageTabs = heritageSection.querySelectorAll('[data-heritage-tab]');
    const heritagePhones = heritageSection.querySelectorAll('[data-heritage-phone]');
    let activeHeritage = 0;
    let heritageTimer = null;
    let heritageVisible = false;

    function selectHeritage(index) {
      activeHeritage = index;
      heritageTabs.forEach((tab, i) => {
        const isActive = i === index;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      heritagePhones.forEach((phone) => {
        const phoneIdx = Number(phone.dataset.heritagePhone);
        if (phoneIdx === index) {
          phone.dataset.heritagePos = 'center';
        } else if (phoneIdx === (index + 1) % 3) {
          phone.dataset.heritagePos = 'right';
        } else {
          phone.dataset.heritagePos = 'left';
        }
      });
    }

    heritageTabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        selectHeritage(index);
        resetHeritageAuto();
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectHeritage(index);
          resetHeritageAuto();
        }
      });
    });

    heritagePhones.forEach((phone) => {
      phone.addEventListener('click', () => {
        const phoneIdx = Number(phone.dataset.heritagePhone);
        if (!isNaN(phoneIdx) && phoneIdx !== activeHeritage) {
          selectHeritage(phoneIdx);
          resetHeritageAuto();
        }
      });
    });

    function resetHeritageAuto() {
      clearInterval(heritageTimer);
      if (heritageVisible && !document.hidden && !reducedMotion.matches) {
        heritageTimer = setInterval(() => {
          selectHeritage((activeHeritage + 1) % 3);
        }, 6000);
      }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heritageVisible = entry.isIntersecting;
        resetHeritageAuto();
      }, { threshold: 0.15 }).observe(heritageSection);
    }

    document.addEventListener('visibilitychange', resetHeritageAuto);
    reducedMotion.addEventListener('change', resetHeritageAuto);

    selectHeritage(0);
  }

  /* ── Notícias e alertas: prévia automática e seleção manual ── */
  const newsSection = document.querySelector('.news-section#noticias');
  if (newsSection) {
    const notification = newsSection.querySelector('.news-notification');
    const newsChoices = [...newsSection.querySelectorAll('[data-news-select]')];
    const newsDots = [...newsSection.querySelectorAll('[data-news-dot]')];
    const newsCount = newsSection.querySelector('[data-news-count]');
    const newsAnnouncement = newsSection.querySelector('[data-news-announcement]');
    const newsExamples = [
      {
        kind: 'news',
        source: 'Agência Marinha',
        headline: 'Uma nova reportagem para você',
        message: 'Amazônia Azul, ciência e Defesa Naval direto da fonte.'
      },
      {
        kind: 'weather',
        source: 'Alertas meteorológicos',
        headline: 'Condições do tempo no seu dia',
        message: 'Consulte umidade, temperatura, probabilidade de chuva e visibilidade.'
      },
      {
        kind: 'payment',
        source: 'Bilhete de Pagamento · PAPEM',
        headline: 'Seu bilhete de pagamento no app',
        message: 'Acompanhe os avisos de disponibilidade do BP Online.'
      }
    ];
    let activeNews = 0;
    let newsVisible = false;
    let newsTimer;
    let newsAnimation;

    function selectNews(index, manual = false, animate = true) {
      const example = newsExamples[index];
      if (!example) return;
      activeNews = index;
      newsAnimation?.cancel();
      if (notification) {
        notification.dataset.kind = example.kind;
        ['source', 'headline', 'message'].forEach((field) => {
          const element = notification.querySelector(`[data-news-${field}]`);
          if (element) element.textContent = example[field];
        });
        if (animate && !reducedMotion.matches && notification.animate) {
          newsAnimation = notification.animate([
            { opacity: .3, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 280, easing: 'ease-out' });
        }
      }
      newsChoices.forEach((choice) => {
        const selected = choice.dataset.newsSelect === example.kind;
        choice.setAttribute('aria-pressed', String(selected));
        choice.classList.toggle('is-active', selected);
      });
      newsDots.forEach((dot) => {
        dot.classList.toggle('is-active', dot.dataset.newsDot === example.kind);
      });
      if (newsCount) newsCount.textContent = `${String(index + 1).padStart(2, '0')} / 03`;
      if (manual && newsAnnouncement) {
        newsAnnouncement.textContent = `Exemplo de notificação. ${example.source}. ${example.headline}. ${example.message}`;
      }
    }

    function syncNewsDemo() {
      clearInterval(newsTimer);
      const playing = newsVisible && !document.hidden && !reducedMotion.matches;
      newsSection.classList.toggle('is-demo-playing', playing);
      if (!playing) newsAnimation?.cancel();
      if (playing) {
        newsTimer = setInterval(() => {
          selectNews((activeNews + 1) % newsExamples.length);
        }, 6000);
      }
    }

    newsChoices.forEach((choice) => {
      choice.addEventListener('click', (event) => {
        const index = newsExamples.findIndex((example) => example.kind === choice.dataset.newsSelect);
        if (index < 0) return;
        selectNews(index, true);
        syncNewsDemo();
        if (event.detail > 0 && window.matchMedia('(max-width: 760px)').matches) {
          newsSection.querySelector('.news-showcase')?.scrollIntoView({
            behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start'
          });
        }
      });
    });

    selectNews(0, false, false);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= .25;
        if (visible === newsVisible) return;
        newsVisible = visible;
        syncNewsDemo();
      }, { threshold: .25 }).observe(newsSection);
    } else {
      newsVisible = true;
    }
    document.addEventListener('visibilitychange', syncNewsDemo);
    reducedMotion.addEventListener('change', syncNewsDemo);
    syncNewsDemo();
  }

  /* ── Back to Top ── */
  document.querySelector('[data-back-to-top]')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  reducedMotion.addEventListener('change', requestRender);
  renderScroll();
});
