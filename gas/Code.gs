// ==========================================================================
// Portfolio API — Google Apps Script Web App
// Sheet ID: 1mSpGSDIsmNGYMKa48Q0FohwMh8yJB1JjFG1Jl2sj-cc
// ==========================================================================

const SHEET_ID = '1mSpGSDIsmNGYMKa48Q0FohwMh8yJB1JjFG1Jl2sj-cc';
const ADMIN_TOKEN_KEY = 'ADMIN_TOKEN';
const ADMIN_PASS_KEY = 'ADMIN_PASS_HASH';

// ── Helpers ──

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(name);
}

function sheetToJson(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).filter(row => row[0] !== '').map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function configToJson() {
  const sheet = getSheet('config');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const obj = {};
  data.slice(1).forEach(row => { if (row[0]) obj[row[0]] = row[1]; });
  return obj;
}

// ── READ API (doGet) ──

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getConfig';

  try {
    switch (action) {
      case 'getConfig':
        return jsonResponse({ success: true, data: configToJson() });

      case 'getProjects':
        return jsonResponse({ success: true, data: sheetToJson('projects') });

      case 'getBlogPosts': {
        const posts = sheetToJson('blog_posts');
        const paraType = e.parameter.para_type;
        const filtered = paraType ? posts.filter(p => p.para_type === paraType) : posts;
        return jsonResponse({ success: true, data: filtered });
      }

      case 'getPodcastEpisodes':
        return jsonResponse({ success: true, data: sheetToJson('podcast_episodes') });

      case 'getSkills':
        return jsonResponse({ success: true, data: sheetToJson('skills') });

      case 'getTestimonials':
        return jsonResponse({ success: true, data: sheetToJson('testimonials') });

      case 'getAll':
        return jsonResponse({
          success: true,
          data: {
            config: configToJson(),
            projects: sheetToJson('projects'),
            blog_posts: sheetToJson('blog_posts'),
            podcast_episodes: sheetToJson('podcast_episodes'),
            skills: sheetToJson('skills'),
            testimonials: sheetToJson('testimonials')
          }
        });

      case 'getBlogPost': {
        const postId = e.parameter.id;
        if (!postId) return jsonResponse({ success: false, error: 'Missing id' });
        const allPosts = sheetToJson('blog_posts');
        const post = allPosts.find(p => String(p.id) === String(postId));
        if (!post) return jsonResponse({ success: false, error: 'Post not found' });
        return jsonResponse({ success: true, data: post });
      }

      case 'getDocContent': {
        const docUrl = e.parameter.url;
        if (!docUrl) return jsonResponse({ success: false, error: 'Missing url parameter' });
        try {
          const result = getDocAsHtml(docUrl);
          return jsonResponse({ success: true, data: result });
        } catch (docErr) {
          return jsonResponse({ success: false, error: 'Cannot read doc: ' + docErr.message });
        }
      }

      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── WRITE API (doPost) ──

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, token } = body;

    // Auth check
    const props = PropertiesService.getScriptProperties();
    const validToken = props.getProperty(ADMIN_TOKEN_KEY);
    
    // Login action doesn't need token
    if (action === 'login') {
      return handleLogin(body, props);
    }

    if (!validToken || token !== validToken) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    switch (action) {
      case 'addRow':
        return handleAddRow(body);
      case 'updateRow':
        return handleUpdateRow(body);
      case 'deleteRow':
        return handleDeleteRow(body);
      case 'changePassword':
        return handleChangePassword(body, props);
      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function handleLogin(body, props) {
  const { password } = body;
  const storedHash = props.getProperty(ADMIN_PASS_KEY);
  
  // Simple hash comparison
  const inputHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  
  if (inputHash === storedHash) {
    // Generate session token
    const newToken = Utilities.getUuid();
    props.setProperty(ADMIN_TOKEN_KEY, newToken);
    return jsonResponse({ success: true, token: newToken });
  }
  return jsonResponse({ success: false, error: 'Wrong password' });
}

function handleChangePassword(body, props) {
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return jsonResponse({ success: false, error: 'Missing password fields' });
  }
  if (newPassword.length < 6) {
    return jsonResponse({ success: false, error: 'Password must be at least 6 characters' });
  }

  // Verify current password
  const storedHash = props.getProperty(ADMIN_PASS_KEY);
  const currentHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, currentPassword)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  
  if (currentHash !== storedHash) {
    return jsonResponse({ success: false, error: 'Current password is incorrect' });
  }

  // Set new password
  const newHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, newPassword)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  props.setProperty(ADMIN_PASS_KEY, newHash);

  // Generate new token
  const newToken = Utilities.getUuid();
  props.setProperty(ADMIN_TOKEN_KEY, newToken);
  return jsonResponse({ success: true, message: 'Password changed', token: newToken });
}

function handleAddRow(body) {
  const { sheetName, rowData } = body;
  const sheet = getSheet(sheetName);
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found: ' + sheetName });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  
  // Auto-generate ID
  if (headers.includes('id') && !rowData.id) {
    const lastRow = sheet.getLastRow();
    const maxId = lastRow > 1 
      ? Math.max(...sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => Number(r[0]) || 0))
      : 0;
    newRow[headers.indexOf('id')] = maxId + 1;
  }

  sheet.appendRow(newRow);
  return jsonResponse({ success: true, message: 'Row added', id: newRow[0] });
}

function handleUpdateRow(body) {
  const { sheetName, id, rowData } = body;
  const sheet = getSheet(sheetName);
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol === -1) return jsonResponse({ success: false, error: 'No id column' });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      headers.forEach((h, j) => {
        if (rowData[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(rowData[h]);
        }
      });
      return jsonResponse({ success: true, message: 'Row updated' });
    }
  }
  return jsonResponse({ success: false, error: 'Row not found' });
}

function handleDeleteRow(body) {
  const { sheetName, id } = body;
  const sheet = getSheet(sheetName);
  if (!sheet) return jsonResponse({ success: false, error: 'Sheet not found' });

  const data = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'Row deleted' });
    }
  }
  return jsonResponse({ success: false, error: 'Row not found' });
}

// ── SETUP (Run once) ──

function setupPortfolio() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const tabs = {
    'config': ['key', 'value', 'type'],
    'projects': ['id', 'title', 'role', 'tags', 'impact', 'image_url', 'order', 'is_featured'],
    'blog_posts': ['id', 'title', 'para_type', 'excerpt', 'content_url', 'image_url', 'date', 'tags'],
    'podcast_episodes': ['id', 'title', 'description', 'duration_min', 'date', 'topic_tags', 'spotify_embed_url', 'image_url'],
    'skills': ['id', 'category', 'name', 'order'],
    'testimonials': ['id', 'name', 'title', 'quote', 'avatar_initial', 'avatar_color', 'order']
  };

  Object.entries(tabs).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Set headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Bold & freeze header
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  Logger.log('✅ All tabs created with headers!');
}

function setupAdminPassword() {
  // Change this password before running!
  const password = 'cuong2024admin';
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  PropertiesService.getScriptProperties().setProperty(ADMIN_PASS_KEY, hash);
  Logger.log('✅ Admin password hash saved. Password: ' + password);
}

// ── Google Docs → HTML Converter ──

function getDocAsHtml(docUrl) {
  // Extract doc ID
  const match = docUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid Google Docs URL');
  const docId = match[1];
  
  // Export as HTML via Drive API
  const token = ScriptApp.getOAuthToken();
  const exportUrl = 'https://docs.google.com/document/d/' + docId + '/export?format=html';
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to export doc (code: ' + response.getResponseCode() + ')');
  }
  
  let html = response.getContentText();
  
  // Strip Google's wrapper — extract only the <body> content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }
  
  // Clean up Google's inline styles but keep structure
  // Remove style attributes to let our CSS handle it
  html = html.replace(/ style="[^"]*"/g, '');
  // Remove Google's span wrappers but keep content
  html = html.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
  // Clean empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  
  // Get doc title
  const doc = DocumentApp.openById(docId);
  
  return {
    title: doc.getName(),
    html: html
  };
}

/**
 * 🔑 RESET PASSWORD — Chạy hàm này từ GAS Editor nếu quên mật khẩu
 * Bước 1: Sửa biến newPassword bên dưới thành mật khẩu mới
 * Bước 2: Nhấn ▶ Run trong GAS Editor
 * Bước 3: Dùng mật khẩu mới để đăng nhập admin
 */
function resetAdminPassword() {
  // ✏️ ĐỔI MẬT KHẨU MỚI Ở ĐÂY:
  const newPassword = 'cuong2024admin';
  
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, newPassword)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  const props = PropertiesService.getScriptProperties();
  props.setProperty(ADMIN_PASS_KEY, hash);
  // Xóa token cũ để buộc đăng nhập lại
  props.deleteProperty(ADMIN_TOKEN_KEY);
  Logger.log('✅ Mật khẩu đã được reset thành: ' + newPassword);
  Logger.log('⚠️ Hãy đăng nhập lại tại /admin.html');
}

function insertDemoData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Config
  const configSheet = ss.getSheetByName('config');
  const configData = [
    ['site_title', 'Nguyen Manh Cuong', 'text'],
    ['hero_headline_1', 'Kỷ luật Thép.', 'text'],
    ['hero_headline_2', 'Tư duy Hệ thống.', 'text'],
    ['hero_description', 'Chuyên gia Quản trị Sản xuất & Chuyển đổi số. Đam mê việc ứng dụng các triết lý vận hành cổ điển vào kỷ nguyên công nghệ số, xây dựng hệ thống bền vững từ những nguyên tắc cốt lõi của lịch sử và triết học.', 'text'],
    ['about_mission', 'Sứ mệnh của tôi là kết nối sự chính xác của sản xuất công nghiệp với tính linh hoạt của công nghệ số. Tôi tin rằng mọi hệ thống phức tạp đều có thể được tối ưu hóa thông qua việc áp dụng các nguyên tắc triết học cơ bản về cấu trúc và trật tự.', 'text'],
    ['about_detail', 'Từ việc tối ưu hóa dây chuyền lắp ráp đến việc thiết kế kiến trúc dữ liệu cho doanh nghiệp, phương pháp luận của tôi luôn bắt nguồn từ việc hiểu rõ bản chất của vấn đề (First Principles) trước khi áp dụng các công cụ chuyển đổi.', 'text'],
    ['dob', '13/04/1998', 'text'],
    ['location', 'Hà Nội, Việt Nam', 'text'],
    ['certification', 'LSS Black Belt', 'text'],
    ['linkedin_url', 'https://linkedin.com/in/nguyenmanhcuong', 'url'],
    ['spotify_url', 'https://open.spotify.com/show/6yPXHY4USWEaZ7KY5rRANB', 'url'],
    ['email', 'cuong@example.com', 'text']
  ];
  if (configSheet.getLastRow() < 2) {
    configSheet.getRange(2, 1, configData.length, 3).setValues(configData);
  }

  // Projects
  const projSheet = ss.getSheetByName('projects');
  const projData = [
    [1, 'Tối ưu hóa dây chuyền sản xuất X', 'Project Lead', 'Lean, Optimization', 'Tăng 25% OEE, giảm 15% thời gian downtime thông qua việc áp dụng các nguyên tắc Lean Manufacturing và tái cấu trúc quy trình luân chuyển nguyên liệu.', '', 1, true],
    [2, 'Chuyển đổi số hệ thống MES', 'Consultant', 'Digitalization, MES', 'Triển khai thành công hệ thống Điều hành Sản xuất (MES), số hóa 100% báo cáo sản xuất, cung cấp dữ liệu thời gian thực cho ban quản trị.', '', 2, true],
    [3, 'Chương trình Đào tạo Kaizen', 'Trainer', 'Training, Kaizen', 'Đào tạo hơn 200 nhân sự về phương pháp Kaizen, dẫn đến 50 sáng kiến cải tiến được triển khai, tiết kiệm chi phí vận hành đáng kể trong quý 3.', '', 3, true]
  ];
  if (projSheet.getLastRow() < 2) {
    projSheet.getRange(2, 1, projData.length, 8).setValues(projData);
  }

  // Skills
  const skillSheet = ss.getSheetByName('skills');
  const skillData = [
    [1, 'Manufacturing Standards', 'ISO 9001:2015', 1],
    [2, 'Manufacturing Standards', 'Lean Six Sigma', 2],
    [3, 'Manufacturing Standards', '5S & Kaizen', 3],
    [4, 'Manufacturing Standards', 'TPM (Total Productive Maintenance)', 4],
    [5, 'Digital Tools', 'SAP ERP', 1],
    [6, 'Digital Tools', 'Ignition SCADA', 2],
    [7, 'Digital Tools', 'Power BI', 3],
    [8, 'Digital Tools', 'Siemens MES', 4]
  ];
  if (skillSheet.getLastRow() < 2) {
    skillSheet.getRange(2, 1, skillData.length, 4).setValues(skillData);
  }

  // Testimonials
  const testSheet = ss.getSheetByName('testimonials');
  const testData = [
    [1, 'Trần Văn A', 'Plant Manager', 'Sự hiểu biết sâu sắc của anh Cường về quy trình sản xuất kết hợp với tầm nhìn số hóa đã thực sự thay đổi cách chúng tôi vận hành nhà máy. Một người lãnh đạo dự án xuất sắc.', 'T', '#79573a', 1],
    [2, 'Lê Thị B', 'Production Supervisor', 'Các buổi đào tạo Kaizen do anh hướng dẫn không chỉ cung cấp lý thuyết mà còn rất thực tiễn, giúp đội ngũ công nhân dễ dàng áp dụng ngay vào công việc hàng ngày.', 'L', '#1c3433', 2]
  ];
  if (testSheet.getLastRow() < 2) {
    testSheet.getRange(2, 1, testData.length, 7).setValues(testData);
  }

  // Blog posts
  const blogSheet = ss.getSheetByName('blog_posts');
  const blogData = [
    [1, 'Triển khai Hệ thống MES cho Nhà máy Chế tạo Cơ khí', 'Projects', 'Ghi chép chi tiết về quá trình đánh giá, lựa chọn và triển khai hệ thống Điều hành Sản xuất (MES).', '', '', '2024-10-12', 'MES, Digital'],
    [2, 'Triết lý Lean và Sự Tĩnh Lặng trong Vận Hành', 'Areas', 'Làm thế nào để áp dụng các nguyên tắc cốt lõi của Sản xuất Tinh gọn không chỉ đến tối ưu...', '', '', '2024-10-05', 'Lean, Philosophy'],
    [3, 'Mô hình Kiến trúc Dữ liệu cho SME Sản Xuất', 'Resources', 'Một tài liệu tham khảo tóm tắt về cách xây dựng nền tảng dữ liệu (Data Foundation) với...', '', '', '2024-09-28', 'Data, Architecture']
  ];
  if (blogSheet.getLastRow() < 2) {
    blogSheet.getRange(2, 1, blogData.length, 8).setValues(blogData);
  }

  // Podcast episodes
  const podSheet = ss.getSheetByName('podcast_episodes');
  const podData = [
    [12, 'Nhịp dập của nhà máy và Khoảng lặng của tâm trí', 'Trong môi trường sản xuất hiện đại, tiếng ồn của máy móc thường lấn át tiếng nói bên trong. Tập này khám phá cách áp dụng các triết lý cổ đại vào việc duy trì sự tập trung và cân...', 45, '2024-10-12', 'Management, Philosophy', 'https://open.spotify.com/show/6yPXHY4USWEaZ7KY5rRANB', ''],
    [11, 'Lean Manufacturing dưới góc nhìn Phật giáo', 'Sự tối giản trong triết học Phương Đông gặp gỡ phương pháp luận loại bỏ lãng...', 38, '2024-09-28', 'Philosophy, Lean', 'https://open.spotify.com/show/6yPXHY4USWEaZ7KY5rRANB', ''],
    [10, 'Chuyển đổi số không chỉ là công nghệ', 'Công cụ là phương tiện, văn hóa doanh nghiệp và tư duy con người mới là đích...', 52, '2024-09-15', 'Digital, Management', 'https://open.spotify.com/show/6yPXHY4USWEaZ7KY5rRANB', ''],
    [9, 'Những bài học quản trị từ Kyoto', 'Ghi chép từ chuyến đi thực địa các nhà máy cơ khí lâu đời tại Nhật Bản và triết...', 41, '2024-09-02', 'Travel, Management', 'https://open.spotify.com/show/6yPXHY4USWEaZ7KY5rRANB', '']
  ];
  if (podSheet.getLastRow() < 2) {
    podSheet.getRange(2, 1, podData.length, 8).setValues(podData);
  }

  Logger.log('✅ Demo data inserted!');
}
