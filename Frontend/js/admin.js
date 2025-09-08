document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("orders-list");
  const revenueSpan = document.getElementById("total-revenue");
  const API_BASE = "https://gursha-food-delivery.onrender.com";

  // Clear while loading
  container.innerHTML = '<div class="loading">Loading orders...</div>';

  // Polling config
  let refreshInterval;
  const POLLING_INTERVAL = 5000; // 5 sec

  // Load revenue from main.py (8000)
  async function loadRevenue() {
    try {
      const response = await fetch(`${API_BASE}/admin/total-revenue`);
      if (!response.ok) throw new Error("Failed to fetch revenue");

      const data = await response.json();

      const revenue = Number(data.total_revenue || 0);
      revenueSpan.textContent = revenue.toLocaleString();
    } catch (error) {s
      console.error("Revenue fetch error:", error);
      revenueSpan.textContent = "Error";
    }
  }

  // Load orders from auth.py (8002)
  async function loadOrders() {
    try {
      const response = await fetch(`${API_BASE}/auth/admin`);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const orders = await response.json();
      container.innerHTML = ""; // clear loading/error

      if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">No orders currently preparing</div>';
        return;
      }

      orders.forEach(order => {
        // avoid duplicate rendering
        if (document.querySelector(`[data-order-id="${order.order_id}"]`)) return;

        const orderBox = document.createElement("div");
        orderBox.className = "order-box";
        orderBox.dataset.orderId = order.order_id;

        const header = document.createElement("h3");
        header.textContent = `Order #${order.order_id}`;
        orderBox.appendChild(header);

        order.items.forEach(item => {
          const itemLine = document.createElement("div");
          itemLine.className = "item-line";
          itemLine.textContent = `${item.quantity}x ${item.name}`;
          orderBox.appendChild(itemLine);
        });

        const doneBtn = document.createElement("button");
        doneBtn.className = "done-btn";
        doneBtn.textContent = "Done";
        doneBtn.onclick = async () => {
          try {
            doneBtn.disabled = true;
            doneBtn.textContent = "Updating...";

            const updateResponse = await fetch(
              `${API_BASE}/auth/admin/orders/${order.order_id}/out-for-delivery`,
              { method: "POST", headers: { "Content-Type": "application/json" } }
            );

            if (!updateResponse.ok) throw new Error("Failed to update order");

            doneBtn.textContent = "Out for Delivery";
            doneBtn.style.backgroundColor = "#e2cc4dff";

            setTimeout(() => {
              orderBox.style.opacity = "0.7";
              orderBox.style.borderLeft = "4px solid #d6af2fff";
            }, 1000);

            // refresh once then resume polling
            stopPolling();
            setTimeout(() => {
              loadOrders();
              startPolling();
            }, 2000);
          } catch (err) {
            console.error("Update error:", err);
            doneBtn.textContent = "Error! Try Again";
            doneBtn.style.backgroundColor = "#dc3545";
            doneBtn.disabled = false;
          }
        };

        orderBox.appendChild(doneBtn);
        container.appendChild(orderBox);
      });
    } catch (error) {
      console.error("Orders fetch error:", error);
      container.innerHTML = `
        <div class="error">
          <h3>Error loading orders</h3>
          <p>${error.message}</p>
          <button id="retry-btn">Retry</button>
        </div>
      `;
      document.getElementById("retry-btn").onclick = loadOrders;
    }
  }

  // Polling control
  function startPolling() {
    if (!refreshInterval) {
      refreshInterval = setInterval(() => {
        loadOrders();
        loadRevenue();
      }, POLLING_INTERVAL);
      console.log("Polling started...");
    }
  }

  function stopPolling() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      console.log("Polling stopped...");
    }
  }

  // Initial load
  await loadOrders();
  await loadRevenue();
  startPolling();

  // Smart polling (pause when tab hidden)
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopPolling() : startPolling();
  });

  // Cleanup
  window.addEventListener("beforeunload", stopPolling);
});
