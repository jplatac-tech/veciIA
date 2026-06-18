(function () {
  'use strict';

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  /* ── Points UI ── */
  const CONFETTI_COLORS = ['#2ecc71', '#ff5a43', '#f1c40f', '#3498db', '#9b59b6', '#e67e22'];

  function animateCounter(el, from, to, duration = 600) {
    if (!el || from === to) {
      if (el) {
        el.textContent = (to ?? 0).toLocaleString('es-CO');
        el.dataset.value = String(to ?? 0);
      }
      return;
    }
    const start = performance.now();
    const diff = to - from;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + diff * eased);
      el.textContent = val.toLocaleString('es-CO');
      if (t < 1) requestAnimationFrame(tick);
      else el.dataset.value = String(to);
    }
    requestAnimationFrame(tick);
  }

  function pulsePointsElements() {
    document.querySelectorAll('#user-impact, #cuenta-points, .cuenta-points-value').forEach((el) => {
      el.classList.remove('points-pulse');
      void el.offsetWidth;
      el.classList.add('points-pulse');
    });
    document.querySelector('.cuenta-points-box')?.classList.add('points-box-glow');
    setTimeout(() => document.querySelector('.cuenta-points-box')?.classList.remove('points-box-glow'), 900);
  }

  function showPointsToast({ type, amount, reason, total }) {
    const stack = document.getElementById('points-toast-stack');
    if (!stack) return;

    const isEarn = type === 'earn';
    const el = document.createElement('div');
    el.className = `points-toast points-toast--${type}`;
    el.innerHTML = `
      <span class="points-toast-badge" aria-hidden="true">${isEarn ? '⭐' : '🎁'}</span>
      <div class="points-toast-body">
        <strong class="points-toast-amount">${isEarn ? '+' : '−'}${amount} pts</strong>
        <span class="points-toast-reason">${reason}</span>
        <small class="points-toast-total">Saldo: ${total.toLocaleString('es-CO')} pts</small>
      </div>
      <div class="points-toast-bar" aria-hidden="true"></div>`;

    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 450);
    }, 4800);
  }

  function spawnConfetti(container) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.style.setProperty('--x', `${10 + Math.random() * 80}%`);
      p.style.setProperty('--delay', `${Math.random() * 0.45}s`);
      p.style.setProperty('--dur', `${1.2 + Math.random() * 0.8}s`);
      p.style.setProperty('--color', CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      p.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
      container.appendChild(p);
    }
  }

  function showRedeemCelebration({ offer, redemption, total }) {
    window.VeciIALayout?.ensureOverlays?.();
    const modal = document.getElementById('redeem-celebration');
    if (!modal || !offer || !redemption) return;

    document.getElementById('redeem-prize-icon').textContent = offer.icon || '🎁';
    document.getElementById('redeem-prize-title').textContent = offer.title;
    document.getElementById('redeem-prize-code').textContent = redemption.code;
    document.getElementById('redeem-spent').textContent = `Canjeaste ${offer.cost.toLocaleString('es-CO')} puntos en ${offer.sponsor}`;
    document.getElementById('redeem-balance').textContent = `Te quedan ${total.toLocaleString('es-CO')} pts disponibles`;

    spawnConfetti(document.getElementById('redeem-confetti'));

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('redeem-open');
  }

  function closeRedeemCelebration() {
    const modal = document.getElementById('redeem-celebration');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('redeem-open');
  }

  function handlePointsEvent(payload) {
    showPointsToast(payload);
    pulsePointsElements();

    document.querySelectorAll('#user-impact, #cuenta-points, .cuenta-points-value').forEach((el) => {
      const prev = parseInt(el.dataset.value || el.textContent.replace(/\D/g, ''), 10) || 0;
      animateCounter(el, prev, payload.total);
    });

    if (payload.type === 'spend' && payload.redemption && payload.offer) {
      setTimeout(() => showRedeemCelebration(payload), 350);
    }
  }

  function renderConnectedEntities(user) {
    const panel = document.getElementById('connected-entities-panel');
    const list = document.getElementById('connected-entities-list');
    if (!panel || !list || typeof VeciIA === 'undefined') return;

    if (!user) {
      panel.hidden = true;
      list.innerHTML = '';
      return;
    }

    const entities = VeciIA.CONNECTED_ENTITIES || [];
    list.innerHTML = entities.map((e) => `
      <div class="entity-chip" role="listitem">
        <span class="entity-chip-icon" aria-hidden="true">${e.icon}</span>
        <div class="entity-chip-body">
          <strong>${e.name}</strong>
          <span>${e.type} · ${e.barrio}</span>
        </div>
        <span class="entity-chip-status" aria-label="Conectado">● Conectado</span>
      </div>
    `).join('');

    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('visible'));
  }

  function bindPointsEvents() {
    document.getElementById('redeem-celebration-close')?.addEventListener('click', closeRedeemCelebration);
    document.querySelector('.redeem-celebration-backdrop')?.addEventListener('click', closeRedeemCelebration);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeRedeemCelebration();
    });

    if (typeof VeciIA !== 'undefined') {
      VeciIA.on('points', handlePointsEvent);
    }
  }

  /* ── Auth UI ── */
  let authModal, authForm, authTitle, authSwitch, authError;
  let authMode = 'login';

  function getAuthEls() {
    authModal = document.getElementById('auth-modal');
    authForm = document.getElementById('auth-form');
    authTitle = document.getElementById('auth-title');
    authSwitch = document.getElementById('auth-switch');
    authError = document.getElementById('auth-error');
  }

  function openAuth(mode) {
    window.VeciIALayout?.ensureOverlays?.();
    authMode = mode || 'login';
    getAuthEls();
    if (!authModal) return;
    authModal.classList.add('open');
    document.body.classList.add('menu-open');
    authModal.setAttribute('aria-hidden', 'false');
    updateAuthForm();
    if (authError) authError.textContent = '';
    authForm?.reset();
  }

  function closeAuth() {
    getAuthEls();
    authModal?.classList.remove('open');
    document.body.classList.remove('menu-open');
    authModal?.setAttribute('aria-hidden', 'true');
  }

  function updateAuthForm() {
    const isRegister = authMode === 'register';
    if (authTitle) authTitle.textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
    const nameField = document.getElementById('field-name');
    const barrioField = document.getElementById('field-barrio');
    const phoneField = document.getElementById('field-phone');
    if (nameField) nameField.style.display = isRegister ? 'block' : 'none';
    if (barrioField) barrioField.style.display = isRegister ? 'block' : 'none';
    if (phoneField) phoneField.style.display = isRegister ? 'block' : 'none';
    const nameInput = document.getElementById('auth-name');
    const barrioInput = document.getElementById('auth-barrio');
    if (nameInput) nameInput.required = isRegister;
    if (barrioInput) barrioInput.required = isRegister;
    const submitBtn = document.getElementById('auth-submit');
    if (submitBtn) submitBtn.textContent = isRegister ? 'Registrarme' : 'Entrar';
    if (authSwitch) {
      authSwitch.innerHTML = isRegister
        ? '¿Ya tienes cuenta? <button type="button" id="switch-login">Inicia sesión</button>'
        : '¿No tienes cuenta? <button type="button" id="switch-register">Regístrate gratis</button>';
      document.getElementById('switch-login')?.addEventListener('click', () => openAuth('login'));
      document.getElementById('switch-register')?.addEventListener('click', () => openAuth('register'));
    }
  }

  function bindAuthEvents() {
    getAuthEls();

    document.querySelectorAll('.sign-in, .sign-in-nav').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.preventDefault(); openAuth('login'); });
    });

    document.querySelector('.auth-close')?.addEventListener('click', closeAuth);
    authModal?.addEventListener('click', (e) => { if (e.target === authModal) closeAuth(); });

    authForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (authError) authError.textContent = '';
      const fd = new FormData(authForm);
      try {
        if (authMode === 'register') {
          VeciIA.register({
            name: fd.get('name'),
            email: fd.get('email'),
            password: fd.get('password'),
            barrio: fd.get('barrio'),
            phone: fd.get('phone'),
          });
          showToast('🎉 ¡Bienvenido a VeciIA!');
        } else {
          VeciIA.login({ email: fd.get('email'), password: fd.get('password') });
          showToast('👋 ¡Hola de nuevo!');
        }
        closeAuth();
        afterAuthSuccess();
      } catch (err) {
        if (authError) authError.textContent = err.message;
      }
    });
  }

  function afterAuthSuccess() {
    if (sessionStorage.getItem('veciia_open_report') || location.hash === '#reportar') {
      sessionStorage.removeItem('veciia_open_report');
      setTimeout(() => VeciIAMap?.focusReportForm(), 300);
    }
  }

  function updateUserUI(user) {
    document.body.classList.toggle('logged-in', !!user);

    const userMenu = document.getElementById('user-menu');
    if (user) {
      if (userMenu) userMenu.style.display = 'flex';

      const firstName = user.name.split(' ')[0];
      const initial = user.name.charAt(0).toUpperCase();

      document.getElementById('user-name') && (document.getElementById('user-name').textContent = firstName);
      document.getElementById('user-barrio') && (document.getElementById('user-barrio').textContent = user.barrio);
      document.getElementById('user-avatar') && (document.getElementById('user-avatar').textContent = initial);

      document.getElementById('sidebar-user-name') && (document.getElementById('sidebar-user-name').textContent = user.name);
      document.getElementById('sidebar-user-barrio') && (document.getElementById('sidebar-user-barrio').textContent = user.barrio);
      document.getElementById('sidebar-avatar') && (document.getElementById('sidebar-avatar').textContent = initial);

      const reports = VeciIA.getReports();
      const score = VeciIA.getUserPoints(user);
      const level = VeciIA.getImpactLevel(VeciIA.calcImpact(user, reports));
      const impactEl = document.getElementById('user-impact');
      if (impactEl) {
        impactEl.dataset.value = String(score);
        impactEl.textContent = score.toLocaleString('es-CO');
      }
      document.getElementById('user-level') && (document.getElementById('user-level').textContent = `${level.icon} ${level.name}`);
      document.querySelectorAll('.impact-score').forEach((el) => { el.textContent = score; });

      renderConnectedEntities(user);

      const phoneInput = document.getElementById('report-phone');
      if (phoneInput && user.phone && !phoneInput.value) phoneInput.value = user.phone;
    } else {
      if (userMenu) userMenu.style.display = 'none';
      renderConnectedEntities(null);
    }
  }

  function bindUserEvents() {
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      VeciIA.logout();
      showToast('Sesión cerrada.');
    });

    document.getElementById('user-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('user-dropdown')?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        document.getElementById('user-dropdown')?.classList.remove('open');
      }
    });
  }

  function bindReportButton() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-report, #btn-reportar, #fab-reportar');
      if (!btn) return;

      const onMap = document.body.dataset.page === 'mapa';

      if (onMap) {
        e.preventDefault();
        if (typeof VeciIA === 'undefined' || !VeciIA.getSessionUser()) {
          sessionStorage.setItem('veciia_open_report', '1');
          openAuth('login');
          return;
        }
        VeciIAMap?.focusReportForm();
        return;
      }

      if (typeof VeciIA !== 'undefined' && !VeciIA.getSessionUser()) {
        e.preventDefault();
        sessionStorage.setItem('veciia_open_report', '1');
        window.location.href = 'mapa.html#reportar';
      }
    });
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-auth]');
    if (trigger) {
      e.preventDefault();
      openAuth(trigger.dataset.openAuth);
    }
  });

  function init() {
    bindUserEvents();
    bindReportButton();

    const bindOverlays = () => {
      window.VeciIALayout?.ensureOverlays?.();
      bindAuthEvents();
      bindPointsEvents();
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(bindOverlays, { timeout: 900 });
    } else {
      setTimeout(bindOverlays, 40);
    }

    if (typeof VeciIA !== 'undefined') {
      updateUserUI(VeciIA.getSessionUser());
      VeciIA.on('auth', ({ user }) => updateUserUI(user));
      VeciIA.on('reports', () => {
        const user = VeciIA.getSessionUser();
        if (user) updateUserUI(user);
      });
    }

    document.querySelectorAll('.example-card[data-example]').forEach((card) => {
      card.addEventListener('click', () => {
        const text = card.dataset.example || '';
        if (typeof VeciIA !== 'undefined' && !VeciIA.getSessionUser()) {
          sessionStorage.setItem('veciia_pending_report', text);
          sessionStorage.setItem('veciia_open_report', '1');
          openAuth('register');
          return;
        }
        sessionStorage.setItem('veciia_pending_report', text);
        sessionStorage.setItem('veciia_open_report', '1');
        window.location.href = 'mapa.html#reportar';
      });
    });

    if (document.body.dataset.page === 'mapa') {
      handleMapPageInit();
    }
  }

  function handleMapPageInit() {
    const pending = sessionStorage.getItem('veciia_pending_report');
    const openReport = sessionStorage.getItem('veciia_open_report') || location.hash === '#reportar';

    if (openReport && VeciIA.getSessionUser()) {
      sessionStorage.removeItem('veciia_open_report');
      setTimeout(() => VeciIAMap?.focusReportForm(), 600);
    } else if (openReport && !VeciIA.getSessionUser()) {
      sessionStorage.setItem('veciia_open_report', '1');
      setTimeout(() => openAuth('login'), 400);
    }

    if (pending) {
      sessionStorage.removeItem('veciia_pending_report');
      const fill = () => {
        const desc = document.getElementById('report-desc');
        if (desc) {
          desc.value = pending;
          desc.dispatchEvent(new Event('input'));
        } else {
          setTimeout(fill, 200);
        }
      };
      setTimeout(fill, 500);
    }

    setTimeout(() => VeciIAMap?.invalidate(), 500);
  }

  init();
  window.VeciIAUI = {
    showToast,
    openAuth,
    showPointsToast,
    showRedeemCelebration,
    animateCounter,
    renderConnectedEntities,
  };
})();
