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
  let communityBoardExpanded = false;
  let activityMarquee = null;

  function renderPreviewFoot(footEl, { remaining, total, expanded, expandId, collapseId, mapLink }) {
    if (!footEl) return;
    const limit = VeciIA.REPORT_PREVIEW_LIMIT;
    if (remaining > 0) {
      footEl.hidden = false;
      footEl.innerHTML = `
        <button type="button" class="reports-expand-btn" id="${expandId}">Ver todos (+${remaining})</button>
        <span class="reports-preview-sep">·</span>
        <a href="${mapLink}">Explorar en el mapa</a>`;
    } else if (expanded && total > limit) {
      footEl.hidden = false;
      footEl.innerHTML = `
        <button type="button" class="reports-expand-btn reports-expand-btn--collapse" id="${collapseId}">Ver menos</button>
        <span class="reports-preview-sep">·</span>
        <a href="${mapLink}">Ir al mapa</a>`;
    } else if (total > 0) {
      footEl.hidden = false;
      footEl.innerHTML = `<a href="${mapLink}">Ver en el mapa</a>`;
    } else {
      footEl.hidden = true;
      footEl.innerHTML = '';
    }
  }

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

  function buildStatsRow(item, isCategory) {
    const icon = isCategory ? item.icon : '📍';
    const name = isCategory ? escapeHtml(item.label) : escapeHtml(item.name);

    return `
      <div class="stats-row">
        <div class="stats-row-name">
          <span class="stats-row-icon" aria-hidden="true">${icon}</span>
          <span class="stats-row-text">${name}</span>
        </div>
        <span class="stats-row-num stats-row-num--open" title="Abiertos">${item.open}</span>
        <span class="stats-row-num stats-row-num--resolved" title="Resueltos">${item.resolved}</span>
      </div>`;
  }

  function buildStatsTable(rowsHtml, headLabel) {
    if (!rowsHtml) {
      return '';
    }
    return `
      <div class="stats-table">
        <div class="stats-table-head">
          <span class="stats-th-name">${headLabel}</span>
          <span class="stats-th-num stats-th-num--open">Ab.</span>
          <span class="stats-th-num stats-th-num--resolved">Res.</span>
        </div>
        ${rowsHtml}
      </div>`;
  }

  function renderCommunityCharts() {
    const el = document.getElementById('community-charts');
    if (!el) return;

    const stats = VeciIA.getCommunityCompareStats();
    const openPct = stats.total ? (stats.openCount / stats.total) * 100 : 0;
    const resolvedPct = stats.total ? (stats.resolvedCount / stats.total) * 100 : 0;

    const categoryRows = stats.byCategory
      .map((c) => buildStatsRow(c, true))
      .join('');

    const barrioRows = stats.byBarrio
      .map((b) => buildStatsRow(b, false))
      .join('');

    el.innerHTML = `
      <div class="stats-panel">
        <div class="stats-overview">
          <div class="stats-donut-wrap">
            <div class="stats-donut" style="--open:${openPct};--resolved:${resolvedPct}"
              role="img" aria-label="${stats.resolutionRate}% resueltos: ${stats.openCount} abiertos y ${stats.resolvedCount} resueltos">
              <div class="stats-donut-inner">
                <strong>${stats.resolutionRate}%</strong>
              </div>
            </div>
            <span class="stats-donut-caption">Resueltos</span>
          </div>
          <div class="stats-overview-legend">
            <div class="stats-legend-item stats-legend-item--open">
              <span class="stats-legend-dot"></span>
              <span>Abiertos</span>
              <strong>${stats.openCount}</strong>
            </div>
            <div class="stats-legend-item stats-legend-item--resolved">
              <span class="stats-legend-dot"></span>
              <span>Resueltos</span>
              <strong>${stats.resolvedCount}</strong>
            </div>
            <div class="stats-legend-item stats-legend-item--total">
              <span class="stats-legend-dot"></span>
              <span>Total</span>
              <strong>${stats.total}</strong>
            </div>
          </div>
        </div>

        <div class="stats-tabs" id="community-stats-tabs" role="tablist" aria-label="Desglose de reportes">
          <button type="button" class="stats-tab active" data-stats-tab="category" role="tab" aria-selected="true">📂 Categoría</button>
          <button type="button" class="stats-tab" data-stats-tab="barrio" role="tab" aria-selected="false">📍 Barrio</button>
        </div>

        <div class="stats-breakdowns">
          <div class="stats-breakdown" data-stats-panel="category">
            <h3 class="stats-breakdown-title">Por categoría</h3>
            ${buildStatsTable(categoryRows, 'Categoría') || '<p class="stats-empty">Sin datos por categoría.</p>'}
          </div>
          <div class="stats-breakdown is-mobile-hidden" data-stats-panel="barrio">
            <h3 class="stats-breakdown-title">Por barrio</h3>
            ${buildStatsTable(barrioRows, 'Barrio') || '<p class="stats-empty">Sin datos por barrio.</p>'}
          </div>
        </div>
      </div>`;

    initCommunityStatsTabs();
  }

  function initCommunityStatsTabs() {
    const root = document.getElementById('community-stats-tabs');
    if (!root) return;

    const tabs = root.querySelectorAll('[data-stats-tab]');
    const panels = root.parentElement?.querySelectorAll('[data-stats-panel]') || [];

    function setTab(id) {
      tabs.forEach((tab) => {
        const active = tab.dataset.statsTab === id;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        panel.classList.toggle('is-mobile-hidden', panel.dataset.statsPanel !== id);
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setTab(tab.dataset.statsTab));
    });
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
    const footEl = document.getElementById('community-board-foot');
    if (!list) return;

    const all = getBoardReports();
    const limit = VeciIA.REPORT_PREVIEW_LIMIT;
    const showAll = communityBoardExpanded;
    const reports = showAll ? all : all.slice(0, limit);
    const remaining = showAll ? 0 : Math.max(0, all.length - limit);

    list.classList.toggle('reports-table-host--expanded', showAll);

    if (countEl) {
      countEl.textContent = all.length
        ? (showAll ? `${all.length} casos` : `${Math.min(limit, all.length)} de ${all.length}`)
        : '';
    }

    if (!reports.length) {
      list.innerHTML = '';
      if (footEl) footEl.hidden = true;
      return;
    }

    list.innerHTML = VeciIA.buildReportsTable(reports);

    renderPreviewFoot(footEl, {
      remaining,
      total: all.length,
      expanded: showAll,
      expandId: 'community-expand-btn',
      collapseId: 'community-collapse-btn',
      mapLink: 'mapa.html',
    });
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
      const focusBtn = e.target.closest('.report-preview-focus');
      const tableRow = e.target.closest('.reports-table-row');
      if (tableRow && !e.target.closest('a, button, .report-chip')) {
        window.location.href = 'mapa.html';
        return;
      }
      if (focusBtn && !e.target.closest('a, .report-chip, .report-resolve-open, .report-cert-btn')) {
        window.location.href = 'mapa.html';
        return;
      }

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
      communityBoardExpanded = false;
      renderCommunityBoard();
    });

    document.getElementById('community-board-foot')?.addEventListener('click', (e) => {
      if (e.target.closest('#community-expand-btn')) {
        e.preventDefault();
        communityBoardExpanded = true;
        renderCommunityBoard();
        return;
      }
      if (e.target.closest('#community-collapse-btn')) {
        e.preventDefault();
        communityBoardExpanded = false;
        renderCommunityBoard();
        document.querySelector('.community-list-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function initDashboardTabs() {
    const tabs = document.querySelectorAll('[data-dashboard-tab]');
    const panels = document.querySelectorAll('[data-dashboard-panel]');
    if (!tabs.length || !panels.length) return;

    function setTab(id) {
      tabs.forEach((tab) => {
        const active = tab.dataset.dashboardTab === id;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        panel.classList.toggle('is-mobile-hidden', panel.dataset.dashboardPanel !== id);
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setTab(tab.dataset.dashboardTab));
    });
  }

  function renderLeaderboard() {
    const board = document.getElementById('leaderboard');
    if (!board) return;

    const top = VeciIA.getTopNeighbors();
    const medals = ['🥇', '🥈', '🥉'];
    const maxScore = top[0]?.score || 1;
    const tierClasses = ['leader-row--gold', 'leader-row--silver', 'leader-row--bronze'];

    board.innerHTML = top.map((u, i) => {
      const resolvedBit = u.resolved ? ` · ${u.resolved} resueltos` : '';
      return `
      <div class="leader-row ${tierClasses[i] || ''}" style="--rank:${i + 1};--pct:${(u.score / maxScore) * 100}">
        <span class="leader-rank">${medals[i] || i + 1}</span>
        <div class="leader-info">
          <div class="leader-head">
            <strong>${escapeHtml(u.name)}</strong>
            <span class="leader-score">${u.score}<small>pts</small></span>
          </div>
          <small class="leader-meta">${escapeHtml(u.barrio)} · ${u.reports} reportes${resolvedBit}</small>
          <div class="leader-bar"><div class="leader-bar-fill"></div></div>
        </div>
      </div>`;
    }).join('');

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
      <div class="zone-row${i === 0 ? ' zone-row--top' : ''}" data-delay="${i * 100}">
        <span class="zone-rank" aria-hidden="true">${i + 1}</span>
        <div class="zone-info">
          <div class="zone-head">
            <span class="zone-name">${escapeHtml(name)}</span>
            <span class="zone-count"><strong>${count}</strong><small>abiertos</small></span>
          </div>
          <div class="zone-bar-track">
            <div class="zone-bar-fill" style="--target:${(count / max) * 100}%"></div>
          </div>
        </div>
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
  initDashboardTabs();

  function scheduleRefreshAll() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => refreshAll(), { timeout: 1200 });
    } else {
      setTimeout(refreshAll, 0);
    }
  }

  scheduleRefreshAll();

  VeciIA.on('ready', scheduleRefreshAll);
  VeciIA.on('reports', scheduleRefreshAll);
  VeciIA.on('auth', scheduleRefreshAll);
})();
