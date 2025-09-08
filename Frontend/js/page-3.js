document.addEventListener("DOMContentLoaded", function () {
  const countryBtn = document.getElementById("pageThreeCountryBtn");
  const dropdown = document.querySelector(".page-three-dropdown");
  const recipeGrid = document.querySelector(".page-three-recipes-grid");
  const API_BASE = "http://localhost:8000";

  // Map food names to image paths (you can expand this as needed)
  const foodImageMap = {
    // American foods
    "Burger": "images/food-images/america/burger.jpg",
    "Hot Dog": "images/food-images/america/hotdog.jpg",
    "Fried Chicken": "images/food-images/america/fried-chicken.jpg",
    "Mac and Cheese": "images/food-images/america/mac-and-cheese.jpg",
    "Clam Chowder": "images/food-images/america/clam-chowder.jpg",
    "Steak": "images/food-images/america/steak.jpg",
    "Pancakes": "images/food-images/america/pancakes.jpg",
    "Grilled Cheese": "images/food-images/america/grilled-cheese.jpg",
    "Buffalo Wings": "images/food-images/america/buffalo-wings.jpg",
    "Cheesecake": "images/food-images/america/cheese-cake.jpg",
    
    // Ethiopian foods
    "Firfir": "images/food-images/ethiopia/firfir.jpg",
    "Doro Wat": "images/food-images/ethiopia/doro-wat.jpg",
    "Tibs": "images/food-images/ethiopia/tibs.jpg",
    "Kitfo": "images/food-images/ethiopia/kitfo.jpg",
    "Shiro": "images/food-images/ethiopia/shiro.jpg",
    "Misir Wot": "images/food-images/ethiopia/misir.jpg",
    "Beyaynet": "images/food-images/ethiopia/beyaynet.jpg",
    "Gomen": "images/food-images/ethiopia/gomen.jpg",
    "Gored Gored": "images/food-images/ethiopia/gored-gored.jpg",
    "Key Wot": "images/food-images/ethiopia/key-wot.jpg",
    
    // Korean foods
    "Bibimbap": "images/food-images/korea/bibimbap.jpg",
    "Bulgogi": "images/food-images/korea/bulgogi.jpg",
    "Tteokbokki": "images/food-images/korea/tteokbokki.jpeg",
    "Samgyeopsal": "images/food-images/korea/samgyeopsal.jpeg",
    "Kimichi Jjigae": "images/food-images/korea/kimichi-jjigae.jpg",
    "Japchae": "images/food-images/korea/japchae.jpg",
    "Korean Fried Chicken": "images/food-images/korea/korean-fried-chicken.jpg",
    "Sundubu-jjigae": "images/food-images/korea/sundubu-jjigae.jpg",
    "Yukgaejang": "images/food-images/korea/yukgaejang.jpg",
    "Dak Galbi": "images/food-images/korea/dak-galbi.jpeg",
    
    // Indian foods
    "Biryani": "images/food-images/india/biryani.jpg",
    "Butter Chicken": "images/food-images/india/butter-chicken.jpg",
    "Samosa": "images/food-images/india/samosa.jpg",
    "Naan": "images/food-images/india/naan.webp",
    "Aloo Gobi": "images/food-images/india/aloo-gobi.jpg",
    "Masala Dosa": "images/food-images/india/masala-dosa.jpg",
    "Tandoori Chicken": "images/food-images/india/tandoori-chicken.jpg",
    "Chicken Tikka Masala": "images/food-images/india/chicken-tikka-masala.jpeg",
    "Gulab Jamun": "images/food-images/india/gulab-jamun.jpg",
    "Palak Paneer": "images/food-images/india/palak-paneer.jpg",
    
    // Mexican foods
    "Tacos": "images/food-images/mexico/tacos.jpeg",
    "Chilaquiles": "images/food-images/mexico/chilaquiles.jpeg",
    "Mole Poblano": "images/food-images/mexico/mole-poblano.jpg",
    "Pozole": "images/food-images/mexico/pozole.jpeg",
    "Tamales": "images/food-images/mexico/tamales.jpeg",
    "Enchiladas": "images/food-images/mexico/enchiladas.jpg",
    "Guacamole": "images/food-images/mexico/guacamole.avif",
    "Elote": "images/food-images/mexico/quesadilla.jpg",
    "Chiles en Nogada": "images/food-images/mexico/nogada.webp",
    "Tlayudas": "images/food-images/mexico/tlayudas.jpg"
  };

  // Fallback data in case backend is unavailable
  const fallbackRecipes = {
    America: [
      { name: "Burger", price: 250, time: "15 mins", portion: "1 person", rating: 4.5 },
      { name: "Hot Dog", price: 150, time: "10 mins", portion: "1 person", rating: 4.2 },
      { name: "Fried Chicken", price: 300, time: "20 mins", portion: "2 persons", rating: 4.7 },
      { name: "Mac & Cheese", price: 200, time: "12 mins", portion: "1 person", rating: 4.3 },
      { name: "BBQ Ribs", price: 450, time: "25 mins", portion: "2 persons", rating: 4.8 }
    ],
    Ethiopia: [
      { name: "Injera", price: 100, time: "5 mins", portion: "2 persons", rating: 4.6 },
      { name: "Doro Wat", price: 350, time: "30 mins", portion: "2 persons", rating: 4.9 },
      { name: "Tibs", price: 280, time: "20 mins", portion: "2 persons", rating: 4.7 },
      { name: "Kitfo", price: 320, time: "15 mins", portion: "1 person", rating: 4.5 },
      { name: "Shiro", price: 180, time: "15 mins", portion: "2 persons", rating: 4.4 }
    ]
  };

  // Function to get image path based on food name
  function getFoodImage(foodName) {
    return foodImageMap[foodName] || 'images/food-images/placeholder.jpg';
  }

  // Fetch available countries from backend
  async function loadCountries() {
    try {
      const response = await fetch(`${API_BASE}/api/countries`);
      if (response.ok) {
        const data = await response.json();
        populateCountryDropdown(data.countries);
      } else {
        console.error('Failed to fetch countries');
        populateCountryDropdown(['America', 'Ethiopia', 'Korea', 'India', 'Mexico']);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
      populateCountryDropdown(['America', 'Ethiopia', 'Korea', 'India', 'Mexico']);
    }
  }

  function populateCountryDropdown(countries) {
    dropdown.innerHTML = '';
    countries.forEach(country => {
      const div = document.createElement('div');
      div.textContent = country;
      div.setAttribute('data-country', country);
      dropdown.appendChild(div);
    });
  }

  // Toggle dropdown visibility
  countryBtn.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
  });

  // Fetch recipes from database
  async function loadRecipes(country) {
    recipeGrid.innerHTML = "<div class='loading'>Loading recipes...</div>";
    
    try {
      const response = await fetch(`${API_BASE}/api/recipes?country_name=${encodeURIComponent(country)}`);
      
      if (response.ok) {
        const recipes = await response.json();
        displayRecipes(recipes);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      // Use fallback data if database is unavailable
      displayRecipes(fallbackRecipes[country] || []);
    }
  }

  // Display recipes in the grid
  function displayRecipes(recipes) {
    recipeGrid.innerHTML = "";
    
    if (recipes.length === 0) {
      recipeGrid.innerHTML = "<div class='no-recipes'>No recipes found for this country.</div>";
      return;
    }
    
    recipes.forEach((recipe) => {
      const card = document.createElement("div");
      card.className = "page-three-card";
      card.innerHTML = `
        <div class="page-three-price-tag">${recipe.price} Birr</div>
        <img src="${getFoodImage(recipe.name)}" alt="${recipe.name}" />
        <div class="page-three-info-wrapper">
          <div class="page-three-info-content">
            <h3>${recipe.name}</h3>
            <div class="page-three-metrics">
              <div><strong>Time</strong><br><span>${recipe.time}</span></div>
              <div><strong>Portion</strong><br><span>${recipe.portion}</span></div>
              <div><strong>Rating</strong><br><span>${recipe.rating}</span></div>
            </div>
          </div>
          <button class="page-three-order-btn" 
                  onclick="addToCart('${recipe.name}', ${recipe.price}, ${recipe.item_id})">
            Add to Cart
          </button>
        </div>
      `;
      recipeGrid.appendChild(card);
    });
  }

  // Country selection
  dropdown.addEventListener("click", (e) => {
    if (e.target.tagName === "DIV") {
      const selected = e.target.getAttribute('data-country');
      countryBtn.textContent = selected;
      loadRecipes(selected);
      dropdown.classList.add("hidden");
    }
  });

  // Load default country and countries list
  loadCountries();
  loadRecipes("America");
});

// Update the addToCart function to include item_id
function addToCart(itemName, itemPrice, itemId) {
    window.cartSystem.addToCart(itemName, itemPrice, itemId);
}

// Update the cart system to handle item IDs
window.cartSystem = window.cartSystem || {
    items: [],
    
    addToCart: function(itemName, itemPrice, itemId) {
        this.items.push({ id: itemId, name: itemName, price: itemPrice });
        this.updateCartUI();
        this.showCartNotification(itemName);
    },
    
    updateCartUI: function() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = this.items.length;
            cartCount.style.display = this.items.length > 0 ? 'inline-block' : 'none';
        }
    },
    
    showCartNotification: function(itemName) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <span>✅ Added ${itemName} to cart!</span>
            <button onclick="cartSystem.proceedToChatbotCheckout()">Checkout (${this.items.length})</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    proceedToChatbotCheckout: function() {
        if (this.items.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        
        // Open chatbot
        openChatbot();
        
        // Pre-fill message with cart items
        const orderText = `I want to order: ${this.items.map(item => `1 ${item.name}`).join(', ')}`;
        const chatInput = document.querySelector('.chat-input input');
        if (chatInput) {
            chatInput.value = orderText;
            chatInput.focus();
        }
        
        // Clear cart
        this.items = [];
        this.updateCartUI();
    }
};

// Helper function to open chatbot
function openChatbot() {
    const chatbot = document.getElementById('chatbot');
    if (chatbot) {
        chatbot.classList.add('active');
    }
    
    // Also focus on the input field
    const chatInput = document.querySelector('.chat-input input');
    if (chatInput) {
        setTimeout(() => {
            chatInput.focus();
        }, 300);
    }
}

document.addEventListener("DOMContentLoaded", function () {
  const chatbot = document.getElementById("chatbot");
  const toggleBtn = document.getElementById("chatbotToggle");

  toggleBtn.addEventListener("click", function (e) {
    chatbot.classList.toggle("active");
    e.stopPropagation(); // prevent immediate outside close
  });

  // Close on outside click
  document.addEventListener("click", function (e) {
    if (!chatbot.contains(e.target) && e.target !== toggleBtn) {
      chatbot.classList.remove("active");
    }
  });
});