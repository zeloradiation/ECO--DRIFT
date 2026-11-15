/* ECO DRIFT - visual polish: starfield, parallax, clocks, count-up, intro HUD.
   Pure decoration; the science code lives in script.js. */
(function () {
    "use strict";
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = id => document.getElementById(id);
    const pad = n => String(n).padStart(2, "0");

    // ---------------- parallax: the NASA photo slides a little against the mouse ----------------
    let mx = 0, my = 0, tx = 0, ty = 0, lpx = 9, lpy = 9;
    addEventListener("pointermove", e => {
        tx = (e.clientX / innerWidth - 0.5) * 2;
        ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    // ---------------- starfield with twinkle, depth and shooting stars ----------------
    const cv = $("stars");
    if (cv && cv.getContext) {
        const cx = cv.getContext("2d");
        let W = 0, H = 0, dpr = 1, stars = [], shooters = [];
        const size = () => {
            dpr = Math.min(devicePixelRatio || 1, 1.5);
            W = innerWidth; H = innerHeight;
            cv.width = W * dpr; cv.height = H * dpr;
            const n = Math.round(Math.min(220, (W * H) / 6500));
            stars = Array.from({ length: n }, () => ({
                x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1,
                r: Math.random() * 1.2 + 0.25, tw: Math.random() * 6.28, sp: Math.random() * 1.6 + 0.4,
                hue: Math.random() < 0.18 ? 285 : (Math.random() < 0.1 ? 28 : 255)
            }));
        };
        size();
        addEventListener("resize", size);
        let nextShot = performance.now() + 2500;
        function spawnShooter() {
            const fromLeft = Math.random() < 0.5;
            shooters.push({
                x: fromLeft ? Math.random() * W * 0.5 : W * (0.5 + Math.random() * 0.5), y: Math.random() * H * 0.45,
                vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 6), vy: 3 + Math.random() * 3, life: 1
            });
        }
        function tick(now) {
            requestAnimationFrame(tick);
            if (document.hidden) { return; }
            mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
            if (Math.abs(mx - lpx) > 0.002 || Math.abs(my - lpy) > 0.002) {      // only touch the DOM when the mouse really moved
                lpx = mx; lpy = my;
                document.documentElement.style.setProperty("--px", mx.toFixed(3));
                document.documentElement.style.setProperty("--py", my.toFixed(3));
            }
            cx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cx.clearRect(0, 0, W, H);
            const t = now / 1000;
            for (const s of stars) {
                const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.tw));
                const ox = mx * s.z * 26, oy = my * s.z * 18;
                const x = ((s.x + ox + t * s.z * 2.2) % W + W) % W, y = s.y + oy;
                cx.globalAlpha = a * s.z;
                cx.fillStyle = `hsl(${s.hue}, 70%, 88%)`;
                cx.beginPath(); cx.arc(x, y, s.r * (0.6 + s.z * 0.6), 0, 6.283); cx.fill();
                if (s.r > 1.38 && a > 0.95) {              // the brightest ones get a little cross flare
                    cx.globalAlpha = a * 0.35; cx.strokeStyle = "#e9ddff"; cx.lineWidth = 0.6;
                    cx.beginPath(); cx.moveTo(x - 3, y); cx.lineTo(x + 3, y); cx.moveTo(x, y - 3); cx.lineTo(x, y + 3); cx.stroke();
                }
            }
            if (!reduce && now > nextShot) { spawnShooter(); nextShot = now + 3500 + Math.random() * 6500; }
            for (let i = shooters.length - 1; i >= 0; i--) {
                const s = shooters[i];
                s.x += s.vx; s.y += s.vy; s.life -= 0.016;
                if (s.life <= 0) { shooters.splice(i, 1); continue; }
                const g = cx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9);
                g.addColorStop(0, `rgba(255,255,255,${s.life})`); g.addColorStop(1, "rgba(196,181,253,0)");
                cx.globalAlpha = 1; cx.strokeStyle = g; cx.lineWidth = 1.8; cx.lineCap = "round";
                cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9); cx.stroke();
            }
            cx.globalAlpha = 1;
        }
        requestAnimationFrame(tick);
    }

    // ---------------- UTC mission clock in the top bar ----------------
    function utc() {
        const d = new Date();
        const el = $("utc");
        if (el) { el.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`; }
    }
    utc(); setInterval(utc, 1000);

    // ---------------- numbers count up when the Home page opens ----------------
    function countUp() {
        document.querySelectorAll(".stat b").forEach(el => {
            const end = parseFloat(el.dataset.end || el.textContent);
            if (isNaN(end)) { return; }
            el.dataset.end = end;
            if (reduce) { el.textContent = end; return; }
            const t0 = performance.now(), ms = 1400;
            (function step(now) {
                const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
                el.textContent = Math.round(end * e);
                if (k < 1) { requestAnimationFrame(step); }
            })(t0);
        });
    }
    const home = $("tab-home");
    if (home && window.MutationObserver) {
        let was = home.classList.contains("on");
        new MutationObserver(() => {
            const now = home.classList.contains("on");
            if (now && !was) { countUp(); }
            was = now;
        }).observe(home, { attributes: true, attributeFilter: ["class"] });
    }
    addEventListener("ecodrift:introend", () => setTimeout(countUp, 150));

    // ---------------- intro HUD: mission clock, drifting coordinates, orbital speed ----------------
    let hudStart = 0, hudOn = false;
    function hud(now) {
        if (!hudOn) { return; }
        requestAnimationFrame(hud);
        const s = (now - hudStart) / 1000;
        const clock = $("hudClock"), coord = $("hudCoord"), vel = $("hudVel");
        if (clock) { clock.textContent = `T+ ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`; }
        // the camera slides from the Gulf toward the Red Sea while the film plays
        const lat = 26.3 - s * 0.35 + Math.sin(s) * 0.02, lon = 50.2 - s * 0.62 + Math.cos(s * 1.3) * 0.02;
        if (coord) { coord.textContent = `${Math.abs(lat).toFixed(2)}\u00B0${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}\u00B0${lon >= 0 ? "E" : "W"}`; }
        if (vel) { vel.textContent = `${(7.66 + Math.sin(s * 2) * 0.01).toFixed(2)} km/s`; }
    }
    addEventListener("ecodrift:intro", () => { hudStart = performance.now(); if (!hudOn) { hudOn = true; requestAnimationFrame(hud); } });
    addEventListener("ecodrift:introend", () => { hudOn = false; });

    // if the intro already started before this file loaded
    const intro = $("intro");
    if (intro && intro.style.display !== "none" && document.body.classList.contains("intro-on") && !hudOn) {
        hudStart = performance.now(); hudOn = true; requestAnimationFrame(hud);
        intro.classList.add("cine");
    }
})();


/* ===================== V8: ticker, live finding, spotlight, scroll line, guided tour ===================== */
(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const txt = id => { const e = $(id); return e ? e.innerText.replace(/\s+/g, " ").trim() : ""; };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    // text with line breaks that also works while the tab is hidden (innerText loses <br> then)
    const plain = id => { const e = $(id); if (!e) { return ""; } const d = document.createElement("div"); d.innerHTML = e.innerHTML.replace(/<br\s*\/?>/gi, "\n"); return d.textContent; };
    const goTab = n => { const b = document.querySelector('.tabs button[data-tab="' + n + '"]'); if (b) { b.click(); } };

    /* ---- scroll progress line ---- */
    const top = document.querySelector(".topbar");
    if (top) {
        const line = document.createElement("span"); line.className = "scrollbar"; top.appendChild(line);
        addEventListener("scroll", () => {
            const h = document.documentElement.scrollHeight - innerHeight;
            top.style.setProperty("--scroll", h > 0 ? (scrollY / h).toFixed(4) : 0);
        }, { passive: true });
    }

    /* ---- spotlight that follows the pointer on cards ---- */
    const SPOT = ".card, .stat, .feature, .clue, .panel, .case, .vars button, .values article, .quest article, .steps article, .count";
    let raf = 0, last = null;
    addEventListener("pointermove", e => {
        last = e; if (raf) { return; }
        raf = requestAnimationFrame(() => {
            raf = 0;
            const el = last.target.closest && last.target.closest(SPOT); if (!el) { return; }
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", (last.clientX - r.left) + "px");
            el.style.setProperty("--my", (last.clientY - r.top) + "px");
        });
    }, { passive: true });

    /* ---- live ticker under the top bar ---- */
    const main = document.querySelector(".main-col");
    const tickerEl = document.createElement("div");
    tickerEl.className = "ticker";
    tickerEl.innerHTML = '<div class="lbl"><i></i>Mission feed</div><div class="track" id="tickTrack"></div>';
    if (main && top) { top.after(tickerEl); }
    const BASE = [
        "NASA POWER &middot; 42 years &middot; 1984&ndash;2025",
        "23 Saudi cities under investigation",
        "Mann-Kendall test &middot; trend is real only if noise chance &lt; 5%",
        "MODIS plant greenness &middot; NOAA sea temperature &middot; GIBS dust maps",
        "Team Zelo Radiation &middot; NASA Space Apps Challenge 2025",
        "Press <b>ECO BOT</b> to ask anything"
    ];
    function buildTicker() {
        // calm, static strip: the fastest-rising cities first, then the project facts
        const rows = [];
        document.querySelectorAll("#table tr").forEach(r => {
            const c = r.querySelectorAll("td"); if (c.length < 6 || !/YES/i.test(c[5].textContent)) { return; }
            const dir = c[2].textContent.trim().toUpperCase(), val = parseFloat(c[3].textContent);
            rows.push({ city: c[0].textContent.trim(), up: dir == "RISING", txt: c[3].textContent.trim(), mag: Math.abs(val) || 0 });
        });
        rows.sort((a, b) => b.mag - a.mag);
        const items = rows.slice(0, 4).map(r => `<span class="it"><b>${esc(r.city)}</b> <span class="${r.up ? "up" : "dn"}">${r.up ? "\u25B2" : "\u25BC"} ${esc(r.txt)}/10y</span></span>`);
        const parts = (rows.length ? ['<span class="it"><b>Fastest change</b></span>'] : []).concat(items, BASE.slice(0, rows.length ? 2 : 4).map(t => `<span class="it">${t}</span>`));
        $("tickTrack").innerHTML = parts.join('<span class="sep">\u25C6</span>');
    }
    buildTicker();
    const tbl = $("table");
    if (tbl && window.MutationObserver) {
        let t = 0;
        new MutationObserver(() => { clearTimeout(t); t = setTimeout(buildTicker, 400); }).observe(tbl, { childList: true, subtree: true });
    }

    /* ---- live finding card on Home ---- */
    const homeTab = $("tab-home"), stats = homeTab && homeTab.querySelector(".stats");
    if (homeTab && stats) {
        const card = document.createElement("div");
        card.className = "card finding";
        card.innerHTML = `
            <div>
                <p class="tagline">Live finding &middot; NASA POWER</p>
                <h2 id="fdTitle">Detecting the signal&hellip;</h2>
                <div class="big-n" id="fdBig">&hellip;</div>
                <p class="sub" id="fdSub">We are asking NASA for 42 years of data. This card updates live as the test finishes.</p>
                <div class="cta"><button data-go="compare">See the full comparison</button><button class="ghost" data-go="trends">Scan the Kingdom</button></div>
            </div>
            <div>
                <div class="gauge-wrap"><div class="gauge" id="fdGauge"></div><div class="mid"><b id="fdN">--</b><span id="fdLbl">cities scanned</span></div></div>
                <div class="gauge-legend"><span><i style="background:#ff5a4d"></i>rising</span><span><i style="background:#22d3ee"></i>falling</span><span><i style="background:rgba(255,255,255,.25)"></i>no real trend</span></div>
            </div>`;
        stats.after(card);
        card.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => goTab(b.dataset.go)));

        function updateFinding() {
            const a = plain("resultA");
            const m = /HOW MUCH:\s*([+\-\u2212]?[\d.]+)\s*(\S+)\s+every 10 years\s*\(([+\-\u2212]?[\d.]+)/i.exec(a);
            const what = /WHAT:\s*(.+)/i.exec(a), city = /^\s*([^\[\n]+?)\s*\[/.exec(a);
            if (m && what && city) {
                const real = /real trend/i.test(a) && /YES/.test(a);
                const rising = /rising|increas|up/i.test(what[1]) && !/falling/i.test(what[1]);
                $("fdTitle").textContent = real ? `${city[1].trim()}: ${what[1].trim().replace(/\bRISING\b/, "rising").replace(/\bFALLING\b/, "falling")}` : `${city[1].trim()}: no clear trend yet`;
                $("fdBig").innerHTML = `${esc(m[1].replace("\u2212", "-"))}<small>${esc(m[2])} per decade</small>`;
                const noise = /chance of random noise = ([^(]+)\(/i.exec(a);
                $("fdSub").textContent = `${m[3]} ${m[2]} in total over the record. Mann-Kendall says the chance this is random noise is ${noise ? noise[1].trim() : "tiny"} (a trend is real only under 5%).` + (real ? "" : " So we do not call it real.");
                $("fdBig").style.filter = rising ? "" : "hue-rotate(160deg)";
            }
            const up = parseInt(txt("nUp"), 10), dn = parseInt(txt("nDown"), 10), fl = parseInt(txt("nFlat"), 10);
            if (!isNaN(up) && !isNaN(dn) && !isNaN(fl) && up + dn + fl > 0) {
                const tot = up + dn + fl, g = $("fdGauge");
                g.style.setProperty("--up", (up / tot * 100).toFixed(1)); g.style.setProperty("--dn", (dn / tot * 100).toFixed(1));
                $("fdN").textContent = up + "/" + tot; $("fdLbl").textContent = "cities rising";
            }
        }
        if (window.MutationObserver) {
            const mo = new MutationObserver(updateFinding);
            ["resultA", "nUp", "nDown", "nFlat"].forEach(id => { const e = $(id); if (e) { mo.observe(e, { childList: true, subtree: true, characterData: true }); } });
        }
        updateFinding();
    }

    /* ---- hero button + guided tour ---- */
    const cta = homeTab && homeTab.querySelector(".hero .cta");
    if (cta) {
        const b = document.createElement("button");
        b.className = "ghost tour-btn";
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Take the 60-second tour';
        cta.appendChild(b); b.addEventListener("click", () => startTour());
    }
    const tourEl = document.createElement("div");
    tourEl.className = "tour"; tourEl.setAttribute("role", "dialog"); tourEl.setAttribute("aria-label", "Guided tour");
    tourEl.innerHTML = '<p class="step" id="tStep"></p><h4 id="tTitle"></h4><p class="say" id="tSay"></p><div class="bar"><i id="tBar"></i></div><div class="row"><div class="dots" id="tDots"></div><button class="ghost" id="tBack">Back</button><button id="tNext">Next</button><button class="ghost" id="tExit">Exit</button></div>';
    const spot = document.createElement("div"); spot.className = "tour-spot";
    document.body.append(tourEl, spot);

    const STEPS = [
        { tab: "home", sel: "#tab-home .hero", t: "Welcome, detective", s: "ECO DRIFT turns 42 years of NASA and NOAA satellite data into one honest answer: is your city's climate really changing, or is it just noise?" },
        { tab: "compare", sel: "#tab-compare .cases", act: () => window.detect && window.detect(), t: "Compare two cities", s: "Pick any two Saudi cities. We fit a trend line and run the Mann-Kendall test, so you see the change per decade and whether it is statistically real." },
        { tab: "trends", sel: ".side .lens", act: () => window.scanAll && window.scanAll(), t: "Scan the whole Kingdom", s: "The same test runs on all 23 cities. Watch the 3D globe light up red where change is real and rising, blue where it is falling." },
        { tab: "causes", sel: "#clues", t: "Causes and solutions", s: "For every variable: what it measures, why it can change, and what helps. We say honestly that the test shows whether, not why." },
        { tab: "space", sel: "#tab-space .tiles", t: "Seen from space", s: "Plant greenness from MODIS, sea temperature and water quality from NOAA, and dust maps from NASA GIBS for the selected city." },
        { tab: "myarea", sel: "#tab-myarea .card", t: "Works anywhere on Earth", s: "Use your location or any coordinates. We pull your own 1984 to 2025 temperature record and tell you if your area is really getting hotter." },
        { tab: "how", sel: "#tab-how .steps", t: "Honest science", s: "What, how much, real or noise, and where. Four questions, one transparent method that anyone can check." },
        { tab: "home", bot: "Why should I trust a trend?", t: "Meet ECO BOT", s: "Ask our AI assistant anything. It can even run the app for you: try \"compare Riyadh and Abha\"." }
    ];
    let ti = -1, tTimer = 0, tStart = 0, running = false;
    const dots = $("tDots"); dots.innerHTML = STEPS.map(() => "<i></i>").join("");

    function placeSpot(sel) {
        const el = sel && document.querySelector(sel);
        if (!el) { spot.classList.remove("on"); return; }
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.top > innerHeight - 140) { spot.classList.remove("on"); return; }
        const pad = 8;
        Object.assign(spot.style, { left: r.left - pad + "px", top: Math.max(4, r.top - pad) + "px", width: r.width + pad * 2 + "px", height: Math.min(r.height, innerHeight - 170) + pad * 2 + "px" });
        spot.classList.add("on");
    }
    function go(i) {
        if (i < 0) { i = 0; }
        if (i >= STEPS.length) { return endTour(); }
        ti = i; const s = STEPS[i];
        clearTimeout(tTimer);
        goTab(s.tab);
        $("tStep").textContent = `Step ${i + 1} of ${STEPS.length}`; $("tTitle").textContent = s.t; $("tSay").textContent = s.s;
        dots.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k == i));
        $("tNext").textContent = i == STEPS.length - 1 ? "Finish" : "Next";
        $("tBar").style.transition = "none"; $("tBar").style.width = "0";
        if (s.act) { try { s.act(); } catch (e) { } }
        if (s.bot) { setTimeout(() => window.EcoBot && window.EcoBot.open(s.bot), 600); }
        setTimeout(() => placeSpot(s.sel), 700);
        const ms = 9500;
        requestAnimationFrame(() => requestAnimationFrame(() => { $("tBar").style.transition = `width ${ms}ms linear`; $("tBar").style.width = "100%"; }));
        tTimer = setTimeout(() => go(ti + 1), ms);
    }
    function startTour() {
        if (running) { return; }
        running = true; document.body.classList.remove("eb-open");
        tourEl.classList.add("on"); go(0);
    }
    function endTour() {
        running = false; clearTimeout(tTimer); tourEl.classList.remove("on"); spot.classList.remove("on");
        document.body.classList.remove("eb-open"); goTab("home");
    }
    $("tNext").onclick = () => go(ti + 1);
    $("tBack").onclick = () => go(ti - 1);
    $("tExit").onclick = endTour;
    addEventListener("keydown", e => { if (running && e.key == "Escape") { endTour(); } if (running && e.key == "ArrowRight") { go(ti + 1); } if (running && e.key == "ArrowLeft") { go(ti - 1); } });
    addEventListener("scroll", () => { if (running) { spot.classList.remove("on"); } }, { passive: true });
    addEventListener("resize", () => { if (running && STEPS[ti]) { placeSpot(STEPS[ti].sel); } });
    window.EcoTour = { start: startTour };
})();


/* ===================== V9: ripples, warp transition, toasts, button icons, shortcuts ===================== */
(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- ripple on every button ---- */
    document.addEventListener("pointerdown", e => {
        const b = e.target.closest && e.target.closest("button");
        if (!b || b.disabled || b.classList.contains("eb-fab") || reduce) { return; }
        const r = b.getBoundingClientRect(), s = document.createElement("span");
        s.className = "rip";
        s.style.left = (e.clientX - r.left) + "px"; s.style.top = (e.clientY - r.top) + "px";
        s.style.setProperty("--rs", Math.max(r.width, r.height) / 4.5);
        b.appendChild(s); setTimeout(() => s.remove(), 750);
    }, true);

    /* ---- icons inside the main buttons ---- */
    function icon(btn, id) {
        if (!btn || btn.querySelector("svg.bi")) { return; }
        const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "bi"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
        const u = document.createElementNS(NS, "use"); u.setAttribute("href", "#" + id); svg.appendChild(u);
        btn.prepend(svg);
    }
    icon($("btnDetect"), "i-search"); icon($("btnScan"), "i-globe"); icon($("btnData"), "i-sat");
    document.querySelectorAll('#tab-home .cta button[data-go="compare"]').forEach(b => icon(b, "i-search"));
    document.querySelectorAll('#tab-home .hero .cta button[data-go="trends"]').forEach(b => icon(b, "i-globe"));

    /* ---- warp transition when a section opens ---- */
    const warp = document.createElement("div");
    warp.className = "warp"; warp.setAttribute("aria-hidden", "true");
    warp.innerHTML = '<div class="lines"></div><div class="lab"><small>Entering sector</small><b id="warpLab"></b></div>';
    document.body.appendChild(warp);
    let wt = 0;
    function doWarp(label) {
        if (reduce || document.body.classList.contains("intro-on")) { return; }
        $("warpLab").textContent = label;
        warp.classList.remove("go"); void warp.offsetWidth; warp.classList.add("go");
        clearTimeout(wt); wt = setTimeout(() => warp.classList.remove("go"), 900);
    }
    const active = () => { const t = document.querySelector(".tab.on"); return t ? t.id.replace("tab-", "") : ""; };
    document.addEventListener("click", e => {
        const el = e.target.closest && e.target.closest(".tabs button[data-tab], [data-go], #brand");
        if (!el) { return; }
        const name = el.dataset.tab || el.dataset.go || "home";
        if (name == active()) { return; }
        const nav = document.querySelector('.tabs button[data-tab="' + name + '"]');
        doWarp(nav ? nav.textContent.trim() : name);
    }, true);

    /* ---- toasts ---- */
    const wrap = document.createElement("div"); wrap.className = "toasts"; wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
    function toast(title, msg, icon) {
        if (document.body.classList.contains("intro-on")) { return; }
        const t = document.createElement("div"); t.className = "toast";
        t.innerHTML = `<div class="ic">${icon || "\u2713"}</div><div><b></b><span></span></div>`;
        t.querySelector("b").textContent = title; t.querySelector("span").textContent = msg;
        wrap.appendChild(t);
        while (wrap.children.length > 3) { wrap.firstChild.remove(); }
        setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 450); }, 5200);
    }
    window.EcoToast = toast;

    const prog = $("progress");
    if (prog && window.MutationObserver) {
        let was = !prog.hidden;
        new MutationObserver(() => {
            const now = !prog.hidden;
            if (was && !now) {
                const up = $("nUp").textContent.trim(), dn = $("nDown").textContent.trim(), fl = $("nFlat").textContent.trim();
                toast("Kingdom scan complete", `${up} cities rising, ${dn} falling, ${fl} with no real trend.`, "\uD83D\uDEF0");
            }
            was = now;
        }).observe(prog, { attributes: true, attributeFilter: ["hidden"] });
    }
    const where = $("where");
    if (where && window.MutationObserver) {
        let lastText = "";
        new MutationObserver(() => {
            const t = where.textContent.trim();
            if (/^WHERE:/i.test(t) && t != lastText) {
                lastText = t;
                toast("Comparison ready", t.replace(/^WHERE:\s*/i, "").split(". ")[0] + ".", "\uD83D\uDCCA");
            }
            if (!/^WHERE:/i.test(t)) { lastText = ""; }
        }).observe(where, { childList: true, subtree: true, characterData: true });
    }
    const ndvi = $("ndvi");
    ["myAnswer"].forEach(id => {
        const e = $(id); if (!e || !window.MutationObserver) { return; }
        new MutationObserver(() => {
            const t = e.textContent.trim();
            if (t && !/^Press/i.test(t) && !/Checking|Asking|\.\.\.$/i.test(t)) { toast("Your area", t.slice(0, 120), "\uD83D\uDCCD"); }
        }).observe(e, { childList: true, subtree: true, characterData: true });
    });

    /* ---- keyboard shortcuts: 1-8 open the sections, B opens Eco Bot, T starts the tour ---- */
    const ORDER = ["home", "compare", "trends", "causes", "space", "myarea", "how", "about"];
    addEventListener("keydown", e => {
        if (e.ctrlKey || e.metaKey || e.altKey) { return; }
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag == "input" || tag == "textarea" || tag == "select" || e.target.isContentEditable) { return; }
        if (document.body.classList.contains("intro-on")) { return; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 8) { const b = document.querySelector('.tabs button[data-tab="' + ORDER[n - 1] + '"]'); if (b) { b.click(); } }
        else if (e.key == "b" || e.key == "B") { window.EcoBot && window.EcoBot.open(); e.preventDefault(); }
        else if (e.key == "t" || e.key == "T") { window.EcoTour && window.EcoTour.start(); }
    });
    const st = $("status");
    if (st) { st.insertAdjacentHTML("beforeend", '<br><kbd>1</kbd>-<kbd>8</kbd> sections &middot; <kbd>B</kbd> bot &middot; <kbd>T</kbd> tour'); }
})();


/* ===================== V11: lazy photos, pause when hidden ===================== */
(function () {
    "use strict";
    const NAMES = ["home", "compare", "trends", "causes", "space", "myarea", "how", "about"];
    const done = {};
    function load(n) {
        if (done[n]) { return; } done[n] = 1;
        const url = "img/photo/" + n + ".webp", im = new Image();
        im.onload = () => { const el = document.querySelector(".bg-" + n); if (el) { el.style.backgroundImage = 'url("' + url + '")'; } };
        im.src = url;
    }
    const active = () => { const t = document.querySelector(".tab.on"); return t ? t.id.replace("tab-", "") : "home"; };
    load("home");
    // a photo is fetched the first time its page opens ...
    document.addEventListener("click", () => setTimeout(() => load(active()), 0), true);
    // ... and the rest quietly one by one while you read the first page
    let i = 1;
    const next = () => { if (i < NAMES.length) { load(NAMES[i++]); setTimeout(next, 1800); } };
    setTimeout(() => (window.requestIdleCallback || setTimeout)(next), 3500);
    document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("paused", document.hidden));
})();
