const PROGRAMME = {
  kinder: "Schwimmen für Kinder",
  erwachsene: "Schwimmen für Erwachsene",
  technik: "Schwimmtechnik verbessern",
  triathlon: "Triathlon-Schwimmtraining",
  personal: "Personal Training",
  gymnastik: "Gymnastik & Koordination",
  wellness: "Wellness- / Entspannungsmassage",
  mobil: "Mobile Massage (bei Ihnen zu Hause)",
  sonstiges: "Sonstiges",
};

const PROGRAMME_SR = {
  kinder: "Plivanje za decu",
  erwachsene: "Plivanje za odrasle",
  technik: "Usavršavanje tehnike plivanja",
  triathlon: "Plivanje za triatlon",
  personal: "Individualni sportski trening",
  gymnastik: "Gimnastika i koordinacija",
  wellness: "Wellness / relaksaciona masaža",
  mobil: "Mobilna masaža (kod vas kući)",
  sonstiges: "Ostalo",
};

const SPRACHE = {
  de: "Deutsch",
  sr: "Srpski",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function field(body, key) {
  const value = body[key];
  if (Array.isArray(value)) return value.length ? String(value[0]) : "";
  if (value == null) return "";
  return String(value);
}

function parseUrlEncoded(raw) {
  const data = {};
  const params = new URLSearchParams(raw);
  for (const [key, value] of params.entries()) data[key] = value;
  return data;
}

async function readBody(req) {
  const body = req.body;
  if (typeof body === "string") return parseUrlEncoded(body);
  if (Buffer.isBuffer(body)) return parseUrlEncoded(body.toString("utf8"));
  if (body && typeof body === "object") return body;
  if (!req.readable) return {};

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return {};
  return parseUrlEncoded(Buffer.concat(chunks).toString("utf8"));
}

function berlinZeit() {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
}

function berlinKurz(date) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type).value;
  return pick("day") + "." + pick("month") + "." + pick("year") + ", " + pick("hour") + ":" + pick("minute");
}

function kuerze(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function eigeneAdresse(adresse) {
  const domain = adresse.slice(adresse.lastIndexOf("@") + 1).toLowerCase().replace(/\.$/, "");
  return domain === "stevansportcoaching.de" || domain.endsWith(".stevansportcoaching.de");
}

function htmlZeilen(zeilen) {
  return zeilen
    .map((zeile) => {
      return (
        "<tr>" +
        '<td width="34%" style="width:34%;padding:10px 12px 10px 0;border-bottom:1px solid #e6eef2;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#5b6b7c;vertical-align:top;">' +
        escapeHtml(zeile[0]) +
        "</td>" +
        '<td style="padding:10px 0;border-bottom:1px solid #e6eef2;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.45;color:#102a43;vertical-align:top;word-break:break-word;">' +
        zeile[1] +
        "</td></tr>"
      );
    })
    .join("");
}

function bestaetigung(lang, angaben) {
  const sr = lang === "sr";
  const copy = sr
    ? {
        subject: "Vaš upit je primljen – Stevan Sport Coaching",
        vorschau: "Vaš upit je primljen. Ovo nije rezervacija.",
        hallo: "Zdravo " + angaben.name + ",",
        danke: "hvala vam na upitu.",
        hinweis:
          "Ovo je potvrda da je vaš upit primljen, a ne rezervacija. Mesto je rezervisano tek kada dobijete ličnu potvrdu sa terminom i cenom.",
        uebersicht: "Pregled upita",
        antwort: "Stevan vam lično odgovara u kratkom roku.",
        telefon: "Telefon",
        email: "E-mail",
        labels: ["Program", "Ime", "E-mail", "Telefon", "Poruka", "Poslato"],
      }
    : {
        subject: "Ihre Anfrage bei Stevan Sport Coaching ist angekommen",
        vorschau: "Ihre Anfrage ist angekommen. Dies ist keine Reservierung.",
        hallo: "Guten Tag " + angaben.name + ",",
        danke: "vielen Dank für Ihre Anfrage.",
        hinweis:
          "Dies ist eine Bestätigung, dass Ihre Anfrage angekommen ist, keine Reservierung. Ihr Platz ist erst reserviert, wenn Sie eine persönliche Bestätigung mit Termin und Preis erhalten.",
        uebersicht: "Ihre Angaben",
        antwort: "Stevan antwortet Ihnen persönlich in Kürze.",
        telefon: "Telefon",
        email: "E-Mail",
        labels: ["Programm", "Name", "E-Mail", "Telefon", "Nachricht", "Gesendet"],
      };

  const werte = [
    angaben.programm,
    angaben.name,
    angaben.email,
    angaben.telefon,
    angaben.nachricht,
    angaben.zeit,
  ];
  const text = [
    copy.hallo,
    "",
    copy.danke,
    "",
    copy.hinweis,
    "",
    copy.uebersicht + ":",
    copy.labels.map((label, index) => label + ": " + werte[index]).join("\n"),
    "",
    copy.antwort,
    "",
    copy.telefon + ": +49 176 14913804",
    "WhatsApp: https://wa.me/4917614913804",
    copy.email + ": stevan.sportcoaching@gmail.com",
    "",
    "Stevan Stefanović",
    "Stevan Sport Coaching",
    "Ingolstadt",
  ].join("\n");

  const absatz = "margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#102a43;";
  const html = [
    '<!DOCTYPE html><html lang="' + (sr ? "sr" : "de") + '"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>" + escapeHtml(copy.subject) + "</title></head>",
    '<body style="margin:0;padding:0;background:#eef3f6;">',
    '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' + escapeHtml(copy.vorschau) + "</div>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3f6;margin:0;padding:0;">',
    '<tr><td align="center" style="padding:24px 12px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;">',
    '<tr><td style="background:#102a43;padding:22px 24px;">',
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.14em;color:#28b8bf;font-weight:bold;">STEVAN</p>',
    '<p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:#ffffff;font-weight:bold;">Sport Coaching</p>',
    "</td></tr>",
    '<tr><td style="height:4px;background:#28b8bf;font-size:0;line-height:0;">&nbsp;</td></tr>',
    '<tr><td style="padding:28px 24px 32px;">',
    '<p style="' + absatz + '">' + escapeHtml(copy.hallo) + "</p>",
    '<p style="' + absatz + '">' + escapeHtml(copy.danke) + "</p>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">',
    '<tr><td style="border-left:4px solid #28b8bf;background:#f3fbfb;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#102a43;">',
    escapeHtml(copy.hinweis),
    "</td></tr></table>",
    '<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.04em;font-weight:bold;color:#28b8bf;">' +
      escapeHtml(copy.uebersicht) +
      "</p>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">',
    htmlZeilen(copy.labels.map((label, index) => [label, escapeHtml(werte[index]).replace(/\r\n|\r|\n/g, "<br>")])),
    "</table>",
    '<p style="' + absatz + '">' + escapeHtml(copy.antwort) + "</p>",
    '<p style="' + absatz + 'margin-bottom:0;">' +
      escapeHtml(copy.telefon) +
      ': <a href="tel:+4917614913804" style="color:#28b8bf;text-decoration:underline;">+49 176 14913804</a><br>' +
      'WhatsApp: <a href="https://wa.me/4917614913804" style="color:#28b8bf;text-decoration:underline;">https://wa.me/4917614913804</a><br>' +
      escapeHtml(copy.email) +
      ': <a href="mailto:stevan.sportcoaching@gmail.com" style="color:#28b8bf;text-decoration:underline;">stevan.sportcoaching@gmail.com</a></p>',
    '<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e6eef2;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#102a43;">' +
      "<strong>Stevan Stefanović</strong><br>Stevan Sport Coaching<br>Ingolstadt</p>",
    "</td></tr></table></td></tr></table></body></html>",
  ].join("");

  return { subject: copy.subject, html: html, text: text };
}

async function sende(payload) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Nur POST ist erlaubt." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    console.error("contact: body could not be read");
    return res.status(400).json({ ok: false, error: "Anfrage konnte nicht gelesen werden." });
  }

  const website = field(body, "website").trim();
  if (website) return res.status(200).json({ ok: true });

  const geladenRoh = field(body, "t").trim();
  const geladen = Number(geladenRoh);
  if (!/^\d{13}$/.test(geladenRoh) || Date.now() - geladen < 3000) {
    return res.status(200).json({ ok: true });
  }

  const name = field(body, "name").trim();
  const email = field(body, "email").trim();
  const telefon = field(body, "telefon").trim();
  const programm = field(body, "programm").trim();
  const nachricht = field(body, "nachricht").trim();
  const zustimmung = field(body, "zustimmung").trim();
  const lang = field(body, "lang").trim();

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ ok: false, error: "Name muss zwischen 2 und 100 Zeichen lang sein." });
  }
  const nameKlein = name.toLowerCase();
  if (nameKlein.includes("http") || nameKlein.includes("www.") || name.includes("<")) {
    return res.status(200).json({ ok: true });
  }
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Ungültige E-Mail-Adresse." });
  }
  if (telefon.length > 40) {
    return res.status(400).json({ ok: false, error: "Telefonnummer ist zu lang." });
  }
  if (!Object.prototype.hasOwnProperty.call(PROGRAMME, programm)) {
    return res.status(400).json({ ok: false, error: "Ungültiges Programm." });
  }
  if (nachricht.length > 3000) {
    return res.status(400).json({ ok: false, error: "Nachricht ist zu lang." });
  }
  if (!zustimmung) {
    return res.status(400).json({ ok: false, error: "Zustimmung fehlt." });
  }
  if (lang !== "de" && lang !== "sr") {
    return res.status(400).json({ ok: false, error: "Ungültige Sprache." });
  }

  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_TO) {
    console.error("contact: RESEND_API_KEY or CONTACT_TO is not set");
    return res.status(502).json({ ok: false, error: "Versand derzeit nicht möglich." });
  }

  const programmName = PROGRAMME[programm];
  const programmAnzeige = lang === "sr" ? PROGRAMME_SR[programm] : programmName;
  const sprache = SPRACHE[lang];
  const jetzt = new Date();
  const zeit = berlinZeit();
  const telefonAnzeige = telefon || "–";
  const nachrichtAnzeige = nachricht || "–";
  const subjectName = name.replace(/[\r\n]+/g, " ");

  const text = [
    "Name: " + name,
    "E-Mail: " + email,
    "Telefon: " + telefonAnzeige,
    "Programm: " + programmName,
    "Nachricht: " + nachrichtAnzeige,
    "Sprache der Seite: " + sprache,
    "Eingegangen: " + zeit + " (Europe/Berlin)",
  ].join("\n");

  const html = [
    "<p><strong>Name:</strong> " + escapeHtml(name) + "</p>",
    "<p><strong>E-Mail:</strong> " + escapeHtml(email) + "</p>",
    "<p><strong>Telefon:</strong> " + escapeHtml(telefonAnzeige) + "</p>",
    "<p><strong>Programm:</strong> " + escapeHtml(programmName) + "</p>",
    "<p><strong>Nachricht:</strong><br>" + escapeHtml(nachrichtAnzeige).replace(/\r\n|\r|\n/g, "<br>") + "</p>",
    "<p><strong>Sprache der Seite:</strong> " + escapeHtml(sprache) + "</p>",
    "<p><strong>Eingegangen:</strong> " + escapeHtml(zeit) + " (Europe/Berlin)</p>",
  ].join("");

  let response;
  try {
    response = await sende({
      from: "Website Stevan Sport Coaching <anfrage@stevansportcoaching.de>",
      to: process.env.CONTACT_TO,
      reply_to: email,
      subject: "Neue Anfrage: " + programmName + " – " + subjectName,
      html: html,
      text: text,
    });
  } catch (error) {
    console.error("contact: resend request failed");
    return res.status(502).json({ ok: false, error: "Versand fehlgeschlagen." });
  }

  if (!response.ok) {
    console.error("contact: resend status", response.status);
    return res.status(502).json({ ok: false, error: "Versand fehlgeschlagen." });
  }

  if (eigeneAdresse(email)) return res.status(200).json({ ok: true });

  const nachrichtKurz = kuerze(nachricht, 1000);
  const mail = bestaetigung(lang, {
    name: name,
    email: email,
    telefon: telefonAnzeige,
    programm: programmAnzeige,
    nachricht: nachrichtKurz || "–",
    zeit: berlinKurz(jetzt),
  });

  try {
    const bestaetigt = await sende({
      from: "Stevan Sport Coaching <anfrage@stevansportcoaching.de>",
      to: email,
      reply_to: process.env.CONTACT_TO,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (!bestaetigt.ok) console.error("contact: confirmation status", bestaetigt.status);
  } catch (error) {
    console.error("contact: confirmation request failed");
  }

  return res.status(200).json({ ok: true });
}
