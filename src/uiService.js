import { formatCurrency, toTitleCase, createElement } from "./utils.js";
import { ORDER_STATUSES } from "./constants.js";

export function renderProductCard(product) {
  const card = createElement("article", { className: "product-card" }, []);
  const image = createElement("img", { src: product.imageUrl, alt: product.name, loading: "lazy" });
  const info = createElement("div", { className: "product-info" });

  info.innerHTML = `
    <span class="product-category">${toTitleCase(product.category)}</span>
    <h3 class="product-title">${product.name}</h3>
    <p class="product-description">${product.description}</p>
  `;

  const row = createElement("div", { className: "price-row" });
  row.innerHTML = `<span class="price">${formatCurrency(product.price)}</span>`;

  const actions = createElement("div", { className: "product-actions" });
  actions.innerHTML = `
    <button class="btn btn-sm btn-outline" data-action="details" data-id="${product.id}">Details</button>
    <button class="btn btn-sm btn-primary" data-action="add" data-id="${product.id}">Add</button>
  `;

  row.appendChild(actions);
  info.appendChild(row);
  card.appendChild(image);
  card.appendChild(info);

  return card;
}

export function renderReviewCards(reviews, container) {
  container.innerHTML = "";
  reviews.forEach((review) => {
    const card = createElement("article", { className: "review-card" });
    card.innerHTML = `
      <h4>${review.name}</h4>
      <p class="stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</p>
      <p>${review.text}</p>
    `;
    container.appendChild(card);
  });
}

export function renderOrderRow(order) {
  const row = createElement("div", { className: "order-row" });
  const status = ORDER_STATUSES.includes(order.status) ? order.status : "pending";
  row.innerHTML = `
    <div><strong>#${order.id}</strong> <small>${status}</small></div>
    <div>${order.userName} • ${order.delivery.address}</div>
    <div>${formatCurrency(order.totals?.total || 0)}</div>
    <div>${new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString()}</div>
  `;
  return row;
}

export function showModal(container, bodyHtml) {
  container.classList.add("show");
  container.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  container.querySelector(".modal-content").innerHTML = bodyHtml;
}

export function hideModal(container) {
  container.classList.remove("show");
  container.setAttribute("hidden", "true");
  document.body.style.overflow = "";
  container.querySelector(".modal-content").innerHTML = "";
}
