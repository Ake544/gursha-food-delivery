const inputEl = document.querySelector(".chat-input input");
const sendBtn = document.querySelector(".chat-input button");
const chatBody = document.querySelector(".chat-body");

// Event listeners
sendBtn.addEventListener("click", onUserSend);
inputEl.addEventListener("keypress", (e) => e.key === "Enter" && onUserSend());

// Session management
function getSessionId() {
  const sessionId = localStorage.getItem("chat_session_id") || `user-${Date.now()}`;
  localStorage.setItem("chat_session_id", sessionId);
  return sessionId;
}

// Message display with typing indicator
function appendMessage(sender, text, isTyping = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender === "user" ? "user-message" : ""} ${isTyping ? "typing-indicator" : ""}`;
  
  if (isTyping) {
    msgDiv.innerHTML = `
      <div class="typing-dots">
        <div></div>
        <div></div>
        <div></div>
      </div>
    `;
    msgDiv.id = "typing-indicator";
  } else {
    msgDiv.innerHTML = `<p>${text}</p>`;
    
    // Add timestamp if needed
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    msgDiv.dataset.time = time;
  }
  
  chatBody.appendChild(msgDiv);
  chatBody.scrollTo({
    top: chatBody.scrollHeight,
    behavior: "smooth"
  });
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

// Main chat function
async function onUserSend() {
  const message = inputEl.value.trim();
    
    // ✅ FIRST: Check if payment was just completed
    const paymentCompleted = localStorage.getItem('payment_completed');
    const paymentSession = localStorage.getItem('payment_session');
    
    if (paymentCompleted === 'true') {
        // Clear the payment flag so we don't show it again
        localStorage.removeItem('payment_completed');
        localStorage.removeItem('payment_session');
        
        // Show payment success message
        appendMessage("bot", "✅ Payment Successful! Your order will be delivered soon. 🚚");
        
        // If user also typed a message, process it normally
        if (message) {
            appendMessage("user", message);
            inputEl.value = "";
            // Continue with normal message processing...
        } else {
            return; // Just show payment success and stop
        }
    }

  if (!message) return;

  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    appendMessage("bot", "⚠️ Please login or Sign Up to continue.");
    inputEl.value = "";
    return;
  }

  appendMessage("user", message);
  inputEl.value = "";
  appendMessage("bot", "", true);

  try {
    const tokenRes = await fetch("https://gursha-food-delivery.onrender.com/token");
    if (!tokenRes.ok) throw new Error("Failed to get token");
    const { access_token } = await tokenRes.json();

    const sessionId = getSessionId();

    const response = await fetch(
      `https://dialogflow.googleapis.com/v2/projects/gursha-chatbot-for-food-d-cfum/agent/sessions/${sessionId}:detectIntent`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalDetectIntentRequest: {
            payload: { authToken: authToken }
          },
          queryInput: {
            text: {
              text: message,
              languageCode: "en"
            }
          },
          queryParams: {
            contexts: [
              {
                name: `projects/gursha-chatbot-for-food-d-cfum/agent/sessions/${sessionId}/contexts/auth`,
                lifespanCount: 50,
                parameters: { authToken: authToken }
              }
            ]
          }
        }),
      }
    );

    if (!response.ok) throw new Error("Dialogflow API error");

    removeTypingIndicator();
    const data = await response.json();
    console.log("Dialogflow response:", data.queryResult?.fulfillmentText);
    appendMessage("bot", data.queryResult?.fulfillmentText || "I didn't understand that");

  } catch (err) {
    removeTypingIndicator();
    appendMessage("bot", "Oops! Something went wrong. Please try again.");
    console.error("Chat error:", err);
  }
}

// Add this at the VERY BOTTOM of your chatbot.js file
// This will run when the page loads

// Check for payment completion when chatbot loads
function checkPaymentOnLoad() {
    const paymentCompleted = localStorage.getItem('payment_completed');
    const paymentSession = localStorage.getItem('payment_session');
    
    if (paymentCompleted === 'true') {
        // Clear the payment flag immediately
        localStorage.removeItem('payment_completed');
        localStorage.removeItem('payment_session');
        
        // Show payment success message automatically
        appendMessage("bot", "✅ Payment Successful! Your order will be delivered soon. 🚚");
    }
}

// Run this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit so the chat UI initializes first
    setTimeout(checkPaymentOnLoad, 1000);
});

// Also check when the window becomes visible again (user returns from payment page)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        checkPaymentOnLoad();
    }
});