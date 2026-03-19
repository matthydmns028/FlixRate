// ============================================================
// FlixRate – Smooth Transitions & Prefetching
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Fade the page IN when it loads
  document.body.classList.add("page-loaded");

  // 2. Find all the links on the page
  const links = document.querySelectorAll("a[href]");

  links.forEach((link) => {
    // Only apply this to internal links (ignore external sites like YouTube)
    if (
      link.hostname === window.location.hostname &&
      !link.hash &&
      link.target !== "_blank" &&
      link.getAttribute("href") !== "#"
    ) {
      // 🚀 THE PREFETCH TRICK: Download the page when they hover over the link!
      link.addEventListener(
        "mouseenter",
        () => {
          const prefetchExists = document.querySelector(
            `link[href="${link.href}"]`,
          );
          if (!prefetchExists) {
            const prefetch = document.createElement("link");
            prefetch.rel = "prefetch";
            prefetch.href = link.href;
            document.head.appendChild(prefetch);
          }
        },
        { once: true },
      ); // Only do this once per link

      // 🎬 THE FADE OUT TRICK: Intercept the click
      link.addEventListener("click", (e) => {
        // Don't intercept if they are opening in a new tab (Ctrl+Click)
        if (e.ctrlKey || e.metaKey) return;

        e.preventDefault(); // Stop the sudden jump
        const targetUrl = link.href;

        // Trigger the fade out animation
        document.body.classList.remove("page-loaded");
        document.body.classList.add("page-exiting");

        // Wait for the CSS fade to finish (250ms), then actually change the page
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 250);
      });
    }
  });
});

// Safari/iOS fix: If the user hits the "Back" button on their phone, force a fade-in
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    document.body.classList.remove("page-exiting");
    document.body.classList.add("page-loaded");
  }
});
