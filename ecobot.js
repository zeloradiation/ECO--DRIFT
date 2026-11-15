/* ECO BOT - the AI assistant inside ECO DRIFT.
 *
 * How it answers (best available first):
 *   1. Google Gemini (full AI, answers ANY question)  - needs a free API key pasted in the settings panel
 *   2. Page actions   - "compare Riyadh and Jeddah", "open trends", "is Abha getting hotter?" run the real app
 *   3. Built-in brain - ECO DRIFT, climate and NASA knowledge + live numbers from the page, no internet needed
 *   4. Wikipedia      - encyclopedic answers for general questions, no key needed
 * The key is stored only in this browser (localStorage) and is sent only to Google.
 */
(function () {
    "use strict";
    const KEY_STORE = "ecodrift.gemini.key";
    const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    const $ = (s, r) => (r || document).querySelector(s);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const ICON = {
        bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 7V3.5"/><circle cx="12" cy="3" r="1" fill="currentColor"/><circle cx="9" cy="13" r="1.4" fill="currentColor"/><circle cx="15" cy="13" r="1.4" fill="currentColor"/><path d="M9.5 16.2c1.6 1 3.4 1 5 0"/><path d="M2 12v2M22 12v2"/></svg>',
        send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
        mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
        speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
        retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
        expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
    };

    /* ================= knowledge: the app + climate + NASA ================= */
    const APP_FACTS =
        "ECO DRIFT is a web app by Team Zelo Radiation (high-school students from Saudi Arabia) for the NASA International Space Apps Challenge 2025 challenge " +
        "'Be an Earth System Trend Detective!'. It asks: is a city's climate really changing, or is it normal ups and downs? " +
        "It tests 42 years (1984-2025) of NASA POWER (MERRA-2 model + CERES satellite) and NOAA NCEI CDO ground-station data for 23 Saudi cities. " +
        "7 variables: air temperature, ground surface temperature, rain, humidity, wind speed, sunshine energy, soil wetness. " +
        "Extra satellite data: MODIS MOD13Q1 plant greenness (NDVI) from ORNL DAAC, NOAA CoastWatch ERDDAP sea surface temperature and chlorophyll, NASA GIBS dust/air maps, Blue Marble globe. " +
        "Method: yearly values for the chosen months -> slope of the best-fit line (how much) -> Mann-Kendall test (real or noise: real only if the chance of random noise is under 5%) -> same test on all cities (where). " +
        "Tabs: Home, City comparison (two cities side by side), Trends (scan all 23 cities for one variable), Causes & solutions, From space (NDVI, sea, dust), Is my area getting hotter? (anywhere in the world), How it works, About us. " +
        "Honest limits: the test shows WHETHER something changes, not WHY; POWER values are for a ~50 km grid square, not one thermometer.";

    const KB = [
        { k: ["hello", "hi", "hey", "salam", "assalamu", "good morning", "good evening", "greetings"], w: 3, only: true,
          a: "Hello! I'm **ECO BOT**, the assistant of ECO DRIFT. Ask me about climate, NASA data, Saudi Arabia, the science behind this app, or just anything curious. I can also **run the app for you**, for example: *\"compare Riyadh and Jeddah\"*." },
        { k: ["thanks", "thank you", "shukran", "thx"], w: 3, only: true, a: "You're welcome! Keep investigating, the planet needs more detectives. \uD83C\uDF0D" },
        { k: ["how are you", "how r u", "how do you do", "whats up", "what's up", "how is it going"], w: 3, only: true,
          a: "Running at **7.66 km/s** in a good mood (figuratively). \uD83D\uDE04 How can I help with your investigation today?" },
        { k: ["bye", "goodbye", "see you", "good night"], w: 3, only: true, a: "Goodbye, detective! Come back anytime. \uD83C\uDF0D" },
        { k: ["who are you", "what are you", "your name", "are you ai", "are you a bot", "are you real", "who made you", "who built you"], w: 3,
          a: "I'm **ECO BOT**, the AI assistant built into ECO DRIFT by Team Zelo Radiation. With a Gemini key (\u2699) I can answer anything. Without one I use my built-in Earth-science brain, live numbers from this page, and Wikipedia." },
        { k: ["what is eco drift", "about eco drift", "what does this app do", "what is this website", "what is this app", "purpose", "eco drift"], w: 2,
          a: "**ECO DRIFT** is a Saudi Arabia *Earth Trend Detective*. It takes 42 years of NASA and NOAA data and answers one question in plain words: **is the climate in your city really changing, or is it just normal ups and downs?**\n\n- Compares two cities side by side\n- Scans all 23 cities and colours them on a 3D globe\n- Shows plants, sea and dust from space\n- Checks *any* place on Earth: \"Is my area getting hotter?\"" },
        { k: ["how does it work", "how it works", "how do you decide", "method", "methodology", "algorithm", "how are trends", "how is the trend"], w: 2,
          a: "For every place we answer 4 questions:\n\n1. **What?** Monthly NASA POWER / NOAA numbers become one value per year for the months you chose.\n2. **How much?** The slope of the best-fit line through the yearly values.\n3. **Real or noise?** The **Mann-Kendall test**. A trend is *real* only if the chance it is random noise is **under 5%**.\n4. **Where?** The same test runs on all 23 cities." },
        { k: ["mann kendall", "mann-kendall", "mannkendall", "p value", "p-value", "significant", "significance", "statistical test", "noise"], w: 3,
          a: "**Mann-Kendall** is a statistics test for trends. It compares every year with every later year and counts how often the value goes up vs down (the score *S*). If ups clearly outnumber downs (or the reverse), the **Z score** is big and the **p-value** (chance of random noise) is small.\n\nIn ECO DRIFT a trend is called **real** only when p < 5%. It needs no bell-curve assumption, so it works well on messy climate data." },
        { k: ["slope", "how much", "best fit", "best-fit", "per decade", "every 10 years", "line of best fit"], w: 2,
          a: "The **slope** is how steep the best-fit line through the yearly values is. ECO DRIFT shows it as *change every 10 years* (for example +0.45 \u00B0C per decade) and the total change over the whole period. Slope says *how fast*; Mann-Kendall says *whether it is real*." },
        { k: ["data source", "data sources", "where does the data", "where is the data", "dataset", "datasets", "api"], w: 2,
          a: "**Data used by ECO DRIFT**\n\n- **NASA POWER** (MERRA-2 model + CERES satellite): temperature, rain, humidity, wind, sunshine, soil wetness\n- **NOAA NCEI CDO**: ground weather stations\n- **MODIS MOD13Q1** (ORNL DAAC): plant greenness (NDVI)\n- **NOAA CoastWatch ERDDAP**: sea surface temperature and chlorophyll\n- **NASA GIBS**: dust/air maps and the Blue Marble globe\n- **Natural Earth**: country outlines" },
        { k: ["power", "nasa power", "merra", "ceres", "reanalysis"], w: 2,
          a: "**NASA POWER** (Prediction Of Worldwide Energy Resources) serves daily/monthly Earth data on a grid (about 50 km squares) from 1981 on. It blends the **MERRA-2** reanalysis model with **CERES** satellite measurements. It is free and has no login, which makes it perfect for a trend detective." },
        { k: ["ndvi", "vegetation", "greenness", "modis", "plants", "plant greenness"], w: 2,
          a: "**NDVI** (Normalized Difference Vegetation Index) measures plant greenness from satellite light: healthy leaves reflect lots of near-infrared and absorb red. Values: about 0 = bare sand, 0.2-0.5 = sparse plants, 0.6-0.9 = dense green. ECO DRIFT reads it from NASA's **MODIS** (Terra/Aqua) every 16 days." },
        { k: ["sea surface", "sst", "sea temperature", "ocean temperature", "red sea", "arabian gulf", "persian gulf", "coral"], w: 2,
          a: "**Sea surface temperature (SST)** shows how warm the water skin is. The Red Sea and Arabian Gulf are among the warmest seas on Earth, so corals there live close to their heat limit. Warmer seas mean stronger evaporation, more humid heat on the coast and coral-bleaching risk. ECO DRIFT reads SST from NOAA CoastWatch." },
        { k: ["chlorophyll", "water quality", "algae", "murky", "chl"], w: 2,
          a: "**Chlorophyll-a** is the green pigment of tiny sea plants (phytoplankton). Satellites see it from colour, so it is a proxy for **water quality**: high values can mean algae blooms or nutrient runoff; very low values mean clear, nutrient-poor water." },
        { k: ["dust", "dust storm", "aerosol", "sandstorm", "haze", "air quality"], w: 2,
          a: "**Dust** matters a lot in Saudi Arabia. Satellites measure it as *aerosol optical depth*. More dust storms can come from drier soil, less plant cover and changing winds. Dust hurts air quality, solar-panel output and health. The *From space* tab shows a NASA GIBS air map." },
        { k: ["urban heat", "heat island", "city hotter", "concrete", "asphalt"], w: 2,
          a: "An **urban heat island** is a city that is warmer than the land around it, because concrete and asphalt soak up heat, there are fewer plants and shade, and air conditioners dump heat outside. At night the difference is often 3-5 \u00B0C. Cool roofs, trees, green corridors and light-coloured surfaces help." },
        { k: ["climate change", "global warming", "greenhouse", "co2", "carbon dioxide", "emissions", "climate crisis"], w: 2,
          a: "**Climate change** is the long-term shift in average weather, now mainly driven by humans burning coal, oil and gas. That releases **CO\u2082 and methane**, which trap heat (the *greenhouse effect*). Earth is about **1.2 \u00B0C warmer** than the late 1800s.\n\n*Weather* = today's conditions. *Climate* = the 30+ year pattern. That is why ECO DRIFT uses 42 years and a statistics test." },
        { k: ["weather vs climate", "difference between weather and climate", "weather and climate"], w: 3,
          a: "**Weather** is what happens today or this week. **Climate** is the average over 30+ years. One hot summer is weather; a steady rise over decades, proven by a test like Mann-Kendall, is a climate trend." },
        { k: ["solution", "solutions", "how can we help", "what can i do", "reduce", "mitigation", "adaptation", "cool down", "cooling"], w: 2,
          a: "**What helps**\n\n- **Cut emissions:** solar and wind, efficient buildings and air conditioning, electric transport\n- **Cool cities:** trees, shade, cool roofs, light surfaces, green corridors\n- **Save water:** drip irrigation, treated wastewater, smart desalination\n- **Restore land:** planting native trees, protecting soil to cut dust\n- **Protect seas:** mangroves and coral protection\n\nSee the *Causes & solutions* tab for each variable." },
        { k: ["saudi green initiative", "vision 2030", "10 billion trees", "billion trees", "neom", "net zero 2060"], w: 2,
          a: "The **Saudi Green Initiative** (2021) aims to plant **10 billion trees**, restore degraded land, protect 30% of land and sea, and reach **net-zero emissions by 2060** as part of Vision 2030. A trend detective like ECO DRIFT could help track whether plant cover (NDVI) really rises." },
        { k: ["saudi", "saudi arabia", "kingdom", "riyadh", "jeddah", "dammam", "climate of saudi", "desert", "hot"], w: 1,
          a: "Saudi Arabia is mostly **hot desert**: very hot summers (often above 45 \u00B0C inland), mild winters, very little rain (often under 100 mm/year), and strong dust storms. The southwest (Abha, Asir mountains) is cooler and wetter, and the Red Sea coast is hot and humid. These contrasts are why ECO DRIFT tests 23 different cities." },
        { k: ["rain", "rainfall", "precipitation", "flood", "drought"], w: 1,
          a: "Rain in Saudi Arabia is rare and uneven: a few heavy storms, long dry gaps. Because of this, rain trends are noisy and a real trend is hard to prove. That is exactly the kind of case where the Mann-Kendall test protects you from fooling yourself." },
        { k: ["humidity", "wind", "soil wetness", "sunshine", "solar radiation", "surface temperature", "ground temperature"], w: 1,
          a: "ECO DRIFT measures **7 Earth variables**: air temperature, ground surface temperature, rain, humidity, wind speed, sunshine energy (solar radiation reaching the ground) and soil wetness. Open the *Trends* tab to scan all 23 cities for any one of them." },
        { k: ["space apps", "spaceapps", "nasa space apps", "hackathon", "challenge", "trend detective"], w: 2,
          a: "The **NASA International Space Apps Challenge** is the world's largest annual hackathon. Teams use free NASA and partner data to solve real problems. Our challenge, **\"Be an Earth System Trend Detective!\"**, asks teams to find trends in Earth data and tell whether they are real. ECO DRIFT is Team Zelo Radiation's answer." },
        { k: ["team", "zelo radiation", "who made", "creators", "authors", "students", "about us"], w: 2,
          a: "ECO DRIFT was made by **Team Zelo Radiation**, a team of high-school students from Saudi Arabia. Their mission: make Earth data easy to understand, honest, and about *your own city*." },
        { k: ["nasa", "what is nasa", "noaa", "what is noaa"], w: 1,
          a: "**NASA** is the US space agency; its Earth-science missions (Terra, Aqua, Landsat, GRACE, Sentinel-6 and more) watch our planet 24/7. **NOAA** is the US ocean and weather agency; it runs weather satellites, stations and the NCEI climate archive. ECO DRIFT uses free data from both." },
        { k: ["satellite", "satellites", "terra", "aqua", "landsat", "sentinel", "iss", "space station", "orbit"], w: 1,
          a: "Earth-watching satellites: **Terra & Aqua** (MODIS, plants/sea/clouds), **Landsat** (50+ years of land images), **Sentinel-6** (sea level), **CERES** (energy balance) and the **ISS**, whose astronaut photos are our background pictures. They orbit about 400-800 km up, circling Earth every ~90 minutes." },
        { k: ["correlation", "causation", "why is it changing", "cause of the trend", "can you tell why"], w: 2,
          a: "Good question, and an honest one: our test shows **whether** something is changing, **not why**. Causes (greenhouse gases, urban growth, land use, natural cycles) come from other research. The *Causes & solutions* tab lists what scientists usually link to each change." },
        { k: ["accurate", "accuracy", "reliable", "trust", "limitations", "limit", "error", "uncertainty", "50 km"], w: 2,
          a: "**Honest limits:** POWER values describe a grid square of ~50 km, not one thermometer; reanalysis blends models with satellites; short or gappy series are less certain. That is why we show the p-value and call a trend *real* only when noise chance is under 5%, and say so when we can't prove one." },
        { k: ["how to use", "how do i use", "tutorial", "guide", "help", "get started", "where do i start"], w: 2,
          a: "**Quick start**\n\n1. **Home**: spin the globe and pick a city\n2. **City comparison**: choose City A & B and press *Detect Trend*\n3. **Trends**: *Scan All Cities* for one variable\n4. **From space**: plants, sea and dust\n5. **Is my area hotter?**: any place on Earth\n\nOr just tell me: *\"compare Riyadh and Abha\"*, *\"open trends\"*, *\"is Jeddah getting hotter?\"*." },
        { k: ["photosynthesis", "ozone", "sea level", "ice", "glacier", "el nino", "monsoon"], w: 1, a: null },
        { k: ["joke", "funny", "make me laugh"], w: 3,
          a: "Why did the scientist go to the desert? To study a **dry spell**. \uD83C\uDF35 (Okay, my humour has a very low p-value.)" },
        { k: ["space fact", "fun fact", "surprise me", "tell me something", "did you know", "interesting fact"], w: 3, fact: true }
    ];

    const FACTS = [
        "The ISS circles Earth about **16 times a day**, so astronauts see 16 sunrises every 24 hours.",
        "From orbit you can see **Riyadh's city lights** at night, shaped like a glowing web of roads.",
        "**Mount Everest** gets taller by about 4 mm a year, but the Red Sea gets **wider** by roughly 1-2 cm a year as Arabia and Africa drift apart.",
        "A single satellite like **Terra** has been scanning the planet since **1999**: that's over 25 years of Earth data.",
        "The **Rub' al Khali** (Empty Quarter) in Saudi Arabia is the largest continuous sand desert on Earth, about 650,000 km\u00B2.",
        "Plants glow slightly in red light that our eyes can't see: satellites use that glow to measure **photosynthesis from space**.",
        "The **Red Sea** coral reefs survive in water that would bleach most corals elsewhere. Scientists study them as possible climate refuges."
    ];

    /* ================= page context (what the user is looking at) ================= */
    function txt(id) { const e = document.getElementById(id); if (!e) { return ""; } const d = document.createElement("div"); d.innerHTML = e.innerHTML.replace(/<br\s*\/?>/gi, " | "); return d.textContent.replace(/\s+/g, " ").trim(); }
    function selText(id) { const s = document.getElementById(id); return s && s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : ""; }
    function activeTab() { const t = $(".tab.on"); return t ? t.id.replace("tab-", "") : "home"; }
    function pageState() {
        const o = [];
        o.push(`Open tab: ${activeTab()}.`);
        o.push(`Settings: City A = ${selText("cityA")}; City B = ${selText("cityB")}; variable = ${selText("variable")}; months = ${selText("months")}; years = ${selText("period")}; source = ${selText("source")}.`);
        const a = txt("resultA"), b = txt("resultB"), w = txt("where");
        if (a && !/will show here/i.test(a)) { o.push("City A result: " + a); }
        if (b && !/will show here/i.test(b)) { o.push("City B result: " + b); }
        if (w && !/will show here/i.test(w)) { o.push("Comparison: " + w); }
        const up = txt("nUp"), dn = txt("nDown"), fl = txt("nFlat");
        if (/\d/.test(up + dn + fl)) { o.push(`Kingdom scan: ${up} cities rising (real), ${dn} falling (real), ${fl} no real trend.`); }
        const rows = Array.from(document.querySelectorAll("#table tr")).slice(0, 26).map(r => r.innerText.replace(/\s+/g, " ").trim()).filter(Boolean);
        if (rows.length > 2) { o.push("Scan table (city, ..., trend, ...): " + rows.join(" | ")); }
        const my = txt("myAnswer");
        if (my && !/^Press/i.test(my)) { o.push("My-area answer: " + my); }
        return o.join("\n").slice(0, 3800);
    }

    function cityList() { const s = document.getElementById("cityA"); return s ? Array.from(s.options).map(o => o.textContent.trim()).join(", ") : ""; }
    function systemPrompt() {
        return "You are ECO BOT, the friendly AI assistant embedded in the ECO DRIFT website.\n" +
            "You answer ANY question the user asks - science, climate, space, school, coding, health, history, everyday life - not only questions about this site. " +
            "Be accurate and helpful. Keep answers concise (usually under 170 words), use short paragraphs or bullets, and simple markdown (**bold**, lists, `code`). " +
            "If the user writes in Arabic or another language, answer in that language. If you are not sure, say so instead of guessing, and never invent numbers or data. " +
            "When it is relevant, connect your answer to ECO DRIFT and the live page data below, but do not force it.\n\n" +
            "OPTIONAL APP CONTROL: if (and only if) the user asks you to DO something in the app, end your answer with one extra last line like\n" +
            "ACTION: {\"type\":\"compare\",\"a\":\"Riyadh\",\"b\":\"Jeddah\"}   or   ACTION: {\"type\":\"goto\",\"tab\":\"trends\"}   or   ACTION: {\"type\":\"scan\"}   or   ACTION: {\"type\":\"detect_city\",\"city\":\"Abha\"}\n" +
            "(tabs: home, compare, trends, causes, space, myarea, how, about). City names must come from: " + cityList() + ".\n" +
            "ALWAYS finish with a last line  FOLLOWUPS: question one | question two | question three  (3 short, useful follow-up questions the user might ask next). Never mention these two protocol lines in the text.\n\n" +
            "ABOUT ECO DRIFT:\n" + APP_FACTS + "\n\nLIVE PAGE STATE:\n" + pageState();
    }

    /* ================= markdown renderer (bold, italic, code, code blocks, lists, tables, links) ================= */
    function inline(s) {
        return esc(s).replace(/`([^`\n]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
            .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<i>$2</i>")
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    function blocks(text) {
        const out = []; let list = null, table = null;
        const close = () => { if (list) { out.push(`</${list}>`); list = null; } if (table) { out.push("</tbody></table></div>"); table = null; } };
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]; let m;
            if (/^\s*\|.*\|\s*$/.test(line)) {                               // table row
                const cells = line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
                if (/^[\s|:\-]+$/.test(line)) { continue; }                  // the |---|---| line
                if (!table) { close(); table = true; out.push('<div class="eb-tw"><table><thead><tr>' + cells.map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>"); }
                else { out.push("<tr>" + cells.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>"); }
            } else if ((m = /^\s*[-*\u2022]\s+(.*)$/.exec(line))) { if (table) { close(); } if (list != "ul") { close(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); }
            else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { if (table) { close(); } if (list != "ol") { close(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); }
            else if ((m = /^#{1,4}\s+(.*)$/.exec(line))) { close(); out.push("<h4>" + inline(m[1]) + "</h4>"); }
            else if (!line.trim()) { close(); }
            else { close(); out.push("<p>" + inline(line) + "</p>"); }
        }
        close();
        return out.join("");
    }
    function md(src) {
        return String(src).replace(/\r/g, "").split("```").map((seg, i) => {
            if (i % 2 == 0) { return blocks(seg); }
            const nl = seg.indexOf("\n"), code = nl >= 0 ? seg.slice(nl + 1) : seg;
            return '<pre><code>' + esc(code.replace(/\n$/, "")) + "</code></pre>";
        }).join("");
    }
    // the model may end its answer with ACTION: {...} and FOLLOWUPS: a | b | c  - split those off
    function parts(text) {
        let body = text, action = null, follow = [];
        let m = /\n?FOLLOWUPS:\s*(.+)\s*$/i.exec(body);
        if (m) { follow = m[1].split("|").map(s => s.trim()).filter(Boolean).slice(0, 3); body = body.slice(0, m.index); }
        m = /\n?ACTION:\s*(\{[^\n]*\})\s*$/i.exec(body);
        if (m) { try { action = JSON.parse(m[1]); } catch (e) { } body = body.slice(0, m.index); }
        // while streaming, hide a half-written marker line
        const nl = body.lastIndexOf("\n"), tail = body.slice(nl + 1);
        if (tail && (/^(ACTION|FOLLOWUPS)/i.test(tail) || ("ACTION:".startsWith(tail.toUpperCase()) && tail.length > 1) || ("FOLLOWUPS:".startsWith(tail.toUpperCase()) && tail.length > 1))) { body = body.slice(0, Math.max(0, nl)); }
        return { body: body.trim(), action, follow };
    }

    /* ================= UI ================= */
    const root = document.createElement("div");
    root.id = "ecobot";
    root.innerHTML = `
      <button class="eb-fab" id="ebFab" aria-label="Open Eco Bot, the AI assistant" title="Ask Eco Bot">${ICON.bot}<span class="tip">Ask ECO BOT</span></button>
      <section class="eb-panel" id="ebPanel" role="dialog" aria-label="Eco Bot chat">
        <header class="eb-head">
          <div class="eb-orb-wrap"><div class="eb-orb"></div>${ICON.bot}</div>
          <div class="eb-title"><b>ECO BOT</b><span><i></i><em id="ebStatus" style="font-style:normal">Earth &amp; climate AI</em></span></div>
          <button id="ebBig" title="Bigger window">${ICON.expand}</button>
          <button id="ebSpeak" title="Read answers aloud" aria-pressed="false">${ICON.speaker}</button>
          <button id="ebClear" title="New chat">${ICON.trash}</button>
          <button id="ebGear" title="AI settings">${ICON.gear}</button>
          <button id="ebClose" title="Close" aria-label="Close">${ICON.close}</button>
        </header>
        <div class="eb-set" id="ebSet">
          <b style="color:#fff">Unlock full AI (answers anything)</b><br>
          Paste a free <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google Gemini API key</a>. It stays in this browser and is sent only to Google.
          <input type="password" id="ebKey" placeholder="AIza..." autocomplete="off" spellcheck="false">
          <div class="row"><button id="ebSave">Save key</button><button class="ghost" id="ebForget">Remove</button></div>
          <div id="ebSetMsg" style="margin-top:6px"></div>
        </div>
        <div class="eb-msgs" id="ebMsgs" aria-live="polite"></div>
        <div class="eb-chips" id="ebChips"></div>
        <form class="eb-foot" id="ebForm">
          <button type="button" class="mic" id="ebMic" title="Speak" aria-label="Speak your question">${ICON.mic}</button>
          <textarea id="ebIn" rows="1" placeholder="Ask me anything..." aria-label="Your question"></textarea>
          <button type="submit" id="ebSend" title="Send" aria-label="Send">${ICON.send}</button>
        </form>
      </section>`;
    document.body.appendChild(root);

    const msgs = $("#ebMsgs"), input = $("#ebIn"), panel = $("#ebPanel");
    let history = [], busy = false, speak = false;
    const getKey = () => (localStorage.getItem(KEY_STORE) || "").trim();

    let serverAI = false;
    function status() {
        $("#ebStatus").textContent = serverAI || getKey() ? "Gemini AI \u00B7 online" : "Built-in brain \u00B7 \u2699 for AI";
        const gear = $("#ebGear"); if (gear) { gear.style.display = serverAI ? "none" : ""; }
    }
    status();
    // is the ECO DRIFT server holding a Gemini key?  then no key is needed in the browser
    fetch("/api/health").then(r => r.ok ? r.json() : null).then(j => { serverAI = !!(j && j.ai); status(); }).catch(() => { });

    function addMsg(who, html, src) {
        const d = document.createElement("div");
        d.className = "eb-m " + who;
        d.innerHTML = (who == "bot" ? `<div class="eb-av">${ICON.bot}</div>` : "") + `<div class="eb-b">${html}</div>`;
        msgs.appendChild(d);
        if (src) { setSrc(d, src); }
        msgs.scrollTop = msgs.scrollHeight;
        return d;
    }
    function setSrc(d, src) {
        const b = $(".eb-b", d); const old = $(".eb-src", b); if (old) { old.remove(); }
        const s = document.createElement("span"); s.className = "eb-src"; s.textContent = src; b.appendChild(s);
    }
    const typing = () => addMsg("bot", '<span class="eb-typing"><i></i><i></i><i></i></span>');

    function chips(list) {
        const c = $("#ebChips"); c.innerHTML = "";
        list.forEach(q => { const b = document.createElement("button"); b.type = "button"; b.textContent = q; b.onclick = () => ask(q); c.appendChild(b); });
    }
    function startChips() {
        chips(["Compare Riyadh and Jeddah", "Explain Mann-Kendall simply", "What is NDVI?", "How can cities cool down?", "Tell me about NASA Space Apps", "Surprise me with a space fact"]);
    }
    function welcome() {
        msgs.innerHTML = ""; history = [];
        addMsg("bot", md("Hi, I'm **ECO BOT** \uD83D\uDE80 your Earth-data copilot.\n\n- Ask me **anything** (climate, space, school, life)\n- I can **run the app**: *\"compare Riyadh and Abha\"*, *\"open trends\"*\n- I know **your live results** on this page\n\nWhat shall we investigate?"));
        startChips();
    }
    welcome();

    // open / close
    const setOpen = on => { document.body.classList.toggle("eb-open", on); if (on) { setTimeout(() => input.focus(), 350); } };
    $("#ebFab").onclick = () => setOpen(true);
    $("#ebClose").onclick = () => setOpen(false);
    document.addEventListener("keydown", e => { if (e.key == "Escape" && document.body.classList.contains("eb-open")) { setOpen(false); } });
    $("#ebClear").onclick = welcome;
    $("#ebBig").onclick = () => panel.classList.toggle("big");
    $("#ebGear").onclick = () => { $("#ebSet").classList.toggle("on"); $("#ebKey").value = getKey(); };
    $("#ebSave").onclick = () => {
        const k = $("#ebKey").value.trim();
        if (k.length < 20) { $("#ebSetMsg").textContent = "That doesn't look like a key (it starts with AIza and is ~39 characters)."; return; }
        localStorage.setItem(KEY_STORE, k); status(); $("#ebSetMsg").textContent = "Saved. Full AI is on \u2705"; setTimeout(() => $("#ebSet").classList.remove("on"), 900);
    };
    $("#ebForget").onclick = () => { localStorage.removeItem(KEY_STORE); $("#ebKey").value = ""; status(); $("#ebSetMsg").textContent = "Key removed. Using the built-in brain."; };

    // text-to-speech
    $("#ebSpeak").onclick = function () {
        speak = !speak; this.setAttribute("aria-pressed", speak); this.style.background = speak ? "rgba(167,139,250,.35)" : "";
        if (!speak && window.speechSynthesis) { speechSynthesis.cancel(); }
    };
    function say(text) {
        if (!speak || !window.speechSynthesis) { return; }
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, "").slice(0, 600));
        u.rate = 1.03; speechSynthesis.speak(u);
    }
    // voice input
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { $("#ebMic").style.display = "none"; }
    else {
        let rec = null;
        $("#ebMic").onclick = function () {
            if (rec) { rec.stop(); return; }
            rec = new SR(); rec.lang = navigator.language || "en-US"; rec.interimResults = true;
            this.classList.add("on");
            rec.onresult = e => { input.value = Array.from(e.results).map(r => r[0].transcript).join(" "); };
            rec.onend = () => { $("#ebMic").classList.remove("on"); rec = null; if (input.value.trim()) { send(); } };
            rec.onerror = () => { $("#ebMic").classList.remove("on"); rec = null; };
            rec.start();
        };
    }

    input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(110, input.scrollHeight) + "px"; });
    input.addEventListener("keydown", e => { if (e.key == "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    $("#ebForm").addEventListener("submit", e => { e.preventDefault(); send(); });
    function send() { if (busy) { if (ctl) { ctl.abort(); } return; } const q = input.value.trim(); if (!q) { return; } input.value = ""; input.style.height = "auto"; ask(q); }

    /* ================= answering ================= */
    let ctl = null, lastQ = "";
    const STOP_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';
    const aiOn = () => serverAI || !!getKey();
    function setBusy(on) {
        busy = on; const s = $("#ebSend");
        s.innerHTML = on ? STOP_ICON : ICON.send; s.title = on ? "Stop" : "Send"; s.classList.toggle("stop", on);
    }
    const defaultFollow = () => ({
        compare: ["Explain this result simply", "What causes this trend?", "Scan all cities"],
        trends: ["Which cities are rising?", "What can be done about it?", "Explain Mann-Kendall"],
        space: ["What is NDVI?", "Why do dust storms happen?", "Tell me about Terra and Aqua"],
        myarea: ["Is this trend real?", "What can I do about heat?", "Compare Riyadh and Jeddah"]
    }[activeTab()] || ["Compare Riyadh and Jeddah", "How can cities cool down?", "Tell me a space fact"]);

    async function ask(q, opts) {
        if (busy) { return; }
        opts = opts || {};
        lastQ = q; setBusy(true); $("#ebChips").innerHTML = "";
        if (!opts.retry) { addMsg("user", esc(q).replace(/\n/g, "<br>")); }
        const t = typing(); ctl = new AbortController();
        try {
            let r = await answerAction(q);                                          // 1. do things in the app
            if (!r && aiOn()) { r = await answerGemini(q, t, ctl.signal); }         // 2. real AI
            if (!r) { r = answerLocal(q); }                                         // 3. built-in brain
            if (!r) { r = await answerWiki(q); }                                    // 4. Wikipedia
            if (!r) { r = { text: "I couldn't find a solid answer to that right now. Try rephrasing, or ask me about climate, NASA data, or this app.", src: "Eco Bot" }; }
            await show(t, r);
            history.push({ role: "user", text: q }, { role: "model", text: r.text });
            history = history.slice(-16);
            say(r.text);
            if (r.action) { await runAction(r.action); }
            chips(r.follow && r.follow.length ? r.follow : defaultFollow());
        } catch (err) {
            t.remove();
            if (!(err && err.name == "AbortError")) {
                const d = addMsg("bot", md("Sorry, something went wrong: **" + esc(err.message || err) + "**"), "Error"); addTools(d, "", true);
            }
        }
        setBusy(false); msgs.scrollTop = msgs.scrollHeight;
    }

    // writes the answer into its bubble (types it out unless Gemini already streamed it)
    async function show(node, r) {
        const b = $(".eb-b", node);
        if (!r.streamed) {
            const words = r.text.split(/(\s+)/); let acc = "";
            for (let i = 0; i < words.length; i++) {
                acc += words[i];
                if (i % 4 == 0 || i == words.length - 1) { b.innerHTML = md(acc); msgs.scrollTop = msgs.scrollHeight; await sleep(12); }
            }
        }
        b.innerHTML = md(r.text);
        if (r.src) { setSrc(node, r.src); }
        addTools(node, r.text);
        msgs.scrollTop = msgs.scrollHeight;
    }
    function addTools(node, raw, errorOnly) {
        node.dataset.raw = raw;
        const d = document.createElement("div"); d.className = "eb-act";
        d.innerHTML = (errorOnly ? "" : `<button type="button" data-a="copy" title="Copy answer">${ICON.copy}</button>`) + `<button type="button" data-a="retry" title="Try again">${ICON.retry}</button>`;
        $(".eb-b", node).appendChild(d);
    }
    msgs.addEventListener("click", e => {
        const btn = e.target.closest("[data-a]"); if (!btn || busy) { return; }
        const node = btn.closest(".eb-m");
        if (btn.dataset.a == "copy") {
            navigator.clipboard && navigator.clipboard.writeText(node.dataset.raw || "").then(() => { btn.classList.add("ok"); setTimeout(() => btn.classList.remove("ok"), 1200); });
        } else if (btn.dataset.a == "retry" && lastQ) {
            node.remove(); history = history.slice(0, -2); ask(lastQ, { retry: true });
        }
    });

    /* ---- 2. gemini: through the ECO DRIFT server (key stays private) or straight with a key you pasted ---- */
    async function readStream(res, node, signal) {
        const reader = res.body.getReader(), dec = new TextDecoder(), bubble = $(".eb-b", node);
        let buf = "", acc = "";
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) { break; }
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n"); buf = lines.pop();
                for (const ln of lines) {
                    if (!ln.startsWith("data:")) { continue; }
                    try {
                        const c = (JSON.parse(ln.slice(5)).candidates || [])[0];
                        if (c && c.content && c.content.parts) {
                            acc += c.content.parts.filter(p => !p.thought).map(p => p.text || "").join("");
                            const pr = parts(acc);
                            if (pr.body) { bubble.innerHTML = md(pr.body); msgs.scrollTop = msgs.scrollHeight; }
                        }
                    } catch (e) { /* half a line */ }
                }
            }
        } catch (e) {
            if (e.name != "AbortError") { throw e; }
            acc += "\n\n*(stopped)*";
        }
        if (!acc.trim()) { return null; }
        const pr = parts(acc);
        return { text: pr.body, action: pr.action, follow: pr.follow, src: "Gemini AI", streamed: true };
    }
    async function answerGemini(q, node, signal) {
        const contents = history.map(h => ({ role: h.role, parts: [{ text: h.text }] })).concat([{ role: "user", parts: [{ text: q }] }]);
        const body = JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt() }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } });
        const tries = serverAI ? [null] : MODELS;
        for (const model of tries) {
            let res;
            try {
                res = serverAI
                    ? await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal })
                    : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(getKey())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal });
            } catch (e) { if (e.name == "AbortError") { throw e; } break; }
            if (res.status == 404 || res.status == 503) { continue; }                       // that model is retired or busy
            if (res.status == 429) { return null; }
            if (!serverAI && (res.status == 400 || res.status == 403)) {
                let m = ""; try { m = (await res.json()).error.message; } catch (e) { }
                if (res.status == 403 || /API key|API_KEY|permission|denied/i.test(m)) { return { text: "Gemini rejected the API key (**" + esc(m || res.status) + "**). Open \u2699 and paste a valid key.", src: "Key problem" }; }
                continue;
            }
            if (!res.ok || !res.body) { if (serverAI) { return null; } continue; }
            const out = await readStream(res, node, signal);
            if (out) { return out; }
        }
        return null;
    }

    /* ---- 1. actions: run the real app from chat ---- */
    const goTab = name => { const b = document.querySelector(`.tabs button[data-tab="${name}"]`); if (b) { b.click(); } };
    const TABS = { home: "home", comparison: "compare", compare: "compare", trend: "trends", trends: "trends", scan: "trends", cause: "causes", causes: "causes", solution: "causes", solutions: "causes", space: "space", satellite: "space", "my area": "myarea", myarea: "myarea", how: "how", method: "how", about: "about", team: "about" };
    function findCity(name) {
        const sel = document.getElementById("cityA"); if (!sel || !name) { return null; }
        const n = String(name).toLowerCase().replace(/[^a-z\u0600-\u06ff ]/g, "").trim();
        if (n.length < 3) { return null; }
        const opts = Array.from(sel.options);
        return opts.find(o => o.textContent.toLowerCase().replace(/[^a-z\u0600-\u06ff ]/g, "").trim() == n) || opts.find(o => o.textContent.toLowerCase().includes(n));
    }
    async function runDetect() {
        if (typeof window.detect != "function") { throw new Error("The app is still loading"); }
        await window.detect(); await sleep(250);
    }
    async function doCompare(a, b) {
        document.getElementById("cityA").value = a.value; document.getElementById("cityB").value = b.value;
        goTab("compare"); await runDetect();
        const A = a.textContent.trim(), B = b.textContent.trim();
        return { text: `I ran the test for **${A}** vs **${B}** (${selText("variable").toLowerCase()}, ${selText("period")}).\n\n**${A}:** ${firstLines("resultA")}\n\n**${B}:** ${firstLines("resultB")}\n\n**Verdict:** ${txt("where").replace(/^WHERE:\s*/i, "")}\n\nThe full charts are on the *City comparison* tab.`, src: "Live app result \u00B7 NASA POWER" };
    }
    async function doCity(a) {
        document.getElementById("cityA").value = a.value;
        const v = document.getElementById("variable"); if (v) { v.selectedIndex = 0; }
        goTab("compare"); await runDetect();
        return { text: `Here is what the data says for **${a.textContent.trim()}** (air temperature, ${selText("period")}):\n\n${firstLines("resultA")}\n\nA trend counts as *real* only if the chance of random noise is under 5%.`, src: "Live app result \u00B7 NASA POWER" };
    }
    // actions the AI asks for:  ACTION: {"type":"compare","a":"Riyadh","b":"Jeddah"}
    async function runAction(a) {
        try {
            let r = null;
            if (a.type == "goto" && TABS[String(a.tab).toLowerCase()]) { goTab(TABS[String(a.tab).toLowerCase()]); setOpen(true); }
            else if (a.type == "scan") { goTab("trends"); if (typeof window.scanAll == "function") { window.scanAll(); } r = { text: "Scanning all 23 cities now. Watch the globe light up.", src: "Page action" }; }
            else if (a.type == "compare") { const x = findCity(a.a), y = findCity(a.b); if (x && y) { r = await doCompare(x, y); } }
            else if (a.type == "detect_city") { const x = findCity(a.city); if (x) { r = await doCity(x); } }
            if (r) { const d = addMsg("bot", md(r.text), r.src); addTools(d, r.text); }
        } catch (e) { /* the action is a bonus; ignore failures */ }
    }
    async function answerAction(q) {
        const s = q.toLowerCase().trim();
        let m = /compar\w*\s+(.+?)\s+(?:and|with|vs\.?|versus|&|to)\s+(.+?)[?.!]*$/.exec(s) || /^(.+?)\s+(?:vs\.?|versus)\s+(.+?)[?.!]*$/.exec(s);
        if (m) {
            const a = findCity(m[1]), b = findCity(m[2]);
            if (a && b) { return doCompare(a, b); }
            if (a || b) { return { text: `I found ${a ? "**" + a.textContent.trim() + "**" : "only one"} of those cities. ECO DRIFT covers 23 Saudi cities (open the City A list to see them). Try *"compare Riyadh and Jeddah"*.`, src: "Eco Bot" }; }
        }
        m = /(?:is|are)\s+(.+?)\s+(?:getting|becoming|growing|turning)\s+(?:hotter|warmer|cooler|drier|wetter)/.exec(s) || /(?:temperature|trend|climate)\s+(?:in|of|for)\s+([a-z\u0600-\u06ff ]+?)[?.!]*$/.exec(s);
        if (m) { const a = findCity(m[1]); if (a) { return doCity(a); } }
        m = /^(?:open|show|go to|take me to|switch to|navigate to)\s+(?:the\s+)?(?:tab\s+)?([a-z ]+?)(?:\s+tab|\s+page)?[?.!]*$/.exec(s);
        if (m && TABS[m[1].trim()]) { goTab(TABS[m[1].trim()]); setOpen(true); return { text: `Opened the **${m[1].trim()}** tab for you.`, src: "Page action" }; }
        if (/^(?:run|start|do)\s+(?:a\s+|the\s+)?(?:scan|kingdom scan)|scan (?:all|the kingdom|every)/.test(s)) {
            goTab("trends"); if (typeof window.scanAll == "function") { window.scanAll(); }
            return { text: "Scanning all 23 cities now. Watch the globe light up, then ask me *\"which cities are rising?\"* for a summary.", src: "Page action" };
        }
        if (/(which|how many|what).*(cit(y|ies)).*(rising|hotter|warming|falling|cooling|trend)|kingdom scan|scan result|scan summary|verdict/.test(s)) {
            const up = txt("nUp"), dn = txt("nDown"), fl = txt("nFlat");
            if (/\d/.test(up + dn + fl)) {
                const names = sel => Array.from(document.querySelectorAll(sel)).map(e => e.textContent.trim()).slice(0, 10);
                const ru = names("#table tr.up td:first-child"), rd = names("#table tr.down td:first-child");
                return { text: `**Latest Kingdom scan** (${selText("variable").toLowerCase()}, ${selText("period")}):\n\n- **${up}** cities with a real **rising** trend${ru.length ? ": " + ru.join(", ") : ""}\n- **${dn}** with a real **falling** trend${rd.length ? ": " + rd.join(", ") : ""}\n- **${fl}** with no real trend (could be noise)\n\nOpen the *Trends* tab for the table and map.`, src: "Live app result" };
            }
            return { text: "No scan has finished yet. Say **\"scan all cities\"** and I'll start it.", src: "Page action" };
        }
        return null;
    }

    function firstLines(id) {
        const e = document.getElementById(id); if (!e) { return ""; }
        const d = document.createElement("div"); d.innerHTML = e.innerHTML.replace(/<br\s*\/?>/gi, "\n");
        const lines = d.textContent.split("\n").map(l => l.trim()).filter(Boolean);
        const pick = lines.filter(l => /^(WHAT|HOW MUCH|SIGNIFICANT)/i.test(l));
        return (pick.length ? pick : lines.slice(0, 3)).join(" \u00B7 ");
    }

    /* ---- 3. built-in brain ---- */
    function answerLocal(q) {
        const s = " " + q.toLowerCase().replace(/[^\p{L}\p{N}\s+\-*/().%^]/gu, " ").replace(/\s+/g, " ") + " ";
        // calculator
        const calc = /^[\s\d+\-*/().%^x]+$/.test(q.replace(/what is|what's|calculate|=|\?/gi, "").trim()) ? q.replace(/what is|what's|calculate|=|\?/gi, "").trim().replace(/x/gi, "*").replace(/\^/g, "**") : "";
        if (calc && /\d\s*[+\-*/%]\s*\d/.test(calc)) {
            try { const v = Function('"use strict";return (' + calc + ")")(); if (isFinite(v)) { return { text: "**" + calc.replace(/\*\*/g, "^") + " = " + (Math.round(v * 1e9) / 1e9) + "**", src: "Calculator" }; } } catch (e) { }
        }
        if (/\b(what time|current time|what's the time)\b/.test(s)) { return { text: "Your device clock says **" + new Date().toLocaleTimeString() + "** (UTC: " + new Date().toUTCString().slice(17, 25) + ").", src: "Device clock" }; }
        if (/\b(what date|today's date|what day)\b/.test(s)) { return { text: "Today is **" + new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + "**.", src: "Device clock" }; }

        let best = null, bestScore = 0;
        for (const e of KB) {
            let sc = 0;
            for (const k of e.k) {
                const kk = " " + k + " ";
                if (s.includes(kk) || (k.length > 4 && s.includes(k))) { sc += (e.w || 1) * (k.includes(" ") ? 2 : 1); }
            }
            if (e.only && s.trim().split(" ").length > 6) { sc = 0; }
            if (sc > bestScore) { bestScore = sc; best = e; }
        }
        if (best && bestScore >= 2) {
            if (best.fact) { return { text: "**Space fact:** " + FACTS[Math.floor(Math.random() * FACTS.length)], src: "Eco Bot knowledge" }; }
            if (best.a) { return { text: best.a, src: "Eco Bot knowledge base" }; }
        }
        // questions about what is on screen right now
        if (/\b(this page|current|my result|results?|what does this mean|explain (this|the) (result|chart|graph)|why is this)\b/.test(s)) {
            const st = pageState();
            if (/result:|Comparison:|scan:|answer:/.test(st)) { return { text: "Here is what is on your screen right now:\n\n" + st.split("\n").filter(l => /result:|Comparison:|scan:|answer:/.test(l)).map(l => "- " + l.slice(0, 330)).join("\n") + "\n\n**How to read it:** the slope tells you *how fast* it changes, and a trend is *real* only when the chance of noise is under 5%.", src: "Live page data" }; }
        }
        return null;
    }

    /* ---- 4. wikipedia ---- */
    async function answerWiki(q) {
        let topic = q.replace(/[?!.]+$/g, "").trim()
            .replace(/^(please\s+)?(can you |could you )?(tell me|explain|describe|define|teach me)( about| what| to me)?\s+/i, "")
            .replace(/^(what|who|where|when|which)('s| is| are| was| were| does| do| did)?\s+(a |an |the )?/i, "")
            .replace(/^(how (does|do|is|are)\s+)/i, "").trim();
        if (topic.length < 2) { return null; }
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
        try {
            const s = await fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=" + encodeURIComponent(topic), { signal: ctl.signal }).then(r => r.json());
            const hit = s.query && s.query.search && s.query.search[0]; if (!hit) { return null; }
            const sum = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(hit.title.replace(/ /g, "_")), { signal: ctl.signal }).then(r => r.json());
            if (!sum.extract) { return null; }
            const ex = sum.extract.length > 720 ? sum.extract.slice(0, 720).replace(/\s+\S*$/, "") + "\u2026" : sum.extract;
            return { text: "**" + sum.title + "**\n\n" + ex + (sum.content_urls ? "\n\n[Read more on Wikipedia](" + sum.content_urls.desktop.page + ")" : "") + "\n\n*Tip: add a Gemini key (\u2699) for conversational answers to anything.*", src: "Wikipedia" };
        } catch (e) { return null; } finally { clearTimeout(to); }
    }

    // let other scripts open the bot:  window.EcoBot.open("question")
    window.EcoBot = { open: q => { setOpen(true); if (q) { ask(q); } } };
})();
