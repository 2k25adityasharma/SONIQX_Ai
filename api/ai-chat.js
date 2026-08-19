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

const SMART_AUDIOLOGY_FALLBACKS = {
    sound: {
        en: "Sound is measured in frequencies (Hz) for pitch and decibels (dB) for volume. Pure-tone screening evaluates how your ears process different sound frequencies from 500Hz to 8000Hz.",
        hi: "ध्वनि को तारत्व (Pitch) के लिए हर्ट्ज (Hz) और तीव्रता (Volume) के लिए डेसिबल (dB) में मापा जाता है। डिजिटल प्यूर-टोन टेस्ट 500Hz से 8000Hz की ध्वनियों को जांचता है।"
    },
    ear: {
        en: "The human ear consists of outer, middle, and inner sections. Sound waves enter the ear canal, vibrate the eardrum, and reach the cochlea to send neural signals to the brain.",
        hi: "मानव कान के तीन भाग होते हैं: बाहरी, मध्य और आंतरिक कान। ध्वनि तरंगें कान के पर्दे में कंपन पैदा करती हैं जिन्हें कोक्लिया (Cochlea) मस्तिष्क तक सिग्नल के रूप में भेजता है।"
    },
    how_it_works: {
        en: "Digital pure-tone audiometry plays calibrated sound tones across 500Hz-8000Hz speech frequencies into your headphones. Press the button whenever you hear a tone to record your hearing threshold across pitch ranges.",
        hi: "डिजिटल प्योर-टोन ऑडियोमेट्री आपके हेडफोन में 500Hz-8000Hz आवृत्तियों पर आवाज बजाती है। जब भी आपको आवाज सुनाई दे, बटन दबाएं ताकि आपकी सुनने की क्षमता रिकॉर्ड हो सके।"
    },
    headphones: {
        en: "Headphones isolate your left and right ears so calibrated sound tones are tested independently in one ear at a time without sound leakage or room noise interference.",
        hi: "हेडफोन दोनों कानों (Left & Right) की अलग-अलग जांच करते हैं ताकि आवाज केवल एक कान में जाए और सटीक नतीजे प्राप्त हों।"
    },
    tinnitus: {
        en: "Tinnitus is perceiving ringing, buzzing, or humming in the ears. It is often linked to noise exposure or age-related hearing shifts. Safe listening (volume <60%) helps prevent further strain.",
        hi: "टिनिटस (Tinnitus) कानों में सीटी बजने या सनसनाहट की आवाज महसूस होना है। यह अक्सर तेज शोर के संपर्क में आने से होता है। वॉल्यूम 60% से कम रखकर कानों की रक्षा करें।"
    },
    frequencies: {
        en: "Frequencies in Hertz (Hz) measure sound pitch from low bass (500Hz) to high treble (8000Hz). Screening across frequencies evaluates your hearing sensitivity across speech range.",
        hi: "हर्ट्ज (Hz) में मापी गई फ्रीक्वेंसी आवाज की पिच दर्शाती है (500Hz बेस से 8000Hz ट्रेबल)। विभिन्न फ्रीक्वेंसी की जांच से आपकी सुनने की क्षमता का सटीक पता चलता है।"
    },
    audiogram: {
        en: "An audiogram is a clinical graph displaying your quietest hearing thresholds (dB HL) across frequencies (Hz). Normal hearing thresholds typically fall between 0 dB and 25 dB.",
        hi: "ऑडियोग्राम एक ग्राफ है जो विभिन्न फ्रीक्वेंसी (Hz) पर आपके न्यूनतम सुनने के स्तर (dB HL) को दिखाता है। सामान्य सुनने का स्तर 0 dB से 25 dB के बीच माना जाता है।"
    },
    ear_care: {
        en: "• 60/60 Safe Listening Rule: Keep headphone volume under 60% and pause every 60 minutes.\n• Avoid cotton swabs inside ear canals; ears self-clean naturally.\n• Wear earplugs in environments louder than 85 dB.",
        hi: "• 60/60 सुरक्षा नियम: वॉल्यूम 60% से कम रखें और 60 मिनट बाद ब्रेक लें।\n• कानों में कॉटन बड्स या नुकीली चीजें न डालें; कान प्राकृतिक रूप से साफ होते हैं।\n• तेज शोर (>85 dB) वाले स्थानों पर ईयरप्लग पहनें।"
    },
    privacy: {
        en: "Your hearing screening results and test data are 100% private, securely encrypted, and saved locally on your device storage.",
        hi: "आपकी सुनवाई जांच के परिणाम और आंकड़े 100% निजी, एन्क्रिप्टेड और केवल आपके डिवाइस पर ही सुरक्षित रहते हैं।"
    },
    decibel: {
        en: "Decibels (dB) measure sound loudness. Whispers measure around 30 dB, normal conversation is ~60 dB, and sounds above 85 dB can cause hearing strain over extended exposure.",
        hi: "डेसिबल (dB) ध्वनि की तीव्रता या वॉल्यूम मापता है। फुसफुसाहट लगभग 30 dB, सामान्य बातचीत ~60 dB, और 85 dB से अधिक की आवाज कानों को नुकसान पहुंचा सकती है।"
    },
    hearing_loss: {
        en: "Hearing shifts can occur naturally with age (presbycusis) or prolonged noise exposure. Routine pure-tone screening helps detect early threshold shifts and maintain hearing wellness.",
        hi: "उम्र बढ़ने या तेज शोर के कारण सुनने की क्षमता में बदलाव आ सकता है। नियमित प्यूर-टोन जांच से शुरुआती बदलावों का पता चलता है और कानों की देखभाल में मदद मिलती है।"
    },
    default_fallback: {
        en: "SONIQX Audiology Tip: Pure-tone screening evaluates your hearing across 500Hz-8000Hz speech frequencies. Remember the 60/60 rule: keep headphone volume under 60% and rest your ears every 60 minutes.",
        hi: "SONIQX ऑडियोलॉजी सलाह: प्यूर-टोन टेस्ट आपके कानों की 500Hz-8000Hz आवृत्तियों की जांच करता है। 60/60 नियम याद रखें: वॉल्यूम 60% से कम रखें और हर 60 मिनट में कानों को आराम दें।"
    }
};

function getPredefinedAnswer(qStr, lang) {
    if (!qStr || typeof qStr !== "string") return null;
    const q = qStr.toLowerCase().trim();
    const l = (lang && SMART_AUDIOLOGY_FALLBACKS.sound[lang]) ? lang : 'en';

    // 1. Off-topic check
    const offTopicKeywords = ['weather', 'recipe', 'cooking', 'crypto', 'bitcoin', 'football', 'cricket', 'movie', 'actor', 'politics', 'president', 'prime minister', 'code in python', 'javascript tutorial', 'मौसम', 'रेसिपी', 'क्रिकेट', 'फिल्म', 'राजनीति'];
    if (offTopicKeywords.some(k => q.includes(k))) {
        return OFF_TOPIC_MESSAGES[l] || OFF_TOPIC_MESSAGES.en;
    }

    // 2. Sound / Audio / Pitch / Volume / Tone
    if (q === 'sound' || q.includes('sound') || q.includes('ध्वनि') || q.includes('आवाज') || q.includes('sonido') || q.includes('son')) {
        if (!q.includes('test') && !q.includes('work') && !q.includes('care') && !q.includes('clean')) {
            return SMART_AUDIOLOGY_FALLBACKS.sound[l] || SMART_AUDIOLOGY_FALLBACKS.sound.en;
        }
    }

    // 3. Tinnitus / Ringing
    if (q.includes('tinnitus') || q.includes('ringing') || q.includes('buzzing') || q.includes('सीटी') || q.includes('सनसनाहट')) {
        return SMART_AUDIOLOGY_FALLBACKS.tinnitus[l] || SMART_AUDIOLOGY_FALLBACKS.tinnitus.en;
    }

    // 4. Decibel / dB
    if (q === 'db' || q.includes('decibel') || q.includes('loudness') || q.includes('डेसिबल')) {
        return SMART_AUDIOLOGY_FALLBACKS.decibel[l] || SMART_AUDIOLOGY_FALLBACKS.decibel.en;
    }

    // 5. Hearing loss / Deafness
    if (q.includes('loss') || q.includes('deaf') || q.includes('बहरापन') || q.includes('कम सुनना')) {
        return SMART_AUDIOLOGY_FALLBACKS.hearing_loss[l] || SMART_AUDIOLOGY_FALLBACKS.hearing_loss.en;
    }

    // 6. Audiogram / Chart / Graph
    if (q.includes('audiogram') || q.includes('chart') || q.includes('graph') || q.includes('ऑडियोग्राम')) {
        return SMART_AUDIOLOGY_FALLBACKS.audiogram[l] || SMART_AUDIOLOGY_FALLBACKS.audiogram.en;
    }

    // 7. Ear Care / Protection / Cleaning / Hygiene
    if (q.includes('care') || q.includes('protect') || q.includes('clean') || q.includes('hygiene') || q.includes('taking care') || q.includes('take care') || q.includes('देखभाल') || q.includes('सफाई') || q.includes('सुरक्षा') || q.includes('cuidado') || q.includes('soin')) {
        return SMART_AUDIOLOGY_FALLBACKS.ear_care[l] || SMART_AUDIOLOGY_FALLBACKS.ear_care.en;
    }

    // 8. How the test works / Procedure / Audiometry
    if (q.includes('work') || q.includes('how test') || q.includes('how does') || q.includes('procedure') || q.includes('काम') || q.includes('कैसे') || q.includes('funciona') || q.includes('fonctionne')) {
        return SMART_AUDIOLOGY_FALLBACKS.how_it_works[l] || SMART_AUDIOLOGY_FALLBACKS.how_it_works.en;
    }

    // 9. Headphones / Earphones
    if (q.includes('headphone') || q.includes('headphones') || q.includes('earphone') || q.includes('earphones') || q.includes('why wear') || q.includes('why headphone') || q.includes('हेडफोन') || q.includes('क्यों') || q.includes('auriculares') || q.includes('casque')) {
        return SMART_AUDIOLOGY_FALLBACKS.headphones[l] || SMART_AUDIOLOGY_FALLBACKS.headphones.en;
    }

    // 10. Frequencies / Hz / Pitch / Hertz
    if (q.includes('frequency') || q.includes('frequencies') || q.includes('hz') || q.includes('hertz') || q.includes('pitch') || q.includes('फ्रीक्वेंसी') || q.includes('हर्ट्ज') || q.includes('frecuencia') || q.includes('fréquence')) {
        return SMART_AUDIOLOGY_FALLBACKS.frequencies[l] || SMART_AUDIOLOGY_FALLBACKS.frequencies.en;
    }

    // 11. Privacy / Data Security
    if (q.includes('privacy') || q.includes('private') || q.includes('data') || q.includes('secure') || q.includes('सुरक्षित') || q.includes('डेटा') || q.includes('गोपनीय') || q.includes('privado')) {
        return SMART_AUDIOLOGY_FALLBACKS.privacy[l] || SMART_AUDIOLOGY_FALLBACKS.privacy.en;
    }

    // 12. Single-word / General Ear inquiry
    if (q === 'ear' || q === 'ears' || q === 'hearing' || q === 'कान' || q === 'सुनना' || q === 'oído') {
        return SMART_AUDIOLOGY_FALLBACKS.ear[l] || SMART_AUDIOLOGY_FALLBACKS.ear.en;
    }

    return null;
}

module.exports = async function handler(req, res) {
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

        const activeApiKey = 
            process.env.VITE_GEMINI_API_KEY || 
            process.env.VITE_AI_API_KEY || 
            process.env.AI_API_KEY || 
            process.env.GEMINI_API_KEY || 
            process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
            process.env.REACT_APP_GEMINI_API_KEY || 
            "";

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

        // 2. SMART RATE-LIMIT & QUOTA EXCEEDED FALLBACK
        if (!aiAnswer) {
            aiAnswer = getPredefinedAnswer(cleanQ, validLang) || SMART_AUDIOLOGY_FALLBACKS.default_fallback[validLang] || SMART_AUDIOLOGY_FALLBACKS.default_fallback.en;
        }

        return res.status(200).json({
            success: true,
            answer: aiAnswer,
            mode: mode,
            language: validLang,
            source: activeApiKey ? 'gemini_api' : 'offline_fallback'
        });
    } catch (err) {
        console.error('[Vercel Serverless SONIQX AI Error]', err.message);
        const fallback = SMART_AUDIOLOGY_FALLBACKS.default_fallback.en;
        return res.status(200).json({
            success: true,
            answer: fallback
        });
    }
};
