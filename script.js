const stories = document.querySelectorAll(".story-card");

stories.forEach((story) => {
  const action = story.querySelector(".summary-action");

  const updateActionText = () => {
    if (!action) return;
    action.textContent = story.open ? "Tap to collapse" : "Tap to expand";
  };

  updateActionText();
  story.addEventListener("toggle", updateActionText);
});

const adLinks = document.querySelectorAll(".ad-card a, .ad-dot");

adLinks.forEach((link) => {
  link.addEventListener("click", () => {
    link.classList.add("was-tapped");
    window.setTimeout(() => link.classList.remove("was-tapped"), 500);
  });
});
