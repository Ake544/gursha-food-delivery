Project ID: gursha-chatbot-for-food-d-cfum
https://dialogflow.cloud.google.com/cx/projects/gursha-chatbot-for-food-d-cfum/locations/global/agents/create?importType=ES
uvicorn auth:app --reload --port 8002 & 
uvicorn main:app --reload --port 8000
uvicorn auth_new:app --reload --port 8002
cloudflared tunnel --url http://localhost:8000
python -m http.server 8001
http://localhost:8001


/* Recipes Section */
.recipes-section {
  margin: 0 auto;
  margin-top: 70px;
  padding: 40px 20px 20px 20px; /* top padding = spacing from hero */
  max-width: 900px;
  display: flex;
  flex-direction: column;
}

.recipes-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 90px;
  margin: 0;
}

.recipe-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 1rem;
}

.recipe-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
  width: calc(20.333% - 1rem);
}
.recipe-card :hover {
  cursor: pointer;
  transform: scale(1.03);
  transition: transform 0.3s ease;
}

.recipe-card img {
  width: 100%;
  height: 90px;
  object-fit: cover;

  clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
}

.recipe-info {
  padding: 0.5rem;
  font-size: 0.75rem;
  text-align: center;
}

.carousel-scroll {
  overflow-x: hidden;
  position: relative;
  width: 100%;
  height: 180px;
  margin-bottom: 20px;
}

.carousel-track {
  display: flex;
  gap: 15px; /* spacing between cards */
  transition: transform 0.6s ease-in-out;
  will-change: transform;
  width: fit-content;
}

.carousel-track .recipe-card {
  flex: 0 0 23.5%;  /* ← 4 cards per row with 15px gap = perfect */
  box-sizing: border-box;
  max-width: 23.5%;
}
