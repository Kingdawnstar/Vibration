var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// backend/server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// backend/app.ts
var import_express = __toESM(require("express"), 1);
var import_genai = require("@google/genai");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PRESET_GUITAR_BULLETINS = [
  {
    id: "greeny_origin",
    category: "ARTIST TRIVIA",
    title: "How Gary Moore Kept Peter Green\u2019s Vintage Legacy Alive",
    description: 'The legendary "Greeny" 1959 Gibson Les Paul Standard was sold by Fleetwood Mac founder Peter Green to Gary Moore in 1970 for just $300. Green wanted to ensure the instrument remained in the hands of a musician who would play it with true soul, rather than a museum collector.',
    source: "Fretboard Journal",
    date: "Today",
    imageUrl: "/src/assets/images/gibson_1959_greeny_1781878999953.jpg"
  },
  {
    id: "voyager_solo",
    category: "GUITAR FACT",
    title: "The Only Guitar Solo Sailing in Interstellar Space",
    description: `Chuck Berry's famous 1958 hit "Johnny B. Goode" is officially flying through deep interstellar space! The track was included on the Voyager Golden Records launched by NASA in 1977, representing human artistic achievement to any extraterrestrial finders.`,
    source: "NASA Space Science",
    date: "Yesterday",
    imageUrl: "/src/assets/images/gibson_1958_flying_v_1781879034258.jpg"
  },
  {
    id: "strat_golden_myth",
    category: "GEAR NEWS",
    title: "Fender\u2019s First Stratocaster #0001 Gold Hardware Secret",
    description: "The legendary Fender Stratocaster bearing serial number #0001 was not the first model off the line, but rather a rare personalized luxury commission. It features an exquisite ash body with a custom white-blonde finish, gold-anodized pickguard, and gold tuner pegs, owned most famously by David Gilmour.",
    source: "Guitar World",
    date: "Just In",
    imageUrl: "/src/assets/images/fender_1954_stratocaster_1781879018435.jpg"
  },
  {
    id: "dangelico_skyscraper",
    category: "LUTHERIE TRIVIA",
    title: "How Archtop Pioneer John D\u2019Angelico Carved New York\u2019s Skyline",
    description: "Master luthier John D'Angelico carved incredible archtop acoustic jazz guitars in Little Italy during the 1930s and 40s. To capture the raw modernist hustle of the era, he famously designed his headstocks to reflect the iconic Art Deco skyscrapers rising across New York.",
    source: "Vintage Guitar Magazine",
    date: "Weekly Special",
    imageUrl: "/src/assets/images/d_angelico_new_yorker_1781879049457.jpg"
  },
  {
    id: "fretboard_physics",
    category: "TONE SCIENCE",
    title: "Why Thicker Jumbo Frets Give You Noticeably Better Sustain",
    description: "Fret sizes do more than influence feeling! Thicker jumbo frets lift your fingertips completely off the fretboard wood. This reduces skin friction against the fretboard, maximizing the transfer of clean vibration energy from string straight to neck wood.",
    source: "Vibration Research Lab",
    date: "Acoustic Science",
    imageUrl: "/src/assets/images/gibson_1959_greeny_1781878999953.jpg"
  },
  {
    id: "flyingv_init_fail",
    category: "GUITAR FACT",
    title: "The Modernist 1958 Flying V was Initially a Commercial Failure",
    description: "When first introduced in 1958, the Flying V was so radically futuristic that traditional list-makers completely rejected it. Gibson shipped only 81 units in its debut year and quickly discontinued production. Today, original 1958 Korina V\u2019s are worth millions of dollars.",
    source: "Fretboard Archive",
    date: "Throwback",
    imageUrl: "/src/assets/images/gibson_1958_flying_v_1781879034258.jpg"
  }
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", academy: "Vibration Guitar Academy" });
});
app.get("/api/guitar-bulletin", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const customImages = [
      "/src/assets/images/gibson_1959_greeny_1781878999953.jpg",
      "/src/assets/images/gibson_1958_flying_v_1781879034258.jpg",
      "/src/assets/images/fender_1954_stratocaster_1781879018435.jpg",
      "/src/assets/images/d_angelico_new_yorker_1781879049457.jpg"
    ];
    if (!apiKey) {
      console.log("[Vibration Live Bulletin] No Gemini API key. Serving randomized preset local archive.");
      const shuffled = [...PRESET_GUITAR_BULLETINS].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5).map((fact, index) => ({
        ...fact,
        imageUrl: customImages[index % customImages.length]
      }));
      return res.json({ bulletins: selected, isDynamic: false });
    }
    const ai = new import_genai.GoogleGenAI({ apiKey });
    const prompt = `Generate a JSON array of exactly 5 highly compelling, authentic, and educational guitar news updates, famous builder history, or elite acoustic/electric trivia facts from around the web. Keep the entries diverse, real, and extremely informative for active guitar students. Each item must contain a unique ID, a premium category, a modern attractive headline (title), a detailed block of description text explaining the trivia/news, a valid publisher/source, and a daily timeline relative date.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              id: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING, description: "Choose from: ARTIST TRIVIA, TONE SCIENCE, GEAR NEWS, GUITAR FACT, LUTHERIE TRIVIA" },
              title: { type: import_genai.Type.STRING, description: "Catchy modern headline under 60 characters" },
              description: { type: import_genai.Type.STRING, description: "Intriguing body description about the lore, fact, or news under 250 characters" },
              source: { type: import_genai.Type.STRING, description: "Journalistic publisher source like Guitar World, Premier Guitar, Vintage Guitar" },
              date: { type: import_genai.Type.STRING, description: "Relative date e.g. Today, Yesterday, Featured, Daily, Hot Gossip" }
            },
            required: ["id", "category", "title", "description", "source", "date"]
          }
        }
      }
    });
    const textValue = response.text;
    if (textValue) {
      const parsedBulletins = JSON.parse(textValue.trim());
      const customizedBulletins = parsedBulletins.map((item, idx) => ({
        ...item,
        imageUrl: customImages[idx % customImages.length]
      }));
      return res.json({ bulletins: customizedBulletins, isDynamic: true });
    }
    throw new Error("Empty response from model");
  } catch (err) {
    console.error("Error in /api/guitar-bulletin endpoint:", err);
    const customImages = [
      "/src/assets/images/gibson_1959_greeny_1781878999953.jpg",
      "/src/assets/images/gibson_1958_flying_v_1781879034258.jpg",
      "/src/assets/images/fender_1954_stratocaster_1781879018435.jpg",
      "/src/assets/images/d_angelico_new_yorker_1781879049457.jpg"
    ];
    const fallbackSlice = PRESET_GUITAR_BULLETINS.slice(0, 5).map((f, i) => ({
      ...f,
      imageUrl: customImages[i % customImages.length]
    }));
    return res.json({ bulletins: fallbackSlice, isDynamic: false, error: err.message });
  }
});
app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Lesson title is required" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        content: `### \u{1F3B8} ${title} - Lesson Guide

*(Note: Gemini API key not configured. This is a generic blueprint.)*

Welcome to this **${category || "Guitar"}** masterclass! 

#### \u{1F3AF} Lesson Objective
Learn the basic structure, hand positioning, and rhythm patterns for "${title}".

#### \u{1F4CB} Tabs & Chords Preview
\`\`\`
E|--0---2---4---0--|
B|--0---3---5---0--|
G|--1---2---4---1--|
D|--2---0----0---2--|
A|--2--------------|
E|--0--------------|
\`\`\`

#### \u26A1 Practice Tip
Start slow at 60 BPM and increment by 5 BPM once you achieve clean fret clarity!`,
        isMock: true
      });
    }
    const ai = new import_genai.GoogleGenAI({ apiKey });
    const prompt = `You are a professional elite guitar instructor at Vibration Guitar Academy. Create a detailed, beautiful, highly engaging markdown-formatted lesson post for the topic: "${title}" under the category: "${category || "General"}". Include structural practice tips, a visual chord or tab ASCII diagram, and clear learning milestones. Keep the tone friendly, encouraging, and focused.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    const textValue = response.text || "Unable to generate content structure. Please check input parameters.";
    return res.json({ content: textValue, isMock: false });
  } catch (e) {
    console.error("Gemini Suggest API Error:", e);
    return res.status(500).json({ error: e.message || "Internal server error during content generation" });
  }
});
app.post("/api/notify", async (req, res) => {
  try {
    const { emails, postTitle, postPreview, postUrl } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "Recipient emails array is required" });
    }
    if (!postTitle || !postUrl) {
      return res.status(400).json({ error: "Post title and post URL are required" });
    }
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || "587";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || '"Vibration Guitar Academy" <newsletter@vibration-academy.com>';
    console.log(`Sending guitar lesson alerts for "${postTitle}" to ${emails.length} subscribers...`);
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP Credentials unconfigured. Simulating standard newsletter alert in local logs.");
      return res.json({
        success: true,
        simulated: true,
        message: `Newsletter alert logged for: "${postTitle}" dispatched to ${emails.length} subscribers.`,
        payload: {
          title: postTitle,
          preview: postPreview,
          url: postUrl,
          recipients: emails
        }
      });
    }
    const transporter = import_nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === "465",
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff5a1f; margin: 0 0 8px 0; font-size: 26px; tracking: -0.05em;">\u{1F3B8} VIBRATION</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Vibration Guitar Academy</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 24px;" />
        <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">New Guitar Lesson Live!</h2>
        <p style="font-size: 16px; color: #374151; font-weight: bold; margin-bottom: 12px;">"${postTitle}"</p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          ${postPreview || "Grab your guitar and start practicing. A brand new elite tab sheet, audio lesson tracker, and diagram sheet are waiting for you inside."}
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${postUrl}" style="background-color: #ff5a1f; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 15px; font-weight: 500; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(255, 90, 31, 0.2);">
            Open Guitar Lesson
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-top: 28px; margin-bottom: 16px;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5; margin: 0;">
          You are receiving this because you signed up for lessons at Vibration Guitar Academy.<br />
          To modify how you receive alerts, update your student notifications dashboard.
        </p>
      </div>
    `;
    await transporter.sendMail({
      from: smtpFrom,
      bcc: emails.join(","),
      subject: `\u{1F3B8} New Lesson: ${postTitle} | Vibration Guitar Academy`,
      text: `New Guitar Lesson: "${postTitle}" is live. Check it out here: ${postUrl}`,
      html: htmlContent
    });
    return res.json({ success: true, simulated: false });
  } catch (err) {
    console.error("Nodemailer dispatch alert error:", err);
    return res.status(500).json({ error: err.message || "Failed to dispatch email newsletter alert" });
  }
});
var app_default = app;

// backend/server.ts
var PORT = 3e3;
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app_default.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app_default.use(import_express2.default.static(distPath));
    app_default.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app_default.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vibration Server] Running successfully on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
