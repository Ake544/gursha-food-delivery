document.getElementById("adminLoginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");
  msg.textContent = ""; // Clear previous messages

  // Client-side validation
  if (!email || !password) {
    msg.style.color = "red";
    msg.textContent = "Both fields are required!";
    return;
  }

  try {
    const API_BASE = "http://localhost:8000";
    const response = await fetch(`${API_BASE}/auth/admin/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: 'include', // For cookies if using HTTP-only tokens
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      msg.style.color = "green";
      msg.textContent = "Login successful! Redirecting...";
      
      // Secure token handling (example)
      if (data.access_token) {
        localStorage.setItem('admin_token', data.access_token);
      }
      
      // Delay redirect for UX
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 1000);
    } else {
      msg.style.color = "red";
      msg.textContent = data.detail || "Invalid credentials!";
      document.getElementById("password").value = ""; // Clear password field
    }
  } catch (error) {
    console.error("Login error:", error);
    msg.style.color = "red";
    msg.textContent = "Network error. Please try again.";
  }
});