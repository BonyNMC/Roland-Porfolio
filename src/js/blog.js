import { initAllAnimations } from './animations.js';
import { fetchData, formatDateShort } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  initAllAnimations();
  loadBlogData();
  initParaNav();
  initSearch();
});

let allPosts = [];

const PARA_TITLES = {
  'all': 'Tất cả bài viết',
  'Projects': 'Dự án đang thực hiện',
  'Areas': 'Lĩnh vực chuyên sâu',
  'Resources': 'Tài nguyên & Công cụ',
  'Archives': 'Kho lưu trữ'
};

async function loadBlogData() {
  try {
    const res = await fetchData('getBlogPosts');
    if (!res.success) return;
    allPosts = res.data;
    renderPosts(allPosts);
  } catch (err) {
    console.warn('[Blog] Data load failed:', err);
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('blog-grid');
  const countEl = document.getElementById('blog-count');
  if (!grid) return;
  if (countEl) countEl.textContent = `Hiển thị ${posts.length} bài viết`;

  if (posts.length === 0) {
    grid.innerHTML = '<p class="text-body-md text-on-surface-variant" style="grid-column:1/-1;padding:var(--space-4);">Chưa có bài viết trong danh mục này.</p>';
    return;
  }

  const cards = posts.map((post, i) => {
    const dateStr = post.date ? formatDateShort(post.date) : '';
    const isFeatured = i === 0 && posts.length > 1;

    if (post.para_type === 'Archives' && !isFeatured) {
      return `
        <article class="blog-card blog-card--quote">
          <span class="material-symbols-outlined text-secondary" style="font-size:36px;opacity:0.5;margin-bottom:var(--space-2);">format_quote</span>
          <h3 class="text-headline-sm text-primary" style="font-style:italic;max-width:600px;margin-bottom:var(--space-2);">"${post.excerpt}"</h3>
          <div style="display:flex;align-items:center;gap:var(--space-unit);margin-top:var(--space-2);">
            <span class="text-label-caps blog-card__para-badge" style="background:rgba(130,116,112,0.1);color:var(--on-surface);">ARCHIVES</span>
            <span class="text-label-caps text-on-surface-variant">${dateStr || post.tags}</span>
          </div>
        </article>`;
    }

    return `
      <article class="blog-card ${isFeatured ? 'blog-card--featured' : ''}">
        <div class="blog-card__image">
          <div style="width:100%;height:100%;background:linear-gradient(135deg,var(--surface-container) 0%,var(--surface-dim) 100%);display:flex;align-items:center;justify-content:center;">
            <span class="material-symbols-outlined" style="font-size:48px;opacity:0.15;">article</span>
          </div>
        </div>
        <div class="blog-card__content">
          <div class="blog-card__meta">
            <span class="text-label-caps blog-card__para-badge">${post.para_type}</span>
            <span class="text-label-caps text-on-surface-variant">${dateStr}</span>
          </div>
          <h3 class="text-headline-sm text-primary" style="margin-bottom:var(--space-unit);">${post.title}</h3>
          <p class="text-body-md text-on-surface-variant" style="margin-bottom:var(--space-3);display:-webkit-box;-webkit-line-clamp:${isFeatured ? 3 : 2};-webkit-box-orient:vertical;overflow:hidden;">${post.excerpt}</p>
          <div class="blog-card__readmore text-label-caps text-primary">
            ĐỌC TIẾP <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
          </div>
        </div>
      </article>`;
  });

  grid.innerHTML = cards.join('');
}

function initParaNav() {
  document.querySelectorAll('.para-nav__item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.para-nav__item').forEach(i => i.classList.remove('para-nav__item--active'));
      item.classList.add('para-nav__item--active');
      const para = item.dataset.para;
      const titleEl = document.getElementById('blog-category-title');
      if (titleEl) titleEl.textContent = PARA_TITLES[para] || para;
      const filtered = para === 'all' ? allPosts : allPosts.filter(p => p.para_type === para);
      renderPosts(filtered);
    });
  });
}

function initSearch() {
  const input = document.getElementById('blog-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { renderPosts(allPosts); return; }
    const filtered = allPosts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q) ||
      (p.tags || '').toLowerCase().includes(q)
    );
    renderPosts(filtered);
  });
}
