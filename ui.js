(function () {
  'use strict';

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
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
    if (nameField) nameField.style.display = isRegister ? 'block' : 'none';
    if (barrioField) barrioField.style.display = isRegister ? 'block' : 'none';
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
      const score = VeciIA.calcImpact(user, reports);
      const level = VeciIA.getImpactLevel(score);
      document.getElementById('user-impact') && (document.getElementById('user-impact').textContent = score);
      document.getElementById('user-level') && (document.getElementById('user-level').textContent = `${level.icon} ${level.name}`);
      document.querySelectorAll('.impact-score').forEach((el) => { el.textContent = score; });
    } else {
      if (userMenu) userMenu.style.display = 'none';
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
    bindAuthEvents();
    bindUserEvents();
    bindReportButton();

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
  window.VeciIAUI = { showToast, openAuth };
})();
