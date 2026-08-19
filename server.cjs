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

// Language map for display names
const LANGUAGE_NAMES = {
    en: 'English',
    es: 'Spanish (Español)',
    hi: 'Hindi (हिंदी)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
    ja: 'Japanese (日本語)',
    zh: 'Chinese (中文)'
};

// Off-topic redirection messages in all 7 supported languages
const OFF_TOPIC_MESSAGES = {
    en: "I'm SONIQX AI, focused on hearing, audiology, and the SONIQX screening experience. Please ask me something related to hearing or your test.",
    hi: "मैं SONIQX AI हूँ, जो सुनवाई, ऑडियोलॉजी और SONIQX स्क्रीनिंग अनुभव पर केंद्रित है। कृपया मुझसे सुनवाई या आपके टेस्ट से संबंधित कोई सवाल पूछें।",
    es: "Soy SONIQX AI, centrado en la audición, la audiología y la experiencia de detección de SONIQX. Por favor, hágame una pregunta relacionada con la audición o su prueba.",
    fr: "Je suis SONIQX AI, axé sur l'audition, l'audiologie et l'expérience de dépistage SONIQX. Veuillez me poser une question liée à l'audition ou à votre test.",
    de: "Ich bin SONIQX AI und konzentriere mich auf Hören, Audiologie und das SONIQX-Screening-Erlebnis. Bitte stellen Sie mir eine Frage zum Thema Hören oder zu Ihrem Test.",
    ja: "私はSONIQX AIです。聴覚、オージオロジー、およびSONIQXスクリーニング体験に特化しています。聴覚やテストに関連する質問をしてください。",
    zh: "我是 SONIQX AI，专注于听力、听力学和 SONIQX 筛查体验。请向我提出与听力或您的测试相关的问题。"
};

// Friendly localized error messages for all 7 supported languages
const ERROR_MESSAGES = {
    en: "Sorry, I couldn't connect to SONIQX AI right now. Please try again.",
    hi: "क्षमा करें, SONIQX AI से अभी कनेक्ट नहीं हो पाया। कृपया फिर से प्रयास करें।",
    es: "Lo sentimos, no se pudo conectar a SONIQX AI en este momento. Inténtelo de nuevo.",
    fr: "Désolé, impossible de se connecter à SONIQX AI pour le moment. Veuillez réessayer.",
    de: "Entschuldigung, die Verbindung zu SONIQX AI konnte derzeit nicht hergestellt werden. Bitte versuchen Sie es erneut.",
    ja: "申し訳ありません。現在SONIQX AIに接続できません。もう一度お試しください。",
    zh: "抱歉，目前无法连接到 SONIQX AI。请重试。"
};

// Pre-cached localized answers for the 4 Quick Clinical Questions across all 7 languages (Medium Depth ~100-150 words)
const PREDEFINED_ANSWERS = {
    // 1. How does the test work?
    how_it_works: {
        en: "Digital pure-tone audiometry plays calibrated sound tones across 500 Hz to 8000 Hz speech frequencies directly into your headphones. Whenever you hear a tone, click or tap the screen button.\n\nThe system measures the quietest sound level (hearing threshold) you can perceive at each frequency for both your left and right ears independently.\n\nOnce completed, the platform generates a detailed pure-tone audiogram graph showing your hearing threshold curve across low, mid, and high frequencies.",
        hi: "डिजिटल प्योर-टोन ऑडियोमेट्री आपके हेडफोन में 500 Hz से 8000 Hz की आवृत्तियों (Frequencies) पर ध्वनि टोन बजाती है। जब भी आपको कोई टोन सुनाई दे, स्क्रीन बटन दबाएं।\n\nयह सिस्टम आपके बाएं और दाएं कान की अलग-अलग न्यूनतम सुनने की क्षमता (Hearing Threshold) को सटीक रूप से मापता है।\n\nपरीक्षण पूरा होने के बाद, प्लेटफॉर्म एक विस्तृत ऑडियोग्राम ग्राफ तैयार करता है जो कम, मध्यम और उच्च आवृत्तियों पर आपकी सुनवाई का स्तर दिखाता है।",
        es: "La audiometría digital de tonos puros emite sonidos calibrados entre 500 Hz y 8000 Hz en sus auriculares. Cada vez que escuche un tono, presione el botón en pantalla.\n\nEl sistema mide el nivel de sonido más suave (umbral auditivo) que puede percibir en cada frecuencia para sus oídos izquierdo y derecho de forma independiente.\n\nUna vez finalizado, la plataforma genera un audiograma detallado que muestra su curva de audición a lo largo del espectro sonoro.",
        fr: "L'audiométrie tonale numérique émet des sons calibrés de 500 Hz à 8000 Hz dans vos écouteurs. Chaque fois que vous entendez un son, appuyez sur le bouton à l'écran.\n\nLe système mesure le niveau sonore le plus faible (seuil d'audition) que vous pouvez percevoir pour chaque oreille indépendamment.\n\nUne fois le test terminé, la plateforme génère un audiogramme détaillé représentant votre courbe d'audition sur l'ensemble des fréquences.",
        de: "Die digitale Reinton-Audiometrie spielt kalibrierte Töne im Bereich von 500 Hz bis 8000 Hz über Ihre Kopfhörer ab. Sobald Sie einen Ton hören, tippen Sie auf die Schaltfläche.\n\nDas System misst die leisesste wahrnehmbare Lautstärke (Hörschwelle) für Ihr linkes und rechtes Ohr unabhängig voneinander.\n\nNach Abschluss erstellt die Plattform ein detailliertes Audiogramm, das Ihre Hörschwellenkurve über alle Frequenzen anzeigt.",
        ja: "デジタル純音聴力検査は、ヘッドホンを通じて500Hzから8000Hzまでの調整された音を再生します。音が聞こえたら画面のボタンを押してください。\n\nシステムは左右の耳それぞれで聞こえる最小の音量（聴力閾値）を測定します。\n\n検査完了後、プラットフォームは各周波数帯での聞こえやすさを示す詳細なオージオグラムグラフを自動生成します。",
        zh: "数字纯音听力测试通过耳机播放 500 Hz 至 8000 Hz 调校好的声音。每当您听到声音时，请点击屏幕按钮。\n\n系统会独立测量您左耳和右耳在每个频率下的最小听力阈值。\n\n测试完成后，平台会生成一张详细的纯音听力图，直观展示您在低频、中频和高频段的听力曲线。"
    },
    // 2. Why put on headphones?
    headphones: {
        en: "Headphones isolate your left and right ears so test tones are delivered independently to each ear without sound leakage or ambient room noise interference.\n\nSince left and right ear hearing thresholds frequently differ, testing each ear separately is medically necessary for an accurate diagnostic baseline.\n\nStandard speakers blend sound waves from both ears, making ear-specific threshold measurement impossible.",
        hi: "हेडफोन दोनों कानों को अलग-अलग जांचने के लिए बेहद आवश्यक हैं। इनसे ध्वनियां बिना किसी लीकेज या कमरे के शोर के एक समय में केवल एक ही कान में जाती हैं।\n\nचूंकि बाएं और दाएं कान की सुनने की क्षमता अक्सर अलग-अलग होती है, इसलिए सटीक ऑडियोग्राम के लिए प्रत्येक कान की अलग से जांच करना जरूरी है।\n\nसाधारण स्पीकर दोनों कानों की ध्वनियों को मिला देते हैं, जिससे एक कान की व्यक्तिगत सीमा मापना असंभव हो जाता है।",
        es: "Los auriculares aíslan sus oídos izquierdo y derecho para que los tonos de prueba se transmitan de forma independiente sin fugas de sonido ni interferencias del entorno.\n\nDado que los umbrales auditivos de cada oído suelen variar, evaluar cada oído por separado es clínicamente necesario para obtener un diagnóstico preciso.\n\nLos altavoces convencionales mezclan el sonido, impidiendo medir la capacidad auditiva individual de cada oído.",
        fr: "Les écouteurs isolent vos oreilles gauche et droite afin que les sons soient diffusés indépendamment dans chaque oreille, sans fuite ni bruit ambiant.\n\nComme la capacité auditive varie souvent d'une oreille à l'autre, tester chaque oreille séparément est indispensable pour établir un bilan précis.\n\nLes haut-parleurs classiques mélangent les sons, ce qui rend impossible la mesure individuelle du seuil auditif de chaque oreille.",
        de: "Kopfhörer isolieren das linke und rechte Ohr, damit die Testtöne unabhängig voneinander und ohne Raumgeräusche an jedes Ohr übertragen werden.\n\nDa sich die Hörschwellen des linken und rechten Ohrs häufig unterscheiden, ist eine getrennte Prüfung klinisch erforderlich.\n\nHerkömmliche Lautsprecher vermischen den Schall beider Ohren, was eine ohrspezifische Messung unmöglich macht.",
        ja: "ヘッドホンは左右の耳を独立して検査するために必須です。音漏れや周囲の雑音を防ぎ、正確な音を耳に届けます。\n\n左右の耳で聴力閾値が異なるケースが多いため、片耳ずつ別々に測定することがオージオロジー検査で非常に重要です。\n\nスピーカーでは左右の音が混ざってしまうため、耳ごとの正確な聴力を測定することができません。",
        zh: "耳机可以将左耳和右耳分隔开，使测试声音能独立传送到每只耳朵，避免声音泄漏或环境噪音干扰。\n\n由于左右耳的听力阈值往往存在差异，分耳测试对于获得准确的听力评估至关重要。\n\n普通扬声器会让左右耳的声音混合在一起，无法实现单耳独立听力阈值的精确测量。"
    },
    // 3. Is my data private?
    privacy: {
        en: "Yes, your privacy and health data security are fully protected on the SONIQX platform.\n\nYour hearing screening results and threshold data are securely encrypted and saved locally on your device storage. We do not store or sell your clinical data on external public servers.\n\nAll screening analytics remain strictly confidential and under your direct personal control at all times.",
        hi: "जी हां, SONIQX प्लेटफॉर्म पर आपकी गोपनीयता और स्वास्थ्य डेटा पूरी तरह सुरक्षित हैं।\n\nआपकी सुनवाई जांच के परिणाम और आंकड़े सुरक्षित रूप से एन्क्रिप्टेड (Encrypted) रहते हैं और केवल आपके डिवाइस पर ही संग्रहीत होते हैं। हम आपका डेटा किसी सार्वजनिक सर्वर पर स्टोर या शेयर नहीं करते।\n\nआपके सभी मेडिकल आंकड़े हमेशा 100% गोपनीय और आपके पूर्ण नियंत्रण में रहते हैं।",
        es: "Sí, su privacidad y la seguridad de sus datos de salud están completamente garantizadas en la plataforma SONIQX.\n\nSus resultados de detección y datos de umbral se cifran de forma segura y se guardan localmente en su dispositivo. No vendemos ni compartimos sus datos con terceros.\n\nToda su información clínica permanece estrictamente confidencial y bajo su control personal en todo momento.",
        fr: "Oui, votre confidentialité et la sécurité de vos données de santé sont pleinement garanties sur la plateforme SONIQX.\n\nVos résultats de dépistage et données de seuil sont chiffrés et stockés localement sur votre appareil. Nous ne vendons ni ne partageons vos données médicales avec des tiers.\n\nToutes vos informations cliniques restent strictement confidentielles et sous votre contrôle direct.",
        de: "Ja, Ihre Privatsphäre und Datensicherheit sind auf der SONIQX-Plattform vollständig geschützt.\n\nIhre Testergebnisse und Hörschwellendaten werden sicher verschlüsselt und lokal auf Ihrem Gerät gespeichert. Wir geben Ihre medizinischen Daten nicht an Dritte weiter.\n\nAlle Screening-Daten bleiben streng vertraulich und unter Ihrer persönlichen Kontrolle.",
        ja: "はい、SONIQXプラットフォームにおけるお客様のプライバシーとデータセキュリティは完全に保護されています。\n\n聴力検査結果および閾値データは暗号化され、お使いのデバイス内にローカル保存されます。外部サーバーへ販売・共有されることはありません。\n\nすべての検査データは常に厳重に機密保持され、お客様ご自身の管理下に置かれます。",
        zh: "是的，您的隐私和健康数据安全在 SONIQX 平台上得到完全保护。\n\n您的听力筛查结果和阈值数据经过加密，并安全储存在您的本地设备上。我们绝不会向第三方出售或共享您的医疗数据。\n\n您的所有筛查数据均保持严格保密，并时刻处于您的个人掌控之中。"
    },
    // 4. What do frequencies mean?
    frequencies: {
        en: "Frequency describes how rapidly a sound wave vibrates and is measured in Hertz (Hz). In human hearing:\n\n• Low Frequencies (125 Hz – 500 Hz): Represent deep bass sounds, such as a thunder rumble, drum beat, or male voice pitch.\n• Mid Frequencies (1000 Hz – 2000 Hz): Cover essential speech vowel sounds critical for everyday conversation comprehension.\n• High Frequencies (4000 Hz – 8000 Hz): Represent high-pitched sounds like bird chirps, whistles, and consonant sounds ('s', 'f', 'th').\n\nTesting multiple frequencies helps pinpoint exactly which pitch ranges you hear clearly and where threshold support may be beneficial.",
        hi: "फ्रीक्वेंसी (आवृत्ति) यह बताती है कि ध्वनि तरंग कितनी तेजी से कंपन करती है, और इसे हर्ट्ज (Hz) में मापा जाता है:\n\n• कम फ्रीक्वेंसी (125 Hz – 500 Hz): गहरी आवाजें दर्शाती हैं, जैसे बादल की गरज, ढोल की थाप या भारी आवाज।\n• मध्यम फ्रीक्वेंसी (1000 Hz – 2000 Hz): आम बातचीत के मुख्य स्वर (Vowels) और ध्वनियों को कवर करती हैं।\n• उच्च फ्रीक्वेंसी (4000 Hz – 8000 Hz): तीखी आवाजें दर्शाती हैं, जैसे पक्षियों की चहक, सीटी या व्यंजन अक्षर ('स', 'फ')।\n\nविभिन्न फ्रीक्वेंसी की जांच से यह सटीक पता चलता है कि आप किस पिच की आवाजों को आसानी से सुन सकते हैं।",
        es: "La frecuencia describe la rapidez con la que vibra una onda sonora y se mide en Hertz (Hz):\n\n• Frecuencias Bajas (125 Hz – 500 Hz): Representan sonidos graves, como el retumbo de un trueno o tonos profundos.\n• Frecuencias Medias (1000 Hz – 2000 Hz): Cubren los sonidos principales del habla diaria y la comprensión vocal.\n• Frecuencias Altas (4000 Hz – 8000 Hz): Representan sonidos agudos, como el canto de pájaros, silbatos y consonantes ('s', 'f').\n\nEvaluar múltiples frecuencias ayuda a identificar exactamente qué tonos percibe con claridad y dónde puede requerir atención.",
        fr: "La fréquence décrit la vitesse de vibration d'une onde sonore et se mesure en Hertz (Hz) :\n\n• Basses Fréquences (125 Hz – 500 Hz) : Sons graves comme le tonnerre ou les voix profondes.\n• Moyennes Fréquences (1000 Hz – 2000 Hz) : Sons essentiels de la parole et des voyelles de conversation.\n• Hautes Fréquences (4000 Hz – 8000 Hz) : Sons aigus comme le chant des oiseaux, les sifflements et consonnes ('s', 'f').\n\nTester plusieurs fréquences permet d'identifier précisément les hauteurs de son que vous percevez le mieux.",
        de: "Die Frequenz beschreibt die Schwingungszahl einer Schallwelle und wird in Hertz (Hz) gemessen:\n\n• Tiefe Frequenzen (125 Hz – 500 Hz): Tiefbässe wie Donnergrollen oder tiefe Stimmen.\n• Mittlere Frequenzen (1000 Hz – 2000 Hz): Hauptsprachbereich für die alltägliche Unterhaltung.\n• Hohe Frequenzen (4000 Hz – 8000 Hz): Hohe Töne wie Vogelgezwitscher, Pfeifen und Konsonanten ('s', 'f').\n\nDie Messung verschiedener Frequenzen zeigt präzise, in welchen Tonhöhen Ihr Gehör am stärksten ist.",
        ja: "周波数とは音の波の振動速度を表すもので、ヘルツ（Hz）単位で測定されます：\n\n• 低周波数 (125 Hz – 500 Hz): 雷の音や低い男性の声などの重低音を表します。\n• 中周波数 (1000 Hz – 2000 Hz): 日常会話で最も重要な母音や会話音をカバーします。\n• 高周波数 (4000 Hz – 8000 Hz): 鳥のさえずりや笛の音、子音（「サ」「タ」行など）の高音を表します。\n\n複数の周波数を測定することで、音の高さごとの聞き取りやすさを詳細に把握できます。",
        zh: "频率指声波振动的快慢，以赫兹 (Hz) 为单位测量：\n\n• 低频 (125 Hz – 500 Hz)：代表沉闷的低音，如雷声、鼓点或低沉的人声。\n• 中频 (1000 Hz – 2000 Hz)：涵盖日常语言交流中最核心的元音和语音成分。\n• 高频 (4000 Hz – 8000 Hz)：代表高亢的声音，如鸟鸣、哨音以及辅音发音（如 's', 'f'）。\n\n测试多个频率有助于精准定位您在哪些音调范围内的听力较好，哪些范围需要关注。"
    }
};

function getPrecachedQuickQuestionAnswer(cleanQ, lang) {
    const q = cleanQ.toLowerCase();
    const l = (lang || 'en').toLowerCase();
    const validLang = PREDEFINED_ANSWERS.how_it_works[l] ? l : 'en';

    if (q.includes('how does') || q.includes('how test') || (q.includes('work') && q.includes('test')) || q.includes('काम करता') || q.includes('कैसे काम') || q.includes('funciona la prueba') || q.includes('fonctionne le test') || q.includes('funktioniert der test') || q.includes('<ctrl42><ctrl42><ctrl42>どのように') || q.includes('如何进行')) {
        return PREDEFINED_ANSWERS.how_it_works[validLang];
    }
    if ((q.includes('why') && (q.includes('headphone') || q.includes('earphone') || q.includes('put on') || q.includes('wear'))) || q.includes('हेडफोन') || q.includes('क्यों जरूरी') || q.includes('auriculares') || q.includes('casque') || q.includes('kopfhörer') || q.includes('ヘッドホン') || q.includes('耳机')) {
        return PREDEFINED_ANSWERS.headphones[validLang];
    }
    if (q.includes('privacy') || q.includes('private') || (q.includes('data') && (q.includes('safe') || q.includes('private') || q.includes('protected'))) || q.includes('सुरक्षित') || q.includes('डेटा') || q.includes('privados') || q.includes('privées') || q.includes('datenschutz') || q.includes('プライバシー') || q.includes('隐私')) {
        return PREDEFINED_ANSWERS.privacy[validLang];
    }
    if (q.includes('frequency') || q.includes('frequencies') || (q.includes('what') && q.includes('hz')) || q.includes('फ्रीक्वेंसी') || q.includes('frecuencias') || q.includes('fréquences') || q.includes('frequenzen') || q.includes('周波数') || q.includes('频率')) {
        return PREDEFINED_ANSWERS.frequencies[validLang];
    }

    return null;
}

function isOffTopicQuestion(cleanQ) {
    const q = cleanQ.toLowerCase();
    const audiologyKeywords = [
        'soniqx', 'hearing', 'hear', 'ear', 'ears', 'audiology', 'audiometer', 'audiogram', 'sound', 'decibel', 'db',
        'frequency', 'frequencies', 'hz', 'hertz', 'pitch', 'headphone', 'headphones', 'earphone', 'earphones',
        'volume', 'tinnitus', 'ringing', 'noise', 'deaf', 'presbycusis', 'ent', 'otology', 'wax', 'earwax',
        'test', 'screening', 'calibration', 'calibrated', 'threshold', 'thresholds', 'doctor', 'report', 'pdf',
        'privacy', 'private', 'data', 'left ear', 'right ear', 'stereo', '60/60', 'protection', 'aid', 'loss',
        'chart', 'graph', 'curve', 'pure tone', 'pure-tone', 'air conduction', 'bone conduction', 'daily care', 'care',
        'clean', 'cleaning', 'hygiene', 'health', 'protect', 'protection',
        'सुनवाई', 'कान', 'हेडफोन', 'आवाज', 'फ्रीक्वेंसी', 'टेस्ट', 'डेटा', 'सुरक्षित', 'काम करता', 'जरूरी', 'मतलब', 'देखभाल', 'सफाई',
        'prueba', 'datos', 'auriculares', 'frecuencia', 'oído', 'audición', 'umbral', 'cuidado', 'limpieza',
        'test', 'oreilles', 'casque', 'fréquence', 'audition', 'seuil', 'soin', 'nettoyage',
        'hören', 'ohr', 'kopfhörer', 'frequenz', 'hörtest', 'hörschwelle', 'pflege', 'reinigung',
        '聴力', '耳', 'ヘッドホン', '周波数', '検査', '閾値', 'ケア', 'お手入れ',
        '听力', '耳朵', '耳机', '频率', '测试', '阈值', '护理', '清洁'
    ];

    if (audiologyKeywords.some(kw => q.includes(kw))) {
        return false;
    }

    const offTopicKeywords = [
        'javascript', 'python', 'java', 'c++', 'html', 'css', 'react', 'code', 'coding', 'program', 'programming',
        'script', 'game', 'snake game', 'cricket', 'football', 'messi', 'ronaldo', 'virat', 'kohli', 'weather',
        'recipe', 'cook', 'pasta', 'pizza', 'math', 'algebra', 'calculus', 'movie', 'actor', 'song', 'music',
        'president', 'capital of', 'who is', 'history of', 'politics', 'car', 'finance', 'stock market'
    ];

    if (offTopicKeywords.some(kw => q.includes(kw))) {
        return true;
    }

    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'is', 'can', 'do', 'does', 'care', 'daily', 'कैसे', 'क्यों', 'क्या'];
    const hasQuestionWord = questionWords.some(qw => q.includes(qw));
    
    if (!hasQuestionWord && q.split(/\s+/).length <= 4) {
        return true;
    }

    return false;
}

function getSMTPConfig() {
    let config = {
        smtp_service: 'gmail',
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.SMTP_PORT || '465', 10),
        smtp_secure: true,
        smtp_user: process.env.SMTP_USER || '',
        smtp_pass: process.env.SMTP_PASS || '',
        ai_api_key: ''
    };

    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const fileData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            config = { ...config, ...fileData };
        } catch (err) {}
    }

    if (process.env.SMTP_USER) config.smtp_user = process.env.SMTP_USER;
    if (process.env.SMTP_PASS) config.smtp_pass = process.env.SMTP_PASS;
    if (process.env.AI_API_KEY) config.ai_api_key = process.env.AI_API_KEY;
    if (process.env.GEMINI_API_KEY) config.ai_api_key = process.env.GEMINI_API_KEY;

    return config;
}

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

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

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
                const validLang = LANGUAGE_NAMES[language] ? language : 'en';
                const targetLangName = LANGUAGE_NAMES[validLang];

                const offTopicRedirectMsg = OFF_TOPIC_MESSAGES[validLang] || OFF_TOPIC_MESSAGES.en;
                const genericErrMsg = ERROR_MESSAGES[validLang] || ERROR_MESSAGES.en;

                if (!cleanQ) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        answer: offTopicRedirectMsg
                    }));
                }

                const cachedAnswer = getPrecachedQuickQuestionAnswer(cleanQ, validLang);
                if (cachedAnswer) {
                    console.log(`[SONIQX AI] Quick Question Cache Hit (${validLang}): "${cleanQ.substring(0, 35)}..."`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        answer: cachedAnswer,
                        source: 'cache'
                    }));
                }

                if (isOffTopicQuestion(cleanQ)) {
                    console.log(`[SONIQX AI Guardrail] Off-topic request redirected (${validLang}): "${cleanQ}"`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        answer: offTopicRedirectMsg,
                        isOffTopic: true,
                        source: 'guardrail'
                    }));
                }

                const config = getSMTPConfig();
                const activeApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || config.ai_api_key || "";

                let aiAnswer = '';

                if (activeApiKey) {
                    try {
                        console.log(`[SONIQX AI Gemini Call] Dispatching request in ${targetLangName}...`);
                        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${activeApiKey}`;
                        
                        const systemInstructionText = `You are SONIQX AI, a specialized digital audiology and hearing-screening assistant.

Your purpose is to help users understand the SONIQX hearing-screening experience, audiology concepts, hearing frequencies, tone calibration, headphones, hearing thresholds, test procedures, results, privacy, and related hearing-health education.

You are not a general-purpose AI assistant.

Only answer questions related to SONIQX, audiology, hearing screening, hearing tests, hearing frequencies, hearing-health education, ear care, ear hygiene, or closely related topics.

If a question is unrelated, politely redirect the user back to SONIQX and hearing-related topics using this message:
"${offTopicRedirectMsg}"

CRITICAL MANDATORY LANGUAGE RULE:
You MUST write your ENTIRE response strictly in ${targetLangName} (${validLang}).
If language is Hindi ("hi"), write in Devanagari script Hindi.
If language is Spanish ("es"), write in Spanish.
If language is French ("fr"), write in French.
If language is German ("de"), write in German.
If language is Japanese ("ja"), write in Japanese.
If language is Chinese ("zh"), write in Simplified Chinese.
Do NOT respond in English unless the selected language is English ("en"). The selected language MUST take priority over the input language.

RESPONSE FORMAT & MEDIUM DEPTH (MANDATORY):
Provide rich, informative, medium-length responses (~120 to 180 words).
NEVER give a single sentence or truncated answer.
Structure your output into 2 to 3 clear paragraphs with bullet points for key recommendations or explanations.

MEDICAL SAFETY & CAUTION:
Do not diagnose medical conditions.
Do not claim that a user definitely has hearing loss or another medical condition based only on a screening result.
When appropriate, recommend consultation with a qualified audiologist or healthcare professional.`;

                        const apiStartTime = Date.now();
                        const response = await fetch(geminiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                system_instruction: { parts: [{ text: systemInstructionText }] },
                                contents: [{ parts: [{ text: cleanQ }] }],
                                generationConfig: {
                                    maxOutputTokens: 2048,
                                    temperature: 0.3,
                                    topP: 0.9
                                }
                            })
                        });

                        const data = await response.json();
                        const latency = Date.now() - apiStartTime;
                        console.log(`[SONIQX AI Gemini Call] Status ${response.status} in ${latency}ms`);

                        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                            aiAnswer = data.candidates[0].content.parts.map(p => p.text).join('').trim();
                        } else if (data && data.error) {
                            console.error('[SONIQX AI Gemini Error]', data.error.code, data.error.message);
                        }
                    } catch (gErr) {
                        console.error('[SONIQX AI Gemini Exception]', gErr.message);
                    }
                }

                if (!aiAnswer) {
                    aiAnswer = genericErrMsg;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    answer: aiAnswer,
                    mode: mode,
                    language: validLang,
                    source: activeApiKey ? 'gemini_api' : 'fallback'
                }));
            } catch (err) {
                console.error('[SONIQX AI Chat API Error]', err.message);
                const defaultErr = ERROR_MESSAGES.en;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    answer: defaultErr
                }));
            }
        });
        return;
    }

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
                    reportId = 'SHS-2026-9041',
                    date = new Date().toLocaleDateString(),
                    overallStatus = 'PASS',
                    notes = '',
                    pdfBase64,
                    fileName
                } = data;

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!recipientEmail || typeof recipientEmail !== 'string' || !emailRegex.test(recipientEmail.trim())) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: false,
                        error: `Invalid email address format: "${recipientEmail || ''}". Please enter a valid email address.`
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

                const transporter = createTransporter(smtpConfig);
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
                console.error('[SONIQX Email API Error]', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: err.message || 'Failed to send email report.',
                    code: err.code || 'EMAIL_FAILED'
                }));
            }
        });
        return;
    }

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
    console.log(`   SONIQX — Precision Audiology Platform & AI Server`);
    console.log(`==========================================================`);
    console.log(` Server running live at: http://localhost:${PORT}`);
    console.log(` AI Chat API Endpoint:   http://localhost:${PORT}/api/ai-chat`);
    console.log(` Email API Endpoint:     http://localhost:${PORT}/api/send-email`);
    console.log(` Static Files Served:    ${DIST_DIR}`);
    console.log(`==========================================================`);
});
