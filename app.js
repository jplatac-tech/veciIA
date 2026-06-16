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
    otro: { label: 'Otro', icon: '📍', keywords: [] },
  };

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
      };
      regroupReports(data.reports);
      saveData(data);
    } else {
      ensureRichSeedData(data);
    }
    return data;
  }

  function buildSeedReports() {
    return SEED_REPORTS.map((r, i) => ({
      id: 'seed-' + i,
      userId: 'demo',
      userName: r.userName,
      barrio: r.barrio,
      category: r.category,
      description: r.description,
      lat: r.lat,
      lng: r.lng,
      urgency: r.urgency,
      status: i % 5 === 0 ? 'resolved' : 'open',
      createdAt: Date.now() - (i + 1) * 3600000 * 4,
      groupId: null,
    }));
  }

  function ensureRichSeedData(data) {
    const seedCount = data.reports.filter((r) => r.id.startsWith('seed-') || r.id.startsWith('extra-')).length;
    if (seedCount >= SEED_REPORTS.length) return;
    const existingIds = new Set(data.reports.map((r) => r.id));
    SEED_REPORTS.forEach((r, i) => {
      const id = 'seed-' + i;
      if (!existingIds.has(id)) {
        data.reports.push({
          id,
          userId: 'demo',
          userName: r.userName,
          barrio: r.barrio,
          category: r.category,
          description: r.description,
          lat: r.lat,
          lng: r.lng,
          urgency: r.urgency,
          status: i % 5 === 0 ? 'resolved' : 'open',
          createdAt: Date.now() - (i + 1) * 3600000 * 4,
          groupId: null,
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
    score += userReports.length * 10;
    score += userReports.filter((r) => r.status === 'resolved').length * 25;
    return score;
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

  function register({ name, email, password, barrio }) {
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

  function createReport({ description, category, urgency, lat, lng }) {
    const user = getSessionUser();
    if (!user) throw new Error('Debes iniciar sesión para reportar.');

    const report = {
      id: uid(),
      userId: user.id,
      userName: user.name,
      barrio: user.barrio,
      category: category || detectCategory(description),
      description: description.trim(),
      lat,
      lng,
      urgency: urgency || 'media',
      status: 'open',
      createdAt: Date.now(),
      groupId: null,
    };

    data.reports.unshift(report);
    regroupReports(data.reports);
    saveData(data);
    emit('reports', { reports: data.reports, newReport: report });
    emit('auth', { user: getSessionUser() });
    return report;
  }

  function resolveReport(reportId) {
    const user = getSessionUser();
    if (!user) throw new Error('Debes iniciar sesión.');

    const report = data.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Reporte no encontrado.');
    if (report.status === 'resolved') throw new Error('Ya está resuelto.');

    report.status = 'resolved';
    report.resolvedBy = user.id;
    report.resolvedAt = Date.now();
    regroupReports(data.reports);
    saveData(data);
    emit('reports', { reports: data.reports });
    emit('auth', { user: getSessionUser() });
    return report;
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
    let open = data.reports.filter((r) => r.status === 'open');
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
        icon: '✅',
        text: `Problema resuelto: "${r.description.slice(0, 50)}…"`,
        meta: `${r.barrio} · +25 pts de impacto`,
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
    const fromData = data.reports
      .filter((r) => r.status === 'resolved')
      .map((r) => ({
        userName: r.userName,
        barrio: r.barrio,
        description: r.description,
        category: r.category,
        icon: (CATEGORIES[r.category] || CATEGORIES.otro).icon,
      }));
    return fromData.length >= 3 ? fromData.slice(0, 6) : RESOLVED_EXAMPLES.map((e) => ({
      userName: e.userName,
      barrio: e.barrio,
      description: e.action,
      icon: e.icon,
    }));
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

  window.VeciIA = {
    CATEGORIES,
    URGENCY_WEIGHT,
    on,
    register,
    login,
    logout,
    getSessionUser,
    createReport,
    resolveReport,
    getReports,
    getGroupCount,
    getStats,
    getHeatPoints,
    getCommunityActivity,
    getResolvedStories,
    getTopNeighbors,
    getImpactLevel,
    calcImpact,
    detectCategory,
    CARTAGENA_CENTER: [10.391, -75.512],
    CARTAGENA_BOUNDS: [[10.32, -75.58], [10.48, -75.44]],
    CARTAGENA_ZOOM: 13,
  };

  emit('ready', { user: getSessionUser(), reports: data.reports });
})();
