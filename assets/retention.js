/* Compress It Small - retention/workspace helper (client-side only) */
(function(){
  const KEY_RECENT = "cis_recent_tools_v1";
  const KEY_FAV = "cis_favorite_tools_v1";
  const KEY_PRESETS = "cis_saved_presets_v1";
  const KEY_LAST_WORKFLOW = "cis_last_workflow_v1";

  function now(){ return Date.now(); }

  function safeParse(str, fallback){
    try { return JSON.parse(str); } catch(e){ return fallback; }
  }

  function read(key, fallback){
    return safeParse(localStorage.getItem(key) || "", fallback);
  }

  function write(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeToolEntry(entry){
    if(!entry || !entry.url) return null;
    return {
      url: entry.url,
      title: entry.title || entry.url,
      category: entry.category || inferCategory(entry.url),
      ts: entry.ts || now()
    };
  }

  function inferCategory(url){
    if(!url) return "tool";
    if(url.indexOf("/tools/pdf/") === 0) return "PDF";
    if(url.indexOf("/tools/image/") === 0) return "Image";
    if(url.indexOf("/tools/office/") === 0) return "Office";
    if(url.indexOf("/tools/youtube-seo/") === 0) return "Workflow";
    if(url.indexOf("/blog/") === 0) return "Blog";
    return "Tool";
  }

  function trackPage(){
    const path = location.pathname || "/";
    const isTool = path.indexOf("/tools/") === 0;
    if(!isTool) return;
    const title = document.title || "Tool";
    const entry = normalizeToolEntry({url: path, title: title, category: inferCategory(path), ts: now()});
    const list = read(KEY_RECENT, []);
    const dedup = list.filter(x => x && x.url !== entry.url);
    dedup.unshift(entry);
    write(KEY_RECENT, dedup.slice(0, 12));
  }

  function getRecent(){ return read(KEY_RECENT, []); }
  function getFavorites(){ return read(KEY_FAV, []); }
  function getPresets(){ return read(KEY_PRESETS, []); }

  function isFavorite(url){
    const fav = getFavorites();
    return fav.some(x => x && x.url === url);
  }

  function toggleFavorite(entry){
    const norm = normalizeToolEntry(entry);
    if(!norm) return;
    const fav = getFavorites().filter(Boolean);
    const exists = fav.some(x => x.url === norm.url);
    const next = exists ? fav.filter(x => x.url !== norm.url) : [norm, ...fav];
    write(KEY_FAV, next.slice(0, 50));
    return !exists;
  }

  function savePreset(preset){
    if(!preset || !preset.id) return;
    const presets = getPresets().filter(Boolean);
    const next = [preset, ...presets.filter(p => p.id !== preset.id)].slice(0, 40);
    write(KEY_PRESETS, next);
    return next;
  }

  function setLastWorkflow(workflowId){
    if(!workflowId) return;
    localStorage.setItem(KEY_LAST_WORKFLOW, workflowId);
  }
  function getLastWorkflow(){
    return localStorage.getItem(KEY_LAST_WORKFLOW) || "";
  }

  function exportData(){
    return {
      recent: getRecent(),
      favorites: getFavorites(),
      presets: getPresets(),
      lastWorkflow: getLastWorkflow(),
      exportedAt: new Date().toISOString()
    };
  }
  function importData(obj){
    if(!obj || typeof obj !== "object") return false;
    if(Array.isArray(obj.recent)) write(KEY_RECENT, obj.recent.slice(0, 12));
    if(Array.isArray(obj.favorites)) write(KEY_FAV, obj.favorites.slice(0, 50));
    if(Array.isArray(obj.presets)) write(KEY_PRESETS, obj.presets.slice(0, 40));
    if(typeof obj.lastWorkflow === "string") localStorage.setItem(KEY_LAST_WORKFLOW, obj.lastWorkflow);
    return true;
  }

  function renderToolList(containerId, items, emptyText){
    const el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = "";
    if(!items || !items.length){
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = emptyText || "No items yet.";
      el.appendChild(p);
      return;
    }
    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.padding = "0";
    ul.style.margin = "0";
    items.forEach(item => {
      if(!item || !item.url) return;
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";
      li.style.padding = "10px 0";
      li.style.borderBottom = "1px solid var(--border)";
      const a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.title || item.url;
      a.style.fontWeight = "600";
      a.style.color = "var(--primary)";
      a.style.textDecoration = "underline";
      const meta = document.createElement("span");
      meta.className = "muted";
      meta.style.fontSize = "0.85rem";
      meta.textContent = (item.category ? item.category + " • " : "") + new Date(item.ts || now()).toLocaleDateString();
      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "8px";
      const star = document.createElement("button");
      star.type = "button";
      star.className = "btn btn-ghost";
      star.style.padding = "6px 10px";
      star.style.fontSize = "0.8rem";
      star.setAttribute("aria-label", "Save tool");
      star.textContent = isFavorite(item.url) ? "★ Saved" : "☆ Save";
      star.addEventListener("click", function(){
        const on = toggleFavorite(item);
        star.textContent = on ? "★ Saved" : "☆ Save";
      });
      right.appendChild(meta);
      right.appendChild(star);

      li.appendChild(a);
      li.appendChild(right);
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  // Public API for pages
  window.CIS = {
    trackPage,
    getRecent,
    getFavorites,
    getPresets,
    toggleFavorite,
    savePreset,
    exportData,
    importData,
    renderToolList,
    setLastWorkflow,
    getLastWorkflow
  };

  // Auto-track tools
  try { trackPage(); } catch(e) {}
})();