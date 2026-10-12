/* =========================================================
   EXTRAS
   · living background  (data network + packets + click ripples)
   · ink blots in the margins, drawn once with the same maths
     as the hero plate
   · section "mood" glow
   · Ctrl+K command palette
   · collaboration email builder
   · local time
========================================================= */

(function () {
    "use strict";

    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

    /* =====================================================
       1. DATA-NETWORK BACKGROUND
       Nodes drift, close ones link up, small "packets" travel
       along the links. Click anywhere to drop an ink ripple.
    ===================================================== */

    var cv = $("#bgNet");

    if (cv && cv.getContext) {
        var cx = cv.getContext("2d");
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0, nodes = [], packets = [], ripples = [];
        var mouse = { x: -9999, y: -9999 };
        var LINK = 150;
        var LABELS = ["API", "SQL", "GET", "POST", "JOIN", "ETL", "JSON", "REST", "Flask", "Pandas",
                      "Redis", "Docker", "Git", "200 OK", "SELECT", "INSERT", "Python", "Java"];
        var running = false;

        var inkTone = function () {
            return root.getAttribute("data-theme") === "light"
                ? { c: "138,93,0", k: 1.5 }
                : { c: "212,175,55", k: 1 };
        };

        var resize = function () {
            W = window.innerWidth;
            H = window.innerHeight;
            cv.width = W * dpr;
            cv.height = H * dpr;
            cx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var target = Math.round(W * H / (W < 700 ? 19000 : 24000));
            target = Math.max(18, Math.min(64, target));

            while (nodes.length < target) {
                nodes.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: (Math.random() - 0.5) * 0.28,
                    r: 1.2 + Math.random() * 1.4,
                    depth: 0.3 + Math.random() * 0.7,
                    label: nodes.length % 6 === 0 ? LABELS[(nodes.length / 6 | 0) % LABELS.length] : "",
                    pulse: 0
                });
            }
            nodes.length = target;
            if (!running) frame(0);
        };

        var pos = function (n) {
            var sy = window.scrollY * 0.06 * n.depth;
            return { x: n.x, y: ((n.y - sy) % H + H) % H };
        };

        var frame = function (ts) {
            var p = inkTone(), i, j, a, b, d, al;
            cx.clearRect(0, 0, W, H);

            var P = nodes.map(pos);

            // links
            cx.lineWidth = 1;
            for (i = 0; i < P.length; i++) {
                for (j = i + 1; j < P.length; j++) {
                    d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
                    if (d < LINK) {
                        al = (1 - d / LINK) * 0.28 * p.k;
                        var mx = (P[i].x + P[j].x) / 2 - mouse.x, my = (P[i].y + P[j].y) / 2 - mouse.y;
                        if (mx * mx + my * my < 18000) al *= 2.4;
                        cx.strokeStyle = "rgba(" + p.c + "," + al + ")";
                        cx.beginPath(); cx.moveTo(P[i].x, P[i].y); cx.lineTo(P[j].x, P[j].y); cx.stroke();
                    }
                }
            }

            // nodes + labels
            cx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
            for (i = 0; i < nodes.length; i++) {
                var n = nodes[i], q = P[i];
                var r = n.r + n.pulse * 3;
                cx.fillStyle = "rgba(" + p.c + "," + (0.35 + n.pulse * 0.5) * Math.min(1, p.k) + ")";
                cx.beginPath(); cx.arc(q.x, q.y, r, 0, 6.2832); cx.fill();
                if (n.pulse > 0.02) {
                    cx.strokeStyle = "rgba(" + p.c + "," + n.pulse * 0.5 + ")";
                    cx.beginPath(); cx.arc(q.x, q.y, r + (1 - n.pulse) * 14, 0, 6.2832); cx.stroke();
                    n.pulse *= 0.94;
                }
                if (n.label) {
                    cx.fillStyle = "rgba(" + p.c + "," + 0.34 * p.k + ")";
                    cx.fillText(n.label, q.x + 7, q.y - 6);
                }

                if (!reduceMotion) {
                    n.x += n.vx; n.y += n.vy;
                    if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
                    if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
                    var dx = q.x - mouse.x, dy = q.y - mouse.y, dd = dx * dx + dy * dy;
                    if (dd < 9000 && dd > 1) { n.x += dx / Math.sqrt(dd) * 0.5; n.y += dy / Math.sqrt(dd) * 0.5; }
                }
            }

            // packets travelling along links
            if (!reduceMotion) {
                if (packets.length < 9 && Math.random() < 0.05) {
                    a = Math.floor(Math.random() * nodes.length);
                    var best = -1, bd = LINK;
                    for (j = 0; j < nodes.length; j++) {
                        if (j === a) continue;
                        d = Math.hypot(P[a].x - P[j].x, P[a].y - P[j].y);
                        if (d < bd && Math.random() < 0.6) { bd = d; best = j; }
                    }
                    if (best >= 0) packets.push({ a: a, b: best, t: 0, s: 0.012 + Math.random() * 0.012 });
                }
                for (i = packets.length - 1; i >= 0; i--) {
                    var k = packets[i]; k.t += k.s;
                    if (k.t >= 1) { nodes[k.b].pulse = 1; packets.splice(i, 1); continue; }
                    var A = P[k.a], B = P[k.b];
                    var x = A.x + (B.x - A.x) * k.t, y = A.y + (B.y - A.y) * k.t;
                    var tx = A.x + (B.x - A.x) * Math.max(0, k.t - 0.12), ty = A.y + (B.y - A.y) * Math.max(0, k.t - 0.12);
                    var g = cx.createLinearGradient(tx, ty, x, y);
                    g.addColorStop(0, "rgba(" + p.c + ",0)"); g.addColorStop(1, "rgba(" + p.c + "," + 0.85 * Math.min(1, p.k) + ")");
                    cx.strokeStyle = g; cx.lineWidth = 2;
                    cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(x, y); cx.stroke();
                    cx.fillStyle = "rgba(" + p.c + ",0.95)";
                    cx.beginPath(); cx.arc(x, y, 2.2, 0, 6.2832); cx.fill();
                }
                cx.lineWidth = 1;
            }

            // click ripples + splatter
            for (i = ripples.length - 1; i >= 0; i--) {
                var rp = ripples[i]; rp.t += 0.022;
                if (rp.t >= 1) { ripples.splice(i, 1); continue; }
                var e = 1 - Math.pow(1 - rp.t, 3), fade = 1 - rp.t;
                cx.strokeStyle = "rgba(" + p.c + "," + 0.5 * fade + ")";
                cx.lineWidth = 2 * fade + 0.5;
                cx.beginPath(); cx.arc(rp.x, rp.y, e * 70, 0, 6.2832); cx.stroke();
                cx.fillStyle = "rgba(" + p.c + "," + 0.55 * fade + ")";
                for (j = 0; j < rp.dots.length; j++) {
                    var dt = rp.dots[j];
                    cx.beginPath();
                    cx.arc(rp.x + Math.cos(dt.a) * dt.d * e, rp.y + Math.sin(dt.a) * dt.d * e, dt.r * fade, 0, 6.2832);
                    cx.fill();
                }
            }

            if (!reduceMotion && !document.hidden) { running = true; requestAnimationFrame(frame); }
            else running = false;
        };

        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
        window.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });

        window.addEventListener("pointerdown", function (e) {
            if (reduceMotion) return;
            var dots = [], m = 7 + Math.floor(Math.random() * 5);
            for (var i = 0; i < m; i++) dots.push({ a: Math.random() * 6.2832, d: 30 + Math.random() * 70, r: 1 + Math.random() * 3 });
            ripples.push({ x: e.clientX, y: e.clientY, t: 0, dots: dots });
            if (!running) frame(0);
        }, { passive: true });

        document.addEventListener("visibilitychange", function () { if (!document.hidden && !running) frame(0); });

        // repaint for the new theme when static
        new MutationObserver(function () { if (!running) frame(0); })
            .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

        resize();
    }

    /* =====================================================
       2. INK BLOTS IN THE MARGINS
       Same idea as the hero plate: blobs on the left half,
       mirrored. Used as a CSS mask, so the colour follows the
       theme automatically.
    ===================================================== */

    function mulberry(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

    function makeBlot(seed) {
        var S = 420, half = S / 2, rnd = mulberry(seed);
        var l = document.createElement("canvas"); l.width = half; l.height = S;
        var o = l.getContext("2d"), k;

        function soft(x, y, r, rot, sy) {
            o.save(); o.translate(x, y); o.rotate(rot); o.scale(1, sy);
            var g = o.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
            o.fillStyle = g; o.beginPath(); o.arc(0, 0, r, 0, 6.2832); o.fill(); o.restore();
        }

        for (k = 0; k < 4; k++) soft(half - 6, S * (0.22 + k * 0.17), S * (0.17 + rnd() * 0.08), 0, 1.15);   // spine
        for (k = 0; k < 14; k++) soft(half - (0.06 + rnd() * rnd() * 0.8) * half, S * (0.08 + rnd() * 0.84), S * (0.05 + rnd() * 0.1), rnd() * 3.14, 0.5 + rnd());
        for (k = 0; k < 10; k++) soft(rnd() * half * 0.9, S * (0.06 + rnd() * 0.88), S * (0.012 + rnd() * 0.025), 0, 1);

        var d = o.getImageData(0, 0, half, S), px = d.data;
        for (var i = 0; i < px.length; i += 4) {
            var a = sstep(0.42, 0.5, px[i + 3] / 255);
            px[i] = px[i + 1] = px[i + 2] = 0; px[i + 3] = a * 255;
        }
        o.putImageData(d, 0, 0);

        var out = document.createElement("canvas"); out.width = S; out.height = S;
        var c = out.getContext("2d");
        c.drawImage(l, 0, 0);
        c.save(); c.translate(S, 0); c.scale(-1, 1); c.drawImage(l, 0, 0); c.restore();
        return "url(" + out.toDataURL("image/png") + ")";
    }

    function addDecos() {
        var spots = [["work", "r", 11], ["backend", "l", 27], ["path", "r", 43], ["notes", "l", 59], ["collab", "r", 71]];
        spots.forEach(function (s) {
            var sec = document.getElementById(s[0]);
            if (!sec) return;
            var el = document.createElement("span");
            el.className = "ink-deco " + s[1];
            el.setAttribute("aria-hidden", "true");
            el.style.setProperty("--blot", makeBlot(s[2] * 7919));
            sec.insertBefore(el, sec.firstChild);
        });
    }

    if ("requestIdleCallback" in window) requestIdleCallback(addDecos, { timeout: 1500 });
    else setTimeout(addDecos, 300);

    /* =====================================================
       3. SECTION MOOD (moves the colour glow)
    ===================================================== */

    if ("IntersectionObserver" in window) {
        var moodIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) document.body.setAttribute("data-mood", en.target.id);
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        ["home", "work", "backend", "path", "toolkit", "notes", "collab", "contact"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) moodIO.observe(el);
        });
    }

    /* =====================================================
       4. LOCAL TIME
    ===================================================== */

    var lt = $("#localTime");
    function tick() {
        if (!lt) return;
        try {
            lt.textContent = new Intl.DateTimeFormat([], {
                hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg"
            }).format(new Date()) + " · Johannesburg";
        } catch (e) { lt.textContent = "Johannesburg (SAST)"; }
    }
    tick();
    setInterval(tick, 30000);

    /* =====================================================
       5. COLLABORATION EMAIL BUILDER
    ===================================================== */

    var brief = $("#collabBrief");

    if (brief) {
        var TO = brief.getAttribute("data-to");
        var bodyEl = $("#letterBody"), subjEl = $("#letterSubject"), link = $("#mailtoBtn");
        var nameEl = $("#cbName"), ideaEl = $("#cbIdea");

        function checked(name) {
            return $$('input[name="' + name + '"]:checked', brief).map(function (i) { return i.value; });
        }

        function join(list) {
            if (list.length <= 1) return list.join("");
            return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
        }

        function build() {
            var topics = checked("cb-topic");
            var phrases = $$('input[name="cb-topic"]:checked', brief).map(function (i) { return i.getAttribute("data-phrase"); });
            var format = checked("cb-format")[0] || "";
            var name = nameEl.value.trim();
            var idea = ideaEl.value.trim();

            var subject = "Collaboration: " + (topics.length ? topics.join(" + ") : "an idea");
            var lines = [
                "Hi Shonisani,",
                "",
                "I came across your portfolio and I'd like to collaborate with you on " +
                    (phrases.length ? join(phrases) : "something we could build together") + ".",
                ""
            ];
            if (format) lines.push("Format: " + format.toLowerCase(), "");
            lines.push(idea || "[Tell me a little about your idea here]", "", "Best,", name || "[Your name]");

            var plain = lines.join("\n");

            subjEl.textContent = subject;
            // show placeholders highlighted
            bodyEl.textContent = "";
            plain.split(/(\[[^\]]+\])/).forEach(function (part) {
                if (/^\[[^\]]+\]$/.test(part)) {
                    var s = document.createElement("span"); s.className = "ph"; s.textContent = part; bodyEl.appendChild(s);
                } else bodyEl.appendChild(document.createTextNode(part));
            });

            link.href = "mailto:" + TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(plain);
            brief._plain = "To: " + TO + "\nSubject: " + subject + "\n\n" + plain;
        }

        brief.addEventListener("input", build);
        brief.addEventListener("change", build);
        build();

        function copy(text, btn, done) {
            function ok() {
                var old = btn.textContent;
                btn.textContent = done;
                setTimeout(function () { btn.textContent = old; }, 1600);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(ok, function () { window.prompt("Copy this:", text); });
            } else {
                window.prompt("Copy this:", text);
            }
        }

        $("#copyDraft").addEventListener("click", function () { copy(brief._plain, this, "Copied ✓"); });
        $("#copyAddr").addEventListener("click", function () { copy(TO, this, "Copied ✓"); });
    }

    /* =====================================================
       6. COMMAND PALETTE  (Ctrl/⌘ + K  or  /)
    ===================================================== */

    var pal = $("#palette"), input = $("#palInput"), list = $("#palList");
    var opener = null, shown = [], sel = 0;

    var addr = brief ? brief.getAttribute("data-to") : "";

    function go(id) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }

    var COMMANDS = [
        { t: "Go to Home", k: "section", f: function () { go("home"); } },
        { t: "Go to Work", k: "section", f: function () { go("work"); } },
        { t: "Go to Backend", k: "section", f: function () { go("backend"); } },
        { t: "Go to Path (extract, transform, load)", k: "section", f: function () { go("path"); } },
        { t: "Go to Toolkit", k: "section", f: function () { go("toolkit"); } },
        { t: "Go to Case notes", k: "section", f: function () { go("notes"); } },
        { t: "Collaborate with me", k: "email", f: function () { go("collab"); } },
        { t: "Send me a message", k: "section", f: function () { go("contact"); } },
        { t: "Toggle light / dark theme", k: "action", f: function () { var b = $("#themeToggle"); if (b) b.click(); } },
        { t: "Email me about a collaboration", k: "email", f: function () { if (addr) window.location.href = "mailto:" + addr + "?subject=" + encodeURIComponent("Collaboration idea"); } },
        { t: "Copy my email address", k: "action", f: function () { if (navigator.clipboard && addr) navigator.clipboard.writeText(addr); } },
        { t: "Open GitHub", k: "link", f: function () { window.open("https://github.com/Sanieeme", "_blank", "noopener"); } },
        { t: "Open LinkedIn", k: "link", f: function () { window.open("https://www.linkedin.com/in/shonisani-n-b7574a22/", "_blank", "noopener"); } },
        { t: "Open my CV (PDF)", k: "link", f: function () { window.open("cv.pdf", "_blank", "noopener"); } }
    ];

    function render() {
        var q = input.value.trim().toLowerCase();
        shown = COMMANDS.filter(function (c) {
            return q.split(/\s+/).every(function (w) { return c.t.toLowerCase().indexOf(w) > -1 || c.k.indexOf(w) > -1; });
        });
        sel = Math.min(sel, Math.max(shown.length - 1, 0));
        list.textContent = "";
        if (!shown.length) {
            var p = document.createElement("li");
            p.className = "pal-empty"; p.setAttribute("role", "presentation");
            p.textContent = "Nothing matches that. Try “work”, “email” or “theme”.";
            list.appendChild(p);
            return;
        }
        shown.forEach(function (c, i) {
            var li = document.createElement("li");
            li.setAttribute("role", "option");
            li.setAttribute("aria-selected", i === sel ? "true" : "false");
            li.innerHTML = "<span></span><small></small>";
            li.firstChild.textContent = c.t;
            li.lastChild.textContent = c.k;
            li.addEventListener("mousemove", function () { sel = i; mark(); });
            li.addEventListener("click", function () { run(i); });
            list.appendChild(li);
        });
    }

    function mark() {
        $$("li[role=option]", list).forEach(function (li, i) {
            li.setAttribute("aria-selected", i === sel ? "true" : "false");
            if (i === sel) li.scrollIntoView({ block: "nearest" });
        });
    }

    function openPal() {
        if (!pal) return;
        opener = document.activeElement;
        pal.hidden = false;
        input.value = ""; sel = 0; render();
        input.focus();
    }

    function closePal() {
        if (!pal || pal.hidden) return;
        pal.hidden = true;
        if (opener && opener.focus) opener.focus();
    }

    function run(i) {
        var c = shown[i];
        closePal();
        if (c) setTimeout(c.f, 60);
    }

    if (pal && input && list) {
        input.addEventListener("input", function () { sel = 0; render(); });
        input.addEventListener("keydown", function (e) {
            if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); mark(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
            else if (e.key === "Enter") { e.preventDefault(); run(sel); }
            else if (e.key === "Tab") { e.preventDefault(); }
        });
        pal.addEventListener("mousedown", function (e) { if (e.target === pal) closePal(); });

        document.addEventListener("keydown", function (e) {
            var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
            if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
            else if (e.key === "/" && !typing && pal.hidden) { e.preventDefault(); openPal(); }
            else if (e.key === "Escape") closePal();
        });

        var pb = $("#palBtn");
        if (pb) pb.addEventListener("click", openPal);
    }
})();
