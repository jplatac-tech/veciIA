(function () {
  'use strict';

  const NAV = [
    { id: 'index', href: 'index.html', label: 'Inicio' },
    { id: 'plataforma', href: 'plataforma.html', label: 'Plataforma' },
    { id: 'mapa', href: 'mapa.html', label: 'Mapa' },
    { id: 'comunidad', href: 'comunidad.html', label: 'Comunidad' },
  ];

  function logoSvg(size, uid) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="veciia-grad-${uid}" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#2ecc71"/>
          <stop offset="1" stop-color="#1e8449"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#veciia-grad-${uid})"/>
      <circle cx="10.5" cy="22.5" r="1.6" fill="white" opacity="0.65"/>
      <circle cx="16" cy="24.5" r="1.8" fill="white" opacity="0.85"/>
      <circle cx="21.5" cy="22.5" r="1.6" fill="white" opacity="0.65"/>
      <path d="M16 7.8c-3.09 0-5.6 2.51-5.6 5.6 0 3.95 5.6 8.85 5.6 8.85s5.6-4.9 5.6-8.85c0-3.09-2.51-5.6-5.6-5.6z" fill="white"/>
      <circle cx="16" cy="13.2" r="2.35" fill="#ff5a43"/>
      <path d="M24.2 7.8l.85 1.72 1.9.28-1.38 1.34.32 1.9-1.69-.88-1.69.88.32-1.9-1.38-1.34 1.9-.28.85-1.72z" fill="white" opacity="0.92"/>
    </svg>`;
  }

  const LOGO_MARK = logoSvg(32, 'h');
  const LOGO_MARK_SM = logoSvg(24, 'f');

  const currentPage = document.body.dataset.page || 'index';

  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;

    const links = NAV.map((item) =>
      `<a href="${item.href}" class="nav-link${item.id === currentPage ? ' active' : ''}">${item.label}</a>`
    ).join('');

    el.innerHTML = `
      <div class="nav-overlay" aria-hidden="true"></div>
      <header class="header">
        <div class="header-inner">
          <a href="index.html" class="logo">
            <span class="logo-icon">${LOGO_MARK}</span>
            <span class="logo-text">Veci<span class="logo-ia">IA</span></span>
          </a>
          <nav class="nav" aria-label="Navegación principal">
            <div class="nav-drawer-head">
              <span class="nav-drawer-brand">${LOGO_MARK_SM}<span>Veci<span class="logo-ia">IA</span></span></span>
              <p class="nav-drawer-tagline">Problemas de barrio, soluciones en comunidad</p>
            </div>
            <div class="nav-links-group">${links}</div>
            <div class="nav-drawer-foot">
              <a href="#" class="nav-link nav-mobile-only sign-in-nav">Iniciar sesión</a>
              <a href="mapa.html#reportar" class="nav-link nav-mobile-only nav-report-mobile js-report">Reportar problema</a>
            </div>
          </nav>
          <div class="header-actions">
            <div class="user-menu" id="user-menu" style="display:none">
              <button class="user-btn" id="user-btn" aria-haspopup="true" aria-label="Menú de usuario">
                <span class="user-avatar" id="user-avatar">V</span>
                <span class="user-info">
                  <strong id="user-name">Vecino</strong>
                  <small id="user-barrio">Cartagena</small>
                </span>
              </button>
              <div class="user-dropdown" id="user-dropdown">
                <div class="dropdown-impact">
                  <span>Índice de impacto</span>
                  <strong id="user-impact">0</strong>
                  <small id="user-level">🥉 Colaborador</small>
                </div>
                <button id="btn-logout">Cerrar sesión</button>
              </div>
            </div>
            <a href="#" class="sign-in">Iniciar sesión</a>
            <a href="mapa.html#reportar" class="header-cta js-report" id="btn-reportar" aria-label="Reportar un problema">
              <span class="header-cta-icon" aria-hidden="true">📍</span>
              <span class="header-cta-label">Reportar</span>
            </a>
            <button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>`;
  }

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;

    el.innerHTML = `
      <footer class="footer">
        <div class="footer-inner">
          <a href="index.html" class="logo">
            <span class="logo-icon">${LOGO_MARK_SM}</span>
            <span class="logo-text">Veci<span class="logo-ia">IA</span></span>
          </a>
          <nav class="footer-nav" aria-label="Enlaces del pie">
            ${NAV.map((item) => `<a href="${item.href}">${item.label}</a>`).join('')}
            <a href="mapa.html#reportar" class="footer-report js-report">Reportar</a>
          </nav>
          <p>© 2026 VeciIA – los Problemas de Barrio. Todos los derechos reservados.</p>
        </div>
      </footer>`;
  }

  function renderAuth() {
    const el = document.getElementById('site-auth');
    if (!el) return;

    el.innerHTML = `
      <div class="auth-modal" id="auth-modal" role="dialog" aria-labelledby="auth-title" aria-hidden="true">
        <div class="modal-content auth-content">
          <button class="modal-close auth-close" aria-label="Cerrar">&times;</button>
          <div class="modal-body">
            <div class="modal-icon">🏘️</div>
            <h3 id="auth-title">Iniciar sesión</h3>
            <p class="auth-subtitle">Únete a la red de solución comunitaria de Cartagena</p>
            <form id="auth-form" class="auth-form">
              <div class="form-field" id="field-name" style="display:none">
                <label for="auth-name">Nombre completo</label>
                <input type="text" id="auth-name" name="name" placeholder="Tu nombre" autocomplete="name">
              </div>
              <div class="form-field" id="field-barrio" style="display:none">
                <label for="auth-barrio">Barrio</label>
                <select id="auth-barrio" name="barrio">
                  <option value="">Selecciona tu barrio</option>
                  <option value="Centro Histórico">Centro Histórico</option>
                  <option value="Getsemaní">Getsemaní</option>
                  <option value="Bocagrande">Bocagrande</option>
                  <option value="Manga">Manga</option>
                  <option value="Crespo">Crespo</option>
                  <option value="San Francisco">San Francisco</option>
                  <option value="La Popa">La Popa</option>
                  <option value="Olaya Herrera">Olaya Herrera</option>
                  <option value="San Diego">San Diego</option>
                  <option value="Chambacú">Chambacú</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div class="form-field">
                <label for="auth-email">Correo electrónico</label>
                <input type="email" id="auth-email" name="email" placeholder="tu@correo.com" required autocomplete="email">
              </div>
              <div class="form-field">
                <label for="auth-password">Contraseña</label>
                <input type="password" id="auth-password" name="password" placeholder="Mínimo 4 caracteres" required autocomplete="current-password">
              </div>
              <p id="auth-error" class="form-error" role="alert"></p>
              <button type="submit" class="btn-primary btn-block" id="auth-submit">Entrar</button>
            </form>
            <p class="auth-switch" id="auth-switch"></p>
          </div>
        </div>
      </div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  }

  renderHeader();
  renderFooter();
  renderAuth();

  const fab = document.createElement('a');
  fab.href = 'mapa.html#reportar';
  fab.className = 'fab-report js-report';
  fab.id = 'fab-reportar';
  fab.setAttribute('aria-label', 'Reportar un problema');
  fab.innerHTML = '<span class="fab-report-icon" aria-hidden="true">📍</span><span class="fab-report-label">Reportar</span>';
  document.body.appendChild(fab);
})();
