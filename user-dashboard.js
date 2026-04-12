// user-dashboard.js - User dashboard for TeaCraft

const FirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

firebase.initializeApp(FirebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const selectors = {
  preloader: document.getElementById("preloader"),
  cartToggleBtn: document.getElementById("cartToggleBtn"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartCloseBtn: document.getElementById("cartCloseBtn"),
  cartItems: document.getElementById("cartItems"),
  cartCount: document.getElementById("cartCount"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartDelivery: document.getElementById("cartDelivery"),
  cartTotal: document.getElementById("cartTotal"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  modalContainer: document.getElementById("modalContainer"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalContent: document.getElementById("modalContent"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  dashboardContent: document.getElementById("dashboardContent"),
  authToggleBtn: document.getElementById("authToggleBtn"),
};

const ui = {
  state: {
    user: null,
    cart: JSON.parse(localStorage.getItem("teacraft-cart")) || {},
    deliveryFee: 2.5,
    currentSection: "profile",
    userData: null,
    orders: [],
    favorites: [],
  },
};

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function updateCartCountUI() {
  const count = Object.values(ui.state.cart).reduce((sum, item) => sum + item.quantity, 0);
  selectors.cartCount.textContent = count;
}

function saveCartToLocal() {
  localStorage.setItem("teacraft-cart", JSON.stringify(ui.state.cart));
}

function syncCartToFirestore() {
  if (!ui.state.user) return;

  const cartRef = db.collection("carts").doc(ui.state.user.uid);
  return cartRef.set({
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    items: Object.values(ui.state.cart),
  }, { merge: true })
  .catch((err) => {
    console.warn("Cart sync to Firestore failure", err);
  });
}

function updateCartSummaryUI() {
  const subtotal = Object.values(ui.state.cart).reduce((acc, item) => acc + item.price * item.quantity, 0);
  const delivery = ui.state.deliveryFee;
  const total = subtotal + delivery;
  selectors.cartSubtotal.textContent = formatCurrency(subtotal);
  selectors.cartDelivery.textContent = formatCurrency(delivery);
  selectors.cartTotal.textContent = formatCurrency(total);
}

function renderCartDrawer() {
  selectors.cartItems.innerHTML = "";

  if (Object.keys(ui.state.cart).length === 0) {
    selectors.cartItems.innerHTML = `<div class='empty-cart'><p>Your cart is empty. Add a drink to start.</p></div>`;
    selectors.checkoutBtn.disabled = true;
    updateCartCountUI();
    updateCartSummaryUI();
    return;
  }

  selectors.checkoutBtn.disabled = false;

  Object.values(ui.state.cart).forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";

    itemEl.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.name}" loading="lazy" />
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span>${formatCurrency(item.price)} x ${item.quantity}</span>
        <span class="muted">${item.customization || ""}</span>
      </div>
      <div class="cart-item-controls">
        <button class="decrease" data-id="${item.id}" aria-label="Decrease quantity">âˆ’</button>
        <span>${item.quantity}</span>
        <button class="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
        <button class="remove" data-id="${item.id}" aria-label="Remove">âœ•</button>
      </div>
    `;

    selectors.cartItems.appendChild(itemEl);
  });

  selectors.cartItems.querySelectorAll(".cart-item-controls button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains("increase")) changeCartQuantity(id, 1);
      else if (e.target.classList.contains("decrease")) changeCartQuantity(id, -1);
      else if (e.target.classList.contains("remove")) removeFromCart(id);
    });
  });

  updateCartCountUI();
  updateCartSummaryUI();
  saveCartToLocal();
  syncCartToFirestore();
}

function changeCartQuantity(productId, delta) {
  if (!ui.state.cart[productId]) return;
  ui.state.cart[productId].quantity += delta;

  if (ui.state.cart[productId].quantity <= 0) {
    delete ui.state.cart[productId];
  }

  saveCartToLocal();
  renderCartDrawer();
}

function removeFromCart(productId) {
  delete ui.state.cart[productId];
  saveCartToLocal();
  renderCartDrawer();
  toast("Item removed from cart.");
}

function setCartOpen(open, focusTarget = null) {
  ui.state.isCartOpen = open;
  if (open) {
    selectors.cartDrawer.classList.add("open");
    selectors.cartDrawer.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
  } else {
    selectors.cartDrawer.classList.remove("open");
    selectors.cartDrawer.setAttribute("hidden", "true");
    document.body.style.overflow = "";
  }
  if (focusTarget) focusTarget.focus();
}

function hideModal() {
  selectors.modalContainer.classList.remove("show");
  selectors.modalContainer.setAttribute("hidden", "true");
  document.body.style.overflow = "";
  selectors.modalContent.innerHTML = "";
}

selectors.modalCloseBtn.addEventListener("click", hideModal);

function renderProfileSection() {
  if (!ui.state.userData) {
    selectors.dashboardContent.innerHTML = `<p>?ang t?i h? s?...</p>`;
    return;
  }

  selectors.dashboardContent.innerHTML = `
    <div class="profile-section">
      <h2>Th?ng tin h? s?</h2>
      <form id="profileForm" class="profile-form">
        <label>H? v? t?n<input type="text" id="profileName" value="${ui.state.userData.name || ""}" required /></label>
        <label>Email<input type="email" id="profileEmail" value="${ui.state.user.email}" readonly /></label>
        <label>S? ?i?n tho?i<input type="tel" id="profilePhone" value="${ui.state.userData.phone || ""}" /></label>
        <label>??a ch?<textarea id="profileAddress" rows="3">${ui.state.userData.address || ""}</textarea></label>
        <button type="submit" class="btn btn-primary">C?p nh?t h? s?</button>
      </form>
    </div>
  `;

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("profileName").value.trim();
    const phone = document.getElementById("profilePhone").value.trim();
    const address = document.getElementById("profileAddress").value.trim();

    try {
      await db.collection("users").doc(ui.state.user.uid).update({
        name,
        phone,
        address,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      toast("C?p nh?t h? s? th?nh c?ng.");
      await loadUserData();
    } catch (error) {
      console.error(error);
      toast("Kh?ng th? c?p nh?t h? s?.", "error");
    }
  });
}

function renderOrdersSection() {
  selectors.dashboardContent.innerHTML = `
    <div class="orders-section">
      <h2>L?ch s? ??n h?ng</h2>
      <div id="ordersList"></div>
    </div>
  `;

  const ordersList = document.getElementById("ordersList");
  if (ui.state.orders.length === 0) {
    ordersList.innerHTML = `<p>B?n ch?a c? ??n h?ng n?o.</p>`;
    return;
  }

  ui.state.orders.forEach((order) => {
    const orderEl = document.createElement("div");
    orderEl.className = "order-card";
    const orderItems = order.items.map((item) => `${item.quantity}Ã—${item.name}`).join(", ");
    const orderDate = new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString();

    orderEl.innerHTML = `
      <h3>??n h?ng #${order.id}</h3>
      <p><strong>Tr?ng th?i:</strong> ${order.status}</p>
      <p><strong>Ng?y ??t:</strong> ${orderDate}</p>
      <p><strong>S?n ph?m:</strong> ${orderItems}</p>
      <p><strong>T?ng ti?n:</strong> ${formatCurrency(order.totals?.total || 0)}</p>
      <button class="btn btn-sm btn-outline" data-order-id="${order.id}">Xem chi ti?t</button>
    `;

    ordersList.appendChild(orderEl);
  });

  ordersList.querySelectorAll("button[data-order-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.orderId;
      const order = ui.state.orders.find(o => o.id === orderId);
      showOrderDetails(order);
    });
  });
}

function renderFavoritesSection() {
  selectors.dashboardContent.innerHTML = `
    <div class="favorites-section">
      <h2>M?n y?u th?ch</h2>
      <div id="favoritesList"></div>
    </div>
  `;

  const favoritesList = document.getElementById("favoritesList");
  if (ui.state.favorites.length === 0) {
    favoritesList.innerHTML = `<p>Ch?a c? m?n y?u th?ch n?o. H?y th?m t? th?c ??n nh?!</p>`;
    return;
  }

  ui.state.favorites.forEach((product) => {
    const favEl = document.createElement("div");
    favEl.className = "favorite-item";
    favEl.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.name}" />
      <div>
        <h4>${product.name}</h4>
        <p>${product.description}</p>
        <p>${formatCurrency(product.price)}</p>
        <button class="btn btn-sm btn-primary" data-product-id="${product.id}">??t l?i</button>
      </div>
    `;
    favoritesList.appendChild(favEl);
  });

  favoritesList.querySelectorAll("button[data-product-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = `product-detail.html?id=${btn.dataset.productId}`;
    });
  });
}

function renderLoyaltySection() {
  const loyaltyPoints = ui.state.userData?.loyalty?.points || 0;
  const loyaltyLevel = ui.state.userData?.loyalty?.level || "??ng";

  selectors.dashboardContent.innerHTML = `
    <div class="loyalty-section">
      <h2>Ch??ng tr?nh th?nh vi?n</h2>
      <div class="loyalty-card">
        <h3>C?p ?? hi?n t?i: ${loyaltyLevel}</h3>
        <p>?i?m t?ch l?y: ${loyaltyPoints}</p>
        <p>T?ch ?i?m sau m?i ??n h?ng ?? ??i ?u ??i v? nh?n ?? u?ng mi?n ph?.</p>
        <div class="loyalty-progress">
          <div class="progress-bar" style="width: ${Math.min(loyaltyPoints / 100 * 100, 100)}%"></div>
        </div>
        <p>L?n h?ng ti?p theo khi ??t 100 ?i?m.</p>
      </div>
    </div>
  `;
}

function renderSettingsSection() {
  selectors.dashboardContent.innerHTML = `
    <div class="settings-section">
      <h2>C?i ??t t?i kho?n</h2>
      <form id="settingsForm" class="settings-form">
        <label><input type="checkbox" id="emailNotifications" ${ui.state.userData?.preferences?.emailNotifications ? "checked" : ""} /> Nh?n th?ng b?o qua email</label>
        <label><input type="checkbox" id="smsNotifications" ${ui.state.userData?.preferences?.smsNotifications ? "checked" : ""} /> Nh?n th?ng b?o qua SMS</label>
        <label><input type="checkbox" id="marketingEmails" ${ui.state.userData?.preferences?.marketingEmails ? "checked" : ""} /> Nh?n email khuy?n m?i</label>
        <button type="submit" class="btn btn-primary">L?u c?i ??t</button>
      </form>
      <div class="danger-zone">
        <h3>V?ng nguy hi?m</h3>
        <button class="btn btn-outline" id="deleteAccountBtn">X?a t?i kho?n</button>
      </div>
    </div>
  `;

  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailNotifications = document.getElementById("emailNotifications").checked;
    const smsNotifications = document.getElementById("smsNotifications").checked;
    const marketingEmails = document.getElementById("marketingEmails").checked;

    try {
      await db.collection("users").doc(ui.state.user.uid).update({
        "preferences.emailNotifications": emailNotifications,
        "preferences.smsNotifications": smsNotifications,
        "preferences.marketingEmails": marketingEmails,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      toast("?? c?p nh?t c?i ??t.");
      await loadUserData();
    } catch (error) {
      console.error(error);
      toast("Kh?ng th? c?p nh?t c?i ??t.", "error");
    }
  });

  document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
    if (!confirm("B?n c? ch?c mu?n x?a t?i kho?n kh?ng? H?nh ??ng n?y kh?ng th? ho?n t?c.")) return;

    try {
      await db.collection("users").doc(ui.state.user.uid).delete();
      await auth.currentUser.delete();
      toast("?? x?a t?i kho?n.");
      window.location.href = "index.html";
    } catch (error) {
      console.error(error);
      toast("Kh?ng th? x?a t?i kho?n.", "error");
    }
  });
}

function showOrderDetails(order) {
  selectors.modalContent.innerHTML = `
    <div class="order-details-modal">
      <h3>??n h?ng #${order.id}</h3>
      <p><strong>Tr?ng th?i:</strong> ${order.status}</p>
      <p><strong>Ng?y ??t:</strong> ${new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString()}</p>
      <p><strong>Ph? giao h?ng:</strong> ${order.delivery.address}</p>
      <p><strong>S? ?i?n tho?i:</strong> ${order.delivery.phone}</p>
      <p><strong>Ghi ch?:</strong> ${order.delivery.notes || "Kh?ng c?"}</p>
      <h4>S?n ph?m:</h4>
      <ul>${order.items.map(item => `<li>${item.quantity}Ã—${item.name} - ${formatCurrency(item.price * item.quantity)}</li>`).join("")}</ul>
      <p><strong>Tạm tính:</strong> ${formatCurrency(order.totals?.subtotal || 0)}</p>
      <p><strong>Ph? giao h?ng:</strong> ${formatCurrency(order.totals?.delivery || 0)}</p>
      <p><strong>T?ng ti?n:</strong> ${formatCurrency(order.totals?.total || 0)}</p>
    </div>
  `;
  selectors.modalContainer.classList.add("show");
  selectors.modalContainer.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
}

function switchSection(section) {
  ui.state.currentSection = section;
  document.querySelectorAll(".dashboard-nav a").forEach(a => a.classList.remove("active"));
  document.querySelector(`[data-section="${section}"]`).classList.add("active");

  switch (section) {
    case "profile":
      renderProfileSection();
      break;
    case "orders":
      renderOrdersSection();
      break;
    case "favorites":
      renderFavoritesSection();
      break;
    case "loyalty":
      renderLoyaltySection();
      break;
    case "settings":
      renderSettingsSection();
      break;
  }
}

async function loadUserData() {
  if (!ui.state.user) return;

  try {
    const userDoc = await db.collection("users").doc(ui.state.user.uid).get();
    if (userDoc.exists) {
      ui.state.userData = userDoc.data();
    } else {
      ui.state.userData = { name: ui.state.user.displayName || "", email: ui.state.user.email };
    }
  } catch (error) {
    console.error("Load user data error", error);
  }
}

async function loadOrders() {
  if (!ui.state.user) return;

  try {
    const ordersQuery = db.collection("orders").where("userId", "==", ui.state.user.uid).orderBy("createdAt", "desc");
    const snapshot = await ordersQuery.get();
    ui.state.orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Load orders error", error);
  }
}

async function loadFavorites() {
  if (!ui.state.user) return;

  try {
    const favoritesQuery = db.collection("favorites").where("userId", "==", ui.state.user.uid);
    const snapshot = await favoritesQuery.get();
    const productIds = snapshot.docs.map(doc => doc.data().productId);
    if (productIds.length > 0) {
      const productsQuery = db.collection("products").where(firebase.firestore.FieldPath.documentId(), "in", productIds);
      const productsSnapshot = await productsQuery.get();
      ui.state.favorites = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (error) {
    console.error("Load favorites error", error);
  }
}

function updateAuthUI() {
  if (ui.state.user) {
    selectors.authToggleBtn.textContent = "??ng xu?t";
    selectors.authToggleBtn.classList.remove("btn-outline");
    selectors.authToggleBtn.classList.add("btn-primary");
  } else {
    selectors.authToggleBtn.textContent = "??ng nh?p";
    selectors.authToggleBtn.classList.remove("btn-primary");
    selectors.authToggleBtn.classList.add("btn-outline");
  }
}

async function signOutUser() {
  await auth.signOut();
  ui.state.user = null;
  updateAuthUI();
  toast("Signed out successfully.");
  window.location.href = "index.html";
}

selectors.authToggleBtn.addEventListener("click", () => {
  if (ui.state.user) {
    signOutUser();
  } else {
    window.location.href = "index.html";
  }
});

selectors.cartToggleBtn.addEventListener("click", () => {
  setCartOpen(!ui.state.isCartOpen, selectors.cartCloseBtn);
});

selectors.cartCloseBtn.addEventListener("click", () => {
  setCartOpen(false);
});

selectors.checkoutBtn.addEventListener("click", () => {
  window.location.href = "checkout.html";
});

document.querySelectorAll(".dashboard-nav a").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = e.target.dataset.section;
    switchSection(section);
  });
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    ui.state.user = user;
    await loadUserData();
    await loadOrders();
    await loadFavorites();
    await loadUserCart();
    switchSection(ui.state.currentSection);
  } else {
    window.location.href = "index.html";
  }
  updateAuthUI();
});

async function loadUserCart() {
  if (!ui.state.user) return;

  const cartSnapshot = await db.collection("carts").doc(ui.state.user.uid).get();
  if (cartSnapshot.exists) {
    const data = cartSnapshot.data();
    if (data?.items?.length) {
      ui.state.cart = {};
      data.items.forEach((item) => {
        ui.state.cart[item.id] = item;
      });
    }
  }
  saveCartToLocal();
  renderCartDrawer();
}

function toast(message, type = "success") {
  const existingToast = document.querySelector(".notification-toast");
  if (existingToast) existingToast.remove();

  const toastEl = document.createElement("div");
  toastEl.className = `notification-toast notification-${type}`;
  toastEl.textContent = message;
  toastEl.style.cssText = `
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    min-width: 240px;
    background: ${type === "success" ? "#2f8030" : "#bb2f2f"};
    color: #fff;
    padding: 0.7rem 1rem;
    border-radius: 10px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.18);
    z-index: 9999;
    font-weight: 600;
  `;
  document.body.append(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(() => toastEl.remove(), 320);
  }, 2800);
}

async function initDashboard() {
  renderCartDrawer();

  if (selectors.preloader) {
    setTimeout(() => {
      selectors.preloader.classList.add("hidden");
    }, 550);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (ui.state.isCartOpen) setCartOpen(false);
      hideModal();
    }
  });

  selectors.modalBackdrop.addEventListener("click", hideModal);
  selectors.modalContainer.addEventListener("click", (event) => {
    if (event.target === selectors.modalContainer) hideModal();
  });
}

initDashboard();
