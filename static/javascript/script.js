// ---- User account chip (Base44 style) ----
// Paste at the very bottom of your existing static/javascript/script.js
(function () {
  const USER = { name: "Barbero Xyzine", role: "Administrator" }; // change these

  const css = `
    .uc-user{display:flex;align-items:center;gap:10px;padding:5px 16px 5px 5px;border-radius:99px;
      background:#1c2033;color:#fff;font-family:inherit;margin-left:12px}
    .uc-user .uc-av{width:34px;height:34px;border-radius:50%;background:#3b4160;display:grid;
      place-items:center;font-size:12px;font-weight:700}
    .uc-user b{display:block;font-size:14px;line-height:1.2}
    .uc-user small{display:block;font-size:11px;font-weight:600;letter-spacing:.04em;
      color:#c0c7e6;text-transform:uppercase}
    .uc-float{position:fixed;top:12px;right:16px;z-index:50;margin:0}
    @media(max-width:900px){.uc-user div:last-child{display:none}.uc-user{padding:5px}}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const chip = document.createElement("div");
  chip.className = "uc-user";
  chip.innerHTML = '<div class="uc-av"></div><div><b></b><small></small></div>';
  chip.querySelector(".uc-av").textContent = USER.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  chip.querySelector("b").textContent = USER.name;
  chip.querySelector("small").textContent = USER.role;

  function mount() {
    // Put the chip in your top bar if one exists, otherwise float it top-right.
    const host = document.querySelector("#topbar, header.topbar, .topbar, header");
    if (host) host.appendChild(chip);
    else { chip.classList.add("uc-float"); document.body.appendChild(chip); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
