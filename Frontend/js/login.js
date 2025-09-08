// Handle Google credential response
async function handleCredentialResponse(response) {
  const API_BASE = "http://localhost:8000";
  try {
    const credential = response.credential; // Google ID token

    // Send the ID token to your backend for verification
    const res = await fetch(`${API_BASE}/auth/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: credential })
    });

    const data = await res.json();

    console.log("Full response:", data);
    console.log("User object:", data.user);
    console.log("User ID field:", data.user.id);

    if (!res.ok) {
      throw new Error(data.detail || "Google login failed");
    }

    // Store backend-issued JWT + user info
    localStorage.setItem("authToken", data.access_token);
    localStorage.setItem("userName", data.user.name);
    localStorage.setItem("user_id", data.user.id);

    // Redirect to main page
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Google login error:", error);
    const errorElement = document.getElementById("loginError");
    errorElement.textContent = error.message;
    errorElement.style.display = "block";
  }
}
