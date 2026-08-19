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
    const query = (q || '').toLowerCase().trim();
    const isHi = lang === 'hi';
    const isEs = lang === 'es';

    // Quick Question 1: How does the test work? / यह टेस्ट कैसे काम करता है?
    if (query.includes('how does') || query.includes('how test') || (query.includes('work') && query.includes('test')) || query.includes('काम करता') || query.includes('कैसे काम') || query.includes('funciona la prueba')) {
        if (isHi) return "डिजिटल प्यूर-टोन ऑडियोमेट्री आपके हेडफोन में 500Hz-8000Hz आवृत्तियों पर आवाज बजाती है। जब भी आपको आवाज सुनाई दे, बटन दबाएं।";
        if (isEs) return "La audiometría digital emite tonos entre 500Hz y 8000Hz en sus auriculares. Presione el botón cada vez que escuche un tono.";
        return "Digital pure-tone audiometry plays calibrated sound tones across 500Hz-8000Hz speech frequencies into your headphones. You press the button whenever you hear a tone to record your auditory threshold.";
    }

    // Quick Question 2: Why put on headphones? / हेडफोन क्यों जरूरी हैं?
    if ((query.includes('why') && (query.includes('headphone') || query.includes('earphone') || query.includes('wear'))) || query.includes('हेडफोन') || query.includes('क्यों जरूरी') || query.includes('ponerse auriculares')) {
        if (isHi) return "हेडफोन दोनों कानों को अलग-अलग जांचते हैं ताकि एक कान की आवाज दूसरे कान में न जाए और सही परीक्षण हो सके।";
        if (isEs) return "Los auriculares aíslan cada oído para entregar sonido de forma independiente y medir la audición con precisión.";
        return "Headphones isolate left and right ears so sounds are delivered to one ear at a time without sound leaking, allowing accurate threshold measurement for each ear.";
    }

    // Quick Question 3: Is my data private? / क्या मेरा डेटा सुरक्षित है?
    if (query.includes('privacy') || query.includes('private') || query.includes('data') || query.includes('safe') || query.includes('सुरक्षित') || query.includes('डेटा') || query.includes('datos son privados')) {
        if (isHi) return "आपकी सुनवाई जांच के परिणाम और डेटा 100% निजी, एन्क्रिप्टेड और आपके डिवाइस पर सुरक्षित रहते हैं।";
        if (isEs) return "Sus resultados de audición y datos son 100% privados, encriptados y guardados de forma segura en su dispositivo.";
        return "Your hearing screening results and test data are 100% private, securely encrypted, and stored locally on your device.";
    }

    // Quick Question 4: What do frequencies mean? / फ्रीक्वेंसी का क्या मतलब है?
    if (query.includes('frequency') || query.includes('frequencies') || query.includes('hz') || query.includes('pitch') || query.includes('फ्रीक्वेंसी') || query.includes('मतलब') || query.includes('frecuencias')) {
        if (isHi) return "हर्ट्ज (Hz) में मापी गई फ्रीक्वेंसी ध्वनि के तारत्व को दर्शाती है (500Hz से 8000Hz), जो यह बताती है कि आप अलग-अलग आवाजें कितनी अच्छी तरह सुनते हैं।";
        if (isEs) return "La frecuencia en Hertz (Hz) mide el tono del sonido desde graves (500Hz) hasta agudos (8000Hz).";
        return "Frequencies measured in Hertz (Hz) represent sound pitch from low bass (500Hz) to high treble (8000Hz), evaluating how well you hear speech pitch.";
    }

    if (query === 'ear' || query === 'ears' || query.includes('ear anatomy') || query.includes('ear health') || query.includes('parts of ear') || query.includes('कान')) {
        if (isHi) return "मानव कान के तीन मुख्य भाग होते हैं: बाहरी, मध्य और आंतरिक कान। यह ध्वनि तरंगों को कंपन में बदलकर मस्तिष्क तक संदेश भेजता है।";
        if (isEs) return "El oído humano consta de tres partes: externo, medio e interno. Convierte las ondas sonoras en impulsos nerviosos.";
        return "The human ear consists of three main parts: outer, middle, and inner ear. It collects sound waves, converts them into vibrations, and sends signals to the brain for hearing.";
    }

    if (query.includes('decibel') || query.includes('db')) {
        if (isHi) return "डेसिबल (dB) ध्वनि की तीव्रता या वॉल्यूम को मापता है। सामान्य सुनवाई 0 से 25 dB HL होती है, जबकि 85 dB से अधिक की आवाज नुकसान पहुंचा सकती है।";
        return "Decibels (dB) measure sound loudness or intensity. Normal hearing thresholds range from 0 to 25 dB HL, while sounds above 85 dB can cause hearing damage.";
    }

    if (query.includes('loss') || query.includes('deaf') || query.includes('impairment')) {
        if (isHi) return "सुनवाई की कमी (Hearing Loss) उम्र, तेज आवाज या कान की समस्या से हो सकती है। डिजिटल जांच से समय पर पता चलता है।";
        return "Hearing loss can be sensorineural or conductive, caused by noise exposure, aging, or ear conditions. Early digital screening helps detect threshold shifts.";
    }

    if (query.includes('tinnitus') || query.includes('ringing') || query.includes('sound in ear')) {
        if (isHi) return "टिनिटस (कान में घंटी बजना) का इलाज साउंड थेरेपी और सुरक्षित वॉल्यूम स्तरों से किया जाता है।";
        return "Tinnitus (ringing in ears) is managed with sound therapy, hearing aids, and safe listening habits. Avoiding loud noise protects hearing.";
    }

    if (isHi) return "कृपया सुनवाई, कान के स्वास्थ्य, हेडफोन या ऑडियोग्राम से संबंधित कोई विशिष्ट प्रश्न पूछें।";
    if (isEs) return "Por favor haga una pregunta específica sobre audición, salud auditiva o auriculares.";
    return "Please ask any specific question about hearing, ear health, audiograms, headphones, or sound frequencies.";
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
    // API Endpoint: AI Chat (Strict Audiology-Only Soniq AI / Gemini API)
    // API Endpoint: AI Chat (Ultra-Fast 1-3 Sentence Soniq Audiology AI)
    // API Endpoint: AI Chat (Google Gemini API Integration)
    // API Endpoint: AI Chat (Google Gemini API Integration)
    // API Endpoint: AI Chat (Google Gemini API Integration)
    if (req.url === '/api/ai-chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1024 * 1024) req.destroy();
        });

        req.on('end', async () => {
            try {
                const { question = '', mode = 'adult', language = 'en' } = JSON.parse(body || '{}');
                const cleanQ = (question || '').trim();

                const languageNames = {
                    hi: 'Hindi (हिंदी)',
                    es: 'Spanish (Español)',
                    fr: 'French (Français)',
                    de: 'German (Deutsch)',
                    ja: 'Japanese (日本語)',
                    zh: 'Chinese (中文)',
                    en: 'English'
                };
                const targetLangName = languageNames[language] || 'English';

                const offTopicRedirectMsg = language === 'hi' 
                    ? "मैं सॉनिक एआई हूं, सुनवाई और ऑडियोलॉजी पर केंद्रित हूं। कृपया सुनवाई से संबंधित प्रश्न पूछें।"
                    : language === 'es'
                    ? "Soy Soniq AI, centrado en la audición y audiología. Por favor haga una pregunta relacionada con la audición."
                    : "I’m Soniq AI, focused on hearing and audiology. Please ask a hearing-related question.";

                if (!cleanQ) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        answer: language === 'hi' ? "कृपया सुनवाई से संबंधित प्रश्न पूछें।" : "Please ask a hearing-related question."
                    }));
                }

                // Off-Topic Detector with full multilingual keyword support
                const isOffTopic = (qStr) => {
                    const q = qStr.toLowerCase();
                    const audiologyKeywords = [
                        'hear', 'ear', 'ears', 'audiology', 'audiometer', 'audiogram', 'sound', 'decibel', 'db',
                        'frequency', 'hz', 'pitch', 'headphone', 'earphone', 'volume', 'tinnitus', 'ringing',
                        'noise', 'deaf', 'presbycusis', 'ent', 'otology', 'wax', 'earwax', 'test', 'screening',
                        'doctor', 'report', 'pdf', 'privacy', 'private', 'data', 'safe', '60/60', 'protection', 'aid',
                        'सुनवाई', 'कान', 'हेडफोन', 'आवाज', 'फ्रीक्वेंसी', 'टेस्ट', 'डेटा', 'सुरक्षित', 'काम करता', 'जरूरी', 'मतलब',
                        'prueba', 'datos', 'auriculares', 'frecuencia', 'oído'
                    ];
                    if (audiologyKeywords.some(kw => q.includes(kw))) return false;

                    const offTopicKeywords = [
                        'python', 'java', 'c++', 'code', 'coding', 'program', 'script', 'snake game',
                        'virat', 'kohli', 'cricket', 'football', 'messi', 'ronaldo', 'weather', 'temp',
                        'joke', 'pasta', 'cook', 'recipe', 'math', 'mathematics', 'algebra', 'calculus',
                        'president', 'capital of', 'movie', 'song', 'history', 'who is', 'how to make', 'game'
                    ];
                    return offTopicKeywords.some(kw => q.includes(kw));
                };

                if (isOffTopic(cleanQ)) {
                    console.log(`[Soniq AI Guardrail] Off-topic question detected: "${cleanQ}"`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        answer: offTopicRedirectMsg,
                        isOffTopic: true
                    }));
                }

                const config = getSMTPConfig();
                const activeApiKey = process.env.GEMINI_API_KEY || config.gemini_api_key || "";

                let aiAnswer = '';

                if (activeApiKey) {
                    try {
                        console.log(`[Soniq AI Gemini API] Fetching Gemini answer in ${targetLangName} for: "${cleanQ}"...`);
                        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${activeApiKey}`;
                        
                        const systemInstructionText = `You are Soniq AI, a specialized audiology and hearing-health assistant.

CRITICAL MANDATORY LANGUAGE RULE:
You MUST write your entire response strictly in ${targetLangName}.
If language is Hindi ("hi"), write in Devanagari script Hindi.
If language is Spanish ("es"), write in Spanish.
Do NOT respond in English unless the selected language is English.

Answer ONLY questions related to hearing, ears, audiology, hearing tests, hearing loss, sound, frequencies, decibels, tinnitus, hearing aids, headphones, hearing protection, and related topics.

Give ONLY the information necessary to answer the user's specific question.
Keep every response to 1–3 short sentences and under 50 words in ${targetLangName}.

If the question is unrelated to hearing or audiology, reply in ${targetLangName} with:
'${offTopicRedirectMsg}'`;

                        const response = await fetch(geminiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                system_instruction: { parts: [{ text: systemInstructionText }] },
                                contents: [{ parts: [{ text: cleanQ }] }],
                                generationConfig: {
                                    maxOutputTokens: 300,
                                    temperature: 0.2,
                                    topP: 0.8
                                }
                            })
                        });

                        const data = await response.json();
                        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                            aiAnswer = data.candidates[0].content.parts.map(p => p.text).join('').trim();
                            console.log(`[Soniq AI Gemini API] Received response in ${targetLangName}: "${aiAnswer.substring(0, 60)}..."`);
                        } else if (data && data.error) {
                            console.error('[Soniq AI Gemini API Error]', data.error.code, data.error.message);
                        }
                    } catch (gErr) {
                        console.error('[Soniq AI Gemini API] Fetch Exception:', gErr.message);
                    }
                }

                if (!aiAnswer) {
                    aiAnswer = generateLocalAudiologyAnswer(cleanQ, mode, language);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    answer: aiAnswer,
                    mode: mode,
                    language: language,
                    source: activeApiKey ? 'gemini_api' : 'local_ai'
                }));
            } catch (err) {
                console.error('[Soniq AI Chat API] Error:', err.message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    answer: "Sorry, I couldn't process that question right now. Please try again."
                }));
            }
        });
        return;
    } // API Endpoint: Send Email
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
