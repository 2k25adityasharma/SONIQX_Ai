const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(__dirname, 'dist');
const CONFIG_PATH = path.join(__dirname, 'email_config.json');

// Cache Ethereal test account if created
let cachedEtherealAccount = null;

// MIME types lookup
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.cjs': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// Helper to load SMTP & Gemini config dynamically on every request
function getSMTPConfig() {
    let config = {
        smtp_service: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_secure: true,
        smtp_user: 'soniqx.earhealth.report@gmail.com',
        smtp_pass: 'rdlk zjgd lowl uexi',
        gemini_api_key: ''
    };

    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const fileData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            config = { ...config, ...fileData };
        } catch (err) {
            console.error('[SONIQX Server] Error reading email_config.json:', err.message);
        }
    }

    // Override from environment variables if present
    if (process.env.SMTP_USER) config.smtp_user = process.env.SMTP_USER;
    if (process.env.SMTP_PASS) config.smtp_pass = process.env.SMTP_PASS;
    if (process.env.GEMINI_API_KEY) config.gemini_api_key = process.env.GEMINI_API_KEY;

    return config;
}

// Fallback 1-2 line audiology answer generator
function generateLocalAudiologyAnswer(q, mode, lang) {
    const query = (q || '').toLowerCase();
    const isEs = lang === 'es';
    const isHi = lang === 'hi';

    if (query.includes('ringing') || query.includes('tinnitus') || query.includes('sound in ear')) {
        if (isHi) return "टिनिटस (कान में घंटी बजना) का इलाज सफेद शोर (White Noise) थेरेपी और सुरक्षित वॉल्यूम स्तरों से किया जाता है।\nध्वनि चिकित्सा और ऑडियोलॉजिस्ट जांच से लाभ मिलता है।";
        if (isEs) return "El tinnitus (zumbido en los oídos) se trata con terapia de sonido y protección auditiva.\nSe recomienda evitar ruidos fuertes y realizar un examen audiológico.";
        return "Tinnitus (ringing in ears) is commonly managed with sound therapy and safe listening habits.\nAvoiding loud noise exposure helps protect your hearing health.";
    }

    if (query.includes('headphone') || query.includes('earphone') || query.includes('volume') || query.includes('loud')) {
        if (isHi) return "सुरक्षित सुनने के लिए 60/60 नियम का पालन करें: 60% वॉल्यूम पर अधिकतम 60 मिनट तक सुनें।\nस्टीरियो हेडफोन दोनों कानों की अलग-अलग जांच करते हैं।";
        if (isEs) return "Siga la regla 60/60: escuche al 60% del volumen durante máximo 60 minutos continuos.\nLos auriculares estéreo evalúan cada oído de forma independiente.";
        return "Follow the 60/60 rule: Listen at max 60% volume for no more than 60 minutes at a time.\nStereo headphones isolate left and right ears for accurate testing.";
    }

    if (query.includes('frequency') || query.includes('hz') || query.includes('pitch') || query.includes('db')) {
        if (isHi) return "आवृत्ति (Hz) ध्वनि के तारत्व को दर्शाती है (500Hz से 8000Hz)।\nसामान्य सुनवाई का स्तर 0 से 25 dB HL के बीच होता है।";
        if (isEs) return "La frecuencia en Hertz (Hz) mide el tono de 500 Hz a 8000 Hz.\nEl rango de audición normal es de 0 a 25 dB HL.";
        return "Frequencies from 500 Hz to 8000 Hz measure sound pitch from bass to treble.\nNormal hearing thresholds fall between 0 and 25 dB HL.";
    }

    if (query.includes('report') || query.includes('pdf') || query.includes('email') || query.includes('doctor')) {
        if (isHi) return "आप परीक्षण पूरा होने पर अपनी आधिकारिक पीडीएफ रिपोर्ट डाउनलोड या ईमेल कर सकते हैं।\nरिपोर्ट में ग्राफ और विस्तृत ऑडियोलॉजिकल निष्कर्ष शामिल हैं।";
        if (isEs) return "Puede descargar su informe oficial en PDF y enviarlo a su médico por correo electrónico.\nIncluye la curva del audiograma y hallazgos clínicos.";
        return "You can generate your official clinical PDF report at the end of screening and email it directly to your doctor.\nIt includes your audiometric curve and audiological insights.";
    }

    if (mode === 'child') {
        return `Sparky AI: Great question about "${q}"!\nPut on your magic headphones and tap the glowing star whenever you hear a fun sound! 🎈`;
    }

    return `SONIQX AI: Audiometry measures hearing thresholds across speech frequencies (500Hz - 8000Hz).\nPlease wear stereo headphones and follow the tone prompts on screen.`;
}

// Request Handler
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // API Endpoint: AI Chat (Gemini API with 1-2 line constraint)
    if (req.url === '/api/ai-chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1024 * 1024) req.destroy();
        });

        req.on('end', async () => {
            try {
                const { question, mode = 'adult', language = 'en' } = JSON.parse(body || '{}');
                const config = getSMTPConfig();
                const apiKey = process.env.GEMINI_API_KEY || config.gemini_api_key;

                let aiAnswer = '';

                if (apiKey) {
                    try {
                        console.log(`[SONIQX Gemini API] Sending question to Gemini API: "${question}"...`);
                        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
                        const systemPrompt = `You are SONIQX AI, a friendly, concise, and expert digital audiology assistant. Mode: ${mode}, Language: ${language}.\n\nUser Question: "${question}"\n\nCRITICAL MANDATORY RULE: Respond in STRICTLY 1 OR 2 LINES ONLY. Never exceed 2 lines. Keep it encouraging, accurate, and easy to understand.`;

                        const response = await fetch(geminiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: systemPrompt }] }]
                            })
                        });

                        const data = await response.json();
                        if (data && data.candidates && data.candidates[0] && data.candidates[0].content) {
                            aiAnswer = data.candidates[0].content.parts.map(p => p.text).join('').trim();
                            console.log(`[SONIQX Gemini API] Received answer from Gemini API: "${aiAnswer}"`);
                        }
                    } catch (gErr) {
                        console.error('[SONIQX Gemini API] Error calling Gemini API endpoint:', gErr.message);
                    }
                }

                // Fallback to local 1-2 line answer if no API key or Gemini request failed
                if (!aiAnswer) {
                    aiAnswer = generateLocalAudiologyAnswer(question, mode, language);
                }

                // Strict 1-2 line formatting guarantee
                const cleanLines = aiAnswer.split('\n').map(l => l.trim()).filter(Boolean);
                if (cleanLines.length > 2) {
                    aiAnswer = cleanLines.slice(0, 2).join(' ');
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    answer: aiAnswer,
                    mode: mode,
                    source: apiKey ? 'gemini_api' : 'local_ai'
                }));
            } catch (err) {
                console.error('[SONIQX AI Chat API] Error handling AI question:', err);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    answer: generateLocalAudiologyAnswer('general', 'adult', 'en')
                }));
            }
        });
        return;
    }

    // API Endpoint: Send Email
    if (req.url === '/api/send-email' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 25 * 1024 * 1024) req.destroy();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const {
                    recipientEmail,
                    userName = 'Patient',
                    userEmail,
                    reportId = 'SHS-2026-9041',
                    date = new Date().toLocaleDateString(),
                    overallStatus = 'PASS',
                    notes = '',
                    pdfBase64,
                    fileName
                } = data;

                console.log(`\n[SONIQX Email API] Processing email request for recipient: "${recipientEmail}"`);

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!recipientEmail || typeof recipientEmail !== 'string' || !emailRegex.test(recipientEmail.trim())) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: false,
                        error: `Invalid email address format: "${recipientEmail || ''}". Please enter a valid email address (e.g. name@example.com).`
                    }));
                }

                const cleanRecipient = recipientEmail.trim();

                if (!pdfBase64) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: false,
                        error: 'Missing PDF report data. Unable to generate attachment.'
                    }));
                }

                let cleanBase64 = pdfBase64;
                if (cleanBase64.includes(',')) {
                    cleanBase64 = cleanBase64.split(',')[1];
                }
                const pdfBuffer = Buffer.from(cleanBase64, 'base64');
                const reportFileName = fileName || `Audiometry_Report_${userName.replace(/\s+/g, '_')}_${reportId}.pdf`;

                const smtpConfig = getSMTPConfig();

                const htmlContent = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
                        <h1 style="color: #f59e0b; margin: 0; font-size: 24px; letter-spacing: 1px;">SONIQX</h1>
                        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Precision Digital Audiology Platform</p>
                    </div>

                    <div style="padding: 20px 0;">
                        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Official Clinical Hearing Screening Report</h2>
                        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Dear <strong>${userName}</strong>,</p>
                        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Please find attached your official digital audiometry screening report PDF generated by the SONIQX Audiology Platform.</p>

                        <div style="background-color: #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <tr>
                                    <td style="color: #94a3b8; padding: 6px 0;">Report ID:</td>
                                    <td style="color: #f8fafc; font-weight: bold; padding: 6px 0; text-align: right;">${reportId}</td>
                                </tr>
                                <tr>
                                    <td style="color: #94a3b8; padding: 6px 0;">Screening Date:</td>
                                    <td style="color: #f8fafc; font-weight: bold; padding: 6px 0; text-align: right;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="color: #94a3b8; padding: 6px 0;">Patient Name:</td>
                                    <td style="color: #f8fafc; font-weight: bold; padding: 6px 0; text-align: right;">${userName}</td>
                                </tr>
                                <tr>
                                    <td style="color: #94a3b8; padding: 6px 0;">Screening Status:</td>
                                    <td style="padding: 6px 0; text-align: right;">
                                        <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; ${overallStatus === 'PASS' ? 'background-color: #064e3b; color: #34d399;' : 'background-color: #831843; color: #f472b6;'}">
                                            ${overallStatus}
                                        </span>
                                    </td>
                                </tr>
                                ${notes ? `
                                <tr>
                                    <td style="color: #94a3b8; padding: 6px 0;">Clinical Notes:</td>
                                    <td style="color: #f8fafc; padding: 6px 0; text-align: right;">${notes}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>

                    <div style="text-align: center; padding-top: 16px; border-top: 1px solid #1e293b; color: #64748b; font-size: 11px;">
                        <p style="margin: 0;">Sent automatically via SONIQX Digital Audiology Platform</p>
                        <p style="margin: 4px 0 0 0;">Sender: ${smtpConfig.smtp_user}</p>
                    </div>
                </div>
                `;

                const mailOptions = {
                    from: `"SONIQX Audiology Platform" <${smtpConfig.smtp_user}>`,
                    to: cleanRecipient,
                    subject: `[SONIQX AUDIOMETRY PDF REPORT #${reportId}] - ${userName}`,
                    text: `Hello ${userName},\n\nPlease find attached your official digital audiometry screening report PDF.\n\nReport ID: ${reportId}\nDate: ${date}\nStatus: ${overallStatus}\n\nSent via SONIQX Digital Audiology Platform (${smtpConfig.smtp_user}).`,
                    html: htmlContent,
                    attachments: [
                        {
                            filename: reportFileName,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                };

                const rawPass = smtpConfig.smtp_pass || '';
                const strippedPass = rawPass.replace(/\s+/g, '');
                const passVariants = Array.from(new Set([rawPass, strippedPass]));

                let primarySuccess = false;
                let primaryInfo = null;
                let primaryErr = null;

                for (const pVar of passVariants) {
                    try {
                        const transporter = nodemailer.createTransport({
                            service: smtpConfig.smtp_service === 'gmail' ? 'gmail' : undefined,
                            host: smtpConfig.smtp_service !== 'gmail' ? smtpConfig.smtp_host : undefined,
                            port: smtpConfig.smtp_port || 465,
                            secure: smtpConfig.smtp_secure !== undefined ? smtpConfig.smtp_secure : true,
                            auth: {
                                user: smtpConfig.smtp_user,
                                pass: pVar
                            }
                        });

                        primaryInfo = await transporter.sendMail(mailOptions);
                        primarySuccess = true;
                        console.log(`[SONIQX Email API] SUCCESS via Primary SMTP! MessageId: ${primaryInfo.messageId}`);
                        break;
                    } catch (err) {
                        primaryErr = err;
                    }
                }

                if (primarySuccess && primaryInfo) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        deliveredDirect: true,
                        message: `Official Audiology PDF report successfully emailed to ${cleanRecipient}.`,
                        messageId: primaryInfo.messageId,
                        recipient: cleanRecipient
                    }));
                }

                console.warn(`[SONIQX Email API] Gmail SMTP Auth 535 Error (${primaryErr ? primaryErr.message : 'Invalid App Password'}). Returning status 400 for client-side web fallback.`);

                let friendlyError = primaryErr ? primaryErr.message : 'SMTP Auth Error';
                if (primaryErr && (primaryErr.code === 'EAUTH' || (primaryErr.response && primaryErr.response.includes('535')))) {
                    friendlyError = `Gmail SMTP Auth Error (535): Invalid login credentials for ${smtpConfig.smtp_user}. Gmail requires a 16-character App Password when 2FA is enabled. Please generate one at https://myaccount.google.com/apppasswords and update smtp_pass in email_config.json.`;
                }

                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: friendlyError,
                    code: 'EAUTH'
                }));

            } catch (err) {
                console.error('[SONIQX Email API] Fatal error in email handler:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: err.message || 'Failed to dispatch email.',
                    code: 'SERVER_ERROR'
                }));
            }
        });
        return;
    }

    // Static File Server
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(DIST_DIR, reqUrl);

    if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            filePath = path.join(DIST_DIR, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500);
                return res.end('Server Error');
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        });
    });
});

server.listen(PORT, () => {
    console.log(`==========================================================`);
    console.log(`   SONIQX — Precision Audiology Platform & Email Server`);
    console.log(`==========================================================`);
    console.log(` Server running live at: http://localhost:${PORT}`);
    console.log(` Email API Endpoint:     http://localhost:${PORT}/api/send-email`);
    console.log(` AI Chat API Endpoint:   http://localhost:${PORT}/api/ai-chat`);
    console.log(` Static Files Served:    ${DIST_DIR}`);
    console.log(`==========================================================`);
});
