(function () {
  'use strict';

  const mapEl = document.getElementById('cartagena-map');
  if (!mapEl || typeof L === 'undefined') return;

  let map, heatLayer, markersLayer, tempMarker;
  let heatVisible = true;
  let markersVisible = true;
  let selectedLatLng = null;
  let activeFilter = 'all';
  let mapReportsExpanded = false;

  const urgencyColors = {
    baja: '#2ecc71',
    media: '#f39c12',
    alta: '#ff5a43',
    critica: '#c0392b',
  };

  function initMap() {
    map = L.map('cartagena-map', {
      center: VeciIA.CARTAGENA_CENTER,
      zoom: VeciIA.CARTAGENA_ZOOM,
      maxBounds: VeciIA.CARTAGENA_BOUNDS,
      minZoom: 12,
      maxZoom: 18,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (typeof L.heatLayer === 'function') {
      heatLayer = createHeatLayer([]);
      map.addLayer(heatLayer);
    }

    markersLayer = L.layerGroup().addTo(map);

    map.on('click', onMapClick);
    map.on('zoomend', () => updateHeatLayer());
    refreshMap();

    const fixSize = () => map?.invalidateSize(true);
    fixSize();
    setTimeout(fixSize, 100);
    setTimeout(fixSize, 400);
    setTimeout(fixSize, 1000);

    const mapContainer = mapEl.closest('.map-container');
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fixSize, 150);
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('load', fixSize);
    window.addEventListener('orientationchange', () => {
      setTimeout(fixSize, 400);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) setTimeout(fixSize, 200);
    });
    if (mapContainer && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(onResize).observe(mapContainer);
    }

    VeciIA.on('reports', () => refreshMap());
  }

  function bootMap() {
    if (!mapEl || typeof L === 'undefined' || typeof VeciIA === 'undefined' || map) return;
    try {
      initMap();
    } catch (err) {
      console.error('VeciIA map init error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBootMap, { once: true });
  } else {
    scheduleBootMap();
  }

  function scheduleBootMap() {
    if (map) return;
    requestAnimationFrame(() => requestAnimationFrame(bootMap));
  }

  function onMapClick(e) {
    if (!document.body.classList.contains('logged-in')) return;
    setSelectedLocation(e.latlng.lat, e.latlng.lng);
    document.getElementById('map-click-hint')?.classList.add('placed');
    document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setSelectedLocation(lat, lng) {
    selectedLatLng = { lat, lng };
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'temp-marker',
        html: '<div class="temp-pin">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(map);
    const coordsEl = document.getElementById('selected-coords');
    if (coordsEl) {
      coordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)} ✓`;
      coordsEl.classList.add('has-coords');
    }
    document.getElementById('map-click-hint')?.classList.add('placed');
  }

  function getSelectedLocation() {
    return selectedLatLng;
  }

  function clearSelectedLocation() {
    selectedLatLng = null;
    if (tempMarker) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }
    const coordsEl = document.getElementById('selected-coords');
    if (coordsEl) {
      coordsEl.textContent = '👆 Toca el mapa para marcar la ubicación';
      coordsEl.classList.remove('has-coords');
    }
    document.getElementById('map-click-hint')?.classList.remove('placed');
  }

  function buildPopup(report) {
    const cat = VeciIA.CATEGORIES[report.category] || VeciIA.CATEGORIES.otro;
    const typeInfo = VeciIA.REPORT_TYPES[report.type] || VeciIA.REPORT_TYPES.problema;
    const groupCount = VeciIA.getGroupCount(report);
    const groupHtml = groupCount > 1
      ? `<p class="popup-group">🤖 IA: ${groupCount} reportes similares agrupados</p>`
      : '';
    const user = VeciIA.getSessionUser();
    const isAuthor = user && report.userId === user.id;
    const isInformativo = report.type === 'informativo';

    const contactHtml = VeciIA.buildReportContactsHtml(report, 'popup');

    let actionHtml = '';
    if (report.status === 'resolved') {
      actionHtml = `
        <div class="popup-resolved-box">
          <p>✅ Resuelto por <strong>${escapeHtml(report.solverName || '—')}</strong></p>
          ${report.certificateId ? `<button type="button" class="popup-view-cert btn-secondary btn-sm" data-cert="${report.certificateId}">Ver constancia</button>` : ''}
        </div>`;
    } else if (!isInformativo && isAuthor) {
      actionHtml = `<button type="button" class="popup-resolve-open btn-primary btn-sm" data-id="${report.id}">Marcar como resuelto</button>`;
    } else if (isInformativo) {
      actionHtml = '<span class="popup-info-badge">ℹ️ Aviso informativo</span>';
    }

    return `
      <div class="map-popup">
        <div class="popup-header">
          <span class="popup-icon">${cat.icon}</span>
          <span class="popup-cat">${cat.label}</span>
          <span class="popup-type">${typeInfo.icon} ${typeInfo.label}</span>
          ${!isInformativo ? `<span class="popup-urgency urgency-${report.urgency}">${report.urgency}</span>` : ''}
        </div>
        <p class="popup-desc">${escapeHtml(report.description)}</p>
        <p class="popup-meta">👤 Publicado por <strong>${escapeHtml(report.userName)}</strong> · ${escapeHtml(report.barrio)}</p>
        ${groupHtml}
        <div class="popup-contacts">${contactHtml}</div>
        ${actionHtml}
      </div>
    `;
  }

  function openResolveModal(reportId) {
    const modal = document.getElementById('resolve-modal');
    document.getElementById('resolve-report-id').value = reportId;
    document.getElementById('resolve-solver-name').value = '';
    document.getElementById('resolve-solver-phone').value = '';
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    map.closePopup();
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
        <h3>Problema resuelto</h3>
        <p class="cert-doc-id">ID: <strong>${escapeHtml(cert.id)}</strong></p>
        <p><strong>Reporte:</strong> ${escapeHtml(cert.description)}</p>
        <p><strong>Publicado por:</strong> ${escapeHtml(cert.authorName)}</p>
        <p><strong>Solucionado por:</strong> ${escapeHtml(cert.solverName)}</p>
        <p><strong>Fecha:</strong> ${new Date(cert.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
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

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function heatOptions() {
    const zoom = map ? map.getZoom() : 13;
    return {
      radius: zoom >= 16 ? 28 : zoom >= 14 ? 38 : 50,
      blur: zoom >= 16 ? 22 : 32,
      maxZoom: 18,
      minOpacity: 0.45,
      max: 1.6,
      gradient: {
        0.0: 'rgba(46,204,113,0)',
        0.15: '#2ecc71',
        0.35: '#f1c40f',
        0.55: '#ff9f43',
        0.75: '#ff5a43',
        1.0: '#c0392b',
      },
    };
  }

  function createHeatLayer(points) {
    if (typeof L.heatLayer !== 'function') return null;
    return L.heatLayer(points, heatOptions());
  }

  function updateHeatLayer() {
    if (!map || !heatVisible || typeof L.heatLayer !== 'function') return;
    const filter = activeFilter === 'all' ? {} : { category: activeFilter };
    const points = VeciIA.getHeatPoints(filter);
    if (heatLayer) map.removeLayer(heatLayer);
    heatLayer = createHeatLayer(points);
    map.addLayer(heatLayer);
  }

  function refreshMap() {
    if (!map) return;

    const reports = VeciIA.getReports(
      activeFilter === 'all' ? {} : { category: activeFilter, status: 'open' }
    ).filter((r) => r.status === 'open' || activeFilter !== 'all');

    if (heatVisible) {
      updateHeatLayer();
    } else if (heatLayer) {
      map.removeLayer(heatLayer);
    }

    markersLayer.clearLayers();

    if (markersVisible) {
      reports.forEach((report) => {
        if (report.status === 'resolved' && activeFilter === 'all') return;
        const isInfo = report.type === 'informativo';
        const color = isInfo ? '#3498db' : (urgencyColors[report.urgency] || '#ff5a43');
        const marker = L.circleMarker([report.lat, report.lng], {
          radius: isInfo ? 9 : (report.urgency === 'critica' ? 10 : 8),
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: heatVisible ? 0.7 : 0.9,
        });
        marker.bindPopup(buildPopup(report), { maxWidth: 300, className: 'veciia-popup' });
        markersLayer.addLayer(marker);
      });
    }

    renderReportsList(
      VeciIA.getReports(activeFilter === 'all' ? {} : { category: activeFilter })
    );
    updateStats();
  }

  function renderReportsList(allReports) {
    const list = document.getElementById('reports-list');
    const footEl = document.getElementById('map-reports-foot');
    if (!list) return;

    const open = allReports.filter((r) => r.status === 'open');
    const limit = VeciIA.REPORT_PREVIEW_LIMIT;
    const showAll = mapReportsExpanded;
    const shown = showAll ? open : open.slice(0, limit);
    const remaining = showAll ? 0 : Math.max(0, open.length - limit);

    list.classList.toggle('reports-table-host--expanded', showAll);

    if (!shown.length) {
      list.innerHTML = '<p class="empty-list map-reports-empty">No hay reportes abiertos con este filtro.</p>';
      if (footEl) footEl.hidden = true;
      return;
    }

    list.innerHTML = VeciIA.buildReportsTable(shown);

    if (footEl) {
      if (remaining > 0) {
        footEl.hidden = false;
        footEl.innerHTML = `
          <button type="button" class="reports-expand-btn" id="map-expand-btn">Ver todos (+${remaining})</button>
          <span class="reports-preview-sep">·</span>
          <span class="reports-preview-hint">o toca el mapa</span>`;
      } else if (showAll && open.length > limit) {
        footEl.hidden = false;
        footEl.innerHTML = `<button type="button" class="reports-expand-btn reports-expand-btn--collapse" id="map-collapse-btn">Ver menos</button>`;
      } else {
        footEl.hidden = true;
        footEl.innerHTML = '';
      }
    }
  }

  function focusReportOnMap(item) {
    const lat = +item.dataset.lat;
    const lng = +item.dataset.lng;
    map.setView([lat, lng], 15, { animate: true });
    markersLayer.eachLayer((layer) => {
      const ll = layer.getLatLng();
      if (Math.abs(ll.lat - lat) < 0.0001 && Math.abs(ll.lng - lng) < 0.0001) {
        layer.openPopup();
      }
    });
  }

  function updateStats() {
    const stats = VeciIA.getStats();
    const els = {
      users: document.querySelector('[data-stat="users"]'),
      reports: document.querySelector('[data-stat="reports"]'),
      resolved: document.querySelector('[data-stat="resolved"]'),
      entities: document.querySelector('[data-stat="entities"]'),
    };
    if (els.users) els.users.textContent = stats.users.toLocaleString('es-CO') + '+';
    if (els.reports) els.reports.textContent = stats.reports.toLocaleString('es-CO');
    if (els.resolved) els.resolved.textContent = stats.resolved.toLocaleString('es-CO');
    if (els.entities) els.entities.textContent = stats.entities + '+';
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    const btn = document.getElementById('btn-my-location');
    if (btn) btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setSelectedLocation(lat, lng);
        map.setView([lat, lng], 15);
        if (btn) btn.disabled = false;
      },
      () => {
        alert('No se pudo obtener tu ubicación. Haz clic en el mapa.');
        if (btn) btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* Controls & popups */
  document.getElementById('reports-list')?.addEventListener('click', (e) => {
    const resolveBtn = e.target.closest('.report-resolve-open');
    if (resolveBtn) {
      e.preventDefault();
      openResolveModal(resolveBtn.dataset.id);
      return;
    }
    const certBtn = e.target.closest('.report-cert-btn');
    if (certBtn) {
      e.preventDefault();
      openCertificateModal(certBtn.dataset.cert);
      return;
    }
    if (e.target.closest('.report-wa-btn, .report-chip--wa')) return;
    const row = e.target.closest('.reports-table-row');
    if (row && !e.target.closest('a, button, .report-chip')) {
      focusReportOnMap(row);
      return;
    }
    const focusBtn = e.target.closest('.report-preview-focus');
    if (focusBtn) {
      const card = focusBtn.closest('.report-preview-card');
      if (card) focusReportOnMap(card);
    }
  });

  document.getElementById('cartagena-map')?.addEventListener('click', (e) => {
    const resolveBtn = e.target.closest('.popup-resolve-open');
    if (resolveBtn) {
      openResolveModal(resolveBtn.dataset.id);
      return;
    }
    const certBtn = e.target.closest('.popup-view-cert');
    if (certBtn) {
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
      refreshMap();
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

  document.getElementById('report-type')?.addEventListener('change', (e) => {
    const isInfo = e.target.value === 'informativo';
    document.getElementById('urgency-field').style.display = isInfo ? 'none' : 'block';
    const submit = document.querySelector('.btn-submit-report');
    if (submit) submit.textContent = isInfo ? 'Publicar aviso (+5 pts)' : 'Enviar reporte (+10 pts)';
  });

  document.getElementById('toggle-heat')?.addEventListener('click', function () {
    heatVisible = !heatVisible;
    this.classList.toggle('active', heatVisible);
    if (heatVisible) updateHeatLayer();
    else if (heatLayer) map.removeLayer(heatLayer);
  });

  document.getElementById('toggle-markers')?.addEventListener('click', function () {
    markersVisible = !markersVisible;
    this.classList.toggle('active', markersVisible);
    refreshMap();
  });

  document.getElementById('filter-category')?.addEventListener('change', (e) => {
    activeFilter = e.target.value;
    mapReportsExpanded = false;
    refreshMap();
  });

  document.getElementById('map-reports-foot')?.addEventListener('click', (e) => {
    if (e.target.closest('#map-expand-btn')) {
      e.preventDefault();
      mapReportsExpanded = true;
      renderReportsList(
        VeciIA.getReports(activeFilter === 'all' ? {} : { category: activeFilter })
      );
      return;
    }
    if (e.target.closest('#map-collapse-btn')) {
      e.preventDefault();
      mapReportsExpanded = false;
      renderReportsList(
        VeciIA.getReports(activeFilter === 'all' ? {} : { category: activeFilter })
      );
      document.querySelector('.reports-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  document.getElementById('btn-my-location')?.addEventListener('click', useMyLocation);

  /* ── Report form ── */
  document.getElementById('report-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('report-desc').value;
    const category = document.getElementById('report-category').value;
    const urgency = document.getElementById('report-urgency').value;
    const type = document.getElementById('report-type').value;
    const phone = document.getElementById('report-phone').value;
    const loc = getSelectedLocation();

    if (!loc) {
      alert('Selecciona una ubicación en el mapa o usa "Mi ubicación".');
      return;
    }

    try {
      const finalCategory = category === 'auto' ? VeciIA.detectCategory(desc) : category;
      VeciIA.createReport({
        description: desc,
        category: finalCategory,
        urgency,
        type,
        phone,
        lat: loc.lat,
        lng: loc.lng,
      });
      e.target.reset();
      clearSelectedLocation();
      document.getElementById('report-category').value = 'auto';
      document.getElementById('report-type').value = 'problema';
      document.getElementById('urgency-field').style.display = 'block';
      document.querySelector('.btn-submit-report').textContent = 'Enviar reporte (+10 pts)';
      const msg = type === 'informativo' ? 'ℹ️ Aviso publicado en el mapa.' : '✅ Reporte enviado. La IA lo agrupó automáticamente.';
      showToast(msg);
      document.getElementById('reports-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('report-desc')?.addEventListener('input', (e) => {
    if (document.getElementById('report-category').value === 'auto') {
      const detected = VeciIA.detectCategory(e.target.value);
      const hint = document.getElementById('category-hint');
      if (hint && e.target.value.length > 5) {
        const cat = VeciIA.CATEGORIES[detected];
        hint.textContent = `🤖 IA detecta: ${cat.icon} ${cat.label}`;
        hint.style.display = 'block';
      } else if (hint) {
        hint.style.display = 'none';
      }
    }
  });

  function showToast(msg) {
    if (window.VeciIAUI?.showToast) {
      VeciIAUI.showToast(msg);
      return;
    }
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function focusReportForm() {
    const section = document.getElementById('report-section');
    const desc = document.getElementById('report-desc');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => desc?.focus(), 400);
  }

  window.VeciIAMap = {
    setSelectedLocation,
    clearSelectedLocation,
    refreshMap,
    focusReportForm,
    showToast,
    invalidate: () => map?.invalidateSize(true),
  };
})();
