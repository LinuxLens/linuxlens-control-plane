const header = document.querySelector("[data-header]");
const menuBtn = document.querySelector("[data-menu-btn]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const form = document.querySelector("[data-form]");
const formError = document.querySelector("[data-form-error]");
const formOk = document.querySelector("[data-form-ok]");

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

menuBtn.addEventListener("click", () => {
  const open = mobileNav.hasAttribute("hidden");
  mobileNav.toggleAttribute("hidden", !open);
  menuBtn.setAttribute("aria-expanded", String(open));
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.setAttribute("hidden", "");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll("[data-edition]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.edition;
    document.querySelectorAll("[data-edition]").forEach((other) => {
      other.setAttribute("aria-selected", String(other === tab));
    });
    document.querySelectorAll("[data-edition-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.editionPanel !== id;
    });
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formOk.hidden = true;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const role = String(data.get("role") || "");
  const estate = String(data.get("estate") || "");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name || !validEmail || !role || !estate) {
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  form.reset();
  formOk.hidden = false;
});
