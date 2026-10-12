/* =========================================================
   HERO — orbiting tech chips, typed line, portrait tilt
   (kept separate from script.js so the form code is untouched)
========================================================= */

(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* -----------------------------------------------------
       TECH CHIPS
       [label, monogram, accent colour]
    ----------------------------------------------------- */

    var RINGS = {
        // inner ring — languages
        a: [
            ["Python",     "Py",  "#6aa9e9"],
            ["Java",       "Jv",  "#f0883e"],
            ["JavaScript", "JS",  "#f7df1e"],
            ["C",          "C",   "#7aa7ec"],
            ["R",          "R",   "#78a6f5"],
            ["SQL",        "SQL", "#e8ab4a"]
        ],
        // outer ring — frameworks, data & tooling
        b: [
            ["Flask",      "Fl",  "#e9e9e9"],
            ["SQLAlchemy", "SA",  "#ec6a57"],
            ["MySQL",      "My",  "#6fb9d8"],
            ["Redis",      "Rd",  "#ef6b61"],
            ["Pandas",     "Pd",  "#a78bfa"],
            ["Docker",     "Dk",  "#36a3f5"],
            ["Git",        "Gt",  "#f26a4f"],
            ["Linux",      "Lx",  "#f5c542"],
            ["SQLite",     "Sq",  "#6db3d9"],
            ["REST API",   "{}",  "#6ee7b7"]
        ]
    };

    // free-floating in the corners: [label, monogram, colour, x%, y%, bob seconds, delay]
    // (the stage corners sit outside the rings, so these never collide with orbiting chips)
    var DRIFT = [
        ["HTML5",    "5",   "#f16529",   6,   7,  7.5,  0  ],
        ["CSS3",     "3",   "#3d8fe0",  95,   8,  8.5, -2  ],
        ["AWS",      "AWS", "#ff9900",   3,  91,  9,   -4  ],
        ["GitHub",   "GH",  "#d6d6d6",  96,  92,  7,   -1  ]
    ];

    function makeChip(label, mono, colour) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.style.setProperty("--c", colour);

        var badge = document.createElement("i");
        badge.textContent = mono;

        chip.appendChild(badge);
        chip.appendChild(document.createTextNode(label));
        return chip;
    }

    function buildRing(el, items, offsetDeg) {
        if (!el) return;
        var step = 360 / items.length;

        items.forEach(function (item, i) {
            var slot = document.createElement("span");
            slot.className = "slot";
            slot.style.setProperty("--a", (offsetDeg + i * step) + "deg");

            var chip = makeChip(item[0], item[1], item[2]);
            chip.style.setProperty("--a", (offsetDeg + i * step) + "deg");

            slot.appendChild(chip);
            el.appendChild(slot);
        });
    }

    buildRing(document.querySelector('[data-ring="a"]'), RINGS.a, -90);
    buildRing(document.querySelector('[data-ring="b"]'), RINGS.b, -60);

    var drift = document.querySelector('[data-ring="drift"]');
    if (drift) {
        DRIFT.forEach(function (d) {
            var chip = makeChip(d[0], d[1], d[2]);
            chip.style.setProperty("--x", d[3] + "%");
            chip.style.setProperty("--y", d[4] + "%");
            chip.style.setProperty("--bt", d[5] + "s");
            chip.style.setProperty("--bd", d[6] + "s");
            drift.appendChild(chip);
        });
    }

    /* -----------------------------------------------------
       THE PLATE
       One symmetrical inkblot, generated fresh on every visit.
       Your photo lives inside the heavy centre of the blot and
       "develops" through the ink the first time the page loads.
    ----------------------------------------------------- */

    var READ = [
        "two figures leaning in to talk.",
        "a moth mid-landing.",
        "a mask with too many eyes.",
        "a server rack seen from above.",
        "a Venn diagram that overlaps completely.",
        "a butterfly that will not commit.",
        "a stack trace, folded in half.",
        "two people carrying one very large idea."
    ];

    var readingEl = document.getElementById("reading");
    if (readingEl) readingEl.textContent = READ[Math.floor(Math.random() * READ.length)];

    var cv = document.getElementById("blot");

    function mulberry(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function sstep(e0, e1, x) {
        var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
        return t * t * (3 - 2 * t);
    }

    function startPlate(photo) {
        var cx = cv.getContext("2d");
        var W = cv.width, H = cv.height, half = W >> 1;
        var rnd = mulberry(Math.floor(Math.random() * 2147483647));
        var INK = [13, 11, 7];

        function layer() {
            var c = document.createElement("canvas");
            c.width = W; c.height = H;
            return c;
        }

        /* soft blob (falls off from the centre) and solid blob (flat core, soft rim) */
        function soft(o, x, y, r, rot, sy) {
            o.save(); o.translate(x, y); o.rotate(rot); o.scale(1, sy);
            var g = o.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
            o.fillStyle = g; o.beginPath(); o.arc(0, 0, r, 0, Math.PI * 2); o.fill(); o.restore();
        }
        function solid(o, x, y, rx, ry) {
            o.save(); o.translate(x, y); o.scale(rx, ry);
            var g = o.createRadialGradient(0, 0, 0, 0, 0, 1);
            g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.7, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
            o.fillStyle = g; o.beginPath(); o.arc(0, 0, 1, 0, Math.PI * 2); o.fill(); o.restore();
        }

        /* M = the heavy body of the blot (this is where the photo shows)
           L = lobes, wings and splatter (ink only)                         */
        var mC = layer(), lC = layer(), m = mC.getContext("2d"), l = lC.getContext("2d"), k;

        solid(m, W * 0.5, H * 0.245, W * 0.20, H * 0.125);
        solid(m, W * 0.5, H * 0.44,  W * 0.30, H * 0.17);
        solid(m, W * 0.5, H * 0.63,  W * 0.38, H * 0.20);
        solid(m, W * 0.5, H * 0.775, W * 0.42, H * 0.15);
        for (k = 0; k < 9; k++) {            // ink-only bumps around the portrait
            solid(l, W * (0.5 - 0.27 - rnd() * 0.17), H * (0.2 + rnd() * 0.62),
                  W * (0.04 + rnd() * 0.06), W * (0.04 + rnd() * 0.07));
        }

        var n = 16 + Math.floor(rnd() * 8);
        for (k = 0; k < n; k++) {            // wings
            soft(l, W * 0.5 - (0.2 + rnd() * rnd() * 0.3) * W, H * (0.11 + rnd() * 0.76),
                 W * (0.05 + rnd() * 0.12), rnd() * Math.PI, 0.45 + rnd() * 0.9);
        }
        for (k = 0; k < 14; k++) {           // splatter
            soft(l, rnd() * W * 0.46, H * (0.12 + rnd() * 0.76), W * (0.014 + rnd() * 0.026), 0, 1);
        }

        /* keep only the left half of each layer's alpha; the right is mirrored */
        function halfAlpha(c) {
            var d = c.getContext("2d").getImageData(0, 0, half, H).data;
            var out = new Uint8Array(half * H);
            for (var i = 0; i < out.length; i++) out[i] = d[i * 4 + 3];
            return out;
        }
        var M = halfAlpha(mC), L = halfAlpha(lC);

        /* output layers */
        var inkC = layer(), phC = layer(), tmpC = layer();
        var inkX = inkC.getContext("2d"), phX = phC.getContext("2d"), tmpX = tmpC.getContext("2d");
        var inkD = inkX.createImageData(W, H), phD = phX.createImageData(W, H);
        var id = inkD.data, pd = phD.data;

        for (var q = 0; q < id.length; q += 4) { id[q] = INK[0]; id[q + 1] = INK[1]; id[q + 2] = INK[2]; }

        /* the photo, cover-fitted to the plate (drawn, never read back, so it
           also works when the page is opened straight from disk) */
        var pC = layer(), pX = pC.getContext("2d");
        if (photo) {
            var sc = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
            var pw = photo.naturalWidth * sc, ph = photo.naturalHeight * sc;
            pX.drawImage(photo, (W - pw) / 2, (H - ph) * 0.35, pw, ph);
        }

        function render(g) {
            var x, y, i, a, mv, ci, cp, i1, i2;
            for (y = 0; y < H; y++) {
                for (x = 0; x < half; x++) {
                    i = y * half + x;
                    mv = M[i] / 255 * g;
                    a = L[i] / 255 * g;
                    a = mv + a - mv * a;
                    ci = sstep(0.42, 0.5, a);
                    cp = photo ? sstep(0.72, 0.78, mv) * ci : 0;
                    i1 = (y * W + x) * 4 + 3;
                    i2 = (y * W + (W - 1 - x)) * 4 + 3;
                    id[i1] = id[i2] = ci * 255;
                    pd[i1] = pd[i2] = cp * 255;
                }
            }
            inkX.putImageData(inkD, 0, 0);
            cx.clearRect(0, 0, W, H);
            cx.drawImage(inkC, 0, 0);

            if (photo) {
                phX.putImageData(phD, 0, 0);
                tmpX.globalCompositeOperation = "source-over";
                tmpX.clearRect(0, 0, W, H);
                tmpX.drawImage(pC, 0, 0);
                tmpX.globalCompositeOperation = "destination-in";
                tmpX.drawImage(phC, 0, 0);
                tmpX.globalCompositeOperation = "source-over";
                cx.drawImage(tmpC, 0, 0);
            }
        }

        if (reduceMotion) { render(1); return; }

        /* bloom: ink spreads first, then the photo develops from the centre */
        var t0 = null, DUR = 2600;
        (function step(ts) {
            if (t0 === null) t0 = ts;
            var t = Math.min(1, (ts - t0) / DUR);
            var e = 1 - Math.pow(1 - t, 3);
            render(0.3 + 0.7 * e);
            if (t < 1) requestAnimationFrame(step);
        })(performance.now());
    }

    if (cv) {
        var photo = new Image();
        photo.onload = function () { startPlate(photo); };
        photo.onerror = function () { startPlate(null); };
        photo.src = "images/profile-hero.jpg";
    }

    /* -----------------------------------------------------
       PORTRAIT TILT (desktop pointers only)
    ----------------------------------------------------- */

    var stage = document.getElementById("stage");
    var portrait = document.getElementById("portrait");
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (stage && portrait && finePointer && !reduceMotion) {
        stage.addEventListener("pointermove", function (e) {
            var r = stage.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5;
            var y = (e.clientY - r.top) / r.height - 0.5;

            portrait.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
            portrait.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
        });

        stage.addEventListener("pointerleave", function () {
            portrait.style.setProperty("--ry", "0deg");
            portrait.style.setProperty("--rx", "0deg");
        });
    }
})();
