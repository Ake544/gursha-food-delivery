let refreshInterval;

async function loadOrders() {
    // Stop auto-refresh while loading new data
    stopAutoRefresh();
    
    const container = document.getElementById('orders-container');
    const userId = localStorage.getItem('user_id');
    
    if (!userId) {
        container.innerHTML = '<div class="error">Please login to view orders</div>';
        return;
    }

    try {
        // ✅ SIMPLIFIED: No headers to avoid OPTIONS preflight issues
        const timestamp = new Date().getTime();
        const url = `http://localhost:8000/my-orders/${userId}?t=${timestamp}`;
        
        const response = await fetch(url);  // ← No headers = no OPTIONS preflight
        
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        
        if (data.orders && data.orders.length > 0) {
            renderOrders(data.orders);
        } else {
            container.innerHTML = '<div class="no-orders">No orders found</div>';
        }
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="error">Failed to load orders</div>';
    } finally {
        // Restart auto-refresh after loading
        startAutoRefresh();
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    
    container.innerHTML = orders.map(order => {
        // Convert status to CSS class
        const statusClass = `status-${order.status.toLowerCase().replace(/\s+/g, '-')}`;
        const orderDate = new Date(order.order_date);
        const formattedDate = orderDate.toLocaleDateString();
        const formattedTime = orderDate.toLocaleTimeString();
        
        return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Order #${order.order_id}</div>
                    <div class="order-date">${formattedDate} • ${formattedTime}</div>
                </div>
                <span class="order-status ${statusClass}">
                    ${order.status}
                </span>
            </div>
            
            <div class="order-items">
                <strong>Items:</strong> ${order.items}<br>
                <strong>Quantity:</strong> ${order.item_count} item(s)
            </div>
            
            <div class="order-total">
                Total: ${order.total_price.toFixed(2)} Birr
            </div>
        </div>
        `;
    }).join('');
}

function startAutoRefresh() {
    // Refresh every 5 seconds (5000ms)
    if (!refreshInterval) {
        refreshInterval = setInterval(loadOrders, 5000);
        console.log('Auto-refresh started: checking every 5 seconds');
    }
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('Auto-refresh stopped');
    }
}

// ✅ Force fresh data on page load and start auto-refresh
document.addEventListener('DOMContentLoaded', function() {
    console.log('Orders page loaded - forcing fresh data');
    loadOrders(); // Initial load
    startAutoRefresh(); // Start auto-refresh
});

// ✅ Stop auto-refresh when page is hidden (tab not active)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        // When user comes back to the tab, refresh immediately
        loadOrders();
        startAutoRefresh();
    }
});

// ✅ Clean up when page is closed
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});