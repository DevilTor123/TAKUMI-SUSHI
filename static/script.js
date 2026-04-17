/* ===================================================
   TAKUMI SUSHI — script.js
   ระบบจัดการเมนู, ตะกร้า, Checkout, Admin Panel
   =================================================== */

// ========== ข้อมูลเมนูเริ่มต้น (Default Menu Data) ==========
const DEFAULT_MENU = [
  {
    id: 1, name: 'ซูชิแซลมอน', nameJP: 'サーモン寿司',
    price: 220, category: 'nigiri', emoji: '🍣',
    desc: 'แซลมอนสดนอร์เวย์ บนข้าวซูชิ รสชาติละมุน',
    featured: true
  },
  {
    id: 2, name: 'ซูชิทูน่า', nameJP: 'マグロ寿司',
    price: 240, category: 'nigiri', emoji: '🍱',
    desc: 'ทูน่าสดคัดพิเศษ เนื้อนุ่มละลายในปาก',
    featured: true
  },
  {
    id: 3, name: 'มากิแตงกวา', nameJP: 'きゅうり巻き',
    price: 120, category: 'maki', emoji: '🌿',
    desc: 'โรลแตงกวา กรอบสดชื่น เหมาะสำหรับมังสวิรัติ',
    featured: false
  },
  {
    id: 4, name: 'มากิแซลมอนอโวคาโด', nameJP: 'サーモンアボカド巻き',
    price: 180, category: 'maki', emoji: '🥑',
    desc: 'แซลมอนและอโวคาโดในม้วนสาหร่าย',
    featured: true
  },
  {
    id: 5, name: 'ซาชิมิแซลมอน 5 ชิ้น', nameJP: 'サーモン刺身',
    price: 280, category: 'sashimi', emoji: '🐟',
    desc: 'แซลมอนสดหั่นหนา 5 ชิ้น เสิร์ฟพร้อมวาซาบิ',
    featured: false
  },
  {
    id: 6, name: 'ซาชิมิทูน่า 5 ชิ้น', nameJP: 'マグロ刺身',
    price: 320, category: 'sashimi', emoji: '🐠',
    desc: 'ทูน่าบลูฟิน สีแดงสด รสเข้ม',
    featured: false
  },
  {
    id: 7, name: 'ดราก้อนโรล', nameJP: 'ドラゴンロール',
    price: 380, category: 'special', emoji: '🐉',
    desc: 'โรลพิเศษ หุ้มด้วยอโวคาโดบางๆ ราดซอสอูนากิ',
    featured: true
  },
  {
    id: 8, name: 'เรนโบว์โรล', nameJP: 'レインボーロール',
    price: 420, category: 'special', emoji: '🌈',
    desc: 'โรลสีสันสวยงาม หุ้มด้วยปลาหลากชนิด',
    featured: false
  },
  {
    id: 9, name: 'ไข่หวาน ทามาโกะ', nameJP: '玉子寿司',
    price: 80, category: 'nigiri', emoji: '🥚',
    desc: 'ไข่หวานญี่ปุ่น นุ่มหวาน เหมาะสำหรับเด็ก',
    featured: false
  },
  {
    id: 10, name: 'สไปซี่ทูน่า โรล', nameJP: 'スパイシーツナロール',
    price: 260, category: 'maki', emoji: '🌶️',
    desc: 'ทูน่าผสมซอสสไปซี่ เผ็ดนิดหน่อย อร่อยมาก',
    featured: false
  }
];

// ========== ข้อมูลแอดมิน (Admin Credentials) ==========
const ADMIN_CREDS = { username: 'admin', password: 'takumi2024' };

// ========== STATE ==========
let cart = JSON.parse(localStorage.getItem('takumi_cart') || '[]');
let menuData = JSON.parse(localStorage.getItem('takumi_menu') || 'null') || DEFAULT_MENU;
let currentPage = 'home';
let cartOpen = false;
let editingId = null;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  saveMenu();           // บันทึกเมนูเริ่มต้น (ถ้ายังไม่มี)
  renderFeaturedMenu();
  renderFullMenu();
  updateCartUI();
  checkAdminSession();
});

// ========== PAGE NAVIGATION ==========
function showPage(page) {
  // ซ่อนทุก page ก่อน
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // แสดง page ที่เลือก
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  currentPage = page;

  // อัพเดต nav links
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // ซ่อน footer ใน admin pages
  const footer = document.getElementById('mainFooter');
  footer.style.display = (page === 'admin' || page === 'admin-login') ? 'none' : 'block';

  // อัพเดต checkout ถ้าไปหน้านั้น
  if (page === 'checkout') renderCheckout();

  // ปิด mobile nav
  document.getElementById('navLinks').classList.remove('open');

  // เลื่อนขึ้นบน
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toggle mobile nav
function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ========== MENU RENDERING ==========

// แสดงเมนูแนะนำในหน้า Home
function renderFeaturedMenu() {
  const featured = menuData.filter(m => m.featured).slice(0, 4);
  document.getElementById('featuredMenu').innerHTML = featured.map(createMenuCard).join('');
}

// แสดงเมนูทั้งหมดในหน้า Menu
function renderFullMenu(filter = 'all') {
  const items = filter === 'all' ? menuData : menuData.filter(m => m.category === filter);
  document.getElementById('fullMenu').innerHTML = items.length
    ? items.map(createMenuCard).join('')
    : '<p style="color:var(--muted);padding:2rem;grid-column:1/-1">ไม่มีเมนูในหมวดนี้</p>';
}

// สร้าง card HTML
function createMenuCard(item) {
  const imgContent = item.img
    ? `<img src="${item.img}" alt="${item.name}" onerror="this.parentElement.innerHTML='${item.emoji || '🍣'}'">`
    : `<span>${item.emoji || '🍣'}</span>`;
  const catLabel = { nigiri: 'นิกิริ', maki: 'มากิ', sashimi: 'ซาชิมิ', special: 'พิเศษ' };
  return `
    <div class="menu-card" data-id="${item.id}">
      <div class="menu-card-img">
        ${imgContent}
        <span class="menu-card-badge">${catLabel[item.category] || item.category}</span>
      </div>
      <div class="menu-card-body">
        <div class="menu-card-jp">${item.nameJP || ''}</div>
        <div class="menu-card-name">${item.name}</div>
        <div class="menu-card-desc">${item.desc || ''}</div>
        <div class="menu-card-footer">
          <span class="menu-price">฿${item.price.toLocaleString()}</span>
          <button class="add-btn" onclick="addToCart(${item.id})" title="เพิ่มลงตะกร้า">+</button>
        </div>
      </div>
    </div>
  `;
}

// Filter เมนู
function filterMenu(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFullMenu(cat);
}

// ========== CART MANAGEMENT ==========

// เพิ่มสินค้าลงตะกร้า
function addToCart(id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;

  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: item.id, name: item.name, price: item.price, emoji: item.emoji || '🍣', qty: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`✅ เพิ่ม "${item.name}" ลงตะกร้าแล้ว`);
}

// ลบหรือลดสินค้า
function removeFromCart(id) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) return;
  if (cart[idx].qty > 1) {
    cart[idx].qty--;
  } else {
    cart.splice(idx, 1);
  }
  saveCart();
  updateCartUI();
}

// บันทึก cart ลง localStorage
function saveCart() {
  localStorage.setItem('takumi_cart', JSON.stringify(cart));
}

// คำนวณราคารวม
function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// นับจำนวนสินค้าในตะกร้า
function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// อัพเดต UI ทั้งหมดของ Cart
function updateCartUI() {
  const count = getCartCount();
  const total = getCartTotal();

  // อัพเดต badge จำนวน
  document.getElementById('cartCount').textContent = count;

  // อัพเดตรายการใน sidebar
  const cartItemsEl = document.getElementById('cartItems');
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="empty-cart">🍱 ยังไม่มีสินค้าในตะกร้า</p>';
  } else {
    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">฿${(item.price * item.qty).toLocaleString()}</div>
        </div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="removeFromCart(${item.id})">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="addToCart(${item.id})">+</button>
        </div>
      </div>
    `).join('');
  }

  // อัพเดตยอดรวม
  document.getElementById('cartTotal').textContent = `฿${total.toLocaleString()}`;
}

// Toggle cart sidebar
function toggleCart() {
  cartOpen = !cartOpen;
  document.getElementById('cartSidebar').classList.toggle('open', cartOpen);
  document.getElementById('cartOverlay').classList.toggle('open', cartOpen);
}

// ========== CHECKOUT ==========

// render checkout page
function renderCheckout() {
  const itemsEl = document.getElementById('checkoutItems');
  const subtotalEl = document.getElementById('subtotal');
  const grandTotalEl = document.getElementById('grandTotal');

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p style="color:var(--muted);padding:1rem 0;font-size:0.9rem">ตะกร้าว่างเปล่า กลับไปเลือกเมนูก่อน</p>';
  } else {
    itemsEl.innerHTML = cart.map(item => `
      <div class="checkout-item">
        <span class="checkout-item-name">${item.emoji} ${item.name}</span>
        <span class="checkout-item-qty">x${item.qty}</span>
        <span class="checkout-item-price">฿${(item.price * item.qty).toLocaleString()}</span>
      </div>
    `).join('');
  }

  const subtotal = getCartTotal();
  subtotalEl.textContent = `฿${subtotal.toLocaleString()}`;
  grandTotalEl.textContent = `฿${(subtotal + 50).toLocaleString()}`;
}

// เลือกวิธีชำระเงิน
function selectPayment(id) {
  document.querySelectorAll('.radio-card').forEach(el => el.classList.remove('active-radio'));
  document.getElementById(id).classList.add('active-radio');
}

// กดสั่งซื้อ
function placeOrder() {
  if (cart.length === 0) {
    showToast('⚠️ กรุณาเพิ่มสินค้าก่อนสั่งซื้อ'); return;
  }
  const name = document.getElementById('co-name').value.trim();
  const phone = document.getElementById('co-phone').value.trim();
  const address = document.getElementById('co-address').value.trim();

  if (!name || !phone || !address) {
    showToast('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน'); return;
  }

  // สร้างหมายเลขออเดอร์
  const orderId = 'TK' + Date.now().toString().slice(-6);
  document.getElementById('orderId').textContent = orderId;

  // แสดง modal สำเร็จ
  document.getElementById('orderModal').classList.add('show');
}

// ปิด modal และ clear cart
function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('show');
  cart = [];
  saveCart();
  updateCartUI();
  // clear form
  ['co-name','co-phone','co-address','co-note'].forEach(id => {
    document.getElementById(id).value = '';
  });
  showPage('home');
  showToast('🎉 ขอบคุณที่ใช้บริการ!');
}

// ========== ADMIN LOGIN ==========
function adminLogin() {
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value.trim();
  const errEl = document.getElementById('loginError');

  if (user === ADMIN_CREDS.username && pass === ADMIN_CREDS.password) {
    localStorage.setItem('takumi_admin', '1');
    errEl.textContent = '';
    showPage('admin');
    renderAdminMenu();
  } else {
    errEl.textContent = '❌ Username หรือ Password ไม่ถูกต้อง';
    document.getElementById('admin-pass').value = '';
    // Shake animation
    errEl.style.animation = 'none';
    setTimeout(() => errEl.style.animation = '', 10);
  }
}

function adminLogout() {
  localStorage.removeItem('takumi_admin');
  showPage('home');
  showToast('👋 ออกจากระบบแล้ว');
}

function checkAdminSession() {
  // ถ้ามี session ให้ redirect ไป admin โดยตรง
  if (localStorage.getItem('takumi_admin') === '1' && currentPage === 'admin-login') {
    showPage('admin');
    renderAdminMenu();
  }
}

// ========== ADMIN MENU MANAGEMENT ==========

// เปลี่ยน tab ใน admin
function adminTab(tabName, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  el.classList.add('active');
}

// บันทึกเมนูลง localStorage
function saveMenu() {
  localStorage.setItem('takumi_menu', JSON.stringify(menuData));
}

// แสดงรายการเมนูใน admin
function renderAdminMenu() {
  const list = document.getElementById('adminMenuList');
  document.getElementById('adminMenuCount').textContent = `${menuData.length} รายการ`;

  list.innerHTML = menuData.map(item => {
    const imgContent = item.img
      ? `<img src="${item.img}" alt="${item.name}" onerror="this.parentElement.innerHTML='${item.emoji || '🍣'}'">`
      : `<span>${item.emoji || '🍣'}</span>`;
    const catLabel = { nigiri: 'นิกิริ', maki: 'มากิ', sashimi: 'ซาชิมิ', special: 'พิเศษ' };
    return `
      <div class="admin-menu-card" id="admin-card-${item.id}">
        <div class="admin-card-img">${imgContent}</div>
        <div class="admin-card-body">
          <div class="admin-card-name">${item.name}</div>
          <div class="admin-card-price">฿${item.price.toLocaleString()}</div>
          <span class="admin-card-cat">${catLabel[item.category] || item.category}</span>
          <div class="admin-card-actions">
            <button class="btn-edit" onclick="editMenu(${item.id})">✏️ แก้ไข</button>
            <button class="btn-delete" onclick="deleteMenu(${item.id})">🗑️ ลบ</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// บันทึกเมนู (เพิ่ม หรือ แก้ไข)
function saveMenu_form() {
  const name    = document.getElementById('menu-name').value.trim();
  const nameJP  = document.getElementById('menu-name-jp').value.trim();
  const price   = parseInt(document.getElementById('menu-price').value);
  const cat     = document.getElementById('menu-cat').value;
  const img     = document.getElementById('menu-img').value.trim();
  const desc    = document.getElementById('menu-desc').value.trim();

  if (!name || !price || price <= 0) {
    showToast('⚠️ กรุณากรอกชื่อเมนูและราคา'); return;
  }

  // ตรวจว่า img เป็น emoji หรือ URL
  const isEmoji = /\p{Emoji}/u.test(img);
  const menuItem = {
    name, nameJP, price, category: cat, desc,
    emoji: isEmoji ? img : '🍣',
    img: isEmoji ? null : (img || null)
  };

  if (editingId) {
    // แก้ไขเมนูที่มีอยู่
    const idx = menuData.findIndex(m => m.id === editingId);
    if (idx !== -1) menuData[idx] = { ...menuData[idx], ...menuItem };
    showToast(`✅ แก้ไขเมนู "${name}" สำเร็จ`);
  } else {
    // เพิ่มเมนูใหม่
    menuItem.id = Date.now();
    menuItem.featured = false;
    menuData.push(menuItem);
    showToast(`✅ เพิ่มเมนู "${name}" สำเร็จ`);
  }

  saveMenu();
  renderAdminMenu();
  renderFeaturedMenu();
  renderFullMenu();
  cancelEdit();
  adminTab('menu-list', document.querySelector('.admin-nav-item'));
}

// alias
function saveMenu() {
  localStorage.setItem('takumi_menu', JSON.stringify(menuData));
}

// เรียกบันทึกจาก form
function saveMenu() {
  localStorage.setItem('takumi_menu', JSON.stringify(menuData));
}

// ---- resolve naming conflict ----
// ใช้ชื่อ saveMenuData แทนสำหรับ form save
window.saveMenu = function() {
  const name    = document.getElementById('menu-name')?.value?.trim();
  // ถ้าไม่มี element นี้ = เรียกมาจากที่อื่น (init), แค่ save
  if (!name) {
    localStorage.setItem('takumi_menu', JSON.stringify(menuData));
    return;
  }
  const nameJP  = document.getElementById('menu-name-jp').value.trim();
  const price   = parseInt(document.getElementById('menu-price').value);
  const cat     = document.getElementById('menu-cat').value;
  const img     = document.getElementById('menu-img').value.trim();
  const desc    = document.getElementById('menu-desc').value.trim();

  if (!name || !price || price <= 0) {
    showToast('⚠️ กรุณากรอกชื่อเมนูและราคา'); return;
  }

  const isEmoji = /\p{Emoji}/u.test(img);
  const menuItem = {
    name, nameJP, price, category: cat, desc,
    emoji: isEmoji ? img : (img ? '🍣' : '🍣'),
    img: (!isEmoji && img) ? img : null
  };

  if (editingId) {
    const idx = menuData.findIndex(m => m.id === editingId);
    if (idx !== -1) menuData[idx] = { ...menuData[idx], ...menuItem };
    showToast(`✅ แก้ไข "${name}" สำเร็จ`);
  } else {
    menuItem.id = Date.now();
    menuItem.featured = false;
    menuData.push(menuItem);
    showToast(`✅ เพิ่ม "${name}" สำเร็จ`);
  }

  localStorage.setItem('takumi_menu', JSON.stringify(menuData));
  renderAdminMenu();
  renderFeaturedMenu();
  renderFullMenu();
  cancelEdit();
  // กลับไปหน้ารายการ
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-menu-list').classList.add('active');
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('.admin-nav-item').classList.add('active');
};

// แก้ไขเมนู - เติมข้อมูลลงฟอร์ม
function editMenu(id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('edit-id').value = id;
  document.getElementById('menu-name').value = item.name || '';
  document.getElementById('menu-name-jp').value = item.nameJP || '';
  document.getElementById('menu-price').value = item.price || '';
  document.getElementById('menu-cat').value = item.category || 'nigiri';
  document.getElementById('menu-img').value = item.img || item.emoji || '';
  document.getElementById('menu-desc').value = item.desc || '';
  document.getElementById('formTitle').textContent = 'แก้ไขเมนู';
  // ไปแท็บ add-menu
  adminTab('add-menu', document.querySelectorAll('.admin-nav-item')[1]);
}

// ลบเมนู
function deleteMenu(id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  if (!confirm(`ต้องการลบ "${item.name}" ออกจากเมนูหรือไม่?`)) return;
  menuData = menuData.filter(m => m.id !== id);
  localStorage.setItem('takumi_menu', JSON.stringify(menuData));
  renderAdminMenu();
  renderFeaturedMenu();
  renderFullMenu();
  // ลบออกจาก cart ด้วย
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
  showToast(`🗑️ ลบ "${item.name}" แล้ว`);
}

// ยกเลิกการแก้ไข
function cancelEdit() {
  editingId = null;
  document.getElementById('edit-id').value = '';
  document.getElementById('menu-name').value = '';
  document.getElementById('menu-name-jp').value = '';
  document.getElementById('menu-price').value = '';
  document.getElementById('menu-img').value = '';
  document.getElementById('menu-desc').value = '';
  document.getElementById('formTitle').textContent = 'เพิ่มเมนูใหม่';
}

// ========== TOAST NOTIFICATION ==========
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ========== NAVBAR SCROLL EFFECT ==========
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 30) {
    navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.3)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});
