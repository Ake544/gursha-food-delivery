document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("chatbotToggle");
  const chatbotIcon = document.getElementById("chatbotIcon");
  const orangeSection = document.querySelector(".newsletter-section");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          toggleBtn.classList.add("chatbot-on-orange");
          chatbotIcon.src = "images/logos/chatbot-orange.png"; // <-- your orange icon
        } else {
          toggleBtn.classList.remove("chatbot-on-orange");
          chatbotIcon.src = "images/logos/chatbot.png"; // <-- default icon
        }
      });
    },
    {
      root: null,
      threshold: 0.2
    }
  );

  if (orangeSection) {
    observer.observe(orangeSection);
  }
});
