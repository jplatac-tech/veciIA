(function () {
  'use strict';

  const mapEl = document.getElementById('cartagena-map');
  if (!mapEl || typeof L === 'undefined') return;

  let map, heatLayer, markersLayer, tempMarker;
  let heatVisible = true;
  let markersVisible = true;
  let selectedLatLng = null;
  let activeFilter = 'all';

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

    heatLayer = createHeatLayer([]);
    map.addLayer(heatLayer);

    markersLayer = L.layerGroup().addTo(map);

    map.on('click', onMapClick);
    map.on('zoomend', () => updateHeatLayer());
    refreshMap();

    setTimeout(() => map.invalidateSize(), 300);
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
      coordsEl.textContent = '👆 Haz clic en el mapa de la derecha';
      coordsEl.classList.remove('has-coords');
    }
    document.getElementById('map-click-hint')?.classList.remove('placed');
  }

  function buildPopup(report) {
    const cat = VeciIA.CATEGORIES[report.category] || VeciIA.CATEGORIES.otro;
    const groupCount = VeciIA.getGroupCount(report);
    const groupHtml = groupCount > 1
      ? `<p class="popup-group">🤖 IA: ${groupCount} reportes similares agrupados</p>`
      : '';
    const statusHtml = report.status === 'resolved'
      ? '<span class="popup-status resolved">✅ Resuelto</span>'
      : `<button class="popup-resolve" data-id="${report.id}">Marcar resuelto (+25 pts)</button>`;
    const user = VeciIA.getSessionUser();
    const canResolve = user && report.status === 'open';

    return `
      <div class="map-popup">
        <div class="popup-header">
          <span class="popup-icon">${cat.icon}</span>
          <span class="popup-cat">${cat.label}</span>
          <span class="popup-urgency urgency-${report.urgency}">${report.urgency}</span>
        </div>
        <p class="popup-desc">${escapeHtml(report.description)}</p>
        <p class="popup-meta">${escapeHtml(report.userName)} · ${escapeHtml(report.barrio)}</p>
        ${groupHtml}
        ${canResolve ? statusHtml : (report.status === 'resolved' ? '<span class="popup-status resolved">✅ Resuelto</span>' : '')}
      </div>
    `;
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
    return L.heatLayer(points, heatOptions());
  }

  function updateHeatLayer() {
    if (!map || !heatVisible) return;
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
        const color = urgencyColors[report.urgency] || '#ff5a43';
        const marker = L.circleMarker([report.lat, report.lng], {
          radius: report.urgency === 'critica' ? 10 : 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: heatVisible ? 0.7 : 0.9,
        });
        marker.bindPopup(buildPopup(report), { maxWidth: 280, className: 'veciia-popup' });
        markersLayer.addLayer(marker);
      });
    }

    renderReportsList(reports);
    updateStats();
  }

  function renderReportsList(reports) {
    const list = document.getElementById('reports-list');
    if (!list) return;

    const open = reports.filter((r) => r.status === 'open').slice(0, 20);
    if (!open.length) {
      list.innerHTML = '<p class="empty-list">No hay reportes abiertos con este filtro.</p>';
      return;
    }

    list.innerHTML = open.map((r) => {
      const cat = VeciIA.CATEGORIES[r.category] || VeciIA.CATEGORIES.otro;
      const group = VeciIA.getGroupCount(r);
      return `
        <button class="report-item" data-lat="${r.lat}" data-lng="${r.lng}" data-id="${r.id}">
          <span class="report-item-icon">${cat.icon}</span>
          <div class="report-item-body">
            <strong>${escapeHtml(r.description.slice(0, 60))}${r.description.length > 60 ? '…' : ''}</strong>
            <span>${escapeHtml(r.barrio)} · ${r.urgency}${group > 1 ? ` · 🤖 ×${group}` : ''}</span>
          </div>
        </button>
      `;
    }).join('');

    list.querySelectorAll('.report-item').forEach((item) => {
      item.addEventListener('click', () => {
        map.setView([+item.dataset.lat, +item.dataset.lng], 15, { animate: true });
        markersLayer.eachLayer((layer) => {
          const ll = layer.getLatLng();
          if (Math.abs(ll.lat - +item.dataset.lat) < 0.0001) {
            layer.openPopup();
          }
        });
      });
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

  /* Controls */
  document.getElementById('cartagena-map')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.popup-resolve');
    if (!btn) return;
    try {
      VeciIA.resolveReport(btn.dataset.id);
      map.closePopup();
      showToast('✅ Problema marcado como resuelto (+25 pts)');
    } catch (err) {
      alert(err.message);
    }
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
    refreshMap();
  });

  document.getElementById('btn-my-location')?.addEventListener('click', useMyLocation);

  /* ── Report form ── */
  document.getElementById('report-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('report-desc').value;
    const category = document.getElementById('report-category').value;
    const urgency = document.getElementById('report-urgency').value;
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
        lat: loc.lat,
        lng: loc.lng,
      });
      e.target.reset();
      clearSelectedLocation();
      document.getElementById('report-category').value = 'auto';
      showToast('✅ Reporte enviado. La IA lo agrupó automáticamente.');
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

  VeciIA.on('reports', () => refreshMap());

  if (mapEl && typeof L !== 'undefined' && typeof VeciIA !== 'undefined') {
    initMap();
  }

  window.VeciIAMap = {
    setSelectedLocation,
    clearSelectedLocation,
    refreshMap,
    focusReportForm,
    showToast,
    invalidate: () => map?.invalidateSize(),
  };
})();
