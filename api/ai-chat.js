// Vercel Serverless Function Endpoint for SONIQX AI Chat (/api/ai-chat)

const LANGUAGE_NAMES = {
    en: 'English',
    es: 'Spanish (Español)',
    hi: 'Hindi (हिंदी)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
    ja: 'Japanese (日本語)',
    zh: 'Chinese (中文)'
};

const OFF_TOPIC_MESSAGES = {
    en: "I'm Dr. Audio AI for SONIQX, focused on hearing health, audiology, and screening tests. Please ask a hearing-related question.",
    hi: "मैं SONIQX Dr. Audio AI हूँ। मैं केवल सुनवाई स्वास्थ्य, ऑडियोलॉजी, और टेस्ट से संबंधित प्रश्नों के उत्तर देता हूँ।",
    es: "Soy Dr. Audio AI de SONIQX, centrado en la salud auditiva y las pruebas. Por favor, haga una pregunta sobre la audición.",
    fr: "Je suis le Dr Audio AI pour SONIQX, axé sur la santé auditive et les tests. Veuillez poser une question sur l'audition.",
    de: "Ich bin Dr. Audio AI für SONIQX und konzentriere mich auf Hörgesundheit und Tests. Bitte stellen Sie eine Frage zum Thema Hören.",
    ja: "SONIQXのDr. Audio AIです。聴覚の健康と検査に特化しています。聴覚に関する質問をしてください。",
    zh: "我是 SONIQX 的 Dr. Audio AI，专注于听力健康和筛查测试。请提出与听力相关的问题。"
};

const ERROR_MESSAGES = {
    en: "Sorry, I couldn't connect right now. Please try again.",
    hi: "क्षमा करें, कनेक्शन में समस्या हुई। कृपया पुनः प्रयास करें।",
    es: "Lo sentimos, no se pudo conectar en este momento. Inténtelo de nuevo.",
    fr: "Désolé, connexion impossible pour le moment. Veuillez réessayer.",
    de: "Entschuldigung, derzeit keine Verbindung möglich. Bitte versuchen Sie es erneut.",
    ja: "申し訳ありません。接続できませんでした。もう一度お試しください。",
    zh: "抱歉，目前无法连接。请重试。"
};

const PREDEFINED_ANSWERS = {
    how_it_works: {
        en: "Digital pure-tone audiometry plays calibrated sound tones across 500Hz-8000Hz speech frequencies into your headphones. Press the button whenever you hear a tone to record your hearing threshold across pitch ranges.",
        hi: "डिजिटल प्योर-टोन ऑडियोमेट्री आपके हेडफोन में 500Hz-8000Hz आवृत्तियों पर आवाज बजाती है। जब भी आपको आवाज सुनाई दे, बटन दबाएं ताकि आपकी सुनने की क्षमता रिकॉर्ड हो सके।",
        es: "La audiometría digital de tonos puros emite sonidos calibrados entre 500 Hz y 8000 Hz en sus auriculares. Presione el botón cuando escuche un tono para registrar su umbral auditivo.",
        fr: "L'audiométrie tonale numérique émet des sons calibrés de 500 Hz à 8000 Hz dans vos écouteurs. Appuyez sur le bouton chaque fois que vous entendez un son.",
        de: "Die digitale Reinton-Audiometrie spielt kalibrierte Töne von 500 Hz bis 8000 Hz über Ihre Kopfhörer ab. Tippen Sie auf die Schaltfläche, sobald Sie einen Ton hören.",
        ja: "デジタル純音聴力検査は、ヘッドホンを通じて500Hzから8000Hzの音を再生します。音が聞こえたらボタンを押して測定します。",
        zh: "数字纯音听力测试通过耳机播放 500Hz 至 8000Hz 的标准调校声音。听到声音时请点击按钮记录您的听力阈值。"
    },
    headphones: {
        en: "Headphones isolate your left and right ears so calibrated sound tones are tested independently in one ear at a time without sound leakage or room noise interference.",
        hi: "हेडफोन दोनों कानों (Left & Right) की अलग-अलग जांच करते हैं ताकि आवाज केवल एक कान में जाए और सटीक नतीजे प्राप्त हों।",
        es: "Los auriculares aíslan sus oídos izquierdo y derecho para que los tonos de prueba se evalúen de forma independiente sin interferencias externas.",
        fr: "Les écouteurs isolent vos oreilles gauche et droite afin que les sons soient testés indépendamment pour chaque oreille sans interférence.",
        de: "Kopfhörer isolieren das linke und rechte Ohr, damit die Testtöne für jedes Ohr unabhängig voneinander gemessen werden können.",
        ja: "ヘッドホンは左右の耳を分離し、音漏れや周囲の雑音を防いで片耳ずつ正確に検査するために必要です。",
        zh: "耳机可以将左耳和右耳分隔开，使测试声音能独立传送到每只耳朵，避免声音泄漏或环境噪音干扰。"
    },
    ear_care: {
        en: "• 60/60 Safe Listening Rule: Keep headphone volume under 60% and pause every 60 minutes.\n• Avoid cotton swabs or sharp objects inside ear canals; ears self-clean naturally.\n• Wear earplugs in environments louder than 85 dB.",
        hi: "• 60/60 सुरक्षा नियम: वॉल्यूम 60% से कम रखें और 60 मिनट बाद ब्रेक लें।\n• कानों में कॉटन बड्स या नुकीली चीजें न डालें; कान प्राकृतिक रूप से साफ होते हैं।\n• तेज शोर (>85 dB) वाले स्थानों पर ईयरप्लग पहनें।",
        es: "• Regla 60/60: Mantenga el volumen por debajo del 60% y descanse cada 60 minutos.\n• Evite hisopos o objetos punzantes en el oído; los oídos se limpian solos.\n• Use tapones en entornos con más de 85 dB.",
        fr: "• Règle 60/60 : Gardez le volume sous 60% et faites une pause toutes les 60 minutes.\n• N'insérez jamais de coton-tige dans le canal auditif.\n• Portez des bouchons d'oreilles dans les milieux bruyants (>85 dB).",
        de: "• 60/60-Regel: Lautstärke unter 60 % halten und alle 60 Minuten Pause machen.\n• Keine Wattestäbchen in den Gehörgang einführen.\n• Bei Lärm über 85 dB Gehörschutz tragen.",
        ja: "• 60/60ルールの遵守：音量は60%以下に保ち、60分ごとに耳を休ませましょう。\n• 綿棒などを耳の奥に入れないでください（自浄作用があります）。\n• 大音量（85dB以上）の場所では耳栓を使用しましょう。",
        zh: "• 60/60 安全用耳法则：耳机音量保持在 60% 以下，每听 60 分钟休息一次。\n• 切勿将棉签或尖锐物品伸入耳道，耳朵具有自然自洁功能。\n• 在超过 85 分贝的高噪音环境中佩戴防噪耳塞。"
    },
    frequencies: {
        en: "Frequencies in Hertz (Hz) measure sound pitch from low bass (500Hz) to high treble (8000Hz). Screening across frequencies evaluates your hearing sensitivity across speech range.",
        hi: "हर्ट्ज (Hz) में मापी गई फ्रीक्वेंसी आवाज की पिच दर्शाती है (500Hz बेस से 8000Hz ट्रेबल)। विभिन्न फ्रीक्वेंसी की जांच से आपकी सुनने की क्षमता का सटीक पता चलता है।",
        es: "Las frecuencias en Hertz (Hz) miden el tono del sonido desde graves (500Hz) hasta agudos (8000Hz) para evaluar su sensibilidad auditiva.",
        fr: "Les fréquences en Hertz (Hz) mesurent la hauteur du son, des graves (500Hz) aux aigus (8000Hz), pour évaluer votre sensibilité auditive.",
        de: "Frequenzen in Hertz (Hz) messen die Tonhöhe von tiefem Bass (500Hz) bis zu hohen Tönen (8000Hz), um Ihr Hörvermögen zu testen.",
        ja: "周波数（Hz）は低音（500Hz）から高音（8000Hz）までの音の高さを表し、会話帯域の聴力を総合評価します。",
        zh: "赫兹 (Hz) 频率代表声音的高低，从低音 (500Hz) 到高音 (8000Hz)，用于评估您在各音调段的听力敏感度。"
    },
    privacy: {
        en: "Your hearing screening results and test data are 100% private, securely encrypted, and saved locally on your device storage.",
        hi: "आपकी सुनवाई जांच के परिणाम और आंकड़े 100% निजी, एन्क्रिप्टेड और केवल आपके डिवाइस पर ही सुरक्षित रहते हैं।",
        es: "Sus resultados de prueba y datos de salud están 100% protegidos, cifrados y guardados localmente en su dispositivo.",
        fr: "Vos résultats de test sont 100% privés, chiffrés et stockés localement sur votre appareil.",
        de: "Ihre Testergebnisse sind zu 100 % privat, verschlüsselt und werden lokal auf Ihrem Gerät gespeichert.",
        ja: "検査結果およびデータは100%プライベートであり、暗号化されてデバイス内に安全にローカル保存されます。",
        zh: "您的听力测试结果和数据 100% 保密，已加密并仅保存在您的本地设备存储中。"
    },
    ear_general: {
        en: "The human ear converts sound vibrations into neurological signals for the brain. Perform regular pure-tone screening and maintain safe volume levels under 60%.",
        hi: "मानव कान ध्वनि तरंगों को कंपन में बदलकर मस्तिष्क तक सिग्नल भेजता है। नियमित रूप से सुनवाई जांच करें और 60% वॉल्यूम सीमा का पालन करें।",
        es: "El oído humano convierte las vibraciones en señales para el cerebro. Realice pruebas periódicas y mantenga el volumen por debajo del 60%.",
        fr: "L'oreille humaine transforme les vibrations en signaux pour le cerveau. Faites des tests réguliers et gardez un volume inférieur à 60%.",
        de: "Das menschliche Ohr wandelt Schallschwingungen in Signale für das Gehirn um. Führen Sie regelmäßige Tests durch und halten Sie die Lautstärke unter 60 %.",
        ja: "人の耳は音の振動を脳への信号に変換します。定期的な聴力検査を行い、音量は60%以下を維持しましょう。",
        zh: "人类耳朵将声音振动转化为大脑神经信号。请定期进行纯音听力测试，并将音量控制在 60% 以下。"
    }
};

function getPredefinedAnswer(qStr, lang) {
    if (!qStr || typeof qStr !== "string") return null;
    const q = qStr.toLowerCase().trim();
    const l = (lang && PREDEFINED_ANSWERS.how_it_works[lang]) ? lang : 'en';

    // 1. Off-topic check
    const offTopicKeywords = ['weather', 'recipe', 'cooking', 'crypto', 'bitcoin', 'football', 'cricket', 'movie', 'actor', 'politics', 'president', 'prime minister', 'code in python', 'javascript tutorial', 'मौसम', 'रेसिपी', 'क्रिकेट', 'फिल्म', 'राजनीति'];
    if (offTopicKeywords.some(k => q.includes(k))) {
        return OFF_TOPIC_MESSAGES[l] || OFF_TOPIC_MESSAGES.en;
    }

    // 2. Ear Care / Protection / Cleaning / How to take care of ear
    if (q.includes('care') || q.includes('protect') || q.includes('clean') || q.includes('hygiene') || q.includes('taking care') || q.includes('take care') || q.includes('देखभाल') || q.includes('सफाई') || q.includes('सुरक्षा') || q.includes('cuidado') || q.includes('soin')) {
        if (q.includes('ear') || q.includes('ears') || q.includes('hearing') || q.includes('कान') || q.includes('सुनना') || q.includes('oído') || q.includes('oreilla') || q.includes('ohr')) {
            return PREDEFINED_ANSWERS.ear_care[l];
        }
    }

    // 3. How the test works / Procedure / Audiometry
    if (q.includes('work') || q.includes('how test') || q.includes('how does') || q.includes('procedure') || q.includes('काम') || q.includes('कैसे') || q.includes('funciona') || q.includes('fonctionne')) {
        if (q.includes('test') || q.includes('screening') || q.includes('audiometry') || q.includes('work') || q.includes('काम') || q.includes('जांच') || q.includes('prueba')) {
            return PREDEFINED_ANSWERS.how_it_works[l];
        }
    }

    // 4. Why headphones / earphones
    if (q.includes('headphone') || q.includes('headphones') || q.includes('earphone') || q.includes('earphones') || q.includes('why wear') || q.includes('why headphone') || q.includes('हेडफोन') || q.includes('क्यों') || q.includes('auriculares') || q.includes('casque')) {
        return PREDEFINED_ANSWERS.headphones[l];
    }

    // 5. Frequencies / Hz / Pitch / Hertz
    if (q.includes('frequency') || q.includes('frequencies') || q.includes('hz') || q.includes('hertz') || q.includes('pitch') || q.includes('फ्रीक्वेंसी') || q.includes('हर्ट्ज') || q.includes('frecuencia') || q.includes('fréquence')) {
        return PREDEFINED_ANSWERS.frequencies[l];
    }

    // 6. Privacy / Data Security / Storage
    if (q.includes('privacy') || q.includes('private') || q.includes('data') || q.includes('secure') || q.includes('सुरक्षित') || q.includes('डेटा') || q.includes('गोपनीय') || q.includes('privado')) {
        return PREDEFINED_ANSWERS.privacy[l];
    }

    // 7. General Ear / Hearing inquiry
    if (q === 'ear' || q === 'ears' || q === 'hearing' || q === 'audiogram' || q === 'कान' || q === 'सुनना' || q === 'oído') {
        return PREDEFINED_ANSWERS.ear_general[l];
    }

    return null;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { question = '', mode = 'adult', language = 'en' } = body;
        const cleanQ = (question || '').trim();
        const validLang = LANGUAGE_NAMES[language] ? language : 'en';
        const targetLangName = LANGUAGE_NAMES[validLang];

        const offTopicRedirectMsg = OFF_TOPIC_MESSAGES[validLang] || OFF_TOPIC_MESSAGES.en;
        const genericErrMsg = ERROR_MESSAGES[validLang] || ERROR_MESSAGES.en;

        if (!cleanQ) {
            return res.status(200).json({
                success: true,
                answer: offTopicRedirectMsg
            });
        }

        // 1. PRIORITIZE PREDEFINED Q&A LOOKUP BEFORE GEMINI API
        const predefined = getPredefinedAnswer(cleanQ, validLang);
        if (predefined) {
            return res.status(200).json({
                success: true,
                answer: predefined,
                source: 'predefined'
            });
        }

        const activeApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "";
        let aiAnswer = '';

        if (activeApiKey) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${activeApiKey}`;
                const systemInstructionText = `You are Dr. Audio AI for SONIQX digital audiology.

You strictly answer questions about hearing health, audiology, pure-tone audiometry, headphones, and ear care.
If a question is off-topic, respond with: "${offTopicRedirectMsg}"

CRITICAL BREVITY RULE (MANDATORY):
Answer in maximum 2-3 concise, scannable sentences or bullet points (strictly under 50 words total).
Do NOT write long paragraphs.

CRITICAL LANGUAGE RULE:
Answer strictly in ${targetLangName} (${validLang}).`;

                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: systemInstructionText }] },
                        contents: [{ parts: [{ text: cleanQ }] }],
                        generationConfig: {
                            maxOutputTokens: 150,
                            temperature: 0.2,
                            topP: 0.8
                        }
                    })
                });

                const data = await response.json();
                if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                    aiAnswer = data.candidates[0].content.parts.map(p => p.text).join('').trim();
                }
            } catch (gErr) {
                console.error('[Vercel Serverless SONIQX AI Exception]', gErr.message);
            }
        }

        if (!aiAnswer) {
            aiAnswer = genericErrMsg;
        }

        return res.status(200).json({
            success: true,
            answer: aiAnswer,
            mode: mode,
            language: validLang,
            source: activeApiKey ? 'gemini_api' : 'fallback'
        });
    } catch (err) {
        console.error('[Vercel Serverless SONIQX AI Error]', err.message);
        return res.status(200).json({
            success: true,
            answer: ERROR_MESSAGES.en
        });
    }
};
