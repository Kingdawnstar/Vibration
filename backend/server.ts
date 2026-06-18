import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API - Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', academy: 'Vibration Guitar Academy' });
  });

  // 2. API - Gemini-powered Lesson Content Optimizer
  app.post('/api/ai/suggest', async (req, res) => {
    try {
      const { title, category } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Lesson title is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Safe mock fallback for when API key is missing, so it doesn't crash
        return res.json({
          content: `### 🎸 ${title} - Lesson Guide\n\n*(Note: Gemini API key not configured. This is a generic blueprint.)*\n\nWelcome to this **${category || 'Guitar'}** masterclass! \n\n#### 🎯 Lesson Objective\nLearn the basic structure, hand positioning, and rhythm patterns for "${title}".\n\n#### 📋 Tabs & Chords Preview\n\`\`\`\nE|--0---2---4---0--|\nB|--0---3---5---0--|\nG|--1---2---4---1--|\nD|--2---0----0---2--|\nA|--2--------------|\nE|--0--------------|\n\`\`\`\n\n#### ⚡ Practice Tip\nStart slow at 60 BPM and increment by 5 BPM once you achieve clean fret clarity!`,
          isMock: true
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a professional elite guitar instructor at Vibration Guitar Academy. Create a detailed, beautiful, highly engaging markdown-formatted lesson post for the topic: "${title}" under the category: "${category || 'General'}". Include structural practice tips, a visual chord or tab ASCII diagram, and clear learning milestones. Keep the tone friendly, encouraging, and focused.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const textValue = response.text || 'Unable to generate content structure. Please check input parameters.';
      return res.json({ content: textValue, isMock: false });
    } catch (e: any) {
      console.error('Gemini Suggest API Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error during content generation' });
    }
  });

  // 3. API - Nodemailer Lesson Newsletter Announcements
  app.post('/api/notify', async (req, res) => {
    try {
      const { emails, postTitle, postPreview, postUrl } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Recipient emails array is required' });
      }
      if (!postTitle || !postUrl) {
        return res.status(400).json({ error: 'Post title and post URL are required' });
      }

      // Lazy-initialization of SMTP transport parameters
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT || '587';
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || '"Vibration Guitar Academy" <newsletter@vibration-academy.com>';

      console.log(`Sending guitar lesson alerts for "${postTitle}" to ${emails.length} subscribers...`);

      if (!smtpHost || !smtpUser || !smtpPass) {
        // Return a successful development mode simulated dispatch when credentials aren't set
        console.warn('SMTP Credentials unconfigured. Simulating standard newsletter alert in local logs.');
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

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ff5a1f; margin: 0 0 8px 0; font-size: 26px; tracking: -0.05em;">🎸 VIBRATION</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">WhatsApp Guitar School & Academy</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 24px;" />
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">New Guitar Lesson Live!</h2>
          <p style="font-size: 16px; color: #374151; font-weight: bold; margin-bottom: 12px;">"${postTitle}"</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            ${postPreview || 'Grab your guitar and start practicing. A brand new elite tab sheet, audio lesson tracker, and diagram sheet are waiting for you inside.'}
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

      // Batch send (bcc to keep emails private)
      await transporter.sendMail({
        from: smtpFrom,
        bcc: emails.join(','),
        subject: `🎸 New Lesson: ${postTitle} | Vibration Guitar Academy`,
        text: `New Guitar Lesson: "${postTitle}" is live. Check it out here: ${postUrl}`,
        html: htmlContent
      });

      return res.json({ success: true, simulated: false });
    } catch (err: any) {
      console.error('Nodemailer dispatch alert error:', err);
      return res.status(500).json({ error: err.message || 'Failed to dispatch email newsletter alert' });
    }
  });

  // 4. Vite middleware configuration for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Vibration Server] Running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
