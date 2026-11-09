(function () {
  "use strict";

  var de = document.documentElement.lang !== "sr";

  /* Mobiles Menü */
  var knopf = document.querySelector(".menue-knopf");
  var nav = document.getElementById("nav");
  if (knopf && nav) {
    var setze = function (offen) {
      nav.classList.toggle("offen", offen);
      document.body.classList.toggle("menue-offen", offen);
      knopf.setAttribute("aria-expanded", String(offen));
      knopf.setAttribute("aria-label", offen ? (de ? "Menü schließen" : "Zatvori meni") : (de ? "Menü öffnen" : "Otvori meni"));
    };
    knopf.addEventListener("click", function () { setze(!nav.classList.contains("offen")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setze(false); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setze(false); });
    window.matchMedia("(min-width: 1061px)").addEventListener("change", function () { setze(false); });
  }

  /* Programmauswahl über Link vorbelegen: kontakt.html?programm=... */
  var auswahl = document.getElementById("f-programm");
  if (auswahl) {
    var kurs = new URLSearchParams(location.search).get("programm");
    if (kurs) {
      for (var i = 0; i < auswahl.options.length; i++) {
        if (auswahl.options[i].value === kurs) auswahl.selectedIndex = i;
      }
    }
  }

  /* Anfrageformular */
  var form = document.querySelector("form.formular");
  if (form) {
    var status = form.querySelector(".formular__status");
    var texte = de ? {
      name: "Bitte geben Sie Ihren Namen an.",
      email: "Bitte geben Sie eine gültige E-Mail-Adresse an.",
      programm: "Bitte wählen Sie ein Programm aus.",
      zustimmung: "Bitte bestätigen Sie die Datenschutzhinweise.",
      gesendet: "Danke! Ihre Anfrage ist angekommen. Sie erhalten in Kürze eine persönliche Antwort.",
      fehler: "Die Anfrage konnte nicht gesendet werden. Bitte schreiben Sie direkt per E-Mail oder WhatsApp."
    } : {
      name: "Molimo unesite ime.",
      email: "Molimo unesite ispravnu e-mail adresu.",
      programm: "Molimo izaberite program.",
      zustimmung: "Molimo potvrdite napomenu o zaštiti podataka.",
      gesendet: "Hvala! Upit je stigao. Uskoro ćete dobiti lični odgovor.",
      fehler: "Upit nije poslat. Pišite direktno e-mailom ili preko WhatsApp-a."
    };

    var markiere = function (feld, meldung) {
      var box = document.getElementById(feld.id + "-fehler");
      feld.setAttribute("aria-invalid", meldung ? "true" : "false");
      if (box) box.textContent = meldung || "";
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      /* Spam-Schutz: das versteckte Feld füllen nur Bots aus */
      if (f.website && f.website.value) return;
      var ok = true;
      var pruefe = function (feld, bedingung, meldung) {
        markiere(feld, bedingung ? "" : meldung);
        if (!bedingung && ok) { feld.focus(); ok = false; }
      };
      pruefe(f.name, f.name.value.trim().length > 1, texte.name);
      pruefe(f.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()), texte.email);
      pruefe(f.programm, f.programm.value !== "", texte.programm);
      pruefe(f.zustimmung, f.zustimmung.checked, texte.zustimmung);
      if (!ok) return;

      var zeige = function (text) { status.textContent = text; status.hidden = false; status.focus(); };
      var ziel = form.getAttribute("data-endpoint");
      if (!ziel) { zeige(texte.fehler); return; }

      var senden = form.querySelector('[type="submit"]');
      if (senden) {
        senden.disabled = true;
        senden.setAttribute("aria-busy", "true");
      }
      fetch(ziel, {
        method: "POST",
        body: new URLSearchParams(new FormData(form)),
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); zeige(texte.gesendet); })
        .catch(function () { zeige(texte.fehler); })
        .then(function () {
          if (!senden) return;
          senden.disabled = false;
          senden.removeAttribute("aria-busy");
        });
    });

    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true") markiere(e.target, "");
    });
  }

  /* Galerie-Leuchtkasten */
  var kasten = document.querySelector(".leuchtkasten");
  var knoepfe = Array.prototype.slice.call(document.querySelectorAll(".galerie button"));
  if (knoepfe.length && kasten && kasten.showModal) {
    var bild = kasten.querySelector("img");
    var unter = kasten.querySelector("p");
    var aktuell = 0;
    var zeigeBild = function (n) {
      aktuell = (n + knoepfe.length) % knoepfe.length;
      var quelle = knoepfe[aktuell].querySelector("img");
      bild.src = knoepfe[aktuell].getAttribute("data-gross");
      bild.alt = quelle.alt;
      unter.textContent = quelle.alt;
    };
    knoepfe.forEach(function (b, n) {
      b.addEventListener("click", function () { zeigeBild(n); kasten.showModal(); });
    });
    kasten.querySelector(".leuchtkasten__zu").addEventListener("click", function () { kasten.close(); });
    kasten.querySelector(".leuchtkasten__nav--zurueck").addEventListener("click", function () { zeigeBild(aktuell - 1); });
    kasten.querySelector(".leuchtkasten__nav--weiter").addEventListener("click", function () { zeigeBild(aktuell + 1); });
    kasten.addEventListener("click", function (e) { if (e.target === kasten) kasten.close(); });
    kasten.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") zeigeBild(aktuell - 1);
      if (e.key === "ArrowRight") zeigeBild(aktuell + 1);
    });
  }

  /* Leinen im Hero: wo der Mauszeiger über eine Leine fährt, bekommt sie einen Stoß,
     und die Welle läuft von dort nach links und rechts die Kugeln entlang */
  var hero = document.querySelector(".hero");
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hero && window.HTMLCanvasElement && CanvasRenderingContext2D.prototype.roundRect) {
    var bahnen = hero.querySelectorAll(".slogan__bahn");
    var quellen = [];
    if (bahnen.length) quellen.push({ el: bahnen[0], oben: true });
    for (var b = 0; b < bahnen.length; b++) quellen.push({ el: bahnen[b], oben: false });

    var leinwand = document.createElement("canvas");
    leinwand.className = "hero__leinen";
    leinwand.setAttribute("aria-hidden", "true");
    hero.appendChild(leinwand);
    var ctx = leinwand.getContext("2d");
    /* Becken dahinter (unter dem Text): rechte Wand mit Startblöcken und T-Markierungen am Boden */
    var becken = document.createElement("canvas");
    becken.className = "hero__becken";
    becken.setAttribute("aria-hidden", "true");
    hero.insertBefore(becken, hero.firstChild);
    var bctx = becken.getContext("2d");
    /* Wie im Becken: alle Leinen weiß mit leichtem Blaustich, die letzten Meter vor beiden Wänden rot */
    var LEINENFARBEN = ["#dcecf7"];
    var ROT = "#d7363c", inhalt = 0, wand = 0, links = 0, KANTE = 3; /* rot vom Rand bis dorthin, wo der Inhalt der Seite beginnt bzw. endet */
    var textSpalte = hero.querySelector(".hero__text");
    /* Schattierung eines Schwimmkörpers von oben gesehen: runder Zylinder mit Glanz */
    var glanz = ctx.createLinearGradient(0, -6, 0, 6);
    glanz.addColorStop(0, "rgba(0,0,0,0.38)");
    glanz.addColorStop(0.28, "rgba(255,255,255,0.32)");
    glanz.addColorStop(0.5, "rgba(255,255,255,0.06)");
    glanz.addColorStop(1, "rgba(0,0,0,0.45)");

    var B = 14, leinen = [], breite = 0, hoehe = 0, dpr = 1;
    var vermesse = function () {
      var h = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      breite = h.width; hoehe = h.height;
      inhalt = textSpalte ? parseFloat(getComputedStyle(textSpalte).paddingLeft) || 0 : breite * 0.08;
      wand = breite - inhalt; /* rechte Beckenwand = rechter Rand des Seiteninhalts */
      links = Math.max(4, inhalt - 12); /* linke Beckenwand knapp vor dem Textanfang */
      [leinwand, becken].forEach(function (c) {
        c.width = Math.round(breite * dpr); c.height = Math.round(hoehe * dpr);
        c.style.width = breite + "px"; c.style.height = hoehe + "px";
      });
      leinen = quellen.map(function (q, n) {
        var r = q.el.getBoundingClientRect();
        var start = r.left - window.innerWidth - h.left; /* Leine beginnt bei -100vw, wie im CSS */
        var erste = Math.floor(-start / B) - 1;
        var anzahl = Math.ceil(breite / B) + 3;
        var alt = leinen[n];
        return {
          y: (q.oben ? r.top : r.bottom) - h.top,
          x0: start + erste * B + B / 2, index: erste, anzahl: anzahl,
          /* erster und letzter Schwimmkörper ganz im Wasser, ohne die Wand zu berühren */
          ende: Math.floor((wand - KANTE / 2 - 7.5 - (start + erste * B + B / 2)) / B),
          anfang: Math.ceil((links + KANTE / 2 + 7.5 - (start + erste * B + B / 2)) / B),
          pos: alt && alt.anzahl === anzahl ? alt.pos : new Float32Array(anzahl),
          v: alt && alt.anzahl === anzahl ? alt.v : new Float32Array(anzahl),
          px: alt && alt.anzahl === anzahl ? alt.px : new Float32Array(anzahl),
          vx: alt && alt.anzahl === anzahl ? alt.vx : new Float32Array(anzahl)
        };
      });
    };

    var zeichneBecken = function () {
      var c = bctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, breite, hoehe);
      var rand = breite - wand;
      var breit = rand >= 54 && links >= 54; /* auf schmalen Bildschirmen nur die Seitenwände */
      /* Becken als Rechteck: oben und unten ebenfalls ein Umgang (nur auf breiten Bildschirmen) */
      var oben = breit ? 34 : -20, unten = breit ? hoehe - 34 : hoehe + 20;
      /* Umgang mit Fliesen rund ums Becken */
      c.save();
      c.beginPath();
      c.rect(0, 0, breite, hoehe);
      c.rect(links, oben, wand - links, unten - oben);
      c.clip("evenodd");
      c.fillStyle = "#234f6d";
      c.fillRect(0, 0, breite, hoehe);
      c.strokeStyle = "rgba(255,255,255,0.05)";
      c.lineWidth = 1;
      c.beginPath();
      for (var fx = links % 28; fx < breite; fx += 28) { c.moveTo(fx + 0.5, 0); c.lineTo(fx + 0.5, hoehe); }
      for (var fy = oben % 28; fy < hoehe; fy += 28) { c.moveTo(0, fy + 0.5); c.lineTo(breite, fy + 0.5); }
      c.stroke();
      c.restore();
      /* Wasser wirkt an den Rändern etwas tiefer: weicher Schatten unter der Kante, rundum gleich */
      var schatten = function (x, y, w, h, gx0, gy0, gx1, gy1) {
        var g = c.createLinearGradient(gx0, gy0, gx1, gy1);
        g.addColorStop(0, "rgba(3,14,26,0.28)");
        g.addColorStop(1, "rgba(3,14,26,0)");
        c.fillStyle = g; c.fillRect(x, y, w, h);
      };
      var T = 22;
      schatten(links, oben, T, unten - oben, links, 0, links + T, 0);
      schatten(wand - T, oben, T, unten - oben, wand, 0, wand - T, 0);
      if (breit) {
        schatten(links, oben, wand - links, T, 0, oben, 0, oben + T);
        schatten(links, unten - T, wand - links, T, 0, unten, 0, unten - T);
      }
      /* Beckenkante rundum, mit leichtem Schatten zum Wasser */
      c.fillStyle = "rgba(214,230,240,0.45)";
      c.fillRect(links - KANTE / 2, oben - KANTE / 2, KANTE, unten - oben + KANTE);
      c.fillRect(wand - KANTE / 2, oben - KANTE / 2, KANTE, unten - oben + KANTE);
      if (breit) {
        c.fillRect(links - KANTE / 2, oben - KANTE / 2, wand - links + KANTE, KANTE);
        c.fillRect(links - KANTE / 2, unten - KANTE / 2, wand - links + KANTE, KANTE);
      }
      c.fillStyle = "rgba(0,0,0,0.18)";
      c.fillRect(links + KANTE / 2, oben + KANTE / 2, 2, unten - oben - KANTE);
      c.fillRect(wand - KANTE / 2 - 2, oben + KANTE / 2, 2, unten - oben - KANTE);
      if (breit) {
        c.fillRect(links + KANTE / 2, oben + KANTE / 2, wand - links - KANTE, 2);
        c.fillRect(links + KANTE / 2, unten - KANTE / 2 - 2, wand - links - KANTE, 2);
      }
      /* Überlaufrinne mit Gitter rund ums Becken, direkt neben der Kante */
      if (breit) {
        var a0 = KANTE / 2 + 2, rb = 10;
        var gL = links - a0 - rb, gR = wand + a0, gO = oben - a0 - rb, gU = unten + a0;
        c.fillStyle = "rgba(220,232,240,0.2)";
        c.fillRect(gL, gO, rb, gU + rb - gO);
        c.fillRect(gR, gO, rb, gU + rb - gO);
        c.fillRect(gL, gO, gR + rb - gL, rb);
        c.fillRect(gL, gU, gR + rb - gL, rb);
        c.fillStyle = "rgba(4,16,28,0.42)";
        for (var gy = gO + 2; gy < gU + rb - 2; gy += 6) { c.fillRect(gL + 1.5, gy, 7, 2.5); c.fillRect(gR + 1.5, gy, 7, 2.5); }
        for (var gx = gL + 2; gx < gR + rb - 2; gx += 6) { c.fillRect(gx, gO + 1.5, 2.5, 7); c.fillRect(gx, gU + 1.5, 2.5, 7); }
      }

      /* pro Bahn: T-Markierung am Boden und Startblock auf dem Umgang */
      for (var b = 0; b < leinen.length - 1; b++) {
        var mitte = (leinen[b].y + leinen[b + 1].y) / 2, bahn = leinen[b + 1].y - leinen[b].y;
        /* T-Markierungen vor beiden Wänden (auf schmalen Bildschirmen nicht) */
        c.fillStyle = "rgba(5,20,35,0.35)";
        var tH = Math.min(44, bahn * 0.4);
        if (rand >= 54) {
          c.fillRect(wand - KANTE / 2 - 110, mitte - 3, 100, 6);
          c.fillRect(wand - KANTE / 2 - 16, mitte - tH / 2, 6, tH);
        }
        if (links < 54) continue;
        c.fillRect(links + KANTE / 2 + 10, mitte - 3, 100, 6);
        c.fillRect(links + KANTE / 2 + 10, mitte - tH / 2, 6, tH);
        /* Startblock auf dem linken Umgang, mit Blick aufs Wasser */
        var bh = Math.min(48, bahn * 0.42), bw = Math.min(44, links - 38), bx = links - KANTE / 2 - 22 - bw, by = mitte - bh / 2;
        c.fillStyle = "rgba(0,0,0,0.28)";
        c.beginPath(); c.roundRect(bx + 3, by + 4, bw, bh, 4); c.fill();
        var platte = c.createLinearGradient(bx, 0, bx + bw, 0);
        platte.addColorStop(0, "#dfe7ed");
        platte.addColorStop(0.65, "#f2f6f9");
        platte.addColorStop(1, "#c9d6df");
        c.fillStyle = platte;
        c.beginPath(); c.roundRect(bx, by, bw, bh, 4); c.fill();
        /* rutschfeste Fläche vorne zum Wasser, Nummer hinten */
        c.fillStyle = "#1677b8";
        c.beginPath(); c.roundRect(bx + bw * 0.5 - 3, by + 4, bw * 0.5, bh - 8, 2); c.fill();
        c.fillStyle = "#102a43";
        c.font = "800 " + Math.round(bh * 0.36) + "px Archivo, sans-serif";
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(String(b + 1), bx + bw * 0.24, mitte + 1);
      }

      var untenY = Math.min(hoehe - 60, leinen[leinen.length - 1].y + 120);

      /* Rettungsring auf dem rechten Umgang: rot-weiß */
      if (rand >= 80) {
        var rx = wand + KANTE / 2 + 14 + (rand - KANTE / 2 - 14) / 2, ry = untenY, R = Math.min(26, rand * 0.2);
        c.fillStyle = "rgba(0,0,0,0.28)";
        c.beginPath(); c.arc(rx + 3, ry + 4, R + R * 0.25, 0, Math.PI * 2); c.arc(rx + 3, ry + 4, R * 0.55, 0, Math.PI * 2, true); c.fill();
        c.lineWidth = R * 0.5;
        for (var k = 0; k < 8; k++) {
          c.strokeStyle = k % 2 ? "#f4f4f2" : "#d7363c";
          c.beginPath(); c.arc(rx, ry, R, k * Math.PI / 4, (k + 1) * Math.PI / 4); c.stroke();
        }
        /* Glanz */
        c.lineWidth = 1.5;
        c.strokeStyle = "rgba(255,255,255,0.35)";
        c.beginPath(); c.arc(rx, ry, R, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
      }

      if (breit && rand >= 90 && links >= 90) {
        /* Badetuch, von oben: Streifen an den Enden, Fransen, leichter Knick in der Mitte */
        var tuch = function (tx, ty, w, h, winkel, farbe, streifen) {
          c.save();
          c.translate(tx, ty); c.rotate(winkel);
          c.fillStyle = "rgba(0,0,0,0.25)";
          c.beginPath(); c.roundRect(-w / 2 + 3, -h / 2 + 4, w, h, 4); c.fill();
          c.fillStyle = farbe;
          c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 4); c.fill();
          c.fillStyle = streifen;
          [-1, 1].forEach(function (sg) {
            c.fillRect(-w / 2, sg * (h / 2 - 14) - 3, w, 4);
            c.fillRect(-w / 2, sg * (h / 2 - 22) - 1.5, w, 2);
          });
          var knick = c.createLinearGradient(-w / 2, 0, w / 2, 0);
          knick.addColorStop(0, "rgba(255,255,255,0.08)");
          knick.addColorStop(0.5, "rgba(0,0,0,0.14)");
          knick.addColorStop(0.52, "rgba(255,255,255,0.1)");
          knick.addColorStop(1, "rgba(0,0,0,0.06)");
          c.fillStyle = knick;
          c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 4); c.fill();
          c.strokeStyle = farbe; c.lineWidth = 1;
          c.beginPath();
          for (var fr = -w / 2 + 3; fr < w / 2; fr += 4) {
            c.moveTo(fr, -h / 2); c.lineTo(fr, -h / 2 - 4);
            c.moveTo(fr, h / 2); c.lineTo(fr, h / 2 + 4);
          }
          c.stroke();
          c.restore();
        };
        /* nasser Fußabdruck; seite 1 = rechter Fuß, -1 = linker */
        var fuss = function (fx, fy, winkel, seite, alpha) {
          c.save();
          c.translate(fx, fy); c.rotate(winkel); c.scale(seite * 1.45, 1.45);
          c.fillStyle = "rgba(6,22,38," + alpha + ")";
          c.beginPath(); c.ellipse(0, -3, 4.4, 5.8, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.ellipse(0.4, 7, 3.2, 3.8, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.ellipse(2.2, 2.4, 1.8, 4, 0, 0, Math.PI * 2); c.fill();
          [[-2.4, -11, 2], [0.3, -11.6, 1.4], [2.3, -10.8, 1.2], [3.9, -9.4, 1.05], [5, -7.6, 0.9]].forEach(function (z) {
            c.beginPath(); c.arc(z[0], z[1], z[2], 0, Math.PI * 2); c.fill();
          });
          c.restore();
        };
        /* Spur von (x1,y1) nach (x2,y2); am Anfang nass, zum Ende hin trocknend */
        var spur = function (x1, y1, x2, y2, nassAmAnfang) {
          var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
          var winkel = Math.atan2(dx, -dy), nx = -dy / len, ny = dx / len;
          var schritte = Math.floor(len / 34);
          for (var k = 0; k <= schritte; k++) {
            var t = k / Math.max(1, schritte), seite = k % 2 ? 1 : -1;
            var nass = nassAmAnfang ? 1 - t * 0.7 : 0.3 + t * 0.7;
            fuss(x1 + dx * t + nx * seite * 9, y1 + dy * t + ny * seite * 9, winkel, seite, (0.42 * nass).toFixed(2));
          }
        };
        /* Badelatschen, paarweise: Sohle vorn breiter, Zehensteg als V */
        var latsche = function (lx, ly, winkel, sohle, riemen) {
          [[-1, 0], [1, 6]].forEach(function (p) {
            c.save();
            c.translate(lx, ly); c.rotate(winkel); c.translate(p[0] * 12.5, p[1]); c.rotate(p[0] * 0.06); c.scale(p[0] * 1.15, 1.15);
            c.fillStyle = "rgba(0,0,0,0.28)";
            c.beginPath(); c.ellipse(2, -2, 7, 11, 0, 0, Math.PI * 2); c.ellipse(2.4, 11, 5.6, 8, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = sohle;
            c.beginPath(); c.ellipse(0, -4, 7, 11, 0, 0, Math.PI * 2); c.ellipse(0.4, 9, 5.6, 8, 0, 0, Math.PI * 2); c.fill();
            c.strokeStyle = riemen; c.lineWidth = 2.6; c.lineCap = "round";
            c.beginPath(); c.moveTo(-6.2, 2); c.quadraticCurveTo(-3, -6, -0.6, -9); c.quadraticCurveTo(2.5, -5, 6.4, 2); c.stroke();
            c.fillStyle = riemen;
            c.beginPath(); c.arc(-0.6, -9, 1.6, 0, Math.PI * 2); c.fill();
            c.restore();
          });
        };

        /* Mitte des freien Umgangs links (vor der Rinne) und rechts (hinter der Rinne) */
        var mL = (links - KANTE / 2 - 14) / 2;
        var mR = wand + KANTE / 2 + 14 + (breite - wand - KANTE / 2 - 14) / 2;
        var tw = Math.min(62, (links - 40) * 0.6), th = Math.round(tw * 1.75);
        var letzte = leinen[leinen.length - 1].y;
        /* rechts: Handtuch oben, nasse Spur vom Beckenrand dorthin, Ring und Latschen weiter unten */
        var tuchY = Math.max(oben + th / 2 + 26, leinen[0].y + 50);
        tuch(mR, tuchY, tw, th, 0.06, "#28b8bf", "rgba(255,255,255,0.85)");
        spur(wand + KANTE / 2 + 28, letzte - 30, mR - 4, tuchY + th / 2 + 18, true);
        latsche(mR, Math.min(unten - 40, untenY + 92), -Math.PI / 2 + 0.12, "#d7363c", "#f4f4f2");
        /* links: Latschen oben, Handtuch unten, Spur vom Handtuch zum Startblock 3 */
        latsche(mL, Math.max(oben + 52, leinen[0].y - 50), Math.PI / 2 - 0.1, "#28b8bf", "#102a43");
        var tuchLY = Math.min(unten - th / 2 - 26, letzte + 130);
        tuch(mL, tuchLY, tw, th, -0.06, "#f2f6f9", "rgba(22,119,184,0.9)");
        spur(mL + 6, tuchLY - th / 2 - 18, mL + 2, letzte - 22, false);
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
    };

    var zeichne = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, breite, hoehe);
      leinen.forEach(function (l, nr) {
        var grund = LEINENFARBEN[nr % LEINENFARBEN.length];
        /* Seil vom Haken in der Wand bis zum ersten bzw. letzten Schwimmkörper */
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "rgba(200,215,225,0.7)";
        ctx.fillRect(links + KANTE / 2, l.y - 1, l.x0 + l.anfang * B - links - KANTE / 2, 2);
        ctx.fillRect(l.x0 + l.ende * B, l.y - 1, wand - KANTE / 2 - l.x0 - l.ende * B, 2);
        for (var i = 0; i < l.anzahl; i++) {
          if (i > l.ende) break;
          if (i < l.anfang) continue;
          var x = l.x0 + i * B + l.px[i];
          var y = l.y + 10 * Math.tanh(l.pos[i] / 10);
          /* der Schwimmkörper kippt mit der Welle */
          var davor = i > 0 ? l.pos[i - 1] : l.pos[i], danach = i < l.anzahl - 1 ? l.pos[i + 1] : l.pos[i];
          var kipp = Math.atan2(danach - davor, 2 * B) * 0.8;
          ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
          ctx.rotate(kipp);
          var nr2 = ((l.index + i) % 10 + 10) % 10;
          /* im weißen Teil ab und zu ein blauer Schwimmkörper, damit die Leine nicht eintönig ist */
          /* je fünf rote Schwimmkörper vor jeder Wand */
          ctx.fillStyle = i < l.anfang + 5 || i > l.ende - 5 ? ROT : nr2 === 0 ? "#1677b8" : nr2 === 1 ? "#7fb6dc" : grund;
          ctx.beginPath();
          ctx.roundRect(-6.2, -6, 12.4, 12, 3.5);
          ctx.fill();
          ctx.fillStyle = glanz;
          ctx.fill();
          /* Rillen der Scheiben */
          ctx.fillStyle = "rgba(0,0,0,0.16)";
          ctx.fillRect(-0.6, -5, 1.2, 10);
        }
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    var laeuft = false, zeiger = null, zuletzt = 0;
    var schritt = function () {
      var tempo = 0, auslenkung = 0;
      leinen.forEach(function (l, nr) {
        var p = l.pos, v = l.v, px = l.px, vx = l.vx, n = l.anzahl;
        var nachbar = [leinen[nr - 1], leinen[nr + 1]];
        var dy = zeiger ? l.y - zeiger.y : 999;
        for (var i = 0; i < n; i++) {
          /* Leine: Nachbarkugeln ziehen (Welle läuft), Auftrieb zieht zurück, Wasser bremst */
          var links = i > 0 ? p[i - 1] : 0, rechts = i < n - 1 ? p[i + 1] : 0;
          v[i] += 0.07 * (links + rechts - 2 * p[i]) - 0.005 * p[i];
          var hl = i > 0 ? px[i - 1] : 0, hr = i < n - 1 ? px[i + 1] : 0;
          vx[i] += 0.05 * (hl + hr - 2 * px[i]) - 0.012 * px[i];
          /* das Wasser gibt einen kleinen Teil der Welle an die Nachbarleinen weiter */
          nachbar.forEach(function (m) { if (m && m.anzahl === n) v[i] += 0.0012 * (m.pos[i] - p[i]); });
          /* Zeiger wie ein Finger im Wasser: drückt die Kugeln in der Nähe sanft weg */
          if (Math.abs(dy) < 46) {
            var ddx = l.x0 + i * B + px[i] - zeiger.x;
            if (Math.abs(ddx) < 46) {
              var abst = Math.sqrt(ddx * ddx + dy * dy);
              if (abst < 46) {
                var kraft = (1 - abst / 46) * (1 - abst / 46) * 0.2;
                v[i] += kraft * (dy >= 0 ? 1 : -1) * (1 - Math.abs(p[i]) / 16);
                vx[i] += kraft * 0.5 * (ddx >= 0 ? 1 : -1);
              }
            }
          }
          v[i] *= 0.972; vx[i] *= 0.95;
        }
        for (var k = 0; k < n; k++) {
          /* an der Wand festgemacht: dort bewegt sich nichts, die Welle wird zurückgeworfen */
          if (k >= l.ende - 1 || k <= l.anfang + 1) { p[k] = v[k] = px[k] = vx[k] = 0; continue; }
          p[k] = Math.max(-16, Math.min(16, p[k] + v[k]));
          px[k] = Math.max(-6, Math.min(6, px[k] + vx[k]));
          tempo += Math.abs(v[k]) + Math.abs(vx[k]);
          auslenkung += Math.abs(p[k]) + Math.abs(px[k]);
        }
      });
      zeichne();
      /* ruht der Zeiger, bleibt die Leine eingedrückt stehen; ohne Zeiger kehrt sie ganz zurück */
      var aktiv = zeiger && Date.now() - zuletzt < 400;
      if (tempo > 0.3 || aktiv || (!zeiger && auslenkung > 0.5)) { requestAnimationFrame(schritt); return; }
      if (!zeiger) { leinen.forEach(function (l) { l.pos.fill(0); l.v.fill(0); l.px.fill(0); l.vx.fill(0); }); zeichne(); }
      laeuft = false;
    };
    var starte = function () { if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } };

    if (!ruhig) hero.addEventListener("pointermove", function (e) {
      var h = hero.getBoundingClientRect();
      var mx = e.clientX - h.left, my = e.clientY - h.top;
      if (zeiger) {
        /* Stoß in Bewegungsrichtung: schnelles Durchziehen schlägt eine größere Welle */
        var vx = mx - zeiger.x, vy = my - zeiger.y;
        leinen.forEach(function (l) {
          var dy = l.y - my;
          if (Math.abs(dy) > 60) return;
          var naehe = Math.exp(-(dy * dy) / 1000);
          var stoss = Math.max(-30, Math.min(30, vy)) * 0.035 * naehe;
          var schub = Math.max(-30, Math.min(30, vx)) * 0.02 * naehe;
          var mitte = Math.round((mx - l.x0) / B);
          for (var i = Math.max(0, mitte - 8); i <= Math.min(l.anzahl - 1, mitte + 8); i++) {
            var dx = l.x0 + i * B - mx;
            var g = Math.exp(-(dx * dx) / 2400);
            l.v[i] += stoss * g;
            l.vx[i] += schub * g;
          }
        });
      }
      zeiger = { x: mx, y: my };
      zuletzt = Date.now();
      starte();
    });
    hero.addEventListener("pointerleave", function () { zeiger = null; starte(); });


    vermesse(); zeichneBecken(); zeichne();
    hero.classList.add("hero--leinwand");
    var neu = function () { vermesse(); zeichneBecken(); zeichne(); };
    if (window.ResizeObserver) new ResizeObserver(neu).observe(hero);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(neu);
  }

  /* Die drei Wörter des Slogans sind Schwimmer: nach kurzem Warten am Start schwimmen sie gleichmäßig
     und gemeinsam, mit kleinen Abständen, bis ans rechte Ende ihrer Bahn, wenden ruhig und kehren
     zum Start zurück, wo sie bleiben. Die Buchstaben schlagen dabei eine sanfte Welle (CSS). */
  if (hero && !ruhig) {
    var slogan = hero.querySelector(".slogan");
    document.documentElement.classList.add("animiraj");
    slogan.classList.add("slogan--geteilt");
    var schwimmer = Array.prototype.map.call(hero.querySelectorAll(".slogan__text"), function (el, nr) {
      /* Buchstaben einzeln verpacken; der Vorleser liest das aria-label der Überschrift */
      var zeichen = el.textContent.split("");
      el.textContent = "";
      zeichen.forEach(function (z, n) {
        var b = document.createElement("span");
        b.className = "slogan__zeichen";
        b.style.setProperty("--n", n);
        b.style.setProperty("--m", zeichen.length - 1 - n);
        b.textContent = z;
        el.appendChild(b);
      });
      return { el: el, weg: 0, abstand: nr * 0.035, x: 0, teil: -1, blase: Math.random() * 0.4 };
    });

    /* Bläschen hinter dem Schwimmer: steigen auf, treiben nach hinten weg und verschwinden */
    var blase = function (x, y, richtung) {
      var bl = document.createElement("span");
      bl.className = "blase";
      bl.setAttribute("aria-hidden", "true");
      var g = 3 + Math.random() * 6;
      bl.style.width = bl.style.height = g + "px";
      bl.style.left = x + "px";
      bl.style.top = (y + (Math.random() - 0.5) * 30) + "px";
      bl.style.setProperty("--dx", (-richtung * (12 + Math.random() * 30)) + "px");
      bl.style.setProperty("--dy", (-12 - Math.random() * 26) + "px");
      bl.style.animationDuration = (1.2 + Math.random() * 1) + "s";
      bl.addEventListener("animationend", function () { bl.remove(); });
      hero.appendChild(bl);
    };
    var messen = function () {
      var h = hero.getBoundingClientRect();
      /* die Wand ist der rechte Rand des Seiteninhalts, gleich weit vom Rand wie der Start links */
      var rand = parseFloat(getComputedStyle(hero.querySelector(".hero__text")).paddingLeft) || 16;
      schwimmer.forEach(function (s) {
        var r = document.createRange();
        r.selectNodeContents(s.el);
        var w = r.getBoundingClientRect();
        var rechts = w.right - s.x - h.left; /* aktuelle Verschiebung herausrechnen */
        s.weg = Math.max(0, h.width - rand - 5 - rechts);
      });
    };
    /* eine Bahn dauert gut 4 s; hin, kurz an der Wand, zurück, am Start bleiben */
    var phase = 0, TEMPO = 0.23, W = 0.28, alt = 0, sichtbarS = true, laeuftS = false;
    var lage = function (q) {
      if (q <= 0) return { u: 0, teil: -1 };
      if (q < 1) return { u: q, teil: 0 };
      if (q < 1 + W) return { u: 1, teil: 1, f: (q - 1) / W };
      if (q < 2 + W) {
        /* von der Feder weggeschleudert: schnell los, dann ruhig ausgleiten bis zum Start */
        var d = q - 1 - W;
        return { u: 1 - (d + 0.28 * Math.sin(Math.PI * d)), teil: 2, los: d / TEMPO };
      }
      return { u: 0, teil: 3 };
    };
    /* Wort als Feder an der Wand: erst zusammendrücken, dann loslassen und ausschwingen */
    var STAUCH = 0.5;
    var feder = function (l) {
      if (l.teil === 1) {
        var f = Math.min(1, l.f / 0.75); /* zusammendrücken, am Ende kurz gespannt halten */
        return 1 - STAUCH * f * f * (3 - 2 * f);
      }
      if (l.teil === 2 && l.los < 2.5) return 1 - STAUCH * Math.exp(-3.2 * l.los) * Math.cos(2 * Math.PI * 1.9 * l.los);
      return 1;
    };
    var takt = function (zeit) {
      var dt = alt ? Math.min(0.05, (zeit - alt) / 1000) : 0;
      alt = zeit;
      phase += TEMPO * dt;
      var fertig = true;
      schwimmer.forEach(function (s) {
        var l = lage(phase - s.abstand);
        /* gleichmäßig schwimmen, nur an Start und Wand sanft an- und abbremsen */
        var e = (1 - Math.cos(Math.PI * l.u)) / 2;
        var x = l.teil === 2 ? l.u * s.weg : (0.6 * l.u + 0.4 * e) * s.weg;
        s.el.style.translate = x.toFixed(1) + "px 0";
        s.x = x;
        var sx = feder(l);
        s.el.style.scale = sx === 1 ? "" : sx.toFixed(3) + " " + (1 + (1 - sx) * 0.22).toFixed(3);
        /* beim Schwimmen in kleinen Abständen Bläschen am Ende des Wortes */
        if ((l.teil === 0 || l.teil === 2) && l.u > 0.02 && l.u < 0.98) {
          s.blase -= dt;
          if (s.blase <= 0) {
            s.blase = 0.18 + Math.random() * 0.35;
            var h = hero.getBoundingClientRect(), r = s.el.getBoundingClientRect();
            var richtung = l.teil === 0 ? 1 : -1;
            blase((richtung > 0 ? r.left + 6 : r.right - 6) - h.left, r.top + r.height * 0.55 - h.top, richtung);
          }
        }
        if (l.teil !== s.teil) {
          if (l.teil === 1) s.el.classList.add("slogan__text--zurueck");
          if (l.teil === 3) s.el.classList.add("slogan__text--ziel");
          s.teil = l.teil;
        }
        if (l.teil !== 3) fertig = false;
      });
      if (fertig) { laeuftS = false; zuEnde = true; return; }
      if (sichtbarS) requestAnimationFrame(takt); else { laeuftS = false; alt = 0; }
    };
    var zuEnde = false, bereit = false;
    var los = function () { if (bereit && !laeuftS && sichtbarS && !zuEnde) { laeuftS = true; requestAnimationFrame(takt); } };
    messen();
    if (window.ResizeObserver) new ResizeObserver(messen).observe(hero);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(messen);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { sichtbarS = e[0].isIntersecting && !document.hidden; los(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      sichtbarS = !document.hidden && hero.getBoundingClientRect().bottom > 0; los();
    });
    /* eine Sekunde nach dem Laden losschwimmen (die Wörter sind dann schon eingeflogen) */
    setTimeout(function () { messen(); slogan.classList.add("slogan--schwimmt"); bereit = true; los(); }, 1000);
  }

  /* Wie ein Finger, der das Wasser berührt: ein Klick in den Hero zieht einen kaum sichtbaren Kreis */
  if (hero && !ruhig) {
    hero.addEventListener("click", function (e) {
      if (e.detail === 0) return; /* Klick per Tastatur: kein Ort, kein Kreis */
      var h = hero.getBoundingClientRect();
      /* nur auf dem Wasser, nicht auf dem Umgang mit den Fliesen */
      var innen = parseFloat(getComputedStyle(hero.querySelector(".hero__text")).paddingLeft) || 0;
      var lw = Math.max(4, innen - 12), rw = h.width - innen, breitB = innen >= 54;
      var kx = e.clientX - h.left, ky = e.clientY - h.top;
      if (kx < lw || kx > rw || (breitB && (ky < 34 || ky > h.height - 34))) return;
      var kr = document.createElement("span");
      kr.className = "kreis";
      kr.setAttribute("aria-hidden", "true");
      kr.style.left = (e.clientX - h.left) + "px";
      kr.style.top = (e.clientY - h.top) + "px";
      kr.addEventListener("animationend", function () { kr.remove(); });
      hero.appendChild(kr);
    });
  }

  /* Karte erst nach Klick laden (keine Daten an Google ohne Zustimmung) */
  var karte = document.querySelector(".karte button");
  if (karte) {
    karte.addEventListener("click", function () {
      var box = karte.closest(".karte");
      var frame = document.createElement("iframe");
      frame.src = box.getAttribute("data-src");
      frame.title = box.getAttribute("data-titel");
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      box.innerHTML = "";
      box.appendChild(frame);
    });
  }
})();
