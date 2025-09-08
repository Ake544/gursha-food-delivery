// Define your API base URL at the top
const API_BASE_URL = 'https://gursha-food-delivery.onrender.com'; // Change this if your FastAPI runs on a different port

// Function to get image path based on food name
function getFoodImage(foodName, countryName) {
  // Simple image mapping - you can expand this
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
  
  return foodImageMap[foodName] || 'images/food-images/placeholder.jpg';
}

// Function to load and display carousel recipes
async function loadCarouselRecipes() {
  try {
    console.log('Loading carousel recipes...');
    
    // Load both newest and hot recipes
    const [newestResponse, hotResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/recipes/newest?limit=18`),
      fetch(`${API_BASE_URL}/api/recipes/hot-right-now?limit=18`)
    ]);

    if (newestResponse.ok) {
      const newestRecipes = await newestResponse.json();
      displayCarouselRecipes(newestRecipes, 'newest-track', 'Newest Recipes');
    } else {
      console.error('Failed to fetch newest recipes:', newestResponse.status);
      showFallbackContent('newest-track', 'Newest Recipes');
    }

    if (hotResponse.ok) {
      const hotRecipes = await hotResponse.json();
      displayCarouselRecipes(hotRecipes, 'hot-track', 'Hot Right Now');
    } else {
      console.error('Failed to fetch hot recipes:', hotResponse.status);
      showFallbackContent('hot-track', 'Hot Right Now');
    }
  } catch (error) {
    console.error('Error loading carousel recipes:', error);
    showFallbackContent('newest-track', 'Newest Recipes');
    showFallbackContent('hot-track', 'Hot Right Now');
  }
}

// Show fallback content if API fails
function showFallbackContent(trackId, sectionName) {
  const track = document.getElementById(trackId);
  if (!track) return;
  
  track.innerHTML = `
    <div class="no-recipes">
      <p>Could not load ${sectionName.toLowerCase()}.</p>
      <p>Please check your connection and try again.</p>
    </div>
  `;
}

// Display recipes in carousel
function displayCarouselRecipes(recipes, trackId, sectionName) {
  const track = document.getElementById(trackId);
  if (!track) {
    console.error(`Track element not found: ${trackId}`);
    return;
  }
  
  track.innerHTML = '';
  
  if (!recipes || recipes.length === 0) {
    track.innerHTML = `<div class="no-recipes">No ${sectionName.toLowerCase()} found.</div>`;
    return;
  }
  
  recipes.forEach((recipe) => {
    const card = createCarouselCard(recipe);
    track.appendChild(card);
  });
  
  // Initialize carousel after content is loaded
  setTimeout(() => {
    initCarousel(trackId.replace('-track', '-carousel'));
  }, 100);
}

// Create carousel card
function createCarouselCard(recipe) {
  const card = document.createElement("div");
  card.className = "recipe-card";
  
  // Safely handle recipe data
  const recipeName = recipe.name || 'Unknown Dish';
  const recipeTime = recipe.time || 'N/A';
  const recipePortion = recipe.portion || 'N/A';
  const recipeRating = recipe.rating || 'No rating';
  const recipePrice = recipe.price || 0;
  const recipeId = recipe.item_id || 0;
  
  card.innerHTML = `
    <img src="${getFoodImage(recipeName, recipe.country_name)}" alt="${recipeName}" />
    <div class="recipe-info">
      <h3>${recipeName}</h3>
      <p>Time: ${recipeTime}</p>
      <p>Portion: ${recipePortion}</p>
      <p>Rating: ${recipeRating} ⭐</p>
      <p>Price: ${recipePrice} Birr</p>
      <button class="carousel-order-btn" 
              onclick="addToCart('${recipeName.replace(/'/g, "\\'")}', ${recipePrice}, ${recipeId})">
        Add to Cart
      </button>
    </div>
  `;
  
  return card;
}

// Initialize carousel with 6 cards visible
// Initialize carousel - SIMPLIFIED VERSION
function initCarousel(containerId) {
  const carousel = document.getElementById(containerId);
  if (!carousel) return;
  
  const track = carousel.querySelector('.carousel-track');
  if (!track) return;
  
  const cards = track.children;
  const totalCards = cards.length;
  
  if (totalCards === 0) return;
  
  // Remove any inline styles that might interfere with CSS
  track.style.width = '';
  Array.from(cards).forEach(card => {
    card.style.flex = '';
  });
  
  // Start auto-scroll if there are more than 6 cards
  if (totalCards > 6) {
    autoScrollCarousel(containerId);
  }
}

// Auto-scroll carousel function - UPDATED
function autoScrollCarousel(containerId, interval = 5000) {
  const carousel = document.getElementById(containerId);
  if (!carousel) return;
  
  const track = carousel.querySelector('.carousel-track');
  const cards = track.children;
  const totalCards = cards.length;
  const visibleCards = 6; // Show 6 cards at a time
  
  if (totalCards <= visibleCards) return;
  
  let index = 0;
  
  // Clear any existing interval
  if (carousel.intervalId) {
    clearInterval(carousel.intervalId);
  }
  
  carousel.intervalId = setInterval(() => {
    index = (index + 1) % Math.ceil(totalCards / visibleCards);
    
    // Calculate scroll amount based on card width + gap
    const card = cards[0];
    const cardWidth = card.offsetWidth + 22; // card width + gap
    const scrollAmount = index * visibleCards * cardWidth;
    
    track.style.transform = `translateX(-${scrollAmount}px)`;
  }, interval);
}

// Update navigateCarousel function too
function navigateCarousel(carouselId, direction) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;
  
  const track = carousel.querySelector('.carousel-track');
  const cards = track.children;
  const totalCards = cards.length;
  const visibleCards = 6;
  
  if (totalCards <= visibleCards) return;
  
  const currentPosition = carousel.currentPosition || 0;
  const maxPosition = Math.ceil(totalCards / visibleCards) - 1;
  
  let newPosition = currentPosition + direction;
  if (newPosition < 0) newPosition = maxPosition;
  if (newPosition > maxPosition) newPosition = 0;
  
  carousel.currentPosition = newPosition;
  
  // Calculate scroll amount based on card width + gap
  const card = cards[0];
  const cardWidth = card.offsetWidth + 22; // card width + gap
  const scrollAmount = newPosition * visibleCards * cardWidth;
  
  track.style.transform = `translateX(-${scrollAmount}px)`;
  
  // Restart auto-scroll
  if (carousel.intervalId) {
    clearInterval(carousel.intervalId);
  }
  autoScrollCarousel(carouselId);
}

// Auto-scroll carousel function
function autoScrollCarousel(containerId, interval = 5000) {
  const carousel = document.getElementById(containerId);
  if (!carousel) return;
  
  const track = carousel.querySelector('.carousel-track');
  const cards = track.children;
  const totalCards = cards.length;
  const visibleCards = 6; // Show 6 cards at a time
  
  if (totalCards <= visibleCards) return; // No need to scroll if all cards fit
  
  let index = 0;
  
  // Clear any existing interval for this carousel
  if (carousel.intervalId) {
    clearInterval(carousel.intervalId);
  }
  
  carousel.intervalId = setInterval(() => {
    index = (index + 1) % Math.ceil(totalCards / visibleCards);
    
    const scrollAmount = index * (100 / (totalCards / visibleCards));
    track.style.transform = `translateX(-${scrollAmount}%)`;
  }, interval);
}

// Manual navigation functions
function setupCarouselNavigation() {
  // Previous buttons
  document.querySelectorAll('.carousel-prev').forEach(btn => {
    btn.addEventListener('click', function() {
      const carouselId = this.getAttribute('data-carousel');
      navigateCarousel(carouselId, -1);
    });
  });
  
  // Next buttons
  document.querySelectorAll('.carousel-next').forEach(btn => {
    btn.addEventListener('click', function() {
      const carouselId = this.getAttribute('data-carousel');
      navigateCarousel(carouselId, 1);
    });
  });
}

function navigateCarousel(carouselId, direction) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;
  
  const track = carousel.querySelector('.carousel-track');
  const cards = track.children;
  const totalCards = cards.length;
  const visibleCards = 6; // Show 6 cards at a time
  
  if (totalCards <= visibleCards) return;
  
  const currentPosition = carousel.currentPosition || 0;
  const maxPosition = Math.ceil(totalCards / visibleCards) - 1;
  
  let newPosition = currentPosition + direction;
  
  if (newPosition < 0) newPosition = maxPosition;
  if (newPosition > maxPosition) newPosition = 0;
  
  carousel.currentPosition = newPosition;
  const scrollAmount = newPosition * (100 / (totalCards / visibleCards));
  track.style.transform = `translateX(-${scrollAmount}%)`;
  
  // Restart auto-scroll
  if (carousel.intervalId) {
    clearInterval(carousel.intervalId);
  }
  autoScrollCarousel(carouselId);
}

// Call when page loads
document.addEventListener("DOMContentLoaded", function() {
  console.log('DOM loaded, setting up carousels...');
  
  // Check if carousel elements exist on this page
  const hasCarousels = document.getElementById('newest-carousel') || document.getElementById('hot-carousel');
  
  if (hasCarousels) {
    loadCarouselRecipes();
    setupCarouselNavigation();
    
    // Initialize auto-scroll after a delay to ensure content is loaded
    setTimeout(() => {
      autoScrollCarousel("newest-carousel");
      autoScrollCarousel("hot-carousel");
    }, 1500);
  }
});

// Add window resize handler to adjust carousel on screen size changes
window.addEventListener('resize', function() {
  initCarousel("newest-carousel");
  initCarousel("hot-carousel");
});