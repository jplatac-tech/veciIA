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
  let activityMarquee = null;
  let storiesMarquee = null;

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
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

  function buildActivityCard(a) {
    const badge = TYPE_LABELS[a.type] || TYPE_LABELS.report;
    return `
      <article class="gallery-card activity-${a.type}" data-type="${a.type}">
        <div class="gallery-card-top">
          <span class="gallery-card-icon">${a.icon}</span>
          <span class="gallery-badge ${badge.class}">${badge.label}</span>
        </div>
        <p class="gallery-card-text">${escapeHtml(a.text)}</p>
        <div class="gallery-card-footer">
          <span>${escapeHtml(a.meta)}</span>
          <time>${escapeHtml(a.time)}</time>
        </div>
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
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderActivityGallery();
    });
  }

  function renderStories() {
    const carousel = document.getElementById('stories-grid');
    if (!carousel) return;

    const stories = VeciIA.getResolvedStories();
    const cards = stories.map((s, i) => `
      <div class="story-card" data-index="${i}">
        <div class="story-card-inner">
          <span class="story-icon">${s.icon}</span>
          <span class="story-badge">✅ Resuelto</span>
          <h3>${escapeHtml(s.description)}</h3>
          <p class="story-author">${escapeHtml(s.userName)} · ${escapeHtml(s.barrio)}</p>
          <span class="story-hover-cta">Ver en el mapa →</span>
        </div>
      </div>
    `).join('');

    carousel.innerHTML = stories.length > 1 ? cards + cards : cards;
    scheduleRemeasure(storiesMarquee);

    carousel.querySelectorAll('.story-card').forEach((card) => {
      card.addEventListener('click', () => {
        card.classList.add('story-tapped');
        setTimeout(() => card.classList.remove('story-tapped'), 300);
      });
    });
  }

  function initStoriesCarousel() {
    const carousel = document.getElementById('stories-grid');
    if (!carousel) return;

    const wrap = carousel.closest('.stories-carousel-wrap');

    renderStories();

    storiesMarquee = createMarquee(carousel, {
      speed: BASE_SPEED * 0.9,
      cardSelector: '.story-card',
      gap: 20,
      wrap,
      prevBtn: document.getElementById('stories-prev'),
      nextBtn: document.getElementById('stories-next'),
    });

    scheduleRemeasure(storiesMarquee);

    window.addEventListener('resize', () => scheduleRemeasure(storiesMarquee));
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
    renderStories();
    renderLeaderboard();
    renderZoneStats();
  }

  initActivityGallery();
  initStoriesCarousel();

  VeciIA.on('ready', refreshAll);
  VeciIA.on('reports', refreshAll);
})();
