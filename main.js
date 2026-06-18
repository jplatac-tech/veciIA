(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ── Sticky header (always visible) ── */
  const header = document.querySelector('.header');

  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ── */
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const overlay = document.querySelector('.nav-overlay');

  function closeMenu() {
    nav?.classList.remove('open');
    menuToggle?.classList.remove('active');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menú');
    overlay?.classList.remove('visible');
    document.body.classList.remove('menu-open');
  }

  menuToggle?.addEventListener('click', () => {
    if (!nav) return;
    const isOpen = nav.classList.toggle('open');
    menuToggle.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    overlay?.classList.toggle('visible', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  overlay?.addEventListener('click', closeMenu);
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  /* ── Scroll reveal ── */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => entry.target.classList.add('revealed'), delay);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('revealed'));
  }

  function runDeferredEffects() {
    /* ── Blob parallax ── */
    const blobs = document.querySelectorAll('.blob');
    if (!prefersReducedMotion && finePointer && blobs.length) {
      document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        blobs.forEach((blob, i) => {
          const factor = (i + 1) * 12;
          blob.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
        });
      }, { passive: true });
    }

    /* ── Hero tilt ── */
    const heroImage = document.querySelector('.hero-image');
    if (!prefersReducedMotion && heroImage && finePointer) {
      heroImage.addEventListener('mousemove', (e) => {
        const rect = heroImage.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        heroImage.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      });
      heroImage.addEventListener('mouseleave', () => { heroImage.style.transform = ''; });
    }

    /* ── Card tilt ── */
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      if (prefersReducedMotion || !finePointer) return;
      if (card.classList.contains('benefit-card')) return;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    /* ── Button ripple ── */
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = this.getBoundingClientRect();
        ripple.style.left = e.clientX - rect.left + 'px';
        ripple.style.top = e.clientY - rect.top + 'px';
        this.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });

    /* ── Live map notifications (hero) ── */
    const notifContainer = document.querySelector('.map-notifications');
    const notifications = [
      { icon: '🕳️', text: 'Alcantarilla reportada' },
      { icon: '💡', text: 'Corte de luz' },
      { icon: '🐕', text: 'Mascota perdida' },
      { icon: '✅', text: 'Problema resuelto' },
    ];
    let notifIndex = 0;

    if (notifContainer && !prefersReducedMotion) {
      function showNotification() {
        const data = notifications[notifIndex % notifications.length];
        const el = document.createElement('div');
        el.className = 'map-notif';
        el.innerHTML = `<span>${data.icon}</span><span>${data.text}</span>`;
        notifContainer.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
          el.classList.remove('show');
          setTimeout(() => el.remove(), 400);
        }, 3200);
        notifIndex++;
      }
      showNotification();
      setInterval(showNotification, 4500);
    }
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(runDeferredEffects, { timeout: 2000 });
  } else {
    setTimeout(runDeferredEffects, 200);
  }

  /* ── Impact levels ── */
  const levels = document.querySelectorAll('.level');
  let levelIndex = 1;

  if (!prefersReducedMotion && levels.length) {
    setInterval(() => {
      levels.forEach((l) => l.classList.remove('active'));
      levels[levelIndex].classList.add('active');
      levelIndex = (levelIndex + 1) % levels.length;
    }, 3000);
  }

  levels.forEach((level, i) => {
    level.addEventListener('click', () => {
      levels.forEach((l) => l.classList.remove('active'));
      level.classList.add('active');
      levelIndex = i;
    });
  });

  /* ── Example cards ── */
  document.querySelectorAll('.example-card').forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.add('tapped');
      setTimeout(() => card.classList.remove('tapped'), 400);
    });
  });

  /* ── Growth rings ── */
  const growthMap = document.querySelector('.growth-map');
  if (growthMap && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          growthMap.classList.add('animated');
        }
      });
    }, { threshold: 0.3 }).observe(growthMap);
  }

  /* ── Keyboard ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      document.getElementById('auth-modal')?.classList.remove('open');
      document.body.classList.remove('menu-open');
    }
  });
})();
