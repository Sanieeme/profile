/* =========================================================
   SITE  ·  theme toggle, nav highlight, scroll reveal,
   hero spotlight, pipeline line, and the contact form
========================================================= */

(function () {
    "use strict";

    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }


    /* -----------------------------------------------------
       SHARED SENDER  (used by the contact form AND the
       collaboration form). Both deliver to ONE inbox: the
       address in each form's action attribute.
       1) try the quick AJAX route (no page change)
       2) if the browser blocks that (e.g. page opened from a
          file, strict network), fall back to a normal form
          post so the message still gets through
    ----------------------------------------------------- */

    window.snSend = function (form, payload) {
        var url = form.getAttribute("action").replace("formsubmit.co/", "formsubmit.co/ajax/");
        var ctrl = window.AbortController ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);

        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload),
            signal: ctrl ? ctrl.signal : undefined
        })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (d) {
                    clearTimeout(timer);
                    var good = res.ok && (d.success === true || d.success === "true");
                    return good ? { status: "ok" } : { status: "error", message: d.message };
                });
            })
            .catch(function () {
                clearTimeout(timer);
                return { status: navigator.onLine === false ? "offline" : "fallback" };
            });
    };

    window.snNative = function (form, payload) {
        var f = document.createElement("form");
        f.method = "POST";
        f.action = form.getAttribute("action");
        f.style.display = "none";

        var data = {};
        Object.keys(payload).forEach(function (k) { data[k] = payload[k]; });
        data._next = new URL("thankyou.html", window.location.href).href;

        Object.keys(data).forEach(function (k) {
            var i = document.createElement("input");
            i.type = "hidden"; i.name = k; i.value = data[k];
            f.appendChild(i);
        });
        document.body.appendChild(f);
        f.submit();
    };

    /* -----------------------------------------------------
       THEME
    ----------------------------------------------------- */

    var toggle = $("#themeToggle");
    var metaTheme = $('meta[name="theme-color"]');

    function stored() {
        try { return localStorage.getItem("theme"); } catch (e) { return null; }
    }

    function paintTheme(t) {
        root.setAttribute("data-theme", t);
        if (metaTheme) metaTheme.setAttribute("content", t === "light" ? "#f5f0e4" : "#050505");
        if (toggle) {
            toggle.setAttribute("aria-label", t === "light" ? "Switch to dark mode" : "Switch to light mode");
            toggle.setAttribute("aria-pressed", t === "light" ? "true" : "false");
        }
    }

    paintTheme(root.getAttribute("data-theme") || "dark");

    if (toggle) {
        toggle.addEventListener("click", function () {
            var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
            try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }

            if (document.startViewTransition && !reduceMotion) {
                var r = toggle.getBoundingClientRect();
                root.style.setProperty("--tx", (r.left + r.width / 2) + "px");
                root.style.setProperty("--ty", (r.top + r.height / 2) + "px");
                document.startViewTransition(function () { paintTheme(next); });
            } else {
                paintTheme(next);
            }
        });
    }

    // follow the system setting until the visitor picks one themselves
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function (e) {
            if (!stored()) paintTheme(e.matches ? "light" : "dark");
        });
    }

    /* -----------------------------------------------------
       NAV — highlight the section in view
    ----------------------------------------------------- */

    if ("IntersectionObserver" in window) {
        var links = {};
        $$(".nav-links a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });

        var navIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                Object.keys(links).forEach(function (k) { links[k].classList.toggle("is-active", k === en.target.id); });
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        Object.keys(links).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) navIO.observe(el);
        });
    }

    /* -----------------------------------------------------
       HERO SPOTLIGHT (mouse only)
    ----------------------------------------------------- */

    var hero = $(".hero");
    var spot = $(".hero-spot");

    if (hero && spot && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        hero.addEventListener("pointermove", function (e) {
            var r = hero.getBoundingClientRect();
            spot.style.setProperty("--mx", (e.clientX - r.left) + "px");
            spot.style.setProperty("--my", (e.clientY - r.top) + "px");
        });
    }

    /* -----------------------------------------------------
       SCROLL REVEAL
    ----------------------------------------------------- */

    if ("IntersectionObserver" in window) {
        var sel = [
            ".cf .sec-head", ".cf .facts", ".cf .cred", ".cf .proj", ".cf .mini",
            ".cf .alx > *", ".cf .pstage", ".cf .kit > *", ".cf .note",
            ".cf .private-card", ".cf .mail-facts", ".cf .compose"
        ].join(",");

        var items = $$(sel);
        items.forEach(function (el) {
            var idx = $$(":scope > " + el.tagName.toLowerCase(), el.parentNode).indexOf(el);
            el.setAttribute("data-reveal", "");
            el.style.setProperty("--rd", Math.min(Math.max(idx, 0), 4) * 0.08 + "s");
        });

        root.classList.add("reveal-ready");

        var revIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add("is-in");
                    revIO.unobserve(en.target);
                }
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

        items.forEach(function (el) { revIO.observe(el); });
    }

    /* -----------------------------------------------------
       CONTACT FORM
       Delivered to ONE inbox only: the address in the form's
       action attribute. No cc, no auto-reply, nothing stored
       on this site (only a draft in the visitor's own browser).
    ----------------------------------------------------- */

    var form = $("#contactForm");
    if (!form) return;

    var sentPanel = $("#sentPanel");
    var formError = $("#formError");
    var counter = $("#counter");
    var draftState = $("#draftState");
    var sendBtn = $("#sendBtn");
    var f = form.elements;

    var MAX = 2000;
    var AJAX_URL = form.getAttribute("action").replace("formsubmit.co/", "formsubmit.co/ajax/");
    var TO_ADDR = form.getAttribute("action").split("/").pop();
    var DRAFT_KEY = "sn_contact_draft";
    var COOLDOWN_MS = 30000;

    // time-of-day greeting in the placeholder
    var hr = new Date().getHours();
    var greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    f.message.placeholder = greet + " Shonisani, I'd love to talk about…";

    function topic() {
        var c = form.querySelector('input[name="topic"]:checked');
        return c ? c.value : "Hello";
    }

    /* ---- validation ---- */

    var rules = {
        name: function (v) { return v.trim().length >= 2 ? "" : "Please tell me your name."; },
        email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "That email doesn't look right — I need it to reply."; },
        message: function (v) {
            var n = v.trim().length;
            if (n < 10) return "A few more words, please (at least 10 characters).";
            if (n > MAX) return "That's a bit long — please keep it under " + MAX + " characters.";
            return "";
        }
    };

    function check(name) {
        var msg = rules[name](f[name].value);
        var row = f[name].closest(".row") || f[name].closest(".msg-wrap");
        var err = $("#err-" + name);
        if (err) err.textContent = msg;
        if (row) row.classList.toggle("invalid", !!msg);
        f[name].setAttribute("aria-invalid", msg ? "true" : "false");
        return !msg;
    }

    ["name", "email", "message"].forEach(function (n) {
        f[n].addEventListener("blur", function () { if (f[n].value) check(n); });
        f[n].addEventListener("input", function () {
            if (f[n].getAttribute("aria-invalid") === "true") check(n);
        });
    });

    /* ---- counter + draft ---- */

    function updateCounter() {
        var n = f.message.value.length;
        counter.textContent = n + " / " + MAX;
        counter.classList.toggle("warn", n > MAX - 200);
    }

    var draftTimer = null;

    function saveDraft() {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                name: f.name.value, email: f.email.value, topic: topic(), message: f.message.value
            }));
            draftState.textContent = "Draft saved";
            draftState.classList.add("show");
            setTimeout(function () { draftState.classList.remove("show"); }, 1600);
        } catch (e) { /* storage unavailable: fine */ }
    }

    function clearDraft() {
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    }

    form.addEventListener("input", function () {
        updateCounter();
        clearTimeout(draftTimer);
        draftTimer = setTimeout(saveDraft, 600);
    });

    try {
        var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
        if (d) {
            f.name.value = d.name || "";
            f.email.value = d.email || "";
            f.message.value = d.message || "";
            var r = form.querySelector('input[name="topic"][value="' + d.topic + '"]');
            if (r) r.checked = true;
            if (d.message) {
                draftState.textContent = "Draft restored";
                draftState.classList.add("show");
            }
        }
    } catch (e) { /* ignore */ }

    updateCounter();

    /* ---- sending ---- */

    function showError(text, withMailto) {
        formError.textContent = text + " ";
        if (withMailto) {
            var a = document.createElement("a");
            a.href = "mailto:" + TO_ADDR +
                "?subject=" + encodeURIComponent("Portfolio · " + topic()) +
                "&body=" + encodeURIComponent(f.message.value);
            a.textContent = "Open it in your email app instead";
            formError.appendChild(a);
            formError.appendChild(document.createTextNode("."));
        }
        formError.hidden = false;
    }

    function finishSending() {
        form.classList.remove("is-sending");
        sendBtn.disabled = false;
        sendBtn.setAttribute("aria-busy", "false");
    }

    function showSent() {
        var when = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        $("#rcTopic").textContent = topic();
        $("#rcTime").textContent = "today, " + when;
        $("#rcFrom").textContent = f.email.value.trim();
        try { sessionStorage.setItem("sn_sent_at", String(Date.now())); } catch (e) { /* ignore */ }
        clearDraft();
        form.hidden = true;
        sentPanel.hidden = false;
        $("#sentTitle").focus();
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        formError.hidden = true;

        var ok = ["name", "email", "message"].map(check).every(Boolean);
        if (!ok) {
            var bad = form.querySelector('[aria-invalid="true"]');
            if (bad) bad.focus();
            return;
        }

        // honeypot: real people never fill this in
        if (f._honey && f._honey.value) { showSent(); return; }

        // gentle cooldown so a double-click can't send two copies
        try {
            var last = Number(sessionStorage.getItem("sn_sent_at") || 0);
            if (Date.now() - last < COOLDOWN_MS) {
                showError("You just sent a message — please give it a moment before sending another.", false);
                return;
            }
        } catch (err) { /* ignore */ }

        form.classList.add("is-sending");
        sendBtn.disabled = true;
        sendBtn.setAttribute("aria-busy", "true");

        var payload = {
            name: f.name.value.trim(),
            email: f.email.value.trim(),
            topic: topic(),
            message: f.message.value.trim(),
            _subject: "Portfolio · " + topic() + " · from " + f.name.value.trim(),
            _template: "table",
            _captcha: "false"
        };

        window.snSend(form, payload).then(function (r) {
            if (r.status === "ok") { finishSending(); showSent(); }
            else if (r.status === "fallback") {
                showError("Switching to the standard sending method…", false);
                window.snNative(form, payload);          // leaves the page, lands on thankyou.html
            } else if (r.status === "offline") {
                finishSending();
                showError("You seem to be offline. Your message is saved here, so try again when you're back online.", true);
            } else {
                finishSending();
                showError("The message didn't go through" + (r.message ? " (" + r.message + ")" : "") + ".", true);
            }
        });
    });

    $("#sendAnother").addEventListener("click", function () {
        form.reset();
        updateCounter();
        $$(".row, .msg-wrap", form).forEach(function (r) { r.classList.remove("invalid"); });
        sentPanel.hidden = true;
        form.hidden = false;
        f.name.focus();
    });
})();
