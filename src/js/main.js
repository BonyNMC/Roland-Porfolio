/* ==========================================================================
   MAIN JS — Entry point, loads dynamic data from GAS API
   ========================================================================== */

import { initAllAnimations } from './animations.js';
import { fetchData, driveImageUrl, formatDateShort } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  initAllAnimations();
  loadDynamicData();
});

async function loadDynamicData() {
  try {
    const res = await fetchData('getAll');
    if (!res.success) return;
    const { config, projects, blog_posts, podcast_episodes } = res.data;

    // Update config-driven text
    if (config) applyConfig(config);

    // Update PARA blog cards with real data
    if (blog_posts && blog_posts.length) applyBlogPreview(blog_posts);

  } catch (err) {
    console.warn('[Portfolio] Dynamic data load failed, using static fallback:', err);
  }
}

function applyConfig(config) {
  // Hero headlines
  const h1 = document.getElementById('hero-headline-1');
  if (h1 && config.hero_headline_1) h1.textContent = config.hero_headline_1;

  const h2 = document.getElementById('hero-headline-2');
  if (h2 && config.hero_headline_2) h2.textContent = config.hero_headline_2;

  // Hero description
  const desc = document.getElementById('hero-description');
  if (desc && config.hero_description) desc.textContent = config.hero_description;

  // Portrait image from Drive
  const portrait = document.getElementById('hero-portrait');
  if (portrait && config.portrait_url) {
    portrait.src = driveImageUrl(config.portrait_url);
  }

  // Stamp
  const stampYear = document.getElementById('hero-stamp-year');
  if (stampYear && config.dob) {
    const year = config.dob.split('/').pop().trim();
    stampYear.textContent = `EST. ${year}`;
  }

  const stampLocation = document.getElementById('hero-stamp-location');
  if (stampLocation && config.location) stampLocation.textContent = config.location;

  // About metadata
  const dob = document.getElementById('about-dob');
  if (dob && config.dob) dob.textContent = config.dob;

  const loc = document.getElementById('about-location');
  if (loc && config.location) loc.textContent = config.location;

  const cert = document.getElementById('about-certification');
  if (cert && config.certification) cert.textContent = config.certification;

  // About mission & detail
  const mission = document.getElementById('about-mission');
  if (mission && config.about_mission) mission.textContent = config.about_mission;

  const detail = document.getElementById('about-detail');
  if (detail && config.about_detail) detail.textContent = config.about_detail;

  // Contact links
  const emailLink = document.getElementById('contact-email');
  if (emailLink && config.email) emailLink.href = `mailto:${config.email}`;

  const linkedinLink = document.getElementById('contact-linkedin');
  if (linkedinLink && config.linkedin_url) linkedinLink.href = config.linkedin_url;

  const footerLinkedin = document.getElementById('footer-linkedin');
  if (footerLinkedin && config.linkedin_url) footerLinkedin.href = config.linkedin_url;
}

function applyBlogPreview(posts) {
  const paraTypes = ['Projects', 'Areas', 'Resources', 'Archives'];
  const container = document.getElementById('blog-preview-cards');
  if (!container) return;

  // Only replace if we have real posts
  const cards = paraTypes.map(type => {
    const post = posts.find(p => p.para_type === type);
    if (!post) return null;

    const isArchive = type === 'Archives';
    const cardClass = isArchive ? 'card-archive' : 'card-dossier';
    const labelColor = isArchive ? 'text-outline' : 'text-secondary';
    const dateStr = post.date ? formatDateShort(post.date) : '';

    return `
      <article class="${cardClass}">
        <div class="text-label-caps ${labelColor}" style="margin-bottom:var(--space-unit);padding-bottom:var(--space-unit);border-bottom:var(--border-ghost);">${type}</div>
        <h3 class="text-headline-sm text-primary" style="font-size:20px;margin:var(--space-unit) 0 var(--space-unit);">${post.title}</h3>
        <p class="text-body-md text-on-surface-variant" style="font-size:14px;flex-grow:1;">${post.excerpt}</p>
        <div class="text-label-caps text-outline" style="font-size:10px;margin-top:var(--space-3);">${dateStr || post.tags}</div>
      </article>
    `;
  }).filter(Boolean);

  if (cards.length) container.innerHTML = cards.join('');
}
