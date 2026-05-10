/* ==========================================================================
   BLOG DETAIL JS — Fetch post metadata + Google Docs content via GAS
   ========================================================================== */

import { initAllAnimations } from './animations.js';
import { fetchData, formatDateVi } from './api.js';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxh956mQcnj38g8iG4B_XRJ3fqZ4yAp8HXJs7hrjI8-Q1qrPz-R83M1nnabr5ytF2fE6w/exec';

document.addEventListener('DOMContentLoaded', () => {
  initAllAnimations();
  loadBlogDetail();
});

async function loadBlogDetail() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');

  if (!postId) {
    showError('Không tìm thấy bài viết. Vui lòng quay lại thư viện.');
    return;
  }

  try {
    // Step 1: Fetch all posts and find by ID (uses existing endpoint)
    const postsRes = await fetchData('getBlogPosts');
    if (!postsRes.success || !postsRes.data) {
      showError('Không thể tải dữ liệu bài viết.');
      return;
    }

    const post = postsRes.data.find(p => String(p.id) === String(postId));
    if (!post) {
      showError('Bài viết không tồn tại.');
      return;
    }
    renderPostHeader(post);

    // Step 2: If content_url exists, fetch Google Docs content
    if (post.content_url && post.content_url.toString().trim()) {
      await loadDocContent(post.content_url);
    } else {
      // No doc linked — show fallback
      document.getElementById('article-body').style.display = 'none';
      document.getElementById('article-no-content').style.display = '';
    }

    // Show footer
    document.getElementById('article-footer').style.display = '';
    renderTags(post.tags);

    // Update page title
    document.title = `${post.title} — Nguyen Manh Cuong`;

  } catch (err) {
    console.error('[BlogDetail] Load failed:', err);
    showError('Không thể tải bài viết. Vui lòng thử lại.');
  }
}

function renderPostHeader(post) {
  // PARA badge + date
  const metaEl = document.getElementById('article-meta');
  const dateStr = post.date ? formatDateVi(post.date) : '';
  metaEl.innerHTML = `
    <span class="article__para-badge">${post.para_type || 'Blog'}</span>
    ${dateStr ? `<span class="article__date">${dateStr}</span>` : ''}
  `;

  // Title
  document.getElementById('article-title').textContent = post.title;

  // Excerpt
  const excerptEl = document.getElementById('article-excerpt');
  if (post.excerpt) {
    excerptEl.textContent = post.excerpt;
  } else {
    excerptEl.style.display = 'none';
  }
}

async function loadDocContent(docUrl) {
  const bodyEl = document.getElementById('article-body');

  try {
    // Fetch doc content via GAS
    const url = new URL(GAS_URL);
    url.searchParams.set('action', 'getDocContent');
    url.searchParams.set('url', docUrl.toString().trim());

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.success && data.data && data.data.html) {
      // Render clean HTML
      bodyEl.innerHTML = data.data.html;

      // Post-process: convert any Google Drive image links
      bodyEl.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        // If it's a Google Docs internal image, try to keep it
        if (src.includes('googleusercontent.com')) {
          img.style.maxWidth = '100%';
        }
      });
    } else {
      // Doc fetch failed — show fallback
      bodyEl.style.display = 'none';
      document.getElementById('article-no-content').style.display = '';
    }
  } catch (err) {
    console.error('[BlogDetail] Doc content load failed:', err);
    bodyEl.style.display = 'none';
    document.getElementById('article-no-content').style.display = '';
  }
}

function renderTags(tagString) {
  const container = document.getElementById('article-tags');
  if (!container || !tagString) return;
  const tags = tagString.split(',').map(t => t.trim()).filter(Boolean);
  container.innerHTML = tags.map(t => `<span class="chip">${t}</span>`).join('');
}

function showError(message) {
  const main = document.querySelector('main');
  main.innerHTML = `
    <div class="article__error">
      <span class="material-symbols-outlined" style="font-size:64px;color:var(--outline);margin-bottom:var(--space-3);">error_outline</span>
      <h2 class="text-headline-md text-primary" style="margin-bottom:var(--space-2);">${message}</h2>
      <a href="/blog.html" class="btn-plinth" style="margin-top:var(--space-3);">
        <span class="material-symbols-outlined" style="font-size:16px;">arrow_back</span> Quay lại Thư viện
      </a>
    </div>
  `;
}
