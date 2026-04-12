// order-confirmation.js - Order confirmation page for TeaCraft

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
  confirmationContent: document.getElementById("confirmationContent"),
  authToggleBtn: document.getElementById("authToggleBtn"),
};

const ui = {
  state: {
    user: null,
    order: null,
  },
};

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function renderConfirmation() {
  if (!ui.state.order) {
    selectors.confirmationContent.innerHTML = `<p>Kh?ng t?m th?y ??n h?ng.</p>`;
    return;
  }

  const order = ui.state.order;
  const orderDate = new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString();
  const expectedTime = new Date(order.fulfillment?.expectedBy?.toDate ? order.fulfillment.expectedBy.toDate() : order.fulfillment?.expectedBy).toLocaleString();

  selectors.confirmationContent.innerHTML = `
    <div class="confirmation-card">
      <div class="confirmation-header">
        <h1>??n h?ng ?? ???c x?c nh?n!</h1>
        <p>Cảm ơn bạn đã đặt hàng. Chúng tôi đã gửi email xác nhận đến ${ui.state.user.email}.</p>
      </div>
      <div class="confirmation-details">
        <div class="detail-row">
          <span>M? ??n h?ng:</span>
          <strong>${order.id}</strong>
        </div>
        <div class="detail-row">
          <span>Ng?y ??t:</span>
          <span>${orderDate}</span>
        </div>
        <div class="detail-row">
          <span>D? ki?n s?n s?ng:</span>
          <span>${expectedTime}</span>
        </div>
        <div class="detail-row">
          <span>Tr?ng th?i:</span>
          <span class="status-${order.status}">${order.status}</span>
        </div>
      </div>
      <div class="confirmation-items">
        <h3>S?n ph?m trong ??n</h3>
        <ul>${order.items.map(item => `<li>${item.quantity} x ${item.name} - ${formatCurrency(item.price * item.quantity)}</li>`).join("")}</ul>
      </div>
      <div class="confirmation-totals">
        <div><span>Tạm tính:</span><span>${formatCurrency(order.totals?.subtotal || 0)}</span></div>
        <div><span>Phí giao hàng:</span><span>${formatCurrency(order.totals?.delivery || 0)}</span></div>
        <div class="total"><strong>Tổng cộng</strong><strong>${formatCurrency(order.totals?.total || 0)}</strong></div>
      </div>
      <div class="confirmation-delivery">
        <h3>Th?ng tin giao h?ng</h3>
        <p><strong>H? v? t?n:</strong> ${order.userName}</p>
        <p><strong>S? ?i?n tho?i:</strong> ${order.delivery?.phone}</p>
        <p><strong>??a ch?:</strong> ${order.delivery?.address}</p>
        ${order.delivery?.notes ? `<p><strong>Ghi ch?:</strong> ${order.delivery.notes}</p>` : ""}
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-primary" id="trackOrderBtn">Theo d?i ??n h?ng</button>
        <button class="btn btn-outline" id="backToMenuBtn">Quay l?i th?c ??n</button>
      </div>
    </div>
  `;

  document.getElementById("trackOrderBtn").addEventListener("click", () => {
    window.location.href = `user-dashboard.html`;
  });

  document.getElementById("backToMenuBtn").addEventListener("click", () => {
    window.location.href = `index.html`;
  });
}

async function loadOrder() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) {
    selectors.confirmationContent.innerHTML = `<p>Ch?a c? m? ??n h?ng.</p>`;
    return;
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      selectors.confirmationContent.innerHTML = `<p>Kh?ng t?m th?y ??n h?ng.</p>`;
      return;
    }

    const orderData = orderDoc.data();
    if (orderData.userId !== ui.state.user.uid) {
      selectors.confirmationContent.innerHTML = `<p>B?n kh?ng c? quy?n xem ??n h?ng n?y.</p>`;
      return;
    }

    ui.state.order = { id: orderDoc.id, ...orderData };
    renderConfirmation();

  } catch (error) {
    console.error("Load order error", error);
    selectors.confirmationContent.innerHTML = `<p>C? l?i khi t?i ??n h?ng.</p>`;
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
  toast("??ng xu?t th?nh c?ng.");
  window.location.href = "index.html";
}

selectors.authToggleBtn.addEventListener("click", () => {
  if (ui.state.user) {
    signOutUser();
  } else {
    window.location.href = "index.html";
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    ui.state.user = user;
    await loadOrder();
  } else {
    window.location.href = "index.html";
  }
  updateAuthUI();
});

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

async function initConfirmation() {
  if (selectors.preloader) {
    setTimeout(() => {
      selectors.preloader.classList.add("hidden");
    }, 550);
  }
}

initConfirmation();
