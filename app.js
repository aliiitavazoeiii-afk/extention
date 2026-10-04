"use strict";

const STORAGE_KEY = "darmaDashboard.v1";
const CUSTOM_ICON_STORAGE_KEY = "darmaDashboard.customIcons.v1";
const ICON_CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_RASTER_DIMENSION = 512;

const DEFAULT_STATE = {
  popular: [
    { id: "youtube", name: "YouTube", url: "https://www.youtube.com/", icon: ICON_CDN + "youtube.svg" },
    { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", icon: ICON_CDN + "chatgpt.svg" },
    { id: "gmail", name: "Gmail", url: "https://mail.google.com/", icon: ICON_CDN + "gmail.svg" },
    { id: "digikala", name: "Digikala", url: "https://www.digikala.com/", icon: "" },
    { id: "github", name: "GitHub", url: "https://github.com/", icon: ICON_CDN + "github.svg" },
    { id: "telegram", name: "Telegram", url: "https://web.telegram.org/", icon: ICON_CDN + "telegram.svg" },
    { id: "gemini", name: "Gemini", url: "https://gemini.google.com/", icon: ICON_CDN + "google-gemini.svg" },
    { id: "drive", name: "Google Drive", url: "https://drive.google.com/", icon: ICON_CDN + "google-drive.svg" }
  ],
  vpn: [
    { id: "claude", name: "Claude", url: "https://claude.ai/", icon: ICON_CDN + "claude-ai.svg" },
    { id: "instagram", name: "Instagram", url: "https://www.instagram.com/", icon: ICON_CDN + "instagram.svg" },
    { id: "reddit", name: "Reddit", url: "https://www.reddit.com/", icon: ICON_CDN + "reddit.svg" },
    { id: "x", name: "X", url: "https://x.com/", icon: ICON_CDN + "x.svg" }
  ]
};

const KNOWN_ICONS = [
  ["youtube.com", "youtube.svg"],
  ["chatgpt.com", "chatgpt.svg"],
  ["openai.com", "chatgpt.svg"],
  ["mail.google.com", "gmail.svg"],
  ["gmail.com", "gmail.svg"],
  ["github.com", "github.svg"],
  ["telegram.org", "telegram.svg"],
  ["x.com", "x.svg"],
  ["twitter.com", "x.svg"],
  ["drive.google.com", "google-drive.svg"],
  ["figma.com", "figma.svg"],
  ["claude.ai", "claude-ai.svg"],
  ["instagram.com", "instagram.svg"],
  ["reddit.com", "reddit.svg"],
  ["netflix.com", "netflix.svg"],
  ["steampowered.com", "steam.svg"],
  ["steamcommunity.com", "steam.svg"],
  ["gemini.google.com", "google-gemini.svg"],
  ["google.com", "google.svg"]
];

let state = clone(DEFAULT_STATE);
let customIcons = {};
let pendingIconData = "";
let pendingIconRemoved = false;
let dragData = null;

const els = {
  popularGrid: document.getElementById("popularGrid"),
  vpnGrid: document.getElementById("vpnGrid"),
  popularCount: document.getElementById("popularCount"),
  vpnCount: document.getElementById("vpnCount"),
  backdrop: document.getElementById("modalBackdrop"),
  form: document.getElementById("siteForm"),
  section: document.getElementById("siteSection"),
  siteId: document.getElementById("siteId"),
  siteName: document.getElementById("siteName"),
  siteUrl: document.getElementById("siteUrl"),
  siteIcon: document.getElementById("siteIcon"),
  siteIconFile: document.getElementById("siteIconFile"),
  pickIcon: document.getElementById("pickIcon"),
  iconFileStatus: document.getElementById("iconFileStatus"),
  removeUploadedIcon: document.getElementById("removeUploadedIcon"),
  modalTitle: document.getElementById("modalTitle"),
  modalEyebrow: document.getElementById("modalEyebrow"),
  deleteSite: document.getElementById("deleteSite"),
  previewImage: document.getElementById("previewImage"),
  previewFallback: document.getElementById("previewFallback"),
  previewName: document.getElementById("previewName"),
  previewHost: document.getElementById("previewHost")
};

init();

async function init() {
  try {
    const [stored, localStored] = await Promise.all([
      chrome.storage.sync.get(STORAGE_KEY),
      chrome.storage.local.get(CUSTOM_ICON_STORAGE_KEY)
    ]);

    if (stored[STORAGE_KEY]) state = normalizeState(stored[STORAGE_KEY]);
    if (localStored[CUSTOM_ICON_STORAGE_KEY] && typeof localStored[CUSTOM_ICON_STORAGE_KEY] === "object") {
      customIcons = localStored[CUSTOM_ICON_STORAGE_KEY];
    }
  } catch (error) {
    console.warn("Could not load dashboard state:", error);
  }

  render();
  bindUi();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeState(value) {
  const next = clone(DEFAULT_STATE);
  if (value && Array.isArray(value.popular)) next.popular = value.popular;
  if (value && Array.isArray(value.vpn)) next.vpn = value.vpn;
  return next;
}

async function saveState() {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: state });
  } catch (error) {
    console.warn("Could not sync dashboard state:", error);
  }
}

async function saveCustomIcons() {
  try {
    await chrome.storage.local.set({ [CUSTOM_ICON_STORAGE_KEY]: customIcons });
  } catch (error) {
    console.warn("Could not save custom icons:", error);
  }
}

function render() {
  renderSection("popular", els.popularGrid);
  renderSection("vpn", els.vpnGrid);
  els.popularCount.textContent = toPersianDigits(state.popular.length);
  els.vpnCount.textContent = toPersianDigits(state.vpn.length);
}

function renderSection(section, grid) {
  grid.replaceChildren();
  state[section].forEach(function(site) {
    grid.appendChild(createSiteCard(section, site));
  });
  grid.appendChild(createAddCard(section));
}

function createSiteCard(section, site) {
  const card = document.createElement("article");
  card.className = "site-card";
  card.draggable = true;
  card.dataset.siteId = site.id;
  card.dataset.section = section;

  const link = document.createElement("a");
  link.className = "site-link";
  link.href = normalizeUrl(site.url);
  link.title = site.name;

  const iconFrame = document.createElement("div");
  iconFrame.className = "icon-frame";

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "eager";
  img.decoding = "async";

  const fallback = document.createElement("span");
  fallback.className = "icon-fallback";
  fallback.textContent = firstLetter(site.name);

  iconFrame.append(img, fallback);
  applyIcon(img, fallback, site);

  const meta = document.createElement("div");
  meta.className = "site-meta";

  const name = document.createElement("span");
  name.className = "site-name";
  name.textContent = site.name;

  const host = document.createElement("span");
  host.className = "site-host";
  host.textContent = displayHost(site.url);

  meta.append(name, host);
  link.append(iconFrame, meta);

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "site-menu";
  menu.setAttribute("aria-label", "ویرایش " + site.name);
  menu.textContent = "•••";
  menu.addEventListener("click", function(event) {
    event.preventDefault();
    event.stopPropagation();
    openModal(section, site.id);
  });

  card.addEventListener("dragstart", function(event) {
    dragData = { section: section, id: site.id };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", site.id);
  });

  card.addEventListener("dragend", function() {
    dragData = null;
    document.querySelectorAll(".site-card").forEach(function(el) {
      el.classList.remove("dragging", "drag-over");
    });
  });

  card.addEventListener("dragover", function(event) {
    if (!dragData || dragData.section !== section || dragData.id === site.id) return;
    event.preventDefault();
    card.classList.add("drag-over");
  });

  card.addEventListener("dragleave", function() {
    card.classList.remove("drag-over");
  });

  card.addEventListener("drop", async function(event) {
    event.preventDefault();
    card.classList.remove("drag-over");
    if (!dragData || dragData.section !== section || dragData.id === site.id) return;

    const list = state[section];
    const fromIndex = list.findIndex(function(item) { return item.id === dragData.id; });
    const toIndex = list.findIndex(function(item) { return item.id === site.id; });
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, moved);
    await saveState();
    render();
  });

  card.append(link, menu);
  return card;
}

function createAddCard(section) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "site-card add-card";
  button.setAttribute("aria-label", "افزودن سایت");

  const inner = document.createElement("span");
  inner.className = "add-card-inner";

  const plus = document.createElement("span");
  plus.className = "add-icon";
  plus.textContent = "+";

  const label = document.createElement("span");
  label.textContent = "افزودن سایت";

  inner.append(plus, label);
  button.append(inner);
  button.addEventListener("click", function() { openModal(section); });

  return button;
}

function bindUi() {
  document.querySelectorAll("[data-add-section]").forEach(function(button) {
    button.addEventListener("click", function() { openModal(button.dataset.addSection); });
  });

  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);

  els.backdrop.addEventListener("click", function(event) {
    if (event.target === els.backdrop) closeModal();
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && !els.backdrop.hidden) closeModal();
  });

  els.siteName.addEventListener("input", updatePreview);
  els.siteUrl.addEventListener("input", updatePreview);
  els.siteIcon.addEventListener("input", updatePreview);

  els.pickIcon.addEventListener("click", function() {
    els.siteIconFile.click();
  });

  els.siteIconFile.addEventListener("change", async function() {
    const file = els.siteIconFile.files && els.siteIconFile.files[0];
    if (!file) return;

    try {
      els.iconFileStatus.textContent = "در حال آماده‌سازی…";
      pendingIconData = await prepareUploadedIcon(file);
      pendingIconRemoved = false;
      els.iconFileStatus.textContent = file.name;
      els.removeUploadedIcon.hidden = false;
      updatePreview();
    } catch (error) {
      pendingIconData = "";
      els.siteIconFile.value = "";
      els.iconFileStatus.textContent = error.message || "فایل قابل استفاده نیست";
      console.warn(error);
    }
  });

  els.removeUploadedIcon.addEventListener("click", function() {
    pendingIconData = "";
    pendingIconRemoved = true;
    els.siteIconFile.value = "";
    els.iconFileStatus.textContent = "PNG، JPG، WebP یا SVG";
    els.removeUploadedIcon.hidden = true;
    updatePreview();
  });

  els.form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const section = els.section.value;
    const id = els.siteId.value;
    const name = els.siteName.value.trim();
    const url = normalizeUrl(els.siteUrl.value);
    const icon = els.siteIcon.value.trim();

    if (!section || !name || !url) return;

    try {
      new URL(url);
    } catch (_) {
      els.siteUrl.focus();
      return;
    }

    let savedId = id;

    if (id) {
      const index = state[section].findIndex(function(item) { return item.id === id; });
      if (index >= 0) state[section][index] = { id: id, name: name, url: url, icon: icon };
    } else {
      savedId = makeId();
      state[section].push({ id: savedId, name: name, url: url, icon: icon });
    }

    if (pendingIconData) {
      customIcons[savedId] = pendingIconData;
    } else if (pendingIconRemoved) {
      delete customIcons[savedId];
    }

    await Promise.all([saveState(), saveCustomIcons()]);
    render();
    closeModal();
  });

  els.deleteSite.addEventListener("click", async function() {
    const section = els.section.value;
    const id = els.siteId.value;
    if (!section || !id) return;

    const site = state[section].find(function(item) { return item.id === id; });
    if (!window.confirm("«" + (site ? site.name : "این سایت") + "» حذف شود؟")) return;

    state[section] = state[section].filter(function(item) { return item.id !== id; });
    delete customIcons[id];
    await Promise.all([saveState(), saveCustomIcons()]);
    render();
    closeModal();
  });
}

function openModal(section, id) {
  const site = id ? state[section].find(function(item) { return item.id === id; }) : null;

  els.section.value = section;
  els.siteId.value = site ? site.id : "";
  els.siteName.value = site ? site.name : "";
  els.siteUrl.value = site ? site.url : "";
  els.siteIcon.value = site ? (site.icon || "") : "";
  els.siteIconFile.value = "";
  pendingIconData = "";
  pendingIconRemoved = false;

  const hasUploadedIcon = Boolean(site && customIcons[site.id]);
  els.iconFileStatus.textContent = hasUploadedIcon ? "لوگوی آپلودی فعال است" : "PNG، JPG، WebP یا SVG";
  els.removeUploadedIcon.hidden = !hasUploadedIcon;

  els.modalEyebrow.textContent = section === "vpn" ? "بخش VPN" : "سایت‌های پرکاربرد";
  els.modalTitle.textContent = site ? "ویرایش سایت" : "افزودن سایت";
  els.deleteSite.hidden = !site;

  els.backdrop.hidden = false;
  updatePreview();
  window.setTimeout(function() { els.siteName.focus(); }, 30);
}

function closeModal() {
  els.backdrop.hidden = true;
  els.form.reset();
  els.siteId.value = "";
  pendingIconData = "";
  pendingIconRemoved = false;
  els.siteIconFile.value = "";
  els.iconFileStatus.textContent = "PNG، JPG، WebP یا SVG";
  els.removeUploadedIcon.hidden = true;
}

function updatePreview() {
  const name = els.siteName.value.trim() || "نام سایت";
  const rawUrl = els.siteUrl.value.trim();
  const url = rawUrl ? normalizeUrl(rawUrl) : "https://example.com/";
  const icon = els.siteIcon.value.trim();

  els.previewName.textContent = name;
  els.previewHost.textContent = rawUrl ? displayHost(url) : "example.com";
  els.previewFallback.textContent = firstLetter(name);

  const editingId = els.siteId.value;
  const uploadedIcon = pendingIconRemoved
    ? ""
    : (pendingIconData || (editingId ? customIcons[editingId] : ""));

  applyIcon(els.previewImage, els.previewFallback, {
    id: editingId,
    name: name,
    url: url,
    icon: icon,
    uploadedIcon: uploadedIcon
  });
}

function applyIcon(img, fallback, site) {
  const candidates = iconCandidates(site);
  let index = 0;

  fallback.style.display = "none";
  img.style.display = "block";

  function useNext() {
    if (index >= candidates.length) {
      img.removeAttribute("src");
      img.style.display = "none";
      fallback.style.display = "grid";
      return;
    }
    const next = candidates[index++];
    if (!next) return useNext();
    img.src = next;
  }

  img.onerror = useNext;
  img.onload = function() {
    fallback.style.display = "none";
    img.style.display = "block";
  };

  useNext();
}

function iconCandidates(site) {
  const candidates = [];

  const uploaded = site.uploadedIcon || (site.id ? customIcons[site.id] : "");
  if (uploaded) candidates.push(uploaded);

  const custom = (site.icon || "").trim();
  if (custom && !candidates.includes(custom)) candidates.push(custom);

  const known = knownIconForUrl(site.url);
  if (known && !candidates.includes(known)) candidates.push(known);

  try {
    const normalized = normalizeUrl(site.url);
    const host = new URL(normalized).hostname;
    candidates.push("https://www.google.com/s2/favicons?domain_url=" + encodeURIComponent(normalized) + "&sz=256");
    candidates.push("https://icons.duckduckgo.com/ip3/" + encodeURIComponent(host) + ".ico");
  } catch (_) {}

  return candidates;
}

function knownIconForUrl(value) {
  try {
    const host = new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
    const match = KNOWN_ICONS.find(function(entry) {
      return host === entry[0] || host.endsWith("." + entry[0]);
    });
    return match ? ICON_CDN + match[1] : "";
  } catch (_) {
    return "";
  }
}

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

function displayHost(value) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
  } catch (_) {
    return String(value || "");
  }
}

function firstLetter(name) {
  const clean = String(name || "").trim();
  return clean ? clean.charAt(0).toUpperCase() : "س";
}

function makeId() {
  if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "site-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function toPersianDigits(value) {
  return String(value).replace(/\d/g, function(digit) {
    return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)];
  });
}


function prepareUploadedIcon(file) {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

  if (!allowedTypes.includes(file.type)) {
    return Promise.reject(new Error("فرمت تصویر پشتیبانی نمی‌شود."));
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error("حجم تصویر باید کمتر از ۵ مگابایت باشد."));
  }

  if (file.type === "image/svg+xml") {
    return readFileAsDataUrl(file);
  }

  return optimizeRasterIcon(file);
}

function readFileAsDataUrl(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(new Error("خواندن فایل تصویر ناموفق بود.")); };
    reader.readAsDataURL(file);
  });
}

function optimizeRasterIcon(file) {
  return new Promise(function(resolve, reject) {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = function() {
      try {
        const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
        const scale = Math.min(1, MAX_RASTER_DIMENSION / maxSide);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", { alpha: true });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, width, height);

        const result = canvas.toDataURL("image/webp", 0.94);
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("بهینه‌سازی تصویر ناموفق بود."));
      }
    };

    image.onerror = function() {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("فایل تصویر معتبر نیست."));
    };

    image.src = objectUrl;
  });
}
