(function () {
  'use strict';

  const STORAGE_KEY = 'veciia_data';
  const SESSION_KEY = 'veciia_session';

  const CATEGORIES = {
    infraestructura: { label: 'Infraestructura', icon: '🕳️', keywords: ['alcantarilla', 'hueco', 'vía', 'calle', 'pavimento', 'bloqueada', 'bache'] },
    servicios: { label: 'Servicios públicos', icon: '💡', keywords: ['luz', 'agua', 'gas', 'internet', 'electricidad', 'apagón'] },
    animales: { label: 'Animales', icon: '🐕', keywords: ['perro', 'gato', 'mascota', 'animal', 'perdido'] },
    salud: { label: 'Salud / emergencia', icon: '🩸', keywords: ['sangre', 'ambulancia', 'hospital', 'medicina', 'paciente', 'emergencia'] },
    seguridad: { label: 'Seguridad', icon: '🚨', keywords: ['robo', 'inseguridad', 'violencia', 'policía'] },
    informativo: { label: 'Aviso informativo', icon: 'ℹ️', keywords: ['vía bloqueada', 'protesta', 'manifestación', 'cierre', 'desvío', 'bloqueo', 'trancón', 'informativo'] },
    otro: { label: 'Otro', icon: '📍', keywords: [] },
  };

  const REPORT_TYPES = {
    problema: { label: 'Problema a resolver', icon: '🔧', points: 10 },
    informativo: { label: 'Aviso informativo', icon: 'ℹ️', points: 5 },
  };

  /* Números de ejemplo para vecinos en reportes demo (no son mediadores de plataforma) */
  const DEMO_VECINO_PHONES = ['573207149637', '573107051660', '573244144382'];

  const SEED_SOLVERS = [
    { name: 'Diego M.', phone: '573207149637' },
    { name: 'Laura V.', phone: '573107051660' },
    { name: 'Ricardo T.', phone: '573244144382' },
    { name: 'Sofía N.', phone: '573201234504' },
    { name: 'Miguel A.', phone: '573201234505' },
  ];

  const SPONSOR_OFFERS = [
    { id: 'exito-10k', sponsor: 'Éxito', icon: '🛒', title: '$10.000 en mercado', cost: 100, desc: 'En compras superiores a $50.000. Válido 30 días.' },
    { id: 'd1-5pct', sponsor: 'D1', icon: '🏪', title: '5% de descuento', cost: 80, desc: 'En productos de aseo y hogar.' },
    { id: 'olimpica-15k', sponsor: 'Olímpica', icon: '🛍️', title: '$15.000 de descuento', cost: 150, desc: 'Patrocinio comunitario VeciIA.' },
    { id: 'cafeteria', sponsor: 'Café del Barrio', icon: '☕', title: 'Bebida gratis', cost: 40, desc: 'Café o jugo en aliados del centro.' },
    { id: 'farmatodo', sponsor: 'Farmatodo', icon: '💊', title: '10% medicamentos', cost: 120, desc: 'No incluye medicamentos controlados.' },
    { id: 'transporte', sponsor: 'Movilidad Cartagena', icon: '🚌', title: '2 pasajes Transcaribe', cost: 60, desc: 'Patrocinio de movilidad comunitaria.' },
  ];

  const URGENCY_WEIGHT = { baja: 0.4, media: 0.7, alta: 1.0, critica: 1.5 };

  const SEED_REPORTS = [
    { category: 'infraestructura', description: 'Alcantarilla destapada en el sector', lat: 10.4212, lng: -75.5458, urgency: 'alta', userName: 'María G.', barrio: 'Getsemaní' },
    { category: 'infraestructura', description: 'Otra alcantarilla sin tapa en Calle de la Media Luna', lat: 10.4215, lng: -75.5462, urgency: 'alta', userName: 'Roberto S.', barrio: 'Getsemaní' },
    { category: 'servicios', description: 'Fuga de agua en la esquina', lat: 10.4208, lng: -75.5455, urgency: 'media', userName: 'Camila T.', barrio: 'Getsemaní' },
    { category: 'seguridad', description: 'Poca iluminación en el parque', lat: 10.4218, lng: -75.5452, urgency: 'media', userName: 'Andrés M.', barrio: 'Getsemaní' },
    { category: 'servicios', description: 'Se fue la luz en la calle del Arsenal', lat: 10.4236, lng: -75.5498, urgency: 'critica', userName: 'Carlos R.', barrio: 'Centro' },
    { category: 'servicios', description: 'Apagón en plena calle de los Coches', lat: 10.4240, lng: -75.5495, urgency: 'critica', userName: 'Patricia L.', barrio: 'Centro' },
    { category: 'infraestructura', description: 'Bache peligroso frente a la plaza', lat: 10.4232, lng: -75.5502, urgency: 'alta', userName: 'Luis F.', barrio: 'Centro' },
    { category: 'animales', description: 'Perro perdido cerca del parque', lat: 10.4150, lng: -75.5350, urgency: 'media', userName: 'Ana L.', barrio: 'Manga' },
    { category: 'animales', description: 'Gato atropellado necesita ayuda', lat: 10.4153, lng: -75.5346, urgency: 'alta', userName: 'Elena R.', barrio: 'Manga' },
    { category: 'infraestructura', description: 'Vía bloqueada por construcción', lat: 10.3992, lng: -75.5544, urgency: 'alta', userName: 'Pedro M.', barrio: 'Bocagrande' },
    { category: 'informativo', type: 'informativo', description: 'Vía bloqueada por protesta en avenida Santander', lat: 10.4250, lng: -75.5480, urgency: 'media', userName: 'Laura M.', barrio: 'Centro', phone: '573001234567' },
    { category: 'servicios', description: 'Semáforo dañado en avenida principal', lat: 10.3998, lng: -75.5538, urgency: 'alta', userName: 'Valentina C.', barrio: 'Bocagrande' },
    { category: 'salud', description: 'Se necesita sangre O+ urgente', lat: 10.4120, lng: -75.5120, urgency: 'critica', userName: 'Lucía V.', barrio: 'San Francisco' },
    { category: 'salud', description: 'Adulto mayor necesita medicamentos', lat: 10.4124, lng: -75.5116, urgency: 'alta', userName: 'Marta D.', barrio: 'San Francisco' },
    { category: 'servicios', description: 'Fuga de agua en Olaya Herrera', lat: 10.3950, lng: -75.4800, urgency: 'media', userName: 'Jorge H.', barrio: 'Olaya Herrera' },
    { category: 'infraestructura', description: 'Hueco grande en la vía principal', lat: 10.4420, lng: -75.5150, urgency: 'alta', userName: 'Diana P.', barrio: 'Crespo' },
    { category: 'infraestructura', description: 'Andén destruido en Crespo', lat: 10.4416, lng: -75.5145, urgency: 'media', userName: 'Héctor B.', barrio: 'Crespo' },
    { category: 'seguridad', description: 'Robo reportado anoche', lat: 10.4180, lng: -75.5280, urgency: 'alta', userName: 'Ricardo T.', barrio: 'Chambacú' },
    { category: 'animales', description: 'Gato herido necesita ayuda', lat: 10.4080, lng: -75.5420, urgency: 'media', userName: 'Sandra K.', barrio: 'San Diego' },
    { category: 'servicios', description: 'Apagón en todo el barrio', lat: 10.4300, lng: -75.5050, urgency: 'critica', userName: 'Felipe A.', barrio: 'La Popa' },
    { category: 'otro', description: 'Basura acumulada en esquina', lat: 10.4175, lng: -75.5380, urgency: 'baja', userName: 'Natalia P.', barrio: 'San Diego' },
  ];

  const RESOLVED_EXAMPLES = [
    { userName: 'María G.', barrio: 'Getsemaní', action: 'Alcantarilla reparada en 6 horas', points: 35, icon: '🕳️', time: 'Hace 2 días' },
    { userName: 'Carlos R.', barrio: 'Centro', action: 'Conectó 3 donantes de sangre O+ con el hospital', points: 50, icon: '🩸', time: 'Hace 5 horas' },
    { userName: 'Ana L.', barrio: 'Manga', action: 'Perro perdido reunido con su familia', points: 25, icon: '🐕', time: 'Ayer' },
    { userName: 'Pedro M.', barrio: 'Bocagrande', action: 'Vía desbloqueada tras reporte colectivo', points: 40, icon: '🚧', time: 'Hace 3 días' },
    { userName: 'Lucía V.', barrio: 'San Francisco', action: 'Emergencia médica atendida por vecinos', points: 60, icon: '🏥', time: 'Hace 1 semana' },
  ];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function initData() {
    let data = loadData();
    if (!data) {
      data = {
        users: [],
        reports: buildSeedReports(),
        certificates: [],
        redemptions: [],
      };
      regroupReports(data.reports);
      saveData(data);
    } else {
      ensureRichSeedData(data);
      migrateData(data);
    }
    return data;
  }

  function seedDemoPhone(index) {
    if (index < DEMO_VECINO_PHONES.length) return DEMO_VECINO_PHONES[index];
    return '57310' + String(7050000 + index).slice(-7);
  }

  function seedSolverForReport(index) {
    const solverIdx = Math.floor(index / 5) % SEED_SOLVERS.length;
    return SEED_SOLVERS[solverIdx];
  }

  function getReportContactPhone(report) {
    if (report.phone) return report.phone;
    if (report.userId && report.userId !== 'demo') {
      const user = data.users.find((u) => u.id === report.userId);
      if (user?.phone) return user.phone;
    }
    if (report.id && String(report.id).startsWith('seed-')) {
      const i = parseInt(String(report.id).replace('seed-', ''), 10);
      if (!Number.isNaN(i)) return seedDemoPhone(i);
    }
    return '';
  }

  function getSolverContactPhone(report) {
    if (report.solverPhone) return report.solverPhone;
    if (report.solverUserId) {
      const user = data.users.find((u) => u.id === report.solverUserId);
      if (user?.phone) return user.phone;
    }
    if (report.status === 'resolved' && report.id && String(report.id).startsWith('seed-')) {
      const i = parseInt(String(report.id).replace('seed-', ''), 10);
      if (!Number.isNaN(i)) return seedSolverForReport(i).phone;
    }
    return '';
  }

  function migrateData(data) {
    if (!data.certificates) data.certificates = [];
    if (!data.redemptions) data.redemptions = [];
    data.reports.forEach((r) => {
      if (!r.type) r.type = r.category === 'informativo' ? 'informativo' : 'problema';
      if (!r.phone && r.id && String(r.id).startsWith('seed-')) {
        const i = parseInt(String(r.id).replace('seed-', ''), 10);
        if (!Number.isNaN(i)) r.phone = seedDemoPhone(i);
      }
      if (!r.phone) r.phone = '';
      if (r.status === 'resolved' && r.id && String(r.id).startsWith('seed-')) {
        const i = parseInt(String(r.id).replace('seed-', ''), 10);
        if (!Number.isNaN(i)) {
          const solver = seedSolverForReport(i);
          if (!r.solverName) r.solverName = solver.name;
          if (!r.solverPhone) r.solverPhone = solver.phone;
        }
      }
    });
    data.users.forEach((u) => {
      if (!u.phone) u.phone = '';
    });
    saveData(data);
  }

  function buildSeedReports() {
    return SEED_REPORTS.map((r, i) => {
      const isResolved = i % 5 === 0;
      const solver = isResolved ? seedSolverForReport(i) : null;
      return {
        id: 'seed-' + i,
        userId: 'demo',
        userName: r.userName,
        barrio: r.barrio,
        category: r.category,
        type: r.type || 'problema',
        description: r.description,
        lat: r.lat,
        lng: r.lng,
        urgency: r.urgency,
        phone: r.phone || seedDemoPhone(i),
        status: isResolved ? 'resolved' : 'open',
        createdAt: Date.now() - (i + 1) * 3600000 * 4,
        groupId: null,
        solverName: solver ? solver.name : null,
        solverPhone: solver ? solver.phone : null,
        certificateId: isResolved ? 'VEC-SEED-' + i : null,
      };
    });
  }

  function ensureRichSeedData(data) {
    const seedCount = data.reports.filter((r) => r.id.startsWith('seed-') || r.id.startsWith('extra-')).length;
    if (seedCount >= SEED_REPORTS.length) return;
    const existingIds = new Set(data.reports.map((r) => r.id));
    SEED_REPORTS.forEach((r, i) => {
      const id = 'seed-' + i;
      if (!existingIds.has(id)) {
        const isResolved = i % 5 === 0;
        const solver = isResolved ? seedSolverForReport(i) : null;
        data.reports.push({
          id,
          userId: 'demo',
          userName: r.userName,
          barrio: r.barrio,
          category: r.category,
          type: r.type || 'problema',
          description: r.description,
          lat: r.lat,
          lng: r.lng,
          urgency: r.urgency,
          phone: r.phone || seedDemoPhone(i),
          status: isResolved ? 'resolved' : 'open',
          createdAt: Date.now() - (i + 1) * 3600000 * 4,
          groupId: null,
          solverName: solver ? solver.name : null,
          solverPhone: solver ? solver.phone : null,
          certificateId: isResolved ? 'VEC-SEED-' + i : null,
        });
      }
    });
    regroupReports(data.reports);
    saveData(data);
  }

  function detectCategory(text) {
    const lower = text.toLowerCase();
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (key === 'otro') continue;
      if (cat.keywords.some((kw) => lower.includes(kw))) return key;
    }
    return 'otro';
  }

  function regroupReports(reports) {
    const open = reports.filter((r) => r.status === 'open');
    open.forEach((r) => { r.groupId = null; });

    open.forEach((report) => {
      if (report.groupId) return;
      const similar = open.filter(
        (other) =>
          other.id !== report.id &&
          !other.groupId &&
          other.category === report.category &&
          distanceKm(report.lat, report.lng, other.lat, other.lng) < 0.5
      );
      if (similar.length) {
        const groupId = uid();
        report.groupId = groupId;
        similar.forEach((s) => { s.groupId = groupId; });
      }
    });
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getImpactLevel(score) {
    if (score >= 500) return { name: 'Héroe del barrio', icon: '🥇' };
    if (score >= 150) return { name: 'Vecino activo', icon: '🥈' };
    return { name: 'Colaborador', icon: '🥉' };
  }

  function calcImpact(user, reports) {
    let score = 0;
    const userReports = reports.filter((r) => r.userId === user.id);
    userReports.forEach((r) => {
      score += r.type === 'informativo' ? 5 : 10;
    });
    score += userReports.filter((r) => r.status === 'resolved').length * 25;
    const solved = reports.filter((r) => r.solverUserId === user.id && r.status === 'resolved');
    score += solved.length * 30;
    return score;
  }

  function getUserPoints(user) {
    if (!user) return 0;
    const earned = calcImpact(user, data.reports);
    const spent = (data.redemptions || [])
      .filter((r) => r.userId === user.id)
      .reduce((s, r) => s + r.cost, 0);
    return Math.max(0, earned - spent);
  }

  function normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '').replace(/^57/, '').slice(-10);
  }

  function whatsAppLink(phone, message) {
    const digits = normalizePhone(phone);
    if (!digits) return null;
    const full = digits.length === 10 ? '57' + digits : digits;
    const text = encodeURIComponent(message || 'Hola, te contacto desde VeciIA sobre un reporte de barrio.');
    return `https://wa.me/${full}?text=${text}`;
  }

  const data = initData();
  let sessionUserId = sessionStorage.getItem(SESSION_KEY);

  const listeners = [];
  let readyPayload = null;

  function emit(event, payload) {
    if (event === 'ready') readyPayload = payload;
    listeners.forEach((fn) => fn(event, payload));
  }

  function on(event, fn) {
    if (event === 'ready' && readyPayload) fn(readyPayload);
    listeners.push((e, p) => { if (e === event) fn(p); });
  }

  function getSessionUser() {
    if (!sessionUserId) return null;
    return data.users.find((u) => u.id === sessionUserId) || null;
  }

  function register({ name, email, password, barrio, phone }) {
    if (!name || !email || !password || !barrio) {
      throw new Error('Completa todos los campos.');
    }
    if (password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }
    if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Este correo ya está registrado.');
    }
    const user = {
      id: uid(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      barrio: barrio.trim(),
      phone: normalizePhone(phone || ''),
      createdAt: Date.now(),
    };
    data.users.push(user);
    saveData(data);
    sessionUserId = user.id;
    sessionStorage.setItem(SESSION_KEY, user.id);
    emit('auth', { user });
    return user;
  }

  function login({ email, password }) {
    const user = data.users.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );
    if (!user) throw new Error('Correo o contraseña incorrectos.');
    sessionUserId = user.id;
    sessionStorage.setItem(SESSION_KEY, user.id);
    emit('auth', { user });
    return user;
  }

  function logout() {
    sessionUserId = null;
    sessionStorage.removeItem(SESSION_KEY);
    emit('auth', { user: null });
  }

  function createReport({ description, category, urgency, lat, lng, type, phone }) {
    const user = getSessionUser();
    if (!user) throw new Error('Debes iniciar sesión para reportar.');

    const reportType = type === 'informativo' ? 'informativo' : 'problema';
    const reportPhone = normalizePhone(phone || user.phone);
    if (!reportPhone) throw new Error('Indica un número de WhatsApp para que te contacten.');

    let finalCategory = category || detectCategory(description);
    if (reportType === 'informativo') {
      finalCategory = category === 'auto' || !category ? detectCategory(description) : category;
      if (finalCategory === 'otro') finalCategory = 'informativo';
    } else if (category === 'auto') {
      finalCategory = detectCategory(description);
    }

    const report = {
      id: uid(),
      userId: user.id,
      userName: user.name,
      barrio: user.barrio,
      category: finalCategory,
      type: reportType,
      description: description.trim(),
      lat,
      lng,
      urgency: urgency || (reportType === 'informativo' ? 'baja' : 'media'),
      phone: reportPhone,
      status: 'open',
      createdAt: Date.now(),
      groupId: null,
    };

    data.reports.unshift(report);
    if (reportType === 'problema') regroupReports(data.reports);
    saveData(data);
    emit('reports', { reports: data.reports, newReport: report });
    emit('auth', { user: getSessionUser() });
    return report;
  }

  function resolveReportAsAuthor(reportId, { solverName, solverPhone, solverUserId }) {
    const user = getSessionUser();
    if (!user) throw new Error('Debes iniciar sesión.');

    const report = data.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Reporte no encontrado.');
    if (report.userId !== user.id) throw new Error('Solo quien publicó el reporte puede confirmar la solución.');
    if (report.status === 'resolved') throw new Error('Ya está resuelto.');
    if (report.type === 'informativo') throw new Error('Los avisos informativos no requieren resolución.');
    if (!solverName || !solverName.trim()) throw new Error('Indica quién solucionó el problema.');

    const certId = 'VEC-' + Date.now().toString(36).toUpperCase();
    report.status = 'resolved';
    report.resolvedAt = Date.now();
    report.solverName = solverName.trim();
    report.solverPhone = solverPhone ? normalizePhone(solverPhone) : '';
    report.solverUserId = solverUserId || null;
    report.certificateId = certId;

    const certificate = {
      id: certId,
      reportId: report.id,
      authorId: user.id,
      authorName: user.name,
      authorPhone: report.phone,
      solverName: report.solverName,
      solverPhone: report.solverPhone,
      description: report.description,
      barrio: report.barrio,
      category: report.category,
      createdAt: Date.now(),
    };

    if (!data.certificates) data.certificates = [];
    data.certificates.unshift(certificate);
    regroupReports(data.reports);
    saveData(data);
    emit('reports', { reports: data.reports, certificate });
    emit('auth', { user: getSessionUser() });
    return { report, certificate };
  }

  function getCertificate(certId) {
    const found = (data.certificates || []).find((c) => c.id === certId);
    if (found) return found;

    const report = data.reports.find((r) => r.certificateId === certId);
    if (!report || report.status !== 'resolved') return null;

    return {
      id: certId,
      reportId: report.id,
      authorId: report.userId,
      authorName: report.userName,
      authorPhone: getReportContactPhone(report),
      solverName: report.solverName || 'Vecino colaborador',
      solverPhone: getSolverContactPhone(report),
      description: report.description,
      barrio: report.barrio,
      category: report.category,
      createdAt: report.resolvedAt || report.createdAt,
    };
  }

  function getUserCertificates(userId) {
    return (data.certificates || []).filter((c) => c.authorId === userId || c.solverUserId === userId);
  }

  function getCertificateMessage(cert) {
    const date = new Date(cert.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' });
    return [
      '✅ *Constancia VeciIA – Problema resuelto*',
      '',
      `📋 ID: ${cert.id}`,
      `📅 Fecha: ${date}`,
      `📍 Barrio: ${cert.barrio}`,
      `📝 Reporte: ${cert.description}`,
      `👤 Publicado por: ${cert.authorName}`,
      `🦸 Solucionado por: ${cert.solverName}`,
      '',
      'Validado en la plataforma comunitaria VeciIA – Cartagena.',
    ].join('\n');
  }

  function redeemOffer(offerId) {
    const user = getSessionUser();
    if (!user) throw new Error('Debes iniciar sesión.');
    const offer = SPONSOR_OFFERS.find((o) => o.id === offerId);
    if (!offer) throw new Error('Oferta no encontrada.');
    const points = getUserPoints(user);
    if (points < offer.cost) {
      throw new Error(`Necesitas ${offer.cost} pts. Tienes ${points} pts disponibles.`);
    }
    const redemption = {
      id: uid(),
      userId: user.id,
      offerId: offer.id,
      sponsor: offer.sponsor,
      title: offer.title,
      cost: offer.cost,
      code: 'VECI-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: Date.now(),
    };
    if (!data.redemptions) data.redemptions = [];
    data.redemptions.push(redemption);
    saveData(data);
    emit('auth', { user: getSessionUser() });
    return { redemption, offer };
  }

  function getUserRedemptions(userId) {
    return (data.redemptions || []).filter((r) => r.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }

  function getUserReports(userId) {
    return data.reports.filter((r) => r.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }

  function updateUserProfile({ phone, barrio }) {
    const user = getSessionUser();
    if (!user) throw new Error('Debes iniciar sesión.');
    if (phone !== undefined) user.phone = normalizePhone(phone);
    if (barrio) user.barrio = barrio.trim();
    saveData(data);
    emit('auth', { user: getSessionUser() });
    return user;
  }

  function getReports(filter = {}) {
    let list = [...data.reports];
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    if (filter.category) list = list.filter((r) => r.category === filter.category);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  function getGroupCount(report) {
    if (!report.groupId) return 1;
    return data.reports.filter((r) => r.groupId === report.groupId && r.status === 'open').length;
  }

  function getStats() {
    const users = data.users.length + 847;
    const reports = data.reports.length;
    const resolved = data.reports.filter((r) => r.status === 'resolved').length;
    const entities = 12 + Math.min(data.users.length, 38);
    return { users, reports, resolved, entities };
  }

  function getHeatPoints(filter = {}) {
    let open = data.reports.filter((r) => r.status === 'open' && r.type !== 'informativo');
    if (filter.category) open = open.filter((r) => r.category === filter.category);

    return open.map((r) => {
      const base = URGENCY_WEIGHT[r.urgency] || 0.7;
      const groupBoost = Math.min(getGroupCount(r) - 1, 4) * 0.2;
      return [r.lat, r.lng, Math.min(base + groupBoost, 1.8)];
    });
  }

  function getCommunityActivity() {
    const activities = [];
    const open = data.reports.filter((r) => r.status === 'open').slice(0, 6);
    open.forEach((r) => {
      const cat = CATEGORIES[r.category] || CATEGORIES.otro;
      const group = getGroupCount(r);
      activities.push({
        type: 'report',
        reportId: r.id,
        report: r,
        icon: cat.icon,
        text: `${r.userName} reportó: "${r.description.slice(0, 55)}${r.description.length > 55 ? '…' : ''}"`,
        meta: `${r.barrio} · ${r.urgency}${group > 1 ? ` · 🤖 ${group} vecinos` : ''}`,
        time: timeAgo(r.createdAt),
      });
    });
    data.reports.filter((r) => r.status === 'resolved').slice(0, 4).forEach((r) => {
      const cat = CATEGORIES[r.category] || CATEGORIES.otro;
      activities.push({
        type: 'resolved',
        reportId: r.id,
        report: r,
        icon: '✅',
        text: `"${r.description.slice(0, 50)}${r.description.length > 50 ? '…' : ''}"`,
        meta: `${r.userName} · resolvió ${r.solverName || 'un vecino'} · ${r.barrio}`,
        time: timeAgo(r.resolvedAt || r.createdAt),
      });
    });
    RESOLVED_EXAMPLES.forEach((ex) => {
      activities.push({
        type: 'story',
        icon: ex.icon,
        text: `${ex.userName} (${ex.barrio}): ${ex.action}`,
        meta: `+${ex.points} pts de impacto`,
        time: ex.time,
      });
    });
    return activities
      .sort((a, b) => {
        const order = { report: 0, resolved: 1, story: 2 };
        return (order[a.type] ?? 3) - (order[b.type] ?? 3);
      })
      .slice(0, 12);
  }

  function getResolvedStories() {
    return data.reports
      .filter((r) => r.status === 'resolved')
      .map((r) => ({
        id: r.id,
        userName: r.userName,
        barrio: r.barrio,
        description: r.description,
        category: r.category,
        icon: (CATEGORIES[r.category] || CATEGORIES.otro).icon,
        solverName: r.solverName,
        solverPhone: getSolverContactPhone(r),
        phone: getReportContactPhone(r),
        certificateId: r.certificateId,
        userId: r.userId,
        type: r.type,
        status: r.status,
        resolvedAt: r.resolvedAt,
      }))
      .slice(0, 12);
  }

  function getTopNeighbors() {
    const counts = {};
    data.reports.forEach((r) => {
      if (!counts[r.userName]) counts[r.userName] = { name: r.userName, barrio: r.barrio, reports: 0, resolved: 0 };
      counts[r.userName].reports++;
      if (r.status === 'resolved') counts[r.userName].resolved++;
    });
    return Object.values(counts)
      .map((u) => ({ ...u, score: u.reports * 10 + u.resolved * 25 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins || 1} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Ayer' : `Hace ${days} días`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function getReportById(id) {
    return data.reports.find((r) => r.id === id) || null;
  }

  function buildReportContactsHtml(report, variant) {
    const btnClass = variant === 'popup' ? 'popup-wa-btn'
      : variant === 'compact' ? 'report-chip report-chip--wa'
      : 'report-wa-btn';
    let html = '';

    const authorPhone = getReportContactPhone(report);
    if (authorPhone) {
      const msg = `Hola ${report.userName}, vi tu reporte en VeciIA: "${report.description.slice(0, 100)}" y quiero ayudar.`;
      const wa = whatsAppLink(authorPhone, msg);
      const authorLabel = variant === 'compact'
        ? `💬 ${escapeHtml(report.userName.split(' ')[0])}`
        : `💬 Contactar a ${escapeHtml(report.userName)} (reportó)`;
      html += `<a href="${wa}" target="_blank" rel="noopener" class="${btnClass}">${authorLabel}</a>`;
    }

    if (report.status === 'resolved' && report.solverName) {
      const solverPhone = getSolverContactPhone(report);
      if (solverPhone) {
        const msg = `Hola ${report.solverName}, vi que ayudaste a resolver un reporte en VeciIA: "${report.description.slice(0, 80)}". ¡Gracias!`;
        const wa = whatsAppLink(solverPhone, msg);
        const solverClass = variant === 'compact'
          ? 'report-chip report-chip--wa report-chip--solver'
          : variant === 'list' ? `${btnClass} report-wa-btn--solver` : btnClass;
        const solverLabel = variant === 'compact'
          ? `✅ ${escapeHtml(report.solverName.split(' ')[0])}`
          : `💬 Contactar a ${escapeHtml(report.solverName)} (resolvió)`;
        html += `<a href="${wa}" target="_blank" rel="noopener" class="${solverClass}">${solverLabel}</a>`;
      }
    }

    if (!html) {
      html = variant === 'compact'
        ? '<span class="report-chip report-chip--muted">Sin WhatsApp</span>'
        : '<p class="report-no-contact">Sin WhatsApp registrado para este reporte.</p>';
    }
    return html;
  }

  function buildReportActionsHtml(report, variant) {
    const user = getSessionUser();
    const isAuthor = user && report.userId === user.id;
    const isInformativo = report.type === 'informativo';
    const isCompact = variant === 'compact';
    const wrapClass = isCompact ? 'report-actions-compact' : 'report-item-actions';

    let html = `<div class="${wrapClass}">`;
    html += buildReportContactsHtml(report, isCompact ? 'compact' : 'list');

    if (report.status === 'resolved') {
      if (report.certificateId) {
        const certClass = isCompact ? 'report-chip report-chip--cert report-cert-btn' : 'report-cert-btn btn-secondary btn-sm';
        const certLabel = isCompact ? '📄 Constancia' : 'Ver constancia';
        html += `<button type="button" class="${certClass}" data-cert="${report.certificateId}">${certLabel}</button>`;
      }
    } else if (!isInformativo && isAuthor) {
      const resolveClass = isCompact ? 'report-chip report-chip--resolve report-resolve-open' : 'report-resolve-open btn-primary btn-sm';
      const resolveLabel = isCompact ? '✓ Resolver' : 'Marcar resuelto';
      html += `<button type="button" class="${resolveClass}" data-id="${report.id}">${resolveLabel}</button>`;
    } else if (isInformativo && !isCompact) {
      html += '<span class="report-info-badge">ℹ️ Aviso informativo</span>';
    }

    html += '</div>';
    return html;
  }

  function getCommunityCompareStats() {
    const reports = data.reports.filter((r) => r.type !== 'informativo');
    const open = reports.filter((r) => r.status === 'open');
    const resolved = reports.filter((r) => r.status === 'resolved');
    const total = reports.length || 1;

    const categoryKeys = Object.keys(CATEGORIES).filter((k) => k !== 'informativo' && k !== 'otro');
    const byCategory = categoryKeys.map((key) => {
      const cat = CATEGORIES[key];
      const o = open.filter((r) => r.category === key).length;
      const res = resolved.filter((r) => r.category === key).length;
      return { key, label: cat.label, icon: cat.icon, open: o, resolved: res, total: o + res };
    }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

    const barrioMap = {};
    reports.forEach((r) => {
      if (!barrioMap[r.barrio]) barrioMap[r.barrio] = { open: 0, resolved: 0 };
      if (r.status === 'open') barrioMap[r.barrio].open += 1;
      else barrioMap[r.barrio].resolved += 1;
    });
    const byBarrio = Object.entries(barrioMap)
      .map(([name, counts]) => ({ name, open: counts.open, resolved: counts.resolved, total: counts.open + counts.resolved }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const maxCategoryTotal = Math.max(1, ...byCategory.map((c) => c.total));
    const maxBarrioTotal = Math.max(1, ...byBarrio.map((b) => b.total));

    return {
      openCount: open.length,
      resolvedCount: resolved.length,
      total: reports.length,
      resolutionRate: Math.round((resolved.length / total) * 100),
      byCategory,
      byBarrio,
      maxCategoryTotal,
      maxBarrioTotal,
    };
  }

  window.VeciIA = {
    CATEGORIES,
    REPORT_TYPES,
    SPONSOR_OFFERS,
    URGENCY_WEIGHT,
    on,
    register,
    login,
    logout,
    getSessionUser,
    createReport,
    resolveReportAsAuthor,
    getReports,
    getReportById,
    getGroupCount,
    getStats,
    getHeatPoints,
    getCommunityActivity,
    getCommunityCompareStats,
    getResolvedStories,
    getTopNeighbors,
    getImpactLevel,
    calcImpact,
    getUserPoints,
    getUserReports,
    getUserRedemptions,
    getUserCertificates,
    getCertificate,
    getCertificateMessage,
    redeemOffer,
    updateUserProfile,
    whatsAppLink,
    getReportContactPhone,
    getSolverContactPhone,
    buildReportContactsHtml,
    buildReportActionsHtml,
    escapeHtml,
    normalizePhone,
    detectCategory,
    CARTAGENA_CENTER: [10.391, -75.512],
    CARTAGENA_BOUNDS: [[10.32, -75.58], [10.48, -75.44]],
    CARTAGENA_ZOOM: 13,
  };

  emit('ready', { user: getSessionUser(), reports: data.reports });
})();
