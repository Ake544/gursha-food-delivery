// DOM Elements
const authButtons = document.getElementById('authButtons');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const authLoadingSpinner = document.getElementById('authLoadingSpinner'); 
const API_BASE = "https://gursha-food-delivery.onrender.com";

// 1. Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupDropdownBehavior();
});

// 2. Persistent Auth Check (Optimized)
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const storedName = localStorage.getItem('userName');

    // Show cached data immediately (if exists) while verifying
    if (storedName) updateUI(true, storedName, false);

    // Show loading state if token exists (awaiting verification)
    if (token) updateUI(false, '', true);

    if (token) {
        try {
            const response = await fetch(`${API_BASE}/auth/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const userData = await response.json();
                localStorage.setItem('userName', userData.name);
                updateUI(true, userData.name, false);
            } else {
                clearAuthState();
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            // Fallback to cached data if network fails
            if (storedName) {
                updateUI(true, storedName, false);
            } else {
                clearAuthState();
            }
        }
    } else {
        clearAuthState();
    }
}

// 3. UI State Management (Updated with loading state)
function updateUI(isAuthenticated, name = '', isLoading = false) {
    if (authLoadingSpinner) {
        authLoadingSpinner.style.display = isLoading ? 'block' : 'none';
    }

    if (authButtons) {
        authButtons.style.display = (isAuthenticated || isLoading) ? 'none' : 'flex';
    }
    
    if (userProfile) {
        userProfile.style.display = (isAuthenticated && !isLoading) ? 'flex' : 'none';
    }
    
    if (userName && name) {
        userName.textContent = name;
    }
}

// 4. Dropdown Behavior (Unchanged)
function setupDropdownBehavior() {
    if (userProfile) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.querySelector('.dropdown-content');
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown) dropdown.style.display = 'none';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuthState();
            window.location.href = '/index.html';
        });
    }
}

// 5. Clear Auth Data (Unchanged)
function clearAuthState() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('user_id');
    updateUI(false); // Logged-out state

    const dropdown = document.querySelector('.dropdown-content');
    if (dropdown) dropdown.style.display = 'none';
}