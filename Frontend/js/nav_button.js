document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll("main.hero, section#Popular, section#Recipes, section#Contact_Us");
  const navLinks = document.querySelectorAll(".nav-links a");

  const sectionMap = {
    "main.hero": "Home",
    "#Popular": "Popular",
    "#Recipes": "Recipes",
    "#Contact_Us": "Contact Us"
  };

  function setActiveNav() {
    let current = "";

    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      if (sectionTop <= 150 && sectionTop >= -section.offsetHeight / 2) {
        current = section.id || "Home";
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      const href = link.getAttribute("href").replace("#", "") || "Home";

      if (href === current) {
        link.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", setActiveNav);
  setActiveNav(); // Run on load
});
