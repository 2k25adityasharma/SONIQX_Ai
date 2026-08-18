const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(__dirname, 'dist');
const CONFIG_PATH = path.join(__dirname, 'email_config.json');

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

// Helper to load SMTP config dynamically
function getSMTPConfig() {
    let config = {
        smtp_service: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_secure: true,
        smtp_user: 'soniqx.earhealth.report@gmail.com',
        smtp_pass: 'soniqX982'
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
    if (process.env.SMTP_HOST) config.smtp_host = process.env.SMTP_HOST;
    if (process.env.SMTP_PORT) config.smtp_port = parseInt(process.env.SMTP_PORT, 10);

    return config;
}

// Create Nodemailer Transporter
function createTransporter(config) {
    if (config.smtp_service === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass
            }
        });
    }

    return nodemailer.createTransport({
        host: config.smtp_host || 'smtp.gmail.com',
        port: config.smtp_port || 465,
        secure: config.smtp_secure !== undefined ? config.smtp_secure : true,
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass
        }
    });
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

    // API Endpoint: Send Email
    if (req.url === '/api/send-email' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
            // 25MB safety limit
            if (body.length > 25 * 1024 * 1024) {
                req.destroy();
            }
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

                console.log(`[SONIQX Email API] Processing email request for recipient: "${recipientEmail}"`);

                // 1. Email Format Validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!recipientEmail || typeof recipientEmail !== 'string' || !emailRegex.test(recipientEmail.trim())) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: false,
                        error: `Invalid email address format: "${recipientEmail || ''}". Please enter a valid email address.`
                    }));
                }

                const cleanRecipient = recipientEmail.trim();

                // 2. PDF Data Check
                if (!pdfBase64) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: false,
                        error: 'Missing PDF report data. Unable to generate attachment.'
                    }));
                }

                // 3. Prepare PDF Buffer
                let cleanBase64 = pdfBase64;
                if (cleanBase64.includes(',')) {
                    cleanBase64 = cleanBase64.split(',')[1];
                }
                const pdfBuffer = Buffer.from(cleanBase64, 'base64');

                const reportFileName = fileName || `Audiometry_Report_${userName.replace(/\s+/g, '_')}_${reportId}.pdf`;

                // 4. Load SMTP Config
                const smtpConfig = getSMTPConfig();

                console.log(`[SONIQX Email API] Connecting to SMTP server (${smtpConfig.smtp_host || 'gmail'}) with user: ${smtpConfig.smtp_user}...`);

                const transporter = createTransporter(smtpConfig);

                // 5. Build HTML & Text Email Body
                const htmlContent = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
                        <h1 style="color: #f59e0b; margin: 0; font-size: 24px; letter-spacing: 1px;">SONIQX</h1>
                        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Precision Digital Audiology Platform</p>
                    </div>

                    <div style="padding: 20px 0;">
                        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Official Clinical Hearing Screening Report</h2>
                        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                            Dear <strong>${userName}</strong>,
                        </p>
                        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                            Please find attached your official digital audiometry screening report PDF generated by the SONIQX Audiology Platform.
                        </p>

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

                        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                            The attached PDF contains the complete pure-tone audiometric threshold curve, frequency breakdown (125 Hz – 8000 Hz), and clinical interpretation notes.
                        </p>
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

                // 6. Send Mail
                const info = await transporter.sendMail(mailOptions);
                console.log(`[SONIQX Email API] SUCCESS: Email dispatched to ${cleanRecipient}. MessageId: ${info.messageId}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    message: `Official Audiology PDF report successfully emailed to ${cleanRecipient}.`,
                    messageId: info.messageId,
                    recipient: cleanRecipient
                }));

            } catch (err) {
                console.error('[SONIQX Email API] ERROR sending email:', err);

                let friendlyError = err.message || 'Failed to send email.';

                // Specific SMTP Error Diagnostics
                if (err.code === 'EAUTH' || (err.response && err.response.includes('535'))) {
                    friendlyError = `Gmail SMTP Authentication Error (535): Invalid password or App Password required. If 2-Step Verification is enabled on ${getSMTPConfig().smtp_user}, please create a 16-character App Password at https://myaccount.google.com/apppasswords and update email_config.json.`;
                } else if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
                    friendlyError = `Network Error (${err.code}): Unable to connect to SMTP server. Please check internet connectivity and firewall settings.`;
                } else if (err.responseCode === 550 || (err.response && err.response.includes('550'))) {
                    friendlyError = `Recipient Mailbox Error (550): The destination email address could not be found or rejected the message.`;
                }

                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: friendlyError,
                    code: err.code || 'EMAIL_FAILED'
                }));
            }
        });
        return;
    }

    // Static File Server
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(DIST_DIR, reqUrl);

    // Security check for directory traversal
    if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // SPA fallback: return index.html for non-file routes
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
    console.log(` Static Files Served:    ${DIST_DIR}`);
    console.log(`==========================================================`);
});
