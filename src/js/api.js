/* ==========================================================================
   API Client — Google Apps Script Backend Proxy
   All data reads/writes go through GAS Web App
   ========================================================================== */

const GAS_CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxh956mQcnj38g8iG4B_XRJ3fqZ4yAp8HXJs7hrjI8-Q1qrPz-R83M1nnabr5ytF2fE6w/exec',
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

/**
 * Set the GAS Web App URL after deployment
 */
export function setApiUrl(url) {
  GAS_CONFIG.WEB_APP_URL = url;
}

/**
 * GET data from GAS
 * @param {string} action — e.g. 'getConfig', 'getProjects'
 * @param {Object} params — optional query params
 * @returns {Promise<Object>}
 */
export async function fetchData(action, params = {}) {
  const cacheKey = `portfolio_${action}_${JSON.stringify(params)}`;

  // Check cache
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = new URL(GAS_CONFIG.WEB_APP_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    // Cache result
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`[API] fetchData(${action}) failed:`, error);
    throw error;
  }
}

/**
 * POST data to GAS (admin operations)
 * @param {string} action — e.g. 'addProject', 'updateProject'
 * @param {Object} body — data payload
 * @param {string} token — admin auth token
 * @returns {Promise<Object>}
 */
export async function postData(action, body, token) {
  try {
    const response = await fetch(GAS_CONFIG.WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // GAS requires text/plain for CORS
      body: JSON.stringify({ action, token, ...body }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    // Invalidate related caches
    clearCacheByPrefix('portfolio_');
    return data;
  } catch (error) {
    console.error(`[API] postData(${action}) failed:`, error);
    throw error;
  }
}

/* ── Cache Helpers (sessionStorage) ── */

function getCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      data,
      expiry: Date.now() + GAS_CONFIG.CACHE_TTL,
    }));
  } catch { /* Storage full — ignore */ }
}

function clearCacheByPrefix(prefix) {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => sessionStorage.removeItem(k));
  } catch { /* Ignore */ }
}

/* ── Loading State Manager ── */

export function showLoading(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;padding:24px 0;">
      <div class="skeleton" style="height:24px;width:60%;"></div>
      <div class="skeleton" style="height:16px;width:90%;"></div>
      <div class="skeleton" style="height:16px;width:75%;"></div>
      <div class="skeleton" style="height:200px;width:100%;margin-top:8px;"></div>
    </div>
  `;
}

export function showError(container, message = 'Không thể tải dữ liệu. Vui lòng thử lại.') {
  container.innerHTML = `
    <div style="text-align:center;padding:48px 24px;color:var(--on-surface-variant);">
      <span class="material-symbols-outlined" style="font-size:48px;margin-bottom:16px;display:block;">error_outline</span>
      <p class="text-body-md">${message}</p>
      <button class="btn-ghost" style="margin-top:16px;" onclick="location.reload()">Thử lại</button>
    </div>
  `;
}

/**
 * Convert Google Drive share link to direct image URL
 * Uses lh3.googleusercontent.com/d/ format (most reliable for embedding)
 * Input:  https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * Output: https://lh3.googleusercontent.com/d/FILE_ID=s1000
 */
export function driveImageUrl(url) {
  if (!url) return '';
  // Already a direct image host
  if (url.includes('lh3.googleusercontent.com')) return url;
  // Extract file ID from various Drive URL formats
  let fileId = null;
  // Format: /file/d/FILE_ID/...
  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) fileId = match1[1];
  // Format: ?id=FILE_ID
  if (!fileId) {
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) fileId = match2[1];
  }
  // Format: uc?export=view&id=FILE_ID
  if (!fileId && url.includes('uc?export=view')) {
    const match3 = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match3) fileId = match3[1];
  }
  // Might be just a raw ID
  if (!fileId && /^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) {
    fileId = url.trim();
  }
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
  }
  return url;
}

/* ── Date Formatter (Vietnamese) ── */

const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export function formatDateVi(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_VI[d.getMonth()]}, ${d.getFullYear()}`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')} THG ${d.getMonth() + 1}, ${d.getFullYear()}`;
}
