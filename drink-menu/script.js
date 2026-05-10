const searchInput = document.getElementById('searchInput');
const menuGrid = document.getElementById('menuGrid');
const filterGroup = document.getElementById('filterGroup');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');

// Danh sách tên file ảnh trong thư mục /images
const imageFiles = [
  'trà sữa truyền thống.jpg',
  'matcha latte.jpg',
  'cacao sữa.jpg',
  'trà trái cây nhiệt đới.jpg',
  'trà sữa trân châu đường đen.jpg',
  'matcha kem sữa.jpg',
  'cacao choco mint đá xay.jpg',
  'trà hoa nhài.jpg',
  'nước chanh mật ong.jpg',
  'sinh tố xoài.jpg',
  'trà ô long hạt sen.jpg',
  'matcha đá xay.jpg'
];

const filterOptions = ['All', 'No Caffeine', 'Tea', 'Milk Tea', 'Matcha', 'Cacao'];
let activeFilter = 'All';
let searchQuery = '';

const bestSellerNames = [
  'Trà Sữa Truyền Thống',
  'Matcha Latte',
  'Cacao Sữa',
  'Trà Trái Cây Nhiệt Đới'
];

const menuItems = imageFiles.map((fileName) => {
  const name = formatMenuName(fileName);
  return {
    name,
    image: encodeURI(`images/${fileName}`),
    category: detectCategory(name),
    price: randomPrice(25, 55),
    bestSeller: bestSellerNames.includes(name)
  };
});

function formatMenuName(fileName) {
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return baseName
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function detectCategory(name) {
  const lower = name.toLowerCase();

  if (lower.includes('trà sữa')) return 'Milk Tea';
  if (lower.includes('matcha')) return 'Matcha';
  if (lower.includes('cacao')) return 'Cacao';
  if (['chanh', 'trái', 'trái', 'fruit', 'mật ong', 'nước', 'nước ép', 'sinh tố', 'sinh to'].some((term) => lower.includes(term))) {
    return 'No Caffeine';
  }
  if (lower.includes('trà') || lower.includes('tra')) return 'Tea';

  return 'Tea';
}

function randomPrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

function buildFilterButtons() {
  filterGroup.innerHTML = '';

  filterOptions.forEach((filterName) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-btn';
    button.textContent = filterName;

    if (filterName === activeFilter) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      activeFilter = filterName;
      buildFilterButtons();
      renderMenu();
    });

    filterGroup.appendChild(button);
  });
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'menu-card';

  article.innerHTML = `
    <div class="card-image">
      <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x625?text=No+Image'" />
      ${item.bestSeller ? '<span class="badge">Best Seller</span>' : ''}
    </div>
    <div class="card-body">
      <div>
        <h3 class="card-title">${item.name}</h3>
        <span class="card-tag">${item.category}</span>
      </div>
      <div class="card-actions">
        <strong class="card-price">${formatPrice(item.price)}</strong>
        <button type="button" class="btn-add">Thêm vào giỏ</button>
      </div>
    </div>
  `;

  article.querySelector('.btn-add').addEventListener('click', () => {
    showToast(`Đã thêm "${item.name}" vào giỏ`);
  });

  return article;
}

function renderMenu() {
  const query = searchQuery.trim().toLowerCase();

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(query);
    const matchesFilter = activeFilter === 'All' || item.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  menuGrid.innerHTML = '';

  if (filteredItems.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filteredItems.forEach((item) => {
    const card = createCard(item);
    menuGrid.appendChild(card);
  });
}

function formatPrice(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 1600);
}

searchInput.addEventListener('input', (event) => {
  searchQuery = event.target.value;
  renderMenu();
});

buildFilterButtons();
renderMenu();
