(function () {
  'use strict';

  if (typeof VeciIA === 'undefined') return;

  const TYPE_LABELS = {
    report: { label: 'Reporte', class: 'badge-report' },
    resolved: { label: 'Resuelto', class: 'badge-resolved' },
    story: { label: 'Historia', class: 'badge-story' },
  };

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE_SPEED = REDUCED_MOTION ? 22 : 48;

  let allActivities = [];
  let activeFilter = 'all';
  let activeBoardTab = 'open';
  let activityMarquee = null;

  function escapeHtml(str) {
    return VeciIA.escapeHtml(str);
  }

  function showToast(msg) {
    if (window.VeciIAUI?.showToast) VeciIAUI.showToast(msg);
    else alert(msg);
  }

  function scheduleRemeasure(marquee) {
    if (!marquee) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => marquee.remeasure());
    });
  }

  function createMarquee(track, options) {
    if (!track) return null;

    const {
      speed = BASE_SPEED,
      cardSelector,
      gap = 20,
      wrap,
      prevBtn,
      nextBtn,
    } = options;

    let offset = 0;
    let halfWidth = 0;
    let running = false;
    let manualPaused = false;
    let lastTime = null;
    let rafId = null;
    let visible = true;

    function measure() {
      halfWidth = track.scrollWidth / 2;
      if (!halfWidth || Number.isNaN(halfWidth)) halfWidth = 1;
    }

    function normalize() {
      if (!halfWidth) return;
      while (offset > 0) offset -= halfWidth;
      while (Math.abs(offset) >= halfWidth) offset += halfWidth;
    }

    function apply() {
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    }

    function tick(time) {
      if (lastTime == null) lastTime = time;
      const dt = Math.min(time - lastTime, 32);
      lastTime = time;

      if (!manualPaused && visible && !document.hidden && halfWidth > 1) {
        offset -= (speed * dt) / 1000;
        normalize();
      }
      apply();
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      measure();
      running = true;
      lastTime = null;
      rafId = requestAnimationFrame(tick);
    }

    function remeasure() {
      measure();
      normalize();
      apply();
    }

    function nudge(direction) {
      const card = track.querySelector(cardSelector);
      const shift = (card?.offsetWidth || 280) + gap;
      offset += direction * shift;
      normalize();
      apply();
    }

    function pauseBriefly(ms = 600) {
      manualPaused = true;
      clearTimeout(pauseBriefly.timer);
      pauseBriefly.timer = setTimeout(() => {
        manualPaused = false;
      }, ms);
    }

    prevBtn?.addEventListener('click', () => {
      nudge(1);
      pauseBriefly();
    });
    nextBtn?.addEventListener('click', () => {
      nudge(-1);
      pauseBriefly();
    });

    wrap?.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault();
    }, { passive: false });

    if ('IntersectionObserver' in window && wrap) {
      const obs = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      }, { threshold: 0.05 });
      obs.observe(wrap);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) lastTime = null;
    });

    start();

    return { remeasure, nudge, pauseBriefly };
  }

  function buildCompactRow(report) {
    const cat = VeciIA.CATEGORIES[report.category] || VeciIA.CATEGORIES.otro;
    const isResolved = report.status === 'resolved';
    const statusClass = isResolved ? 'is-resolved' : 'is-open';
    const statusLabel = isResolved ? 'Resuelto' : 'Abierto';
    const solverBit = isResolved && report.solverName
      ? ` · ✅ ${escapeHtml(report.solverName)}`
      : '';

    return `
      <article class="community-row ${statusClass}" data-id="${report.id}" role="listitem">
        <div class="community-row-head">
          <span class="community-row-icon" aria-hidden="true">${cat.icon}</span>
          <div class="community-row-text">
            <p class="community-row-title">${escapeHtml(report.description)}</p>
            <p class="community-row-meta">
              <strong>${escapeHtml(report.userName)}</strong> · ${escapeHtml(report.barrio)}${solverBit}
            </p>
          </div>
          <span class="community-row-pill community-row-pill--${isResolved ? 'resolved' : 'open'}">${statusLabel}</span>
        </div>
        ${VeciIA.buildReportActionsHtml(report, 'compact')}
      </article>
    `;
  }

  function renderCommunityCharts() {
    const el = document.getElementById('community-charts');
    if (!el) return;

    const stats = VeciIA.getCommunityCompareStats();
    const openPct = stats.total ? (stats.openCount / stats.total) * 100 : 0;
    const resolvedPct = stats.total ? (stats.resolvedCount / stats.total) * 100 : 0;

    const categoryRows = stats.byCategory.map((c) => {
      const openW = (c.open / stats.maxCategoryTotal) * 100;
      const resW = (c.resolved / stats.maxCategoryTotal) * 100;
      return `
        <div class="chart-compare-row">
          <span class="chart-compare-label">${c.icon} ${escapeHtml(c.label)}</span>
          <div class="chart-compare-track" title="${c.open} abiertos, ${c.resolved} resueltos">
            <div class="chart-compare-bar chart-compare-bar--open" style="width:${openW}%"></div>
            <div class="chart-compare-bar chart-compare-bar--resolved" style="width:${resW}%"></div>
          </div>
          <span class="chart-compare-nums"><span class="num-open">${c.open}</span><span class="num-sep">/</span><span class="num-resolved">${c.resolved}</span></span>
        </div>`;
    }).join('') || '<p class="chart-empty">Sin datos por categoría.</p>';

    const barrioRows = stats.byBarrio.map((b) => {
      const openW = (b.open / stats.maxBarrioTotal) * 100;
      const resW = (b.resolved / stats.maxBarrioTotal) * 100;
      return `
        <div class="chart-compare-row">
          <span class="chart-compare-label">${escapeHtml(b.name)}</span>
          <div class="chart-compare-track" title="${b.open} abiertos, ${b.resolved} resueltos">
            <div class="chart-compare-bar chart-compare-bar--open" style="width:${openW}%"></div>
            <div class="chart-compare-bar chart-compare-bar--resolved" style="width:${resW}%"></div>
          </div>
          <span class="chart-compare-nums"><span class="num-open">${b.open}</span><span class="num-sep">/</span><span class="num-resolved">${b.resolved}</span></span>
        </div>`;
    }).join('') || '<p class="chart-empty">Sin datos por barrio.</p>';

    el.innerHTML = `
      <div class="community-charts-grid">
        <div class="chart-card chart-card--summary">
          <h3 class="chart-card-title">Comparativa general</h3>
          <div class="chart-summary-stats">
            <div class="chart-mini-stat chart-mini-stat--open">
              <strong>${stats.openCount}</strong>
              <span>Abiertos</span>
            </div>
            <div class="chart-mini-stat chart-mini-stat--resolved">
              <strong>${stats.resolvedCount}</strong>
              <span>Resueltos</span>
            </div>
            <div class="chart-mini-stat">
              <strong>${stats.resolutionRate}%</strong>
              <span>Tasa resolución</span>
            </div>
          </div>
          <div class="chart-stack-bar" role="img" aria-label="${stats.openCount} abiertos y ${stats.resolvedCount} resueltos">
            <div class="chart-stack-seg chart-stack-seg--open" style="width:${openPct}%"></div>
            <div class="chart-stack-seg chart-stack-seg--resolved" style="width:${resolvedPct}%"></div>
          </div>
          <div class="chart-legend">
            <span><i class="chart-dot chart-dot--open"></i> Abiertos</span>
            <span><i class="chart-dot chart-dot--resolved"></i> Resueltos</span>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-card-title">Por categoría <small>A/R</small></h3>
          <div class="chart-compare-list">${categoryRows}</div>
        </div>
        <div class="chart-card">
          <h3 class="chart-card-title">Por barrio <small>A/R</small></h3>
          <div class="chart-compare-list">${barrioRows}</div>
        </div>
      </div>`;
  }

  function getBoardReports() {
    if (activeBoardTab === 'open') {
      return VeciIA.getReports({ status: 'open' }).filter((r) => r.type !== 'informativo');
    }
    if (activeBoardTab === 'resolved') {
      return VeciIA.getReports({ status: 'resolved' });
    }
    return VeciIA.getReports().filter((r) => r.type !== 'informativo' || r.status === 'resolved');
  }

  function renderCommunityBoard() {
    const list = document.getElementById('community-board-list');
    const countEl = document.getElementById('community-list-count');
    if (!list) return;

    const reports = getBoardReports().slice(0, 16);

    if (countEl) {
      countEl.textContent = reports.length ? `${reports.length} casos` : '';
    }

    if (!reports.length) {
      const emptyMsg = activeBoardTab === 'open'
        ? 'No hay reportes abiertos.'
        : activeBoardTab === 'resolved'
          ? 'No hay casos resueltos aún.'
          : 'No hay reportes para mostrar.';
      list.innerHTML = `<p class="empty-list community-empty">${emptyMsg}</p>`;
      return;
    }

    list.innerHTML = reports.map(buildCompactRow).join('');
  }

  function buildActivityCard(a) {
    const badge = TYPE_LABELS[a.type] || TYPE_LABELS.report;
    const actionsHtml = a.report ? VeciIA.buildReportActionsHtml(a.report, 'compact') : '';

    return `
      <article class="gallery-card activity-${a.type}" data-type="${a.type}" data-report-id="${a.reportId || ''}">
        <div class="gallery-card-top">
          <span class="gallery-card-icon">${a.icon}</span>
          <span class="gallery-badge ${badge.class}">${badge.label}</span>
        </div>
        <p class="gallery-card-text">${escapeHtml(a.text)}</p>
        <div class="gallery-card-footer">
          <span>${escapeHtml(a.meta)}</span>
          <time>${escapeHtml(a.time)}</time>
        </div>
        ${actionsHtml ? `<div class="gallery-card-actions">${actionsHtml}</div>` : ''}
      </article>`;
  }

  function renderActivityGallery() {
    const track = document.getElementById('activity-track');
    if (!track) return;

    allActivities = VeciIA.getCommunityActivity();
    const filtered = activeFilter === 'all'
      ? allActivities
      : allActivities.filter((a) => a.type === activeFilter);

    const items = filtered.length ? filtered : allActivities;
    const cards = items.map(buildActivityCard).join('');
    track.innerHTML = items.length > 1 ? cards + cards : cards;
    scheduleRemeasure(activityMarquee);
  }

  function initActivityGallery() {
    const track = document.getElementById('activity-track');
    if (!track) return;

    const wrap = track.closest('.activity-track-wrap');

    renderActivityGallery();

    activityMarquee = createMarquee(track, {
      speed: BASE_SPEED,
      cardSelector: '.gallery-card',
      gap: 20,
      wrap,
      prevBtn: document.getElementById('gallery-prev'),
      nextBtn: document.getElementById('gallery-next'),
    });

    scheduleRemeasure(activityMarquee);

    document.getElementById('activity-filters')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      document.querySelectorAll('#activity-filters .filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderActivityGallery();
    });
  }

  function openResolveModal(reportId) {
    const modal = document.getElementById('resolve-modal');
    document.getElementById('resolve-report-id').value = reportId;
    document.getElementById('resolve-solver-name').value = '';
    document.getElementById('resolve-solver-phone').value = '';
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
  }

  function closeResolveModal() {
    const modal = document.getElementById('resolve-modal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  }

  function openCertificateModal(certId) {
    const cert = VeciIA.getCertificate(certId);
    if (!cert) return;
    const modal = document.getElementById('certificate-modal');
    const body = document.getElementById('certificate-body');
    if (!modal || !body) return;

    body.innerHTML = `
      <div class="cert-document">
        <div class="cert-doc-header"><span class="cert-doc-logo">VeciIA</span><span class="cert-doc-badge">Constancia</span></div>
        <h3>Problema resuelto – validación</h3>
        <p class="cert-doc-id">ID: <strong>${escapeHtml(cert.id)}</strong></p>
        <p><strong>Reporte:</strong> ${escapeHtml(cert.description)}</p>
        <p><strong>Publicado por:</strong> ${escapeHtml(cert.authorName)}</p>
        <p><strong>Solucionado por:</strong> ${escapeHtml(cert.solverName)}</p>
        <p><strong>Fecha:</strong> ${new Date(cert.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
        <p class="cert-doc-valid">Este documento valida que el problema fue confirmado como resuelto en VeciIA.</p>
      </div>`;

    modal.dataset.certId = certId;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  }

  function initReportActions() {
    document.body.addEventListener('click', (e) => {
      const resolveBtn = e.target.closest('.report-resolve-open');
      if (resolveBtn) {
        e.preventDefault();
        openResolveModal(resolveBtn.dataset.id);
        return;
      }
      const certBtn = e.target.closest('.report-cert-btn, .popup-view-cert');
      if (certBtn) {
        e.preventDefault();
        openCertificateModal(certBtn.dataset.cert);
      }
    });

    document.getElementById('resolve-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const reportId = document.getElementById('resolve-report-id').value;
      const solverName = document.getElementById('resolve-solver-name').value;
      const solverPhone = document.getElementById('resolve-solver-phone').value;
      try {
        const { certificate } = VeciIA.resolveReportAsAuthor(reportId, { solverName, solverPhone });
        closeResolveModal();
        refreshAll();
        showToast('✅ Problema resuelto. Constancia generada.');
        openCertificateModal(certificate.id);
      } catch (err) {
        alert(err.message);
      }
    });

    document.querySelectorAll('.resolve-modal-close').forEach((btn) => {
      btn.addEventListener('click', closeResolveModal);
    });
    document.getElementById('resolve-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'resolve-modal') closeResolveModal();
    });

    document.getElementById('btn-share-cert-wa')?.addEventListener('click', () => {
      const modal = document.getElementById('certificate-modal');
      const certId = modal?.dataset.certId;
      if (!certId) return;
      const cert = VeciIA.getCertificate(certId);
      if (!cert) return;
      const wa = VeciIA.whatsAppLink(cert.authorPhone || cert.solverPhone, VeciIA.getCertificateMessage(cert));
      if (wa) window.open(wa, '_blank', 'noopener');
    });
    document.querySelectorAll('.cert-modal-close, .cert-modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', closeCertificateModal);
    });
    document.getElementById('certificate-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'certificate-modal') closeCertificateModal();
    });

    document.getElementById('community-board-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-board-tab]');
      if (!tab) return;
      document.querySelectorAll('#community-board-tabs .filter-chip').forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeBoardTab = tab.dataset.boardTab;
      renderCommunityBoard();
    });
  }

  function renderLeaderboard() {
    const board = document.getElementById('leaderboard');
    if (!board) return;

    const top = VeciIA.getTopNeighbors();
    const medals = ['🥇', '🥈', '🥉'];
    const maxScore = top[0]?.score || 1;

    board.innerHTML = top.map((u, i) => `
      <div class="leader-row" style="--rank:${i + 1};--pct:${(u.score / maxScore) * 100}">
        <span class="leader-rank">${medals[i] || i + 1}</span>
        <div class="leader-info">
          <strong>${escapeHtml(u.name)}</strong>
          <small>${escapeHtml(u.barrio)}</small>
          <div class="leader-bar"><div class="leader-bar-fill"></div></div>
        </div>
        <div class="leader-stats">
          <span class="leader-score">${u.score}</span>
          <small>pts</small>
        </div>
      </div>
    `).join('');

    observeLeaderboard(board);
  }

  function observeLeaderboard(board) {
    if (!('IntersectionObserver' in window)) {
      board.querySelectorAll('.leader-bar-fill').forEach((el) => el.classList.add('animated'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.leader-bar-fill').forEach((el) => el.classList.add('animated'));
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(board);
  }

  function renderZoneStats() {
    const zones = document.getElementById('zone-stats');
    if (!zones) return;

    const barrios = {};
    VeciIA.getReports().filter((r) => r.status === 'open').forEach((r) => {
      barrios[r.barrio] = (barrios[r.barrio] || 0) + 1;
    });

    const sorted = Object.entries(barrios).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;

    zones.innerHTML = sorted.map(([name, count], i) => `
      <div class="zone-row" data-delay="${i * 100}">
        <span class="zone-rank">${i + 1}</span>
        <div class="zone-info">
          <span class="zone-name">${escapeHtml(name)}</span>
          <div class="zone-bar-track">
            <div class="zone-bar-fill" style="--target:${(count / max) * 100}%"></div>
          </div>
        </div>
        <span class="zone-count">${count}</span>
      </div>
    `).join('');

    observeZones(zones);
  }

  function observeZones(zones) {
    if (!('IntersectionObserver' in window)) {
      zones.querySelectorAll('.zone-bar-fill').forEach((el) => el.classList.add('animated'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.zone-bar-fill').forEach((el, i) => {
            setTimeout(() => el.classList.add('animated'), i * 120);
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    obs.observe(zones);
  }

  function refreshAll() {
    renderActivityGallery();
    renderCommunityCharts();
    renderCommunityBoard();
    renderLeaderboard();
    renderZoneStats();
  }

  initActivityGallery();
  initReportActions();
  refreshAll();

  VeciIA.on('ready', refreshAll);
  VeciIA.on('reports', refreshAll);
  VeciIA.on('auth', refreshAll);
})();
