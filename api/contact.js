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
  const sprache = SPRACHE[lang];
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
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Website Stevan Sport Coaching <anfrage@stevansportcoaching.de>",
        to: process.env.CONTACT_TO,
        reply_to: email,
        subject: "Neue Anfrage: " + programmName + " – " + subjectName,
        html: html,
        text: text,
      }),
    });
  } catch (error) {
    console.error("contact: resend request failed");
    return res.status(502).json({ ok: false, error: "Versand fehlgeschlagen." });
  }

  if (!response.ok) {
    console.error("contact: resend status", response.status);
    return res.status(502).json({ ok: false, error: "Versand fehlgeschlagen." });
  }

  return res.status(200).json({ ok: true });
}
