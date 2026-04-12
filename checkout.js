// checkout.js - Checkout process for TeaCraft

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
  checkoutGrid: document.getElementById("checkoutGrid"),
  authToggleBtn: document.getElementById("authToggleBtn"),
};

const ui = {
  state: {
    user: null,
    cart: JSON.parse(localStorage.getItem("teacraft-cart")) || {},
    deliveryFee: 2.5,
    userData: null,
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

function renderCheckoutForm() {
  if (Object.keys(ui.state.cart).length === 0) {
    selectors.checkoutGrid.innerHTML = `<p>Your cart is empty. <a href="index.html">Go back to menu</a></p>`;
    return;
  }

  const subtotal = Object.values(ui.state.cart).reduce((acc, item) => acc + item.price * item.quantity, 0);
  const delivery = ui.state.deliveryFee;
  const total = subtotal + delivery;

  selectors.checkoutGrid.innerHTML = `
    <div class="checkout-summary">
      <h2>Tóm tắt đơn hàng</h2>
      <div id="checkoutItems"></div>
      <div class="checkout-totals">
        <div><span>Tạm tính:</span><span>${formatCurrency(subtotal)}</span></div>
        <div><span>Phí giao hàng:</span><span>${formatCurrency(delivery)}</span></div>
        <div class="total"><strong>Tổng cộng</strong><strong>${formatCurrency(total)}</strong></div>
      </div>
    </div>
    <div class="checkout-form-section">
      <h2>Thông tin giao hàng</h2>
      <form id="checkoutForm" novalidate>
        <label>Full name<input type="text" id="checkoutName" required value="${ui.state.userData?.name || ""}" /></label>
        <label>Phone<input type="tel" id="checkoutPhone" required pattern="[0-9]{10,}" value="${ui.state.userData?.phone || ""}" /></label>
        <label>Address<textarea id="checkoutAddress" rows="3" required>${ui.state.userData?.address || ""}</textarea></label>
        <label>Notes<textarea id="checkoutNotes" rows="2" placeholder="Leave a note (optional)"></textarea></label>
        <fieldset>
          <legend>Select payment method</legend>
          <label><input type="radio" name="payment" value="card" checked /> Credit/Debit Card</label>
          <label><input type="radio" name="payment" value="apple-pay" /> Apple Pay</label>
          <label><input type="radio" name="payment" value="google-pay" /> Google Pay</label>
          <label><input type="radio" name="payment" value="cash" /> Cash on delivery</label>
        </fieldset>
        <div class="payment-fields" id="cardFields">
          <label>Card Number<input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" /></label>
          <div class="card-details">
            <label>Expiry<input type="text" id="cardExpiry" placeholder="MM/YY" /></label>
            <label>CVV<input type="text" id="cardCvv" placeholder="123" /></label>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="placeOrderBtn">Đặt hàng</button>
      </form>
    </div>
  `;

  const checkoutItemsEl = document.getElementById("checkoutItems");
  checkoutItemsEl.innerHTML = "";

  Object.values(ui.state.cart).forEach((item) => {
    const line = document.createElement("div");
    line.className = "checkout-item";
    line.innerHTML = `<span>${item.quantity} x ${item.name}</span><span>${formatCurrency(item.price * item.quantity)}</span>`;
    checkoutItemsEl.appendChild(line);
  });

  const paymentRadios = document.querySelectorAll("input[name='payment']");
  const cardFields = document.getElementById("cardFields");

  paymentRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "card") {
        cardFields.style.display = "block";
      } else {
        cardFields.style.display = "none";
      }
    });
  });

  const checkoutForm = document.getElementById("checkoutForm");
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await placeOrder();
  });
}

async function placeOrder() {
  const name = document.getElementById("checkoutName").value.trim();
  const phone = document.getElementById("checkoutPhone").value.trim();
  const address = document.getElementById("checkoutAddress").value.trim();
  const notes = document.getElementById("checkoutNotes").value.trim();
  const paymentType = document.querySelector("input[name='payment']:checked").value;

  if (!name || !phone || !address) {
    toast("Please complete all required fields.", "error");
    return;
  }

  if (paymentType === "card") {
    const cardNumber = document.getElementById("cardNumber").value.trim();
    const cardExpiry = document.getElementById("cardExpiry").value.trim();
    const cardCvv = document.getElementById("cardCvv").value.trim();

    if (!cardNumber || !cardExpiry || !cardCvv) {
      toast("Please complete card details.", "error");
      return;
    }

    // Simulate payment processing
    toast("Processing payment...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const orderData = {
    userId: ui.state.user.uid,
    userName: name,
    userEmail: ui.state.user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "pending",
    delivery: {
      phone,
      address,
      notes,
    },
    paymentType,
    items: Object.values(ui.state.cart),
    totals: {
      subtotal: Number(Object.values(ui.state.cart).reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)),
      delivery: ui.state.deliveryFee,
      total: Number(Object.values(ui.state.cart).reduce((acc, item) => acc + item.price * item.quantity, 0) + ui.state.deliveryFee),
    },
    fulfillment: {
      expectedBy: new Date(new Date().getTime() + 45 * 60000),
      pickedUp: false,
      delivered: false,
    },
  };

  try {
    const orderRef = await db.collection("orders").add(orderData);

    // Update user loyalty points
    const pointsEarned = Math.floor(orderData.totals.total / 10);
    await db.collection("users").doc(ui.state.user.uid).update({
      loyalty: {
        points: firebase.firestore.FieldValue.increment(pointsEarned),
        level: "Bronze", // Simple level system
      },
    });

    ui.state.cart = {};
    saveCartToLocal();
    syncCartToFirestore();
    renderCartDrawer();

    toast("Order placed successfully! Order ID: " + orderRef.id);

    // Redirect to order confirmation
    setTimeout(() => {
      window.location.href = `order-confirmation.html?id=${orderRef.id}`;
    }, 2000);

  } catch (error) {
    console.error(error);
    toast("Could not place your order at this moment", "error");
  }
}

async function loadUserData() {
  if (!ui.state.user) return;

  try {
    const userDoc = await db.collection("users").doc(ui.state.user.uid).get();
    if (userDoc.exists) {
      ui.state.userData = userDoc.data();
    }
  } catch (error) {
    console.error("Load user data error", error);
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
  // Already on checkout page
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    ui.state.user = user;
    await loadUserData();
    await loadUserCart();
    renderCheckoutForm();
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

async function initCheckout() {
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

initCheckout();
