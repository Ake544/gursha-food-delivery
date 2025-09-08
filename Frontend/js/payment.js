document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payButton = document.getElementById('payButton');
    payButton.disabled = true;
    payButton.textContent = 'Processing...';
    const API_BASE = "http://localhost:8000";

    try {
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const cardName = document.getElementById('card-name').value.trim();
        const sessionId = new URLSearchParams(window.location.search).get('session_id');

        // Simple validation
        if (cardNumber !== '4242424242424242') {
            throw new Error('Please use test card: 4242 4242 4242 4242');
        }

        if (!cardName) {
            throw new Error('Please enter name on card');
        }

        const response = await fetch(`${API_BASE}/auth/payment-success`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                session_id: sessionId, 
                card_name: cardName,
                card_number: cardNumber,
                amount: 29.00
            })
        });

        if (!response.ok) {
            throw new Error('Payment processing failed. Please try again.');
        }

        const result = await response.json();
        
        if (result.status === "success") {
    // Store payment success
    localStorage.setItem('payment_completed', 'true');
    localStorage.setItem('payment_session', sessionId);
    
    // ✅ TRY TO SEND MESSAGE DIRECTLY TO CHATBOT
        try {
            // This will work if the chatbot window is still open
            window.opener?.postMessage({
                type: 'PAYMENT_SUCCESS',
                message: '✅ Payment Successful! Your order will be delivered soon. 🚚',
                sessionId: sessionId
            }, '*');
        } catch (e) {
            console.log('Could not send message to parent window');
        }
        
        alert('✅ Payment Successful! Close this window to continue.');
        setTimeout(() => window.close(), 2000);
    }

    } catch (error) {
        alert(`❌ ${error.message}`);
        console.error('Payment error:', error);
    } finally {
        payButton.disabled = false;
        payButton.textContent = 'Pay 29.00 Birr';
    }
});