// product-detail.js - Detailed product view for TeaCraft

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
  productDetailGrid: document.getElementById("productDetailGrid"),
  relatedProductsGrid: document.getElementById("relatedProductsGrid"),
  authToggleBtn: document.getElementById("authToggleBtn"),
};

const ui = {
  state: {
    user: null,
    cart: JSON.parse(localStorage.getItem("teacraft-cart")) || {},
    deliveryFee: 2.5,
    product: null,
    relatedProducts: [],
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
        <button class="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
        <span>${item.quantity}</span>
        <button class="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
        <button class="remove" data-id="${item.id}" aria-label="Remove">✕</button>
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

function addToCart(product, frontOptions = {}) {
  const specialId = `${product.id}-${Object.keys(frontOptions).map(k => frontOptions[k]).join("-")}`;
  const key = specialId;

  if (!ui.state.cart[key]) {
    ui.state.cart[key] = {
      id: key,
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.price,
      quantity: 0,
      customization: Object.keys(frontOptions).length ? Object.values(frontOptions).join(" • ") : "",
      options: frontOptions,
    };
  }

  ui.state.cart[key].quantity += 1;
  saveCartToLocal();
  renderCartDrawer();
  toast(`Added ${product.name} to cart`);
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

function renderProductDetail(product) {
  if (!product) {
    selectors.productDetailGrid.innerHTML = `<p>Không tìm thấy sản phẩm.</p>`;
    return;
  }

  selectors.productDetailGrid.innerHTML = `
    <div class="product-detail-image">
      <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
    </div>
    <div class="product-detail-info">
      <span class="product-category">${product.category}</span>
      <h1 class="product-title">${product.name}</h1>
      <p class="product-description">${product.description}</p>
      <div class="product-price">${formatCurrency(product.price)}</div>
      <div class="product-options">
        <label>Sugar Level</label>
        <select id="sugarSelect">${product.options.sweetness.map((option) => `<option value="${option}">${option}</option>`).join("")}</select>
        <label>Ice Level</label>
        <select id="iceSelect">${product.options.ice.map((option) => `<option value="${option}">${option}</option>`).join("")}</select>
        <label>Topping</label>
        <select id="toppingSelect">${product.options.toppings.map((option) => `<option value="${option}">${option}</option>`).join("")}</select>
      </div>
      <div class="product-actions">
        <button class="btn btn-primary" id="addToCartBtn">Add to Cart</button>
        <button class="btn btn-outline" id="customizeBtn">Customize</button>
      </div>
      <div class="product-meta">
        <div>Calories: ${product.calories}</div>
        <div>Inventory: ${product.inventory} available</div>
        <div>Notes: ${product.notes.join(", ")}</div>
      </div>
    </div>
  `;

  document.getElementById("addToCartBtn").addEventListener("click", () => {
    const sugar = document.getElementById("sugarSelect").value;
    const ice = document.getElementById("iceSelect").value;
    const topping = document.getElementById("toppingSelect").value;
    addToCart(product, { sugar, ice, topping });
  });

  document.getElementById("customizeBtn").addEventListener("click", () => {
    // Open customization modal
    selectors.modalContent.innerHTML = `
      <div class="customization-modal">
        <h3>Customize Your Drink</h3>
        <form id="customizationForm">
          <label>Sugar<input type="range" id="sugarRange" min="0" max="100" value="50" /></label>
          <label>Ice<input type="range" id="iceRange" min="0" max="100" value="50" /></label>
          <label>Toppings<select id="toppingsMulti" multiple>${product.options.toppings.map(t => `<option value="${t}">${t}</option>`).join("")}</select></label>
          <button type="submit" class="btn btn-primary">Add Custom Drink</button>
        </form>
      </div>
    `;
    selectors.modalContainer.classList.add("show");
    selectors.modalContainer.removeAttribute("hidden");
    document.body.style.overflow = "hidden";

    document.getElementById("customizationForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const sugar = document.getElementById("sugarRange").value + "%";
      const ice = document.getElementById("iceRange").value + "%";
      const toppings = Array.from(document.getElementById("toppingsMulti").selectedOptions).map(o => o.value);
      addToCart(product, { sugar, ice, toppings: toppings.join(", ") });
      hideModal();
    });
  });
}

function renderRelatedProducts(products) {
  selectors.relatedProductsGrid.innerHTML = "";
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";

    const title = product.name.length > 38 ? `${product.name.slice(0, 36)}...` : product.name;
    const description = product.description.length > 60 ? `${product.description.slice(0, 58)}...` : product.description;

    card.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.name}" />
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 class="product-title">${title}</h3>
        <p class="product-description">${description}</p>
        <div class="price-row">
          <span class="price">${formatCurrency(product.price)}</span>
          <div class="product-actions">
            <button class="btn btn-sm btn-outline" data-action="details" data-id="${product.id}">Details</button>
            <button class="btn btn-sm btn-primary" data-action="add" data-id="${product.id}">Add</button>
          </div>
        </div>
      </div>
    `;

    const detailsBtn = card.querySelector("button[data-action='details']");
    const addBtn = card.querySelector("button[data-action='add']");

    detailsBtn.addEventListener("click", () => window.location.href = `product-detail.html?id=${product.id}`);
    addBtn.addEventListener("click", () => addToCart(product));

    selectors.relatedProductsGrid.appendChild(card);
  });
}

async function loadProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (!productId) {
    selectors.productDetailGrid.innerHTML = `<p>Chưa chọn sản phẩm.</p>`;
    return;
  }

  try {
    const doc = await db.collection("products").doc(productId).get();
    if (!doc.exists) {
      selectors.productDetailGrid.innerHTML = `<p>Không tìm thấy sản phẩm.</p>`;
      return;
    }

    ui.state.product = { id: doc.id, ...doc.data() };
    renderProductDetail(ui.state.product);

    // Load related products
    const relatedQuery = db.collection("products").where("category", "==", ui.state.product.category).limit(4);
    const relatedSnapshot = await relatedQuery.get();
    ui.state.relatedProducts = relatedSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== productId);
    renderRelatedProducts(ui.state.relatedProducts);

  } catch (error) {
    console.error("Load product error", error);
    selectors.productDetailGrid.innerHTML = `<p>Error loading product.</p>`;
  }
}

function updateAuthUI() {
  if (ui.state.user) {
    selectors.authToggleBtn.textContent = "Đăng xuất";
    selectors.authToggleBtn.classList.remove("btn-outline");
    selectors.authToggleBtn.classList.add("btn-primary");
  } else {
    selectors.authToggleBtn.textContent = "Đăng nhập";
    selectors.authToggleBtn.classList.remove("btn-primary");
    selectors.authToggleBtn.classList.add("btn-outline");
  }
}

async function signOutUser() {
  await auth.signOut();
  ui.state.user = null;
  updateAuthUI();
  toast("Signed out successfully.");
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
  if (!ui.state.user) {
    toast("Please sign in to checkout.");
    return;
  }
  window.location.href = "checkout.html";
});

auth.onAuthStateChanged(async (user) => {
  ui.state.user = user;
  if (user) {
    await loadUserCart();
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

async function initProductDetail() {
  await loadProduct();
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

initProductDetail();
