/* ==========================================================================
   ADMIN JS — Login, CRUD operations via GAS API
   ========================================================================== */

const API_URL = 'https://script.google.com/macros/s/AKfycbxHe7my5-gHA-HxulpTFjZsIt6rn42pUvF6FJOC3AimIvNFnDl_9P5a4meEZrzklCH6sw/exec';
const TOKEN_KEY = 'portfolio_admin_token';

// Schema definitions for each tab
const SCHEMAS = {
  projects: {
    title: 'Quản lý Dự án',
    fields: [
      { key: 'title', label: 'Tên dự án', type: 'text', required: true },
      { key: 'role', label: 'Vai trò', type: 'text' },
      { key: 'tags', label: 'Tags (comma separated)', type: 'text' },
      { key: 'impact', label: 'Impact / Kết quả', type: 'textarea' },
      { key: 'image_url', label: 'Image URL (Drive)', type: 'text' },
      { key: 'order', label: 'Thứ tự', type: 'number' },
      { key: 'is_featured', label: 'Nổi bật', type: 'select', options: ['true', 'false'] }
    ],
    columns: ['id', 'title', 'role', 'tags', 'order']
  },
  blog_posts: {
    title: 'Quản lý Blog',
    fields: [
      { key: 'title', label: 'Tiêu đề', type: 'text', required: true },
      { key: 'para_type', label: 'PARA Type', type: 'select', options: ['Projects', 'Areas', 'Resources', 'Archives'] },
      { key: 'excerpt', label: 'Tóm tắt', type: 'textarea' },
      { key: 'content_url', label: 'Google Docs URL', type: 'text' },
      { key: 'image_url', label: 'Image URL', type: 'text' },
      { key: 'date', label: 'Ngày (YYYY-MM-DD)', type: 'text' },
      { key: 'tags', label: 'Tags', type: 'text' }
    ],
    columns: ['id', 'title', 'para_type', 'date', 'tags']
  },
  podcast_episodes: {
    title: 'Quản lý Podcast',
    fields: [
      { key: 'title', label: 'Tiêu đề tập', type: 'text', required: true },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'duration_min', label: 'Thời lượng (phút)', type: 'number' },
      { key: 'date', label: 'Ngày (YYYY-MM-DD)', type: 'text' },
      { key: 'topic_tags', label: 'Chủ đề tags', type: 'text' },
      { key: 'spotify_embed_url', label: 'Spotify URL', type: 'text' },
      { key: 'image_url', label: 'Image URL', type: 'text' }
    ],
    columns: ['id', 'title', 'duration_min', 'date', 'topic_tags']
  },
  skills: {
    title: 'Quản lý Skills',
    fields: [
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'name', label: 'Tên skill', type: 'text', required: true },
      { key: 'order', label: 'Thứ tự', type: 'number' }
    ],
    columns: ['id', 'category', 'name', 'order']
  },
  testimonials: {
    title: 'Quản lý Nhận xét',
    fields: [
      { key: 'name', label: 'Tên người', type: 'text', required: true },
      { key: 'title', label: 'Chức vụ', type: 'text' },
      { key: 'quote', label: 'Nhận xét', type: 'textarea', required: true },
      { key: 'avatar_initial', label: 'Ký tự đại diện', type: 'text' },
      { key: 'avatar_color', label: 'Màu avatar (hex)', type: 'text' },
      { key: 'order', label: 'Thứ tự', type: 'number' }
    ],
    columns: ['id', 'name', 'title', 'order']
  }
};

let currentTab = 'projects';
let currentData = [];
let editingId = null;
let deletingId = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    showDashboard();
    loadTabData();
  }
  initEventListeners();
});

function initEventListeners() {
  // Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('admin-tab--active'));
      tab.classList.add('admin-tab--active');
      currentTab = tab.dataset.tab;
      document.getElementById('tab-title').textContent = SCHEMAS[currentTab].title;
      loadTabData();
    });
  });

  // Add new
  document.getElementById('add-new-btn').addEventListener('click', () => openModal(null));

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Modal save
  document.getElementById('modal-form').addEventListener('submit', handleSave);

  // Delete
  document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-confirm').addEventListener('click', handleDelete);

  // Change Password
  document.getElementById('change-pass-btn').addEventListener('click', () => {
    document.getElementById('password-overlay').style.display = '';
  });
  document.getElementById('password-close').addEventListener('click', closePasswordModal);
  document.getElementById('password-cancel').addEventListener('click', closePasswordModal);
  document.getElementById('password-form').addEventListener('submit', handleChangePassword);
}

// ── Auth ──
async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  btn.disabled = true;
  btn.textContent = 'ĐANG XỬ LÝ...';
  errorEl.style.display = 'none';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'login', password })
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      showDashboard();
      loadTabData();
    } else {
      errorEl.textContent = 'Mật khẩu không đúng';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Lỗi kết nối: ' + err.message;
    errorEl.style.display = 'block';
  }

  btn.disabled = false;
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">login</span> ĐĂNG NHẬP';
}

function handleLogout() {
  sessionStorage.removeItem(TOKEN_KEY);
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = '';
  document.getElementById('login-password').value = '';
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = '';
}

// ── Data Loading ──
async function loadTabData() {
  const container = document.getElementById('table-container');
  container.innerHTML = '<div class="skeleton" style="height:200px;"></div>';

  const actionMap = {
    projects: 'getProjects',
    blog_posts: 'getBlogPosts',
    podcast_episodes: 'getPodcastEpisodes',
    skills: 'getSkills',
    testimonials: 'getTestimonials'
  };

  try {
    const res = await fetch(`${API_URL}?action=${actionMap[currentTab]}`);
    const data = await res.json();
    if (data.success) {
      currentData = data.data;
      renderTable();
    }
  } catch (err) {
    container.innerHTML = '<p class="text-body-md" style="padding:var(--space-3);color:var(--error);">Lỗi tải dữ liệu</p>';
  }
}

function renderTable() {
  const schema = SCHEMAS[currentTab];
  const container = document.getElementById('table-container');

  if (currentData.length === 0) {
    container.innerHTML = '<p class="text-body-md text-on-surface-variant" style="padding:var(--space-4);text-align:center;">Chưa có dữ liệu. Nhấn "Thêm mới" để bắt đầu.</p>';
    return;
  }

  const headers = schema.columns.map(c => `<th>${c}</th>`).join('') + '<th>ACTIONS</th>';
  const rows = currentData.map(row => {
    const cells = schema.columns.map(c => `<td title="${row[c] || ''}">${row[c] || '—'}</td>`).join('');
    return `<tr>
      ${cells}
      <td class="admin-table__actions">
        <button onclick="window._adminEdit(${row.id})"><span class="material-symbols-outlined" style="font-size:14px;">edit</span></button>
        <button class="btn-delete" onclick="window._adminDelete(${row.id})"><span class="material-symbols-outlined" style="font-size:14px;">delete</span></button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `<table class="admin-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

// Global handlers for inline onclick
window._adminEdit = (id) => {
  const row = currentData.find(r => r.id === id);
  if (row) openModal(row);
};

window._adminDelete = (id) => {
  deletingId = id;
  document.getElementById('delete-overlay').style.display = '';
};

// ── Modal ──
function openModal(rowData) {
  const schema = SCHEMAS[currentTab];
  editingId = rowData ? rowData.id : null;
  document.getElementById('modal-title').textContent = editingId ? 'Chỉnh sửa' : 'Thêm mới';

  const fieldsHtml = schema.fields.map(f => {
    const val = rowData ? (rowData[f.key] || '') : '';
    let input;
    if (f.type === 'textarea') {
      input = `<textarea class="ledger-input" name="${f.key}" ${f.required ? 'required' : ''}>${val}</textarea>`;
    } else if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o}" ${val == o ? 'selected' : ''}>${o}</option>`).join('');
      input = `<select class="ledger-input" name="${f.key}">${opts}</select>`;
    } else {
      input = `<input class="ledger-input" type="${f.type}" name="${f.key}" value="${val}" ${f.required ? 'required' : ''} />`;
    }
    return `<div class="admin-field"><label class="text-label-caps text-on-surface-variant">${f.label}</label>${input}</div>`;
  }).join('');

  document.getElementById('modal-fields').innerHTML = fieldsHtml;
  document.getElementById('modal-overlay').style.display = '';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingId = null;
}

function closeDeleteModal() {
  document.getElementById('delete-overlay').style.display = 'none';
  deletingId = null;
}

// ── CRUD Operations ──
async function handleSave(e) {
  e.preventDefault();
  const form = document.getElementById('modal-form');
  const formData = new FormData(form);
  const rowData = {};
  for (const [key, val] of formData.entries()) {
    rowData[key] = val;
  }

  const token = sessionStorage.getItem(TOKEN_KEY);
  const payload = editingId
    ? { action: 'updateRow', token, sheetName: currentTab, id: editingId, rowData }
    : { action: 'addRow', token, sheetName: currentTab, rowData };

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'ĐANG LƯU...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(editingId ? 'Đã cập nhật thành công!' : 'Đã thêm mới thành công!');
      closeModal();
      loadTabData();
    } else {
      showToast('Lỗi: ' + data.error, true);
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, true);
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">save</span> LƯU';
}

async function handleDelete() {
  if (!deletingId) return;
  const token = sessionStorage.getItem(TOKEN_KEY);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRow', token, sheetName: currentTab, id: deletingId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa thành công!');
      closeDeleteModal();
      loadTabData();
    } else {
      showToast('Lỗi: ' + data.error, true);
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, true);
  }
}

// ── Change Password ──
function closePasswordModal() {
  document.getElementById('password-overlay').style.display = 'none';
  document.getElementById('password-form').reset();
}

async function handleChangePassword(e) {
  e.preventDefault();
  const form = document.getElementById('password-form');
  const formData = new FormData(form);
  const currentPassword = formData.get('currentPassword');
  const newPassword = formData.get('newPassword');
  const confirmPassword = formData.get('confirmPassword');

  if (newPassword !== confirmPassword) {
    showToast('Mật khẩu xác nhận không khớp!', true);
    return;
  }

  if (newPassword.length < 6) {
    showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', true);
    return;
  }

  const token = sessionStorage.getItem(TOKEN_KEY);
  const saveBtn = document.getElementById('password-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'ĐANG XỬ LÝ...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'changePassword', token, currentPassword, newPassword })
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      showToast('Đổi mật khẩu thành công!');
      closePasswordModal();
    } else {
      showToast('Lỗi: ' + data.error, true);
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, true);
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">key</span> ĐỔI MẬT KHẨU';
}

// ── Toast ──
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'admin-toast' + (isError ? ' admin-toast--error' : '');
  toast.style.display = '';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
