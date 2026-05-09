import { initAllAnimations } from './animations.js';
import { fetchData, formatDateVi } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  initAllAnimations();
  loadPodcastData();
  initFilters();
});

let allEpisodes = [];

async function loadPodcastData() {
  try {
    const res = await fetchData('getPodcastEpisodes');
    if (!res.success) return;
    allEpisodes = res.data;
    if (allEpisodes.length > 0) {
      renderFeatured(allEpisodes[0]);
      renderArchive(allEpisodes.slice(1));
    }
  } catch (err) {
    console.warn('[Podcast] Data load failed:', err);
  }
}

function renderFeatured(ep) {
  const el = document.getElementById('featured-episode');
  if (!el) return;
  const d = ep.date ? new Date(ep.date) : null;
  const dateStr = d ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}` : '';

  el.innerHTML = `
    <div class="featured-ep">
      <div class="featured-ep__play">
        <a href="${ep.spotify_embed_url || '#'}" target="_blank" rel="noopener" class="featured-ep__play-btn">
          <span class="material-symbols-outlined" style="font-size:48px;margin-left:4px;font-variation-settings:'FILL' 1;">play_arrow</span>
        </a>
        <div class="featured-ep__play-meta">
          <span class="text-label-caps">${ep.duration_min} MIN</span>
          <span class="text-label-caps">${dateStr}</span>
        </div>
      </div>
      <div class="featured-ep__content">
        <span class="text-label-caps text-primary" style="display:block;margin-bottom:var(--space-2);">Tập ${ep.id}</span>
        <h3 class="text-headline-md text-on-surface" style="margin-bottom:var(--space-3);">${ep.title}</h3>
        <p class="text-body-md text-on-surface-variant" style="margin-bottom:var(--space-4);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${ep.description}</p>
        <a href="${ep.spotify_embed_url || '#'}" target="_blank" rel="noopener" class="btn-link" style="width:fit-content;">
          Nghe Chi Tiết <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
        </a>
      </div>
    </div>`;
}

function renderArchive(episodes) {
  const grid = document.getElementById('episodes-grid');
  if (!grid) return;
  grid.innerHTML = episodes.map(ep => {
    const d = ep.date ? new Date(ep.date) : null;
    const monthStr = d ? `${String(d.getDate()).padStart(2,'0')} Tháng ${d.getMonth()+1}` : '';
    return `
      <article class="episode-card" data-tags="${ep.topic_tags || ''}">
        <div class="episode-card__header">
          <span class="text-label-caps text-on-surface-variant">Tập ${ep.id}</span>
          <a href="${ep.spotify_embed_url || '#'}" target="_blank" rel="noopener" class="episode-card__play">
            <span class="material-symbols-outlined" style="font-size:32px;font-variation-settings:'FILL' 1;">play_circle</span>
          </a>
        </div>
        <h3 class="text-headline-sm" style="margin-bottom:var(--space-unit);flex-grow:1;">${ep.title}</h3>
        <p class="text-body-md text-on-surface-variant" style="margin-bottom:var(--space-3);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${ep.description}</p>
        <div class="episode-card__footer">
          <span class="text-label-caps text-on-surface-variant episode-card__meta">
            <span class="material-symbols-outlined" style="font-size:14px;">schedule</span>
            ${ep.duration_min} Phút
          </span>
          <span class="text-label-caps text-on-surface-variant episode-card__meta">
            <span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span>
            ${monthStr}
          </span>
        </div>
      </article>`;
  }).join('');
}

function initFilters() {
  document.querySelectorAll('.podcast-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.podcast-filter').forEach(b => b.classList.remove('chip--active'));
      btn.classList.add('chip--active');
      const filter = btn.dataset.filter;
      const cards = document.querySelectorAll('.episode-card');
      cards.forEach(card => {
        if (filter === 'all' || (card.dataset.tags || '').includes(filter)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}
