import { initAllAnimations } from './animations.js';
import { fetchData } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  initAllAnimations();
  loadPortfolioData();
});

const ICONS = ['factory', 'memory', 'school', 'precision_manufacturing', 'analytics', 'hub'];

async function loadPortfolioData() {
  try {
    const res = await fetchData('getAll');
    if (!res.success) return;
    const { projects, skills, testimonials } = res.data;
    if (projects) renderProjects(projects);
    if (skills) renderSkills(skills);
    if (testimonials) renderTestimonials(testimonials);
  } catch (err) {
    console.warn('[Portfolio] Data load failed:', err);
  }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  grid.innerHTML = projects.map((p, i) => {
    const tags = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    return `
      <article class="project-card">
        <div class="project-card__icon">
          <span class="material-symbols-outlined">${ICONS[i % ICONS.length]}</span>
        </div>
        <div style="margin-bottom:var(--space-3);">
          <div class="project-card__tags">
            ${tags.map(t => `<span class="chip">${t}</span>`).join('')}
          </div>
          <h3 class="text-headline-md text-primary" style="margin-bottom:var(--space-unit);">${p.title}</h3>
          <p class="text-label-caps text-secondary">Role: ${p.role}</p>
        </div>
        <div class="project-card__impact">
          <p class="text-body-md text-on-surface-variant"><strong>Impact:</strong> ${p.impact}</p>
        </div>
      </article>`;
  }).join('');
}

function renderSkills(skills) {
  const container = document.getElementById('skills-container');
  if (!container) return;
  const grouped = {};
  skills.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s.name);
  });
  container.innerHTML = Object.entries(grouped).map(([cat, names]) => `
    <div class="skill-category">
      <h4 class="text-label-caps text-secondary skill-category__title">${cat}</h4>
      <div class="skill-chips">
        ${names.map(n => `<span class="skill-chip">${n}</span>`).join('')}
      </div>
    </div>`).join('');
}

function renderTestimonials(testimonials) {
  const grid = document.getElementById('testimonials-grid');
  if (!grid) return;
  grid.innerHTML = testimonials.map(t => `
    <div class="testimonial-card">
      <span class="material-symbols-outlined testimonial-card__quote-icon" style="font-size:40px;">format_quote</span>
      <p class="testimonial-card__text">"${t.quote}"</p>
      <div class="testimonial-card__author">
        <div class="testimonial-card__avatar"><span>${t.avatar_initial}</span></div>
        <div>
          <p class="text-label-caps text-primary">${t.name}</p>
          <p class="text-body-md text-on-surface-variant" style="font-size:14px;">${t.title}</p>
        </div>
      </div>
    </div>`).join('');
}
