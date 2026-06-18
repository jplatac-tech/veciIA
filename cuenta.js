(function () {
  'use strict';

  if (typeof VeciIA === 'undefined') return;

  let activeCertId = null;

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showToast(msg) {
    if (window.VeciIAUI?.showToast) VeciIAUI.showToast(msg);
  }

  function renderOffers(user) {
    const grid = document.getElementById('offers-grid');
    if (!grid) return;
    const points = VeciIA.getUserPoints(user);

    grid.innerHTML = VeciIA.SPONSOR_OFFERS.map((offer) => {
      const canRedeem = points >= offer.cost;
      const pct = Math.min(100, Math.round((points / offer.cost) * 100));
      const missing = Math.max(0, offer.cost - points);
      return `
        <article class="offer-card ${canRedeem ? 'offer-card--ready' : 'offer-card--locked'}">
          <div class="offer-card-head">
            <span class="offer-icon">${offer.icon}</span>
            <span class="offer-sponsor">${escapeHtml(offer.sponsor)}</span>
          </div>
          <h3>${escapeHtml(offer.title)}</h3>
          <p>${escapeHtml(offer.desc)}</p>
          <div class="offer-progress-wrap">
            <div class="offer-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso hacia el canje">
              <div class="offer-progress-fill" style="width:${pct}%"></div>
            </div>
            <span class="offer-progress-text">${points.toLocaleString('es-CO')} / ${offer.cost} pts</span>
          </div>
          <div class="offer-footer">
            <span class="offer-cost">${offer.cost} pts</span>
            ${canRedeem
              ? `<button type="button" class="btn-primary btn-sm btn-redeem offer-redeem-btn" data-offer="${offer.id}">
                  <span class="offer-redeem-icon" aria-hidden="true">🎁</span> Canjear ahora
                </button>`
              : `<span class="offer-locked"><span aria-hidden="true">🔒</span> Te faltan ${missing.toLocaleString('es-CO')} pts</span>`
            }
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.btn-redeem').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('is-redeeming')) return;
        btn.classList.add('is-redeeming');
        btn.textContent = 'Canjeando…';
        try {
          VeciIA.redeemOffer(btn.dataset.offer);
          refresh();
        } catch (err) {
          btn.classList.remove('is-redeeming');
          btn.innerHTML = '<span class="offer-redeem-icon" aria-hidden="true">🎁</span> Canjear ahora';
          alert(err.message);
        }
      });
    });
  }

  function renderCertificates(user) {
    const block = document.getElementById('cuenta-block-certs');
    const list = document.getElementById('certificates-list');
    if (!block || !list) return;

    const certs = VeciIA.getUserCertificates(user.id);
    if (!certs.length) {
      block.hidden = true;
      list.innerHTML = '';
      return;
    }

    block.hidden = false;
    list.innerHTML = certs.map((c) => `
      <article class="cert-card">
        <div class="cert-card-head">
          <strong>${escapeHtml(c.id)}</strong>
          <span>${new Date(c.createdAt).toLocaleDateString('es-CO')}</span>
        </div>
        <p>${escapeHtml(c.description)}</p>
        <p class="cert-card-meta">🦸 Solucionado por: <strong>${escapeHtml(c.solverName)}</strong></p>
        <button type="button" class="btn-secondary btn-sm btn-view-cert" data-cert="${c.id}">Ver constancia</button>
      </article>
    `).join('');

    list.querySelectorAll('.btn-view-cert').forEach((btn) => {
      btn.addEventListener('click', () => openCertificateModal(btn.dataset.cert));
    });
  }

  function renderMyReports(user) {
    const block = document.getElementById('cuenta-block-reports');
    const list = document.getElementById('my-reports-list');
    if (!block || !list) return;

    const reports = VeciIA.getUserReports(user.id);
    if (!reports.length) {
      block.hidden = true;
      list.innerHTML = '';
      return;
    }

    block.hidden = false;
    list.innerHTML = reports.slice(0, 10).map((r) => {
      const cat = VeciIA.CATEGORIES[r.category] || VeciIA.CATEGORIES.otro;
      const typeLabel = r.type === 'informativo' ? 'ℹ️ Informativo' : '🔧 Problema';
      const status = r.status === 'resolved'
        ? `✅ Resuelto por ${escapeHtml(r.solverName || '—')}`
        : '⏳ Abierto';
      return `
        <article class="my-report-card">
          <span class="my-report-type">${typeLabel}</span>
          <strong>${cat.icon} ${escapeHtml(r.description.slice(0, 80))}${r.description.length > 80 ? '…' : ''}</strong>
          <span class="my-report-meta">${escapeHtml(r.barrio)} · ${status}</span>
          ${r.status === 'open' && r.type === 'problema' ? `<a href="mapa.html" class="my-report-link">Ir al mapa →</a>` : ''}
        </article>
      `;
    }).join('');
  }

  function renderRedemptions(user) {
    const block = document.getElementById('cuenta-block-redemptions');
    const list = document.getElementById('redemptions-list');
    if (!block || !list) return;

    const items = VeciIA.getUserRedemptions(user.id);
    if (!items.length) {
      block.hidden = true;
      list.innerHTML = '';
      return;
    }

    block.hidden = false;
    list.innerHTML = items.map((r) => `
      <article class="redemption-card">
        <strong>${escapeHtml(r.title)}</strong>
        <span>${escapeHtml(r.sponsor)} · -${r.cost} pts</span>
        <code class="redemption-code">${escapeHtml(r.code)}</code>
        <small>${new Date(r.createdAt).toLocaleDateString('es-CO')}</small>
      </article>
    `).join('');
  }

  function openCertificateModal(certId) {
    const cert = VeciIA.getCertificate(certId);
    if (!cert) return;
    activeCertId = certId;
    const modal = document.getElementById('certificate-modal');
    const body = document.getElementById('certificate-body');
    if (!modal || !body) return;

    body.innerHTML = `
      <div class="cert-document">
        <div class="cert-doc-header">
          <span class="cert-doc-logo">VeciIA</span>
          <span class="cert-doc-badge">Constancia oficial</span>
        </div>
        <h3>Problema comunitario resuelto</h3>
        <p class="cert-doc-id">ID: <strong>${escapeHtml(cert.id)}</strong></p>
        <dl class="cert-doc-details">
          <div><dt>Fecha</dt><dd>${new Date(cert.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</dd></div>
          <div><dt>Barrio</dt><dd>${escapeHtml(cert.barrio)}</dd></div>
          <div><dt>Reporte</dt><dd>${escapeHtml(cert.description)}</dd></div>
          <div><dt>Publicado por</dt><dd>${escapeHtml(cert.authorName)}</dd></div>
          <div><dt>Solucionado por</dt><dd>${escapeHtml(cert.solverName)}</dd></div>
        </dl>
        <p class="cert-doc-footer">Documento generado automáticamente por VeciIA – Plataforma comunitaria de Cartagena.</p>
      </div>
    `;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    activeCertId = null;
  }

  function refresh() {
    const user = VeciIA.getSessionUser();
    const guest = document.getElementById('cuenta-guest');
    const content = document.getElementById('cuenta-content');

    if (!user) {
      if (guest) guest.style.display = 'block';
      if (content) content.style.display = 'none';
      return;
    }

    if (guest) guest.style.display = 'none';
    if (content) content.style.display = 'block';

    const points = VeciIA.getUserPoints(user);
    const level = VeciIA.getImpactLevel(VeciIA.calcImpact(user, VeciIA.getReports()));

    document.getElementById('cuenta-avatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('cuenta-name').textContent = user.name;
    document.getElementById('cuenta-email').textContent = user.email;
    document.getElementById('cuenta-barrio').textContent = user.barrio;
    const pointsEl = document.getElementById('cuenta-points');
    if (pointsEl) {
      pointsEl.textContent = points.toLocaleString('es-CO');
      pointsEl.dataset.value = String(points);
    }
    document.getElementById('cuenta-level').textContent = `${level.icon} ${level.name}`;

    const phoneEl = document.getElementById('cuenta-phone');
    if (phoneEl && document.activeElement !== phoneEl) {
      phoneEl.value = user.phone || '';
    }

    const hints = document.getElementById('points-hints');
    if (hints && VeciIA.POINTS) {
      const P = VeciIA.POINTS;
      hints.innerHTML = `
        <li><span>+${P.reportProblema}</span> Reportar problema</li>
        <li><span>+${P.reportInformativo}</span> Publicar aviso</li>
        <li><span>+${P.reportResolved}</span> Marcar resuelto</li>
      `;
    }

    renderOffers(user);
    renderCertificates(user);
    renderMyReports(user);
    renderRedemptions(user);
  }

  document.getElementById('cuenta-profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phoneEl = document.getElementById('cuenta-phone');
    try {
      const user = VeciIA.updateUserProfile({ phone: phoneEl?.value || '' });
      if (phoneEl) phoneEl.value = user.phone || '';
      showToast(user.phone ? `✅ WhatsApp guardado: ${user.phone}` : '✅ Teléfono eliminado');
      refresh();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('btn-share-cert-wa')?.addEventListener('click', () => {
    if (!activeCertId) return;
    const cert = VeciIA.getCertificate(activeCertId);
    if (!cert) return;
    const msg = VeciIA.getCertificateMessage(cert);
    const wa = VeciIA.whatsAppLink(cert.authorPhone || cert.solverPhone, msg);
    if (wa) window.open(wa, '_blank', 'noopener');
  });

  document.querySelectorAll('.cert-modal-close, .cert-modal-close-btn').forEach((btn) => {
    btn.addEventListener('click', closeCertificateModal);
  });

  document.getElementById('certificate-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'certificate-modal') closeCertificateModal();
  });

  VeciIA.on('auth', refresh);
  VeciIA.on('reports', refresh);
  VeciIA.on('points', refresh);
  VeciIA.on('ready', refresh);
  refresh();
})();
