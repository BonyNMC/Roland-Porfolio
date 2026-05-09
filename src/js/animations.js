/* ==========================================================================
   ANIMATIONS JS — IntersectionObserver scroll reveals
   ========================================================================== */

/**
 * Initialize scroll reveal animations
 * Elements with class 'reveal', 'reveal-left', 'reveal-right',
 * 'reveal-scale', or 'reveal-stagger' will animate on scroll.
 */
export function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Animate once
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  const targets = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger'
  );
  targets.forEach((el) => observer.observe(el));
}

/**
 * Initialize navbar scroll behavior (add shadow on scroll)
 */
export function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  });
}

/**
 * Initialize mobile menu toggle
 */
export function initMobileMenu() {
  const toggle = document.querySelector('.navbar__mobile-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.querySelector('.material-symbols-outlined').textContent =
      isOpen ? 'close' : 'menu';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  menu.querySelectorAll('.mobile-menu__link').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.querySelector('.material-symbols-outlined').textContent = 'menu';
      document.body.style.overflow = '';
    });
  });
}

/**
 * Smooth scroll to anchor
 */
export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/**
 * Initialize all animations & interactions
 */
export function initAllAnimations() {
  // Wait for DOM paint
  requestAnimationFrame(() => {
    initScrollReveal();
    initNavbarScroll();
    initMobileMenu();
    initSmoothScroll();

    // Add page enter animation
    const main = document.querySelector('main');
    if (main) main.classList.add('page-enter');
  });
}
