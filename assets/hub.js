(function () {
  "use strict";
  var VIEWS = ["list", "board", "timeline", "calendar", "progress", "views"];
  var ACCENT = { purple: ["#7b6cf6", "#ece9fe", "#5444d6"], yellow: ["#f5c142", "#fdf3d6", "#8a6500"], teal: ["#2bbfa4", "#daf5ef", "#147a67"], pink: ["#f47aa0", "#fde4ec", "#b8335d"] };
  var TAG = {
    Web: ["#ece9fe", "#5444d6"], "3D": ["#fde4ec", "#b8335d"], Interior: ["#daf5ef", "#147a67"], Construction: ["#fdf3d6", "#8a6500"],
    Marble: ["#ebeef5", "#4a5578"], Joinery: ["#fdeadb", "#a34f12"], Roofing: ["#fde2e2", "#b42318"], Landscaping: ["#e1f6dd", "#2f7a1f"],
    Lofts: ["#e0eefe", "#1d5fb5"], Shopfitting: ["#f1e5fd", "#7a35b8"], Concrete: ["#eceef1", "#4b4f56"], Engineering: ["#dff4fb", "#0f6a86"], Trading: ["#fff1cc", "#8a5a00"]
  };
  var CHART = ["#7b6cf6", "#f5c142", "#2bbfa4", "#f47aa0", "#6ea8fe", "#f9a87c", "#9ad06a", "#b48cf2", "#5fd0e6", "#ff8f8f", "#c3c7cf", "#ffd36e", "#8bd3c7"];
  var FLAG = { Canada: "CA", UAE: "AE", US: "US", UK: "UK", Australia: "AU" };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var STORE = "d3ddd-board-v1";

  var DATA, VDATA = null, SITES = [], GROUPS = [], state = { q: "", country: "", trade: "", sort: { key: "published", dir: 1 }, month: null };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function group(id) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i]; return GROUPS[0]; }
  function pill(t) { var c = TAG[t] || ["#eceef1", "#4b4f56"]; return '<span class="pill" style="background:' + c[0] + ";color:" + c[1] + '">' + esc(t) + "</span>"; }
  function utcDay(iso) { var d = new Date(iso); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
  function fmtDate(iso) { var d = new Date(iso); return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()].slice(0, 3) + " " + d.getUTCFullYear(); }
  function fmtTime(iso) { var d = new Date(iso); return fmtDate(iso) + ", " + String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " UTC"; }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 1800); }

  var EYE = '<svg class="eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  function hasViews() { return !!(VDATA && VDATA.status === "ok"); }
  function viewsOf(slug) {
    if (!hasViews()) return null;
    for (var i = 0; i < VDATA.demos.length; i++) if (VDATA.demos[i].slug === slug) return VDATA.demos[i].views;
    return 0;
  }
  function num(n) { return n == null ? "–" : Number(n).toLocaleString("en-GB"); }
  function viewChip(s) { var v = viewsOf(s.slug); return '<span class="vc" title="' + (v == null ? "No view data yet" : plural(v, "view") + " in the last 30 days") + '">' + EYE + num(v) + "</span>"; }

  function matches(s) {
    if (state.country && s.country !== state.country) return false;
    if (state.trade && s.tags.indexOf(state.trade) < 0) return false;
    if (state.q) {
      var hay = [s.name, s.category, s.country, s.area, s.tags.join(" "), group(s.group).title].join(" ").toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }
  function visible() { return SITES.filter(matches); }

  /* ---------- board ---------- */
  function loadMoves() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveMoves(m) { try { localStorage.setItem(STORE, JSON.stringify(m)); } catch (e) { /* storage off: still works for this visit */ } }
  var moves = {};

  function cardHTML(s) {
    var g = group(s.group), a = ACCENT[g.accent], tc = (TAG[s.trade] || ["#eceef1", "#4b4f56"])[1];
    return '<div class="bars"><i style="background:' + a[0] + '"></i><i style="background:' + tc + ';opacity:.55"></i></div>' +
      '<a class="thumb" href="' + esc(s.url) + '" tabindex="-1" draggable="false"><img src="' + esc(s.thumb) + '" alt="Preview of the ' + esc(s.name) + ' site" width="480" height="300" loading="lazy" draggable="false"></a>' +
      '<p class="title"><svg class="check" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#2bbfa4"/><path d="m5 8.2 2 2 4-4.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + esc(s.name) + "</span></p>" +
      '<p class="sub">' + esc(s.category) + " · " + esc(s.area) + "</p>" +
      '<div class="pills">' + s.tags.map(pill).join("") + "</div>" +
      '<div class="meta"><span class="avatar" title="D3DDD">D3</span><span class="country">' + esc(s.country) + '</span><span class="muted pg">' + plural(s.pages, "page") + "</span>" + viewChip(s) + '<span class="status">Live</span>' +
      '<a class="open" href="' + esc(s.url) + '" draggable="false" aria-label="Open ' + esc(s.name) + ' demo">Open ↗</a></div>';
  }

  function renderBoard() {
    var board = $("#kanban"); board.innerHTML = "";
    var vis = visible();
    GROUPS.forEach(function (g) {
      var a = ACCENT[g.accent];
      var col = el("section", "col"); col.dataset.group = g.id;
      var items = vis.filter(function (s) { return (moves[s.slug] || s.group) === g.id; });
      var pages = items.reduce(function (n, s) { return n + s.pages; }, 0);
      col.innerHTML = '<div class="col-head"><span class="col-dot" style="background:' + a[0] + '"></span><h2>' + esc(g.title) + '</h2><span class="count">' + items.length + '</span><span class="muted">' + plural(pages, "page") + "</span></div>";
      var list = el("div", "cards");
      items.forEach(function (s) {
        var c = el("article", "card", cardHTML(s));
        c.draggable = true; c.dataset.slug = s.slug;
        if (moves[s.slug] && moves[s.slug] !== s.group) c.classList.add("moved");
        list.appendChild(c);
      });
      if (!items.length) list.appendChild(el("div", "empty", "No demos match"));
      col.appendChild(list); board.appendChild(col);
    });
  }

  function initDrag() {
    var board = $("#kanban"), dragSlug = null;
    board.addEventListener("dragstart", function (e) {
      var c = e.target.closest && e.target.closest(".card"); if (!c) return;
      dragSlug = c.dataset.slug; c.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", dragSlug); } catch (x) { /* older browsers */ }
    });
    board.addEventListener("dragend", function (e) {
      var c = e.target.closest && e.target.closest(".card"); if (c) c.classList.remove("dragging");
      board.querySelectorAll(".col.over").forEach(function (x) { x.classList.remove("over"); });
    });
    board.addEventListener("dragover", function (e) {
      var col = e.target.closest && e.target.closest(".col"); if (!col || !dragSlug) return;
      e.preventDefault(); e.dataTransfer.dropEffect = "move";
      board.querySelectorAll(".col.over").forEach(function (x) { if (x !== col) x.classList.remove("over"); });
      col.classList.add("over");
    });
    board.addEventListener("drop", function (e) {
      var col = e.target.closest && e.target.closest(".col"); if (!col || !dragSlug) return;
      e.preventDefault();
      var s = SITES.filter(function (x) { return x.slug === dragSlug; })[0];
      if (s) {
        if (col.dataset.group === s.group) delete moves[s.slug]; else moves[s.slug] = col.dataset.group;
        saveMoves(moves); renderBoard(); toast("Moved " + s.name + " to " + group(col.dataset.group).title + " (just on this device)");
      }
      dragSlug = null;
    });
    $("#reset").addEventListener("click", function () { moves = {}; saveMoves(moves); renderBoard(); toast("Board reset"); });
  }

  /* ---------- list ---------- */
  var COLS = [
    { key: "thumb", label: "", sort: false },
    { key: "name", label: "Name" }, { key: "group", label: "Group" }, { key: "country", label: "Country" }, { key: "area", label: "Area" },
    { key: "trade", label: "Trade" }, { key: "pages", label: "Pages" }, { key: "views", label: "Views" }, { key: "published", label: "Published" }, { key: "updated", label: "Updated" },
    { key: "status", label: "Status" }, { key: "open", label: "", sort: false }
  ];
  function renderList() {
    var thead = $("#table thead"), tbody = $("#table tbody");
    thead.innerHTML = "<tr>" + COLS.map(function (c) {
      if (c.sort === false) return "<th>" + c.label + "</th>";
      var s = state.sort.key === c.key ? (state.sort.dir > 0 ? "ascending" : "descending") : "none";
      return '<th data-key="' + c.key + '" aria-sort="' + s + '" tabindex="0">' + c.label + "</th>";
    }).join("") + "</tr>";
    var k = state.sort.key, d = state.sort.dir;
    var rows = visible().slice().sort(function (a, b) {
      var x = k === "group" ? group(a.group).title : k === "views" ? viewsOf(a.slug) || 0 : a[k], y = k === "group" ? group(b.group).title : k === "views" ? viewsOf(b.slug) || 0 : b[k];
      if (typeof x === "number") return (x - y) * d || a.name.localeCompare(b.name);
      return String(x).localeCompare(String(y)) * d || a.name.localeCompare(b.name);
    });
    tbody.innerHTML = rows.map(function (s) {
      return '<tr><td><img class="mini" src="' + esc(s.thumb) + '" alt="" width="56" height="35" loading="lazy"></td><td class="name">' + esc(s.name) + '<div class="muted small">' + esc(s.category) + "</div></td><td>" + esc(group(s.group).title) + "</td><td>" + esc(s.country) + "</td><td>" + esc(s.area) +
        "</td><td>" + pill(s.trade) + "</td><td>" + s.pages + "</td><td>" + viewChip(s) + "</td><td>" + fmtDate(s.published) + "</td><td>" + fmtDate(s.updated) + '</td><td><span class="status">Live</span></td><td><a class="open" href="' + esc(s.url) + '">Open ↗</a></td></tr>';
    }).join("") || '<tr><td colspan="12" class="muted">No demos match</td></tr>';
  }
  function initList() {
    function go(th) { if (!th || !th.dataset.key) return; var k = th.dataset.key; state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : 1 }; renderList(); }
    $("#table thead").addEventListener("click", function (e) { go(e.target.closest("th")); });
    $("#table thead").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e.target.closest("th")); } });
  }

  /* ---------- timeline ---------- */
  function renderTimeline() {
    var all = [];
    SITES.forEach(function (s) { s.history.forEach(function (h) { all.push(+new Date(h)); }); });
    var DAY = 864e5, min = Math.floor(Math.min.apply(null, all) / DAY) * DAY, max = Math.ceil((Math.max.apply(null, all) + 1) / DAY) * DAY;
    var days = Math.round((max - min) / DAY), span = max - min;
    var pct = function (t) { return ((t - min) / span * 100).toFixed(3) + "%"; };
    var html = '<div class="g-scale" style="grid-template-columns:repeat(' + days + ',1fr)">';
    for (var i = 0; i < days; i++) html += "<div>" + fmtDate(new Date(min + i * DAY).toISOString()) + "</div>";
    html += "</div>";
    var vis = visible();
    GROUPS.forEach(function (g) {
      var items = vis.filter(function (s) { return s.group === g.id; }), a = ACCENT[g.accent];
      var track = '<div class="g-track" style="background-size:' + (100 / days) + '% 100%">';
      if (items.length) {
        var times = {}; items.forEach(function (s) { s.history.forEach(function (h) { times[h] = 1; }); });
        var ts = Object.keys(times).map(function (h) { return +new Date(h); }).sort(function (x, y) { return x - y; });
        var start = Math.min.apply(null, items.map(function (s) { return +new Date(s.published); })), end = ts[ts.length - 1];
        var w = Math.max((end - start) / span * 100, 7);
        track += '<div class="g-bar" style="left:' + pct(start) + ";width:" + w.toFixed(3) + "%;background:" + a[1] + ";color:" + a[2] + ";border:1px solid " + a[0] + '" title="' + esc(g.title + ": " + fmtTime(new Date(start).toISOString()) + " → " + fmtTime(new Date(end).toISOString())) + '">' + plural(items.length, "site") + "</div>";
        ts.forEach(function (t) { track += '<span class="g-dot" style="left:' + pct(t) + ";background:" + a[0] + '" title="Commit ' + esc(fmtTime(new Date(t).toISOString())) + '"></span>'; });
        html += '<div class="g-row"><div class="g-label"><b>' + esc(g.title) + '</b><span class="muted small">' + plural(ts.length, "commit") + " · " + fmtDate(new Date(start).toISOString()) + "</span></div>" + track + "</div></div>";
      } else {
        html += '<div class="g-row"><div class="g-label"><b>' + esc(g.title) + '</b><span class="muted small">No demos match</span></div>' + track + "</div></div>";
      }
    });
    $("#gantt").innerHTML = html;
  }

  /* ---------- calendar ---------- */
  function renderCalendar() {
    var vis = visible();
    if (!state.month) { var f = new Date(SITES[0] ? SITES.map(function (s) { return s.published; }).sort().pop() : Date.now()); state.month = [f.getUTCFullYear(), f.getUTCMonth()]; }
    var y = state.month[0], m = state.month[1];
    $("#cal-title").textContent = MONTHS[m] + " " + y;
    var byDay = {};
    vis.forEach(function (s) { var d = utcDay(s.published); (byDay[d] = byDay[d] || []).push(s); });
    var first = new Date(Date.UTC(y, m, 1)), offset = (first.getUTCDay() + 6) % 7, today = utcDay(new Date().toISOString());
    var html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (d) { return '<div class="dow">' + d + "</div>"; }).join("");
    for (var i = 0; i < 42; i++) {
      var d = new Date(Date.UTC(y, m, 1 - offset + i)), key = utcDay(d.toISOString());
      if (i >= 35 && d.getUTCMonth() !== m) break;
      var items = byDay[key] || [], cls = "day" + (d.getUTCMonth() !== m ? " out" : "") + (key === today ? " today" : "");
      var cell = '<div class="' + cls + '"><div class="num">' + d.getUTCDate() + "</div>";
      GROUPS.forEach(function (g) {
        var gi = items.filter(function (s) { return s.group === g.id; }); if (!gi.length) return;
        var a = ACCENT[g.accent];
        cell += '<details><summary style="background:' + a[1] + ";color:" + a[2] + '" title="' + esc(g.title) + '">' + esc(window.innerWidth < 760 ? g.short || g.title : g.title) + " · " + gi.length + "</summary><ul>" +
          gi.map(function (s) { return '<li><a href="' + esc(s.url) + '">' + esc(s.name) + "</a></li>"; }).join("") + "</ul></details>";
      });
      html += cell + "</div>";
    }
    $("#cal").innerHTML = html;
    var keys = Object.keys(byDay).filter(function (k) { return +k.slice(0, 4) === y && +k.slice(5, 7) === m + 1; }).sort();
    $("#agenda").innerHTML = keys.length ? keys.map(function (k) {
      return '<div class="ag-day"><h3>' + fmtDate(k + "T12:00:00Z") + ' <span class="count">' + byDay[k].length + "</span></h3><ul>" + byDay[k].map(function (s) {
        var a = ACCENT[group(s.group).accent];
        return '<li><i style="background:' + a[0] + '"></i><a href="' + esc(s.url) + '">' + esc(s.name) + '</a><span class="muted">' + esc(group(s.group).title) + " · " + esc(s.country) + "</span></li>";
      }).join("") + "</ul></div>";
    }).join("") : '<p class="muted">Nothing published this month.</p>';
  }
  function initCalendar() {
    function shift(n) { var y = state.month[0], m = state.month[1] + n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } state.month = [y, m]; renderCalendar(); }
    $("#cal-prev").addEventListener("click", function () { shift(-1); });
    $("#cal-next").addEventListener("click", function () { shift(1); });
  }

  /* ---------- progress ---------- */
  function count(list, fn) { var o = {}; list.forEach(function (s) { [].concat(fn(s)).forEach(function (k) { o[k] = (o[k] || 0) + 1; }); }); return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }); }
  function donut(title, entries, centre, colorFn) {
    var total = entries.reduce(function (n, e) { return n + e[1]; }, 0), R = 52, C = 2 * Math.PI * R, off = 0;
    var svg = '<svg class="donut" viewBox="0 0 150 150" role="img" aria-label="' + esc(title) + '"><circle cx="75" cy="75" r="' + R + '" fill="none" stroke="#eef0f3" stroke-width="16"/>';
    entries.forEach(function (e, i) {
      var len = total ? e[1] / total * C : 0;
      svg += '<circle class="seg" cx="75" cy="75" r="' + R + '" fill="none" stroke="' + colorFn(e[0], i) + '" stroke-width="16" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 75 75)"><title>' + esc(e[0] + ": " + e[1]) + "</title></circle>";
      off += len;
    });
    svg += '<text x="75" y="73" text-anchor="middle" font-size="24" font-weight="600" fill="#1e1f21">' + total + '</text><text x="75" y="92" text-anchor="middle" font-size="11" fill="#7a7f87">' + esc(centre) + "</text></svg>";
    return '<div class="panel"><div class="panel-head"><h2>' + esc(title) + '</h2></div><div class="donut-wrap">' + svg + '<ul class="legend">' +
      entries.map(function (e, i) { return '<li><i style="background:' + colorFn(e[0], i) + '"></i>' + esc(e[0]) + "<span>" + e[1] + "</span></li>"; }).join("") + "</ul></div></div>";
  }
  function renderProgress() {
    var vis = visible();
    var themes = vis.filter(function (s) { return s.kind === "theme"; }).length, demos = vis.length - themes;
    var countries = count(vis, function (s) { return s.country; }), trades = count(vis, function (s) { return s.trade; });
    var tags = count(vis, function (s) { return s.tags; });
    var pages = vis.reduce(function (n, s) { return n + s.pages; }, 0);
    var commits = {}; vis.forEach(function (s) { s.history.forEach(function (h) { commits[h] = 1; }); });
    var cIdx = {}; count(SITES, function (s) { return s.country; }).forEach(function (e, i) { cIdx[e[0]] = CHART[i % CHART.length]; });
    var tIdx = {}; count(SITES, function (s) { return s.trade; }).forEach(function (e, i) { tIdx[e[0]] = CHART[i % CHART.length]; });
    var tradeColor = function (k) { return tIdx[k]; };
    var side = '<aside class="side"><section><h3>Description</h3><p>Every D3DDD website theme and trade demo in one place. All sites are static, mobile-ready and live on GitHub Pages.</p></section>' +
      '<section><h3>Tags</h3><div class="pills">' + tags.map(function (t) { return pill(t[0]); }).join("") + "</div></section>" +
      "<section><h3>Countries</h3><p>" + countries.map(function (c) { return esc(c[0]); }).join(", ") + "</p></section>" +
      '<section><h3>Contact</h3><p><a href="mailto:info@d3ddd.com">info@d3ddd.com</a><br><a href="https://d3ddd.com" rel="noopener">d3ddd.com</a></p></section></aside>';
    var digest = '<div class="digest">' + [[vis.length, "Total sites"], [themes, "Themes"], [demos, "Trade demos"], [countries.length, "Countries"], [pages, "Pages live"], [Object.keys(commits).length, "Commits"]].map(function (d) { return '<div class="stat"><b>' + d[0] + "</b><span>" + d[1] + "</span></div>"; }).join("") + "</div>";
    var charts = '<div class="donuts">' + donut("Demos by country", countries, "sites", function (k) { return cIdx[k]; }) + donut("Demos by trade", trades, "sites", tradeColor) + "</div>";
    var max = Math.max.apply(null, GROUPS.map(function (g) { return vis.filter(function (s) { return s.group === g.id; }).length; }).concat([1]));
    var brk = '<aside class="panel"><div class="panel-head"><h2>Breakdown</h2><span class="muted small">Sites per group</span></div><ul class="brk">' + GROUPS.map(function (g) {
      var n = vis.filter(function (s) { return s.group === g.id; }).length, a = ACCENT[g.accent], pc = vis.length ? Math.round(n / vis.length * 100) : 0;
      return '<li><span class="avatar" style="background:' + a[1] + ";color:" + a[2] + '">D3</span><div class="lbl"><b>' + esc(g.title) + '</b><div class="bar"><i style="width:' + (n / max * 100) + "%;background:" + a[0] + '"></i></div><span class="muted small">' + pc + '% of shown</span></div><span class="n">' + n + "</span></li>";
    }).join("") + '</ul><div class="panel-head" style="margin-top:16px"><h2>By country</h2></div><ul class="brk">' + countries.map(function (c) {
      return '<li><span class="avatar" style="background:#f3f4f6;color:#4b4f56">' + esc(FLAG[c[0]] || "") + '</span><div class="lbl"><b>' + esc(c[0]) + '</b><div class="bar"><i style="width:' + (c[1] / vis.length * 100) + "%;background:" + cIdx[c[0]] + '"></i></div></div><span class="n">' + c[1] + "</span></li>";
    }).join("") + "</ul></aside>";
    $("#overview").innerHTML = side + "<div>" + digest + charts + "</div>" + brk;
  }

  /* ---------- views (GoatCounter aggregates) ---------- */
  var SRC_COLOR = { Google: "#6ea8fe", Bing: "#2bbfa4", Email: "#f5c142", Fiverr: "#9ad06a", LinkedIn: "#5444d6", Facebook: "#f47aa0", Direct: "#7b6cf6", Other: "#c3c7cf" };
  var DEV_COLOR = { Desktop: "#7b6cf6", Mobile: "#f47aa0", Tablet: "#f5c142", Unknown: "#c3c7cf" };
  function pairs(list) { return (list || []).map(function (x) { return [x.name, x.views]; }); }
  function emptyNote(t) { return '<div class="v-empty small">' + esc(t || "No data yet") + "</div>"; }
  function vDonut(title, entries, colors) {
    if (!entries.length) return '<div class="panel"><div class="panel-head"><h2>' + esc(title) + "</h2></div>" + emptyNote() + "</div>";
    return donut(title, entries, "views", function (k, i) { return colors[k] || CHART[i % CHART.length]; });
  }
  function lineChart(daily) {
    var W = 700, H = 200, n = daily.length, max = Math.max.apply(null, daily.map(function (d) { return d.views; }).concat([0]));
    var top = max <= 4 ? 4 : Math.ceil(max / 4 / Math.pow(10, Math.floor(Math.log10(max / 4)))) * Math.pow(10, Math.floor(Math.log10(max / 4))) * 4;
    var x = function (i) { return n > 1 ? i / (n - 1) * W : W / 2; }, y = function (v) { return H - v / top * (H - 8); };
    var pts = daily.map(function (d, i) { return x(i).toFixed(1) + "," + y(d.views).toFixed(1); });
    var svg = '<svg class="line" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Daily views, last ' + n + ' days"><defs><linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f47aa0" stop-opacity=".28"/><stop offset="1" stop-color="#f47aa0" stop-opacity="0"/></linearGradient></defs>';
    [0, .25, .5, .75, 1].forEach(function (f) { svg += '<line x1="0" x2="' + W + '" y1="' + y(top * f).toFixed(1) + '" y2="' + y(top * f).toFixed(1) + '" stroke="#eef0f3" vector-effect="non-scaling-stroke"/>'; });
    if (n) {
      svg += '<path d="M0,' + H + " L" + pts.join(" L") + " L" + W + "," + H + ' Z" fill="url(#vfill)"/>';
      svg += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#f47aa0" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
      daily.forEach(function (d, i) { var w = W / n; svg += '<rect class="hit" x="' + (x(i) - w / 2).toFixed(1) + '" y="0" width="' + w.toFixed(1) + '" height="' + H + '"><title>' + esc(fmtDate(d.day + "T12:00:00Z") + ": " + plural(d.views, "view")) + "</title></rect>"; });
    }
    svg += "</svg>";
    var yl = [1, .5, 0].map(function (f) { return "<span>" + num(Math.round(top * f)) + "</span>"; }).join("");
    var xl = n ? [daily[0], daily[Math.floor((n - 1) / 2)], daily[n - 1]].map(function (d) { var t = new Date(d.day + "T12:00:00Z"); return "<span>" + t.getUTCDate() + " " + MONTHS[t.getUTCMonth()].slice(0, 3) + "</span>"; }).join("") : "";
    return '<div class="chart"><div class="y-ax">' + yl + '</div><div class="plot">' + svg + '<div class="x-ax">' + xl + "</div></div></div>";
  }
  function barList(list, total, colorFn, badgeFn) {
    if (!list.length) return emptyNote();
    var max = Math.max.apply(null, list.map(function (x) { return x.views; }).concat([1]));
    return '<ul class="brk">' + list.map(function (c, i) {
      var pc = total ? Math.round(c.views / total * 100) : 0;
      return "<li>" + (badgeFn ? '<span class="avatar" style="background:#f3f4f6;color:#4b4f56">' + esc(badgeFn(c)) + "</span>" : "") + '<div class="lbl"><b>' + esc(c.name) + '</b><div class="bar"><i style="width:' + (c.views / max * 100) + "%;background:" + colorFn(c, i) + '"></i></div><span class="muted small">' + pc + '% of views</span></div><span class="n">' + num(c.views) + "</span></li>";
    }).join("") + "</ul>";
  }
  function renderViews() {
    var box = $("#vstats");
    if (!VDATA) { box.innerHTML = '<div class="panel">' + emptyNote(VDATA === false ? "View stats could not be loaded. Please refresh the page." : "Loading view stats…") + "</div>"; return; }
    var V = VDATA, ok = hasViews(), t = V.totals || {}, bySlug = {};
    SITES.forEach(function (s) { bySlug[s.slug] = s; });
    var demos = (V.demos || []).filter(function (d) { return bySlug[d.slug] && matches(bySlug[d.slug]); });
    var topDemo = (V.demos || [])[0], srcs = V.sources || [], srcTotal = srcs.reduce(function (n, x) { return n + x.views; }, 0);
    var topSrc = srcs[0];
    var head = '<div class="v-head"><div><h2>Where views come from</h2><span class="muted small">Anonymous, aggregate stats from GoatCounter · last ' + (V.range ? V.range.days : 30) + " days" + (V.range ? " (" + fmtDate(V.range.start + "T12:00:00Z") + " – " + fmtDate(V.range.end + "T12:00:00Z") + ")" : "") + '</span></div><span class="v-upd">Last updated ' + (V.updated ? fmtTime(V.updated) : "–") + "</span></div>";
    var banner = ok ? "" : '<div class="panel v-banner"><span class="v-ico" aria-hidden="true">' + EYE + '</span><div><b>No data yet</b><p class="muted small">View counts appear here after the next stats update. Only anonymous totals are shown: no IP addresses and no personal data.</p></div></div>';
    var tiles = '<div class="digest v-tiles">' + [
      [ok ? num(t.views) : "–", "Total views", ok ? "last 30 days" : "no data yet"],
      [ok ? num(t.visitors) : "–", "Visitors", ok ? "unique, anonymous" : "no data yet"],
      [ok && topDemo ? esc(topDemo.name) : "–", "Top demo", ok && topDemo ? plural(topDemo.views, "view") : ok ? "hub page only" : "no data yet"],
      [ok && topSrc ? esc(topSrc.name) : "–", "Top source", ok && topSrc && srcTotal ? Math.round(topSrc.views / srcTotal * 100) + "% of views" : "no data yet"]
    ].map(function (d, i) { return '<div class="stat' + (i > 1 ? " txt" : "") + '"><b title="' + d[0] + '">' + d[0] + "</b><span>" + d[1] + '</span><em class="muted small">' + d[2] + "</em></div>"; }).join("") + "</div>";
    var line = '<div class="panel v-line"><div class="panel-head"><h2>Daily views</h2><span class="muted small">' + (ok ? plural(t.views, "view") + " in " + (V.daily || []).length + " days (UTC)" : "No data yet") + "</span></div>" + lineChart(V.daily || []) + "</div>";
    var countries = V.countries || [], cTotal = countries.reduce(function (n, x) { return n + x.views; }, 0);
    var three = '<div class="v-three">' + vDonut("Sources", pairs(srcs), SRC_COLOR) + vDonut("Devices", pairs(V.devices), DEV_COLOR) +
      '<div class="panel"><div class="panel-head"><h2>Countries</h2><span class="muted small">' + (countries.length ? "Top " + countries.length : "No data yet") + "</span></div>" + barList(countries, cTotal, function (c, i) { return CHART[i % CHART.length]; }, function (c) { return c.code || "··"; }) + "</div></div>";
    var maxD = Math.max.apply(null, demos.map(function (d) { return d.views; }).concat([1]));
    var rows = demos.slice(0, 15).map(function (d, i) {
      var s = bySlug[d.slug], a = ACCENT[group(s.group).accent];
      return '<tr><td class="rk">' + (i + 1) + '</td><td><img class="mini" src="' + esc(s.thumb) + '" alt="" width="56" height="35" loading="lazy"></td><td class="name">' + esc(s.name) + '<div class="muted small">' + esc(s.category) + " · " + esc(s.country) + '</div></td><td class="grp"><span class="pill" style="background:' + a[1] + ";color:" + a[2] + '">' + esc(group(s.group).short || group(s.group).title) + '</span></td><td class="vbar"><div class="bar"><i style="width:' + (d.views / maxD * 100) + "%;background:" + a[0] + '"></i></div></td><td class="n">' + num(d.views) + '</td><td><a class="open" href="' + esc(s.url) + '" aria-label="Open ' + esc(s.name) + '">Open ↗</a></td></tr>';
    }).join("");
    var table = '<div class="panel v-table"><div class="panel-head"><h2>Top demos by views</h2><span class="muted small">' + (ok ? "Hub page: " + plural(t.hub || 0, "view") : "No data yet") + '</span></div><div class="scroll-x"><table class="table vt"><thead><tr><th>#</th><th></th><th>Demo</th><th class="grp">Group</th><th class="vbar">Share</th><th>Views</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="muted">' + (ok ? "No demo views yet in this range" + (demos.length < (V.demos || []).length ? " for these filters" : "") : "No data yet") + "</td></tr>") + "</tbody></table></div></div>";
    var b = V.browsers || [], sy = V.systems || [], bT = b.reduce(function (n, x) { return n + x.views; }, 0), sT = sy.reduce(function (n, x) { return n + x.views; }, 0);
    var tech = '<div class="panel v-tech"><div class="panel-head"><h2>Browsers</h2></div>' + barList(b, bT, function (c, i) { return CHART[i % CHART.length]; }) +
      '<div class="panel-head" style="margin-top:16px"><h2>Operating systems</h2></div>' + barList(sy, sT, function (c, i) { return CHART[(i + 3) % CHART.length]; }) + "</div>";
    box.innerHTML = head + banner + tiles + line + three + '<div class="v-two">' + table + tech + "</div>";
  }

  /* ---------- shell ---------- */
  var renderers = { board: renderBoard, list: renderList, timeline: renderTimeline, calendar: renderCalendar, progress: renderProgress, views: renderViews };
  function current() { var h = location.hash.replace("#", ""); return VIEWS.indexOf(h) >= 0 ? h : "board"; }
  function show() {
    var v = current();
    document.querySelectorAll(".view").forEach(function (s) { s.hidden = s.dataset.view !== v; });
    document.querySelectorAll(".tabs a").forEach(function (a) { a.setAttribute("aria-selected", a.dataset.view === v ? "true" : "false"); });
    var tab = $('.tabs a[data-view="' + v + '"]'); if (tab && tab.scrollIntoView && window.innerWidth < 760) tab.scrollIntoView({ block: "nearest", inline: "center" });
    if (DATA) renderers[v]();
  }
  function refresh() {
    var n = visible().length;
    $("#summary").textContent = n === SITES.length ? SITES.length + " live sites · " + SITES.reduce(function (t, s) { return t + s.pages; }, 0) + " pages · drag cards between columns" : n + " of " + SITES.length + " sites shown";
    renderers[current()]();
  }

  function init(d) {
    DATA = d; SITES = d.sites; GROUPS = d.groups; moves = loadMoves();
    var cs = $("#country"), ts = $("#trade");
    count(SITES, function (s) { return s.country; }).forEach(function (c) { cs.appendChild(new Option(c[0] + " (" + c[1] + ")", c[0])); });
    count(SITES, function (s) { return s.tags; }).forEach(function (c) { ts.appendChild(new Option(c[0] + " (" + c[1] + ")", c[0])); });
    cs.addEventListener("change", function () { state.country = cs.value; refresh(); });
    ts.addEventListener("change", function () { state.trade = ts.value; refresh(); });
    $("#q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); refresh(); });
    initDrag(); initList(); initCalendar();
    window.addEventListener("hashchange", show);
    show(); refresh();
  }

  function loadViews() {
    return fetch("views.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (v) { VDATA = v; }).catch(function () { VDATA = false; })
      .then(function () { if (DATA) renderers[current()](); });
  }

  show();
  loadViews();
  fetch("data.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch(function () {
    $("#summary").textContent = "Could not load the demo list. Please refresh the page.";
  });
})();
