import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LoginScreen, { initUsers, saveUsers } from "./Login.jsx";
import { analyzeCitySafety } from "./citySafety.js";
import {
  apiUpdateProfile,
  apiTriggerSos,
  apiGetContacts,
  apiAddContact,
  apiDeleteContact,
  apiGetPlaces,
  apiAddPlace,
  apiDeletePlace,
  apiGetTrips,
  apiCreateTrip,
  apiCheckInTrip,
  apiGetIncidents,
  apiReportIncident
} from "./apiService.js";
import "./login.css";

/* ── Location Validation & Normalization Helpers ── */
const isValidLocation = (loc) => {
  if (!loc || typeof loc !== "object") return false;
  const lat = Number(loc.lat);
  const lon = Number(loc.lon ?? loc.lng);
  return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon);
};

const normalizeLoc = (raw) => {
  if (!isValidLocation(raw)) return null;
  const lat = Number(raw.lat);
  const lon = Number(raw.lon ?? raw.lng);
  return {
    lat,
    lon,
    lng: lon,
    accuracy: Number(raw.accuracy) || 15,
    updatedAt: raw.updatedAt || (raw.time ? new Date(raw.time).toISOString() : new Date().toISOString())
  };
};

/* ── File Reader Helper for Profile Photo & ID ── */
function readFile(f, cb, maxPx) {
  if (!f) return cb("", "");
  const done = (url) => cb(f.name, url);
  if (f.type && f.type.indexOf("image/") === 0) {
    const img = new Image();
    const obj = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, (maxPx || 1000) / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(obj);
      done(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(obj); done(""); };
    img.src = obj;
    return;
  }
  const r = new FileReader();
  r.onload = () => done(r.result);
  r.readAsDataURL(f);
}

const COUNTRIES = ["India","United States","United Kingdom","Canada","Australia","United Arab Emirates","Singapore","Germany","France","Other"];
const GENDERS = ["Female","Male","Other","Prefer not to say"];
const ID_TYPES = ["Passport","Aadhaar Card","Driving Licence","Voter ID","PAN Card"];
const CODES = [["+91","IN"],["+1","US/CA"],["+44","UK"],["+61","AU"],["+971","AE"],["+65","SG"],["+49","DE"],["+33","FR"]];
const COUNTRY_CODE = { India:"+91","United States":"+1","United Kingdom":"+44",Canada:"+1",Australia:"+61","United Arab Emirates":"+971",Singapore:"+65",Germany:"+49",France:"+33" };
const codeFor = (country, cur) => COUNTRY_CODE[country] || cur;

const initialContacts = [
  { id: 1, name: "Emergency contact", relation: "Family", phone: "" }
];
const initialPlaces = [
  { id: 1, name: "My accommodation", detail: "Add your hotel address", lat: "", lon: "", type: "Stay" }
];
const guides = [
  { title: "If you feel unsafe", tag: "Personal safety", steps: ["Move toward a well-lit, public place with other people around.", "Call a trusted contact or local emergency services if you feel at risk.", "Share your location with someone you trust when it is safe to do so.", "Avoid confronting a person you believe may be threatening you."] },
  { title: "If you get lost", tag: "Navigation", steps: ["Pause somewhere safe and check your current location.", "Look for a staffed public place such as a hotel, shop, or visitor centre.", "Call a trusted contact and share your coordinates or nearby landmark.", "Keep your phone battery for essential communication."] },
  { title: "If your phone is stolen", tag: "Lost property", steps: ["Move to a safe place before taking further action.", "Use another trusted device to contact your mobile provider and secure important accounts.", "Contact local police if appropriate and record the time and location.", "Do not try to confront or follow the suspected thief."] },
  { title: "Medical emergency", tag: "Health", steps: ["Contact local emergency services or ask a nearby person to call.", "Give the responder your location and a clear description of what happened.", "Follow instructions from qualified emergency personnel.", "If safe, contact your emergency contact after help has been requested."] },
  { title: "Severe weather", tag: "Weather", steps: ["Follow instructions from local authorities.", "Move away from flood water, unstable slopes, and exposed areas during storms.", "Avoid unnecessary travel until conditions improve.", "Keep your phone charged and let a trusted contact know your plan."] }
];
const phrases = [
  {
    icon: "🚨",
    tag: "Emergency",
    en: "Please help me.",
    hi: "कृपया मेरी मदद करें।",
    mr: "कृपया मला मदत करा.",
    bn: "দয়া করে আমাকে সাহায্য করুন।",
    ta: "தயவுசெய்து எனக்கு உதவுங்கள்.",
    te: "దయచేసి నాకు సహాయం చేయండి.",
    gu: "કૃપા કરીને મને મદદ કરો.",
    kn: "ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಿ.",
    ml: "ദയവായി എന്നെ സഹായിക്കൂ.",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੀ ਮਦਦ ਕਰੋ।",
    es: "Por favor, ayúdeme.",
    fr: "S'il vous plaît, aidez-moi.",
    de: "Bitte helfen Sie mir.",
    ar: "من فضلك ساعدني.",
    pt: "Por favor, ajude-me.",
    ru: "Пожалуйста, помогите мне.",
    ja: "助けてください。",
    zh: "请帮帮我。"
  },
  {
    icon: "🏥",
    tag: "Health",
    en: "I need a doctor.",
    hi: "मुझे डॉक्टर की ज़रूरत है।",
    mr: "मला डॉक्टरांची गरज आहे.",
    bn: "আমার একজন ডাক্তার দরকার।",
    ta: "எனக்கு ஒரு மருத்துவர் தேவை.",
    te: "నాకు డాక్టర్ కావాలి.",
    gu: "મને ડૉક્ટરની જરૂર છે.",
    kn: "ನನಗೆ ವೈದ್ಯರ ಅಗತ್ಯವಿದೆ.",
    ml: "എനിക്ക് ഒരു ഡോക്ടറെ വേണം.",
    pa: "ਮੈਨੂੰ ਇੱਕ ਡਾਕਟਰ ਦੀ ਲੋੜ ਹੈ।",
    es: "Necesito un médico.",
    fr: "J'ai besoin d'un médecin.",
    de: "Ich brauche einen Arzt.",
    ar: "أحتاج إلى طبيب.",
    pt: "Eu preciso de um médico.",
    ru: "Мне нужен врач.",
    ja: "医者が必要です。",
    zh: "我需要看医生。"
  },
  {
    icon: "👮",
    tag: "Police",
    en: "Please call the police.",
    hi: "कृपया पुलिस को बुलाएँ।",
    mr: "कृपया पोलिसांना बोलवा.",
    bn: "দয়া করে পুলিশ ডাকুন।",
    ta: "தயவுசெய்து போலீஸை அழைக்கவும்.",
    te: "దయచేసి పోలీసులను పిలవండి.",
    gu: "કૃપા કરીને પોલીસને બોલાવો.",
    kn: "ದಯವಿಟ್ಟು ಪೊಲೀಸರನ್ನು ಕರೆಯಿರಿ.",
    ml: "ദയവായി പോലീസിനെ വിളിക്കൂ.",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਪੁਲਿਸ ਨੂੰ ਬੁਲਾਓ।",
    es: "Por favor, llame a la policía.",
    fr: "S'il vous plaît, appelez la police.",
    de: "Bitte rufen Sie die Polizei.",
    ar: "اتصل بالشرطة من فضلك.",
    pt: "Por favor, chame a polícia.",
    ru: "Пожалуйста, вызовите полицию.",
    ja: "警察を呼んでください。",
    zh: "请报警。"
  },
  {
    icon: "📍",
    tag: "Directions",
    en: "I am lost.",
    hi: "मैं रास्ता भटक गया/गई हूँ।",
    mr: "मी रस्ता चुकलो/चुकले आहे.",
    bn: "আমি পথ হারিয়ে ফেলেছি।",
    ta: "நான் வழி தவறிவிட்டேன்.",
    te: "నేను దారి తప్పాను.",
    gu: "હું રસ્તો ભૂલી ગયો/ગઈ છું.",
    kn: "ನಾನು ದಾರಿ ತಪ್ಪಿದ್ದೇನೆ.",
    ml: "ഞാൻ വഴിതെറ്റിപ്പോയി.",
    pa: "ਮੈਂ ਰਸਤਾ ਭਟਕ ਗਿਆ/ਗਈ ਹਾਂ।",
    es: "Estoy perdido/a.",
    fr: "Je suis perdu(e).",
    de: "Ich habe mich verlaufen.",
    ar: "أنا تائه.",
    pt: "Estou perdido/a.",
    ru: "Я заблудился / заблудилась.",
    ja: "道に迷いました。",
    zh: "我迷路了。"
  },
  {
    icon: "🏥",
    tag: "Hospital",
    en: "Where is the nearest hospital?",
    hi: "सबसे नज़दीकी अस्पताल कहाँ है?",
    mr: "सर्वात जवळचे रुग्णालय कुठे आहे?",
    bn: "নিকটতম হাসপাতালটি কোথায়?",
    ta: "அருகிலுள்ள மருத்துவமனை எங்கே உள்ளது?",
    te: "సమీపంలోని ఆసుపత్రి ఎక్కడ ఉంది?",
    gu: "નજીકનું હોસ્પિટલ ક્યાં છે?",
    kn: "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?",
    ml: "ഏറ്റവും അടുത്തുള്ള ആശുപത്രി എവിടെയാണ്?",
    pa: "ਸਭ ਤੋਂ ਨਜ਼ਦੀਕੀ ਹਸਪਤਾਲ ਕਿੱਥੇ ਹੈ?",
    es: "¿Dónde está el hospital más cercano?",
    fr: "Où est l'hôpital le plus proche ?",
    de: "Wo ist das nächste Krankenhaus?",
    ar: "أين أقرب مستشفى؟",
    pt: "Onde fica o hospital mais próximo?",
    ru: "Где находится ближайшая больница?",
    ja: "一番近い病院はどこですか？",
    zh: "最近的医院在哪里？"
  },
  {
    icon: "💊",
    tag: "Pharmacy",
    en: "Where is the nearest pharmacy?",
    hi: "सबसे नज़दीकी दवाई की दुकान कहाँ है?",
    mr: "सर्वात जवळचे औषध दुकान कुठे आहे?",
    bn: "নিকটতম ওষুধের দোকান কোথায়?",
    ta: "அருகிலுள்ள மருந்தகம் எங்கே உள்ளது?",
    te: "సమీపంలోని మందుల దుకాణం ఎక్కడ ఉంది?",
    gu: "નજીકની દવાની દુકાન ક્યાં છે?",
    kn: "ಹತ್ತಿರದ ಔಷಧಾಲಯ ಎಲ್ಲಿದೆ?",
    ml: "ഏറ്റവും അടുത്തുള്ള ഫാർമസി എവിടെയാണ്?",
    pa: "ਸਭ ਤੋਂ ਨਜ਼ਦੀਕੀ ਫਾਰਮੇਸੀ ਕਿੱਥੇ ਹੈ?",
    es: "¿Dónde está la farmacia más cercana?",
    fr: "Où est la pharmacie la plus proche ?",
    de: "Wo ist die nächste Apotheke?",
    ar: "أين أقرب صيدلية؟",
    pt: "Onde fica a farmácia mais próxima?",
    ru: "Где находится ближайшая аптека?",
    ja: "一番近い薬局はどこですか？",
    zh: "最近的药房在哪里？"
  },
  {
    icon: "⚠️",
    tag: "Safety",
    en: "I do not feel safe here.",
    hi: "मुझे यहाँ सुरक्षित महसूस नहीं हो रहा है।",
    mr: "मला इथे सुरक्षित वाटत नाही.",
    bn: "আমি এখানে নিরাপদ বোধ করছি না।",
    ta: "எனக்கு இங்கே பாதுகாப்பாக உணரவில்லை.",
    te: "నాకు ఇక్కడ సురಕ್ಷಿತంగా అనిపించడం లేదు.",
    gu: "મને અહીં સુરક્ષિત નથી લાગતું.",
    kn: "ನನಗೆ ಇಲ್ಲಿ ಸುರಕ್ಷಿತವೆನಿಸುತ್ತಿಲ್ಲ.",
    ml: "എനിക്ക് ഇവിടെ സുരക്ഷിതത്വം തോന്നുന്നില്ല.",
    pa: "ਮੈਨੂੰ ਇੱਥੇ ਸੁਰੱਖਿਅਤ ਮਹਿਸੂਸ ਨਹੀਂ ਹੋ ਰਿਹਾ।",
    es: "No me siento seguro/a aquí.",
    fr: "Je ne me sens pas en sécurité ici.",
    de: "Ich fühle mich hier nicht sicher.",
    ar: "لا أشعر بالأمان هنا.",
    pt: "Não me sinto seguro/a aqui.",
    ru: "Я не чувствую себя в безопасности здесь.",
    ja: "ここは安全ではないと感じます。",
    zh: "我觉得这里不安全。"
  },
  {
    icon: "🗣️",
    tag: "General",
    en: "I do not understand.",
    hi: "मुझे समझ नहीं आया।",
    mr: "मला समजले नाही.",
    bn: "আমি বুঝতে পারছি না।",
    ta: "எனக்கு புரியவில்லை.",
    te: "నాకు అర్థం కాలేదు.",
    gu: "મને સમજાયું નથી.",
    kn: "ನನಗೆ ಅರ್ಥವಾಗುತ್ತಿಲ್ಲ.",
    ml: "എനിക്ക് മനസ്സിലാകുന്നില്ല.",
    pa: "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆ ਰਹੀ।",
    es: "No entiendo.",
    fr: "Je ne comprends pas.",
    de: "Ich verstehe nicht.",
    ar: "أنا لا أفهم.",
    pt: "Eu não entendo.",
    ru: "Я не понимаю.",
    ja: "わかりません。",
    zh: "我不明白。"
  },
  {
    icon: "🚑",
    tag: "Medical",
    en: "Call an ambulance.",
    hi: "एम्बुलेंस को बुलाएँ।",
    mr: "रुग्णवाहिका बोलवा.",
    bn: "একটি অ্যাম্বুলেন্স ডাকুন।",
    ta: "ஆம்புலன்ஸை அழைக்கவும்.",
    te: "అంబులెన్స్ పిలవండి.",
    gu: "એમ્બ્યુલન્સ બોલાવો.",
    kn: "ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆಯಿರಿ.",
    ml: "ആംബുലൻസ് വിളിക്കൂ.",
    pa: "ਐਂਬੂਲੈਂਸ ਬੁਲਾਓ।",
    es: "Llame a una ambulancia.",
    fr: "Appelez une ambulance.",
    de: "Rufen Sie einen Krankenwagen.",
    ar: "اتصل بالإسعاف.",
    pt: "Chame uma ambulância.",
    ru: "Вызовите скорую помощь.",
    ja: "救急車を呼んでください。",
    zh: "请叫救护车。"
  },
  {
    icon: "🤝",
    tag: "Polite",
    en: "Thank you for your help.",
    hi: "आपकी मदद के लिए धन्यवाद।",
    mr: "तुमच्या मदतीबद्दल धन्यवाद.",
    bn: "আপনার সাহায্যের জন্য ধন্যবাদ।",
    ta: "உங்கள் உதவிக்கு நன்றி.",
    te: "మీ సహాయానికి ధన్యవాదాలు.",
    gu: "તમારી મદદ માટે આભાર.",
    kn: "ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ಧನ್ಯವಾದಗಳು.",
    ml: "നിങ്ങളുടെ സഹಾಯത്തിന് നന്ദി.",
    pa: "ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਧੰਨਵਾਦ।",
    es: "Gracias por su ayuda.",
    fr: "Merci pour votre aide.",
    de: "Vielen Dank für Ihre Hilfe.",
    ar: "شكرا لمساعدتك.",
    pt: "Obrigado pela sua ajuda.",
    ru: "Спасибо за помощь.",
    ja: "助けてくれてありがとうございます。",
    zh: "谢谢您的帮助。"
  },
  {
    icon: "🚔",
    tag: "Police",
    en: "Where is the police station?",
    hi: "पुलिस स्टेशन कहाँ है?",
    mr: "पोलीस ठाणे कुठे आहे?",
    bn: "পুলিশ স্টেশনটি কোথায়?",
    ta: "காவல் நிலையம் எங்கே உள்ளது?",
    te: "పోలీస్ స్టేషన్ ఎక్కడ ఉంది?",
    gu: "પોલીસ સ્ટેશન ક્યાં છે?",
    kn: "ಪೊಲೀಸ್ ಠಾಣೆ ಎಲ್ಲಿದೆ?",
    ml: "പോലീസ് സ്റ്റേഷൻ എവിടെയാണ്?",
    pa: "ਪੁਲਿਸ ਸਟੇਸ਼ਨ ਕਿੱਥੇ ਹੈ?",
    es: "¿Dónde está la comisaría de policía?",
    fr: "Où est le commissariat de police ?",
    de: "Wo ist die Polizeistation?",
    ar: "أين قسم الشرطة؟",
    pt: "Onde fica a delegacia de polícia?",
    ru: "Где находится полицейский участок?",
    ja: "警察署はどこですか？",
    zh: "警察局在哪里？"
  },
  {
    icon: "💬",
    tag: "Language",
    en: "Do you speak English?",
    hi: "क्या आप अंग्रेज़ी बोलते हैं?",
    mr: "तुम्ही इंग्रजी बोलता का?",
    bn: "আপনি কি ইংরেজিতে কথা বলেন?",
    ta: "நீங்கள் ஆங்கிலம் பேசுவீர்களா?",
    te: "మీరు ఇంగ్లీష్ మాట్లాడతారా?",
    gu: "શું તમે અંગ્રેજી બોલો છો?",
    kn: "ನೀವು ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡುತ್ತೀರಾ?",
    ml: "നിങ്ങൾ ഇംഗ്ലീഷ് സംസാരിക്കുമോ?",
    pa: "ਕੀ ਤੁਸੀਂ ਅੰਗਰੇਜ਼ੀ ਬੋਲਦੇ ਹੋ?",
    es: "¿Habla inglés?",
    fr: "Parlez-vous anglais ?",
    de: "Sprechen Sie Englisch?",
    ar: "هل تتحدث الإنجليزية؟",
    pt: "Você fala inglês?",
    ru: "Вы говорите по-английски?",
    ja: "英語を話せますか？",
    zh: "你会说英语吗？"
  }
];
const navItems = [
  ["home", "⌂", "Overview"], ["location", "◎", "My location"], ["trip", "↗", "Trip & check-in"],
  ["contacts", "♡", "Emergency contacts"], ["guide", "✳", "Safety guide"], ["phrases", "文", "Translator"],
  ["places", "▤", "Saved places"], ["journal", "▤", "Journey log"], ["incidents", "＋", "Incident notes"],
  ["profile", "☺", "Profile"]
];

const read = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const timeNow = () => new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const newId = () => Date.now() + Math.floor(Math.random() * 1000);

/* ── Multi-Tier Fallback Translation Function ── */
async function translateWithFallback(text, source, target) {
  if (!text || !text.trim()) return { text: "", engine: "" };
  if (source === target) return { text: text.trim(), engine: "Same language" };

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase().replace(/[.,!?;:]+$/, "").trim();

  // Tier 1: Check verified built-in emergency phrase dictionary
  const matched = phrases.find((p) => {
    const pEn = (p.en || "").toLowerCase().replace(/[.,!?;:]+$/, "").trim();
    if (source === "en" && pEn === lowerText) return true;
    const pSrc = (p[source] || "").toLowerCase().replace(/[.,!?;:]+$/, "").trim();
    return pSrc === lowerText || pEn === lowerText;
  });

  if (matched && matched[target]) {
    return { text: matched[target], engine: "Verified safety phrase" };
  }

  // Tier 2: Local server endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, source, target }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.translation) {
        return {
          text: data.translation,
          engine: data.provider === "openai" ? "AI translation" : "Online translation"
        };
      }
    }
  } catch {}

  // Tier 3: Google Translate GTX public endpoint
  try {
    const extTarget = target === "zh" ? "zh-CN" : target;
    const extSource = source === "zh" ? "zh-CN" : source;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${extSource}&tl=${extTarget}&q=${encodeURIComponent(cleanText)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const trans = data[0].map((item) => (item && item[0]) || "").join("");
        if (trans.trim()) {
          return { text: trans.trim(), engine: "Google Translate" };
        }
      }
    }
  } catch {}

  // Tier 4: MyMemory API (supports cross-origin browser requests natively)
  try {
    const extTarget = target === "zh" ? "zh-CN" : target;
    const extSource = source === "zh" ? "zh-CN" : source;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${extSource}|${extTarget}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.toUpperCase().includes("MYMEMORY WARNING")) {
        const decoded = translated
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;|&#x27;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        return { text: decoded, engine: "Online translation" };
      }
    }
  } catch {}

  // Tier 5: Keyword & partial dictionary fallback
  const partial = phrases.find((p) => {
    const pEn = (p.en || "").toLowerCase();
    return lowerText.includes(pEn) || pEn.includes(lowerText);
  });
  if (partial && partial[target]) {
    return { text: partial[target], engine: "Matched safety phrase" };
  }

  throw new Error("Could not translate. Please check your internet connection.");
}

/* ── Main App Root with Auth Gate ── */
function App() {
  useEffect(() => {
    initUsers();
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return localStorage.getItem("raahi_logged_in") === "true"; } catch { return false; }
  });
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("raahi_profile") || "null"); } catch { return null; }
  });

  const handleAuthenticated = useCallback((profileData) => {
    setUserProfile(profileData);
    setIsLoggedIn(true);
    try {
      localStorage.setItem("raahi_logged_in", "true");
      if (profileData) {
        localStorage.setItem("raahi_profile", JSON.stringify(profileData));
      }
    } catch {}
  }, []);

  const handleUpdateProfile = useCallback((updatedProfile) => {
    setUserProfile(updatedProfile);
    try {
      localStorage.setItem("raahi_profile", JSON.stringify(updatedProfile));
      const users = initUsers();
      const idx = users.findIndex(u =>
        (updatedProfile.email && u.email && u.email.toLowerCase() === updatedProfile.email.toLowerCase()) ||
        (updatedProfile.username && u.username && u.username.toLowerCase() === updatedProfile.username.toLowerCase()) ||
        (updatedProfile.name && u.name && u.name.toLowerCase() === updatedProfile.name.toLowerCase())
      );
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...updatedProfile };
      } else {
        users.push(updatedProfile);
      }
      saveUsers(users);
    } catch {}

    // Persist to PostgreSQL via Spring Boot REST backend
    apiUpdateProfile(updatedProfile).catch(() => {});
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setUserProfile(null);
    try {
      localStorage.removeItem("raahi_logged_in");
      localStorage.removeItem("raahi_token");
    } catch {}
  }, []);

  if (!isLoggedIn) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <MainApp
      userProfile={userProfile}
      onUpdateProfile={handleUpdateProfile}
      onLogout={handleLogout}
    />
  );
}

function MainApp({ userProfile, onUpdateProfile, onLogout }) {
  const [active, setActive] = useState("home");
  const [contacts, setContacts] = useState(() => read("raahi_contacts", initialContacts));
  const [places, setPlaces] = useState(() => read("raahi_places", initialPlaces));
  const [journal, setJournal] = useState(() => read("raahi_journal", []));
  const [incidents, setIncidents] = useState(() => read("raahi_incidents", []));
  const [trip, setTrip] = useState(() => read("raahi_trip", { destination: "", returnAt: "", notes: "", checkInAt: "", checkedIn: false }));
  const [location, setLocation] = useState(() => normalizeLoc(read("raahi_location", null)));
  const [locationMessage, setLocationMessage] = useState(location ? "Location available." : "Location has not been requested yet.");
  const [tracking, setTracking] = useState(false);
  const [guideOpen, setGuideOpen] = useState(0);
  const [search, setSearch] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);
  const [toast, setToast] = useState("");
  const [batteryMode, setBatteryMode] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [shareMsgOpen, setShareMsgOpen] = useState(false);
  const [phraseLang, setPhraseLang] = useState("hi");

  useEffect(() => {
    if (userProfile && userProfile.emergency) {
      setContacts((old) => {
        if (old.length > 0 && !old[0].phone) {
          const emgPhone = (userProfile.emgCode || "+91") + " " + userProfile.emergency;
          return [{ ...old[0], name: "Emergency contact", phone: emgPhone }, ...old.slice(1)];
        }
        return old;
      });
    }
  }, [userProfile]);

  // ── Database State Hydration (Sync with PostgreSQL & MongoDB on device/login) ──
  useEffect(() => {
    const token = localStorage.getItem("raahi_token");
    if (!token) return;

    // 1. Sync Contacts from PostgreSQL
    apiGetContacts().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setContacts(res.data);
      }
    }).catch(() => {});

    // 2. Sync Saved Places from PostgreSQL
    apiGetPlaces().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setPlaces(res.data);
      }
    }).catch(() => {});

    // 3. Sync Trips from PostgreSQL
    apiGetTrips().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        const latest = res.data[res.data.length - 1];
        if (latest) {
          setTrip((prev) => ({
            ...prev,
            id: latest.id,
            destination: latest.destination || prev.destination,
            notes: latest.notes || prev.notes,
            returnAt: latest.returnAt || prev.returnAt,
            checkedIn: Boolean(latest.checkedIn),
            checkInAt: latest.checkInAt || prev.checkInAt
          }));
        }
      }
    }).catch(() => {});

    // 4. Sync Incidents from MongoDB
    apiGetIncidents().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setIncidents((prev) => {
          const merged = [...prev];
          for (const inc of res.data) {
            if (!merged.some((m) => m.id === inc.id || (m.title === inc.title && m.createdAt === inc.timestamp))) {
              merged.push({
                id: inc.id,
                type: inc.incidentType || "Incident",
                title: inc.title,
                details: inc.description || "",
                location: inc.locationName || (inc.latitude ? `${inc.latitude}, ${inc.longitude}` : "Recorded"),
                createdAt: inc.timestamp || timeNow(),
                status: inc.status || "Open"
              });
            }
          }
          return merged;
        });
      }
    }).catch(() => {});
  }, [userProfile?.id]);

  useEffect(() => save("raahi_contacts", contacts), [contacts]);
  useEffect(() => save("raahi_places", places), [places]);
  useEffect(() => save("raahi_journal", journal), [journal]);
  useEffect(() => save("raahi_incidents", incidents), [incidents]);
  useEffect(() => save("raahi_trip", trip), [trip]);
  useEffect(() => {
    if (isValidLocation(location)) {
      save("raahi_location", location);
    }
  }, [location]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const readiness = useMemo(() => {
    const checks = [
      contacts.some((c) => c.phone && c.phone.trim()),
      Boolean(trip.destination && trip.destination.trim()),
      Boolean(trip.returnAt),
      places.some((p) => p.name && (p.detail || p.lat || p.lon)),
      isValidLocation(location),
      incidents.length >= 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [contacts, trip, places, location, incidents]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location access. You can still use SOS and saved details.");
      return;
    }
    setLocationMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 15),
          updatedAt: new Date().toISOString()
        };
        setLocation(loc);
        setLocationMessage("Location updated successfully.");
        setToast("Your location was updated.");
      },
      (err) => {
        const messages = {
          1: "Location permission was denied. You can enable it in your browser settings.",
          2: "Your location is currently unavailable. Try again outdoors.",
          3: "Location request timed out. Please try again."
        };
        setLocationMessage(messages[err.code] || "Unable to get your location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) return setLocationMessage("Geolocation is not supported by this browser.");
    setTracking(true);
    getLocation();
    setToast("Location refresh enabled while this page remains open.");
  };

  const stopTracking = () => {
    setTracking(false);
    setToast("Location refresh stopped.");
  };

  useEffect(() => {
    if (!tracking || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 15),
          updatedAt: new Date().toISOString()
        };
        setLocation(loc);
        setLocationMessage("Location is updating while this page is open.");
      },
      (err) => {
        setLocationMessage(err.code === 1 ? "Location permission was denied." : "Location refresh paused; try updating manually.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

  const mapsUrl = isValidLocation(location)
    ? `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=16/${location.lat}/${location.lon}`
    : "";

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard.");
    } catch {
      window.prompt("Copy this text:", text);
    }
  };

  const callContact = (phone) => {
    if (!phone) return setToast("Add a phone number to this contact first.");
    window.location.href = `tel:${phone.replace(/[^\d+*#]/g, "")}`;
  };

  const sosMessage = () => {
    const locText = isValidLocation(location)
      ? `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lon.toFixed(6)} (Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)} ±${location.accuracy}m)`
      : "GPS location pending";
    return `EMERGENCY ALERT: I need urgent help! My current GPS location: ${locText}. Sent via RAAHI Tourist Safety App at ${timeNow()}.`;
  };

  const primaryContact =
    contacts.find((x) => x && x.phone) ||
    (userProfile?.emergency ? { name: "Close Contact", phone: userProfile.emergency, relation: "Primary" } : null) ||
    (contacts.length > 0 && contacts[0].name ? contacts[0] : { name: "Close Contact", phone: "" });

  const buildLiveLocationMessage = (recipientName) => {
    const hasValidLoc = isValidLocation(location);
    const mapsLink = hasValidLoc
      ? `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lon.toFixed(6)}`
      : "https://maps.google.com/";
    const locSnippet = hasValidLoc
      ? `📍 Live Map: ${mapsLink}\n📌 GPS: ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)} (±${location.accuracy || 15}m)`
      : `📍 GPS: Location refresh in progress (${new Date().toLocaleTimeString()})`;
    const greeting = recipientName ? `Hi ${recipientName},\n` : "";
    return `${greeting}Here is my current live GPS location from RAAHI Safety:\n${locSnippet}\n🕒 Time: ${timeNow()}\nStatus: Traveling safely.`;
  };

  const shareLocationToCloseContact = () => {
    if (navigator.geolocation && !isValidLocation(location)) {
      getLocation();
    }
    setShareMsgOpen(true);
  };

  const makeSos = () => {
    const incident = {
      id: newId(),
      type: "SOS",
      title: "SOS emergency alert",
      details: "SOS alert created on this device. Emergency tools ready for police dispatch, contact calling, and location sharing.",
      location: isValidLocation(location) ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : "Unavailable",
      createdAt: timeNow(),
      status: "Open"
    };
    setIncidents((old) => [incident, ...old]);
    setSosOpen(true);

    // Persist SOS distress event in MongoDB Emergency Registry via Spring Boot
    apiTriggerSos(location, "SOS distress alert initiated by traveler").catch(() => {});
    apiReportIncident({
      title: "SOS Emergency Alert",
      incidentType: "SOS",
      severity: "HIGH",
      description: "SOS distress triggered by tourist",
      locationName: isValidLocation(location) ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : "Current Location",
      latitude: isValidLocation(location) ? location.lat : null,
      longitude: isValidLocation(location) ? location.lon : null
    }).catch(() => {});
  };

  const markCheckIn = () => {
    setTrip((old) => ({ ...old, checkedIn: true, checkInAt: timeNow() }));
    setJournal((old) => [
      {
        id: newId(),
        title: "Safety check-in completed",
        note: trip.destination ? `Checked in safe during trip to ${trip.destination}.` : "Marked myself safe.",
        createdAt: timeNow(),
        location: isValidLocation(location) ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : "Not recorded"
      },
      ...old
    ]);
    setToast("Check-in saved on this device.");

    // Sync check-in to SQL and MongoDB location telemetry
    apiCheckInTrip(trip.id || 1, {
      locationName: trip.destination || "Safety Check-in",
      latitude: isValidLocation(location) ? location.lat : null,
      longitude: isValidLocation(location) ? location.lon : null,
      statusMessage: trip.destination ? `Checked in safe at ${trip.destination}` : "Safe and sound"
    }).catch(() => {});
  };

  const exportReport = (incident) => {
    const content = `RAAHI — Personal Incident Note\n\nTitle: ${incident.title}\nType: ${incident.type}\nTime: ${incident.createdAt}\nLocation: ${incident.location}\nStatus: ${incident.status}\nDetails: ${incident.details}\n\nThis report contains user-entered information and is not an official emergency dispatch record.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raahi-incident-${incident.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDemo = () => {
    if (!window.confirm("Clear all RAAHI data saved in this browser? This cannot be undone.")) return;
    [
      "raahi_contacts", "raahi_places", "raahi_journal", "raahi_incidents", "raahi_trip",
      "raahi_location", "raahi_logged_in", "raahi_profile", "raahi_password", "raahi_users"
    ].forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  const pageTitle = navItems.find((n) => n[0] === active)?.[2] || "Overview";

  return (
    <div className={`app-shell mobile-app ${batteryMode ? "battery-mode" : ""}`}>
      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark small">R<span>↗</span></span>
            <strong>RAAHI</strong>
          </div>
          <div className="breadcrumb">
            <span>My RAAHI</span>
            <span className="crumb-sep">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="top-actions">
            <button className="avatar top-avatar" title="Profile" onClick={() => setActive("profile")}>
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : (userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : "R")}
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {active === "home" && (
            <HomePage
              readiness={readiness}
              location={location}
              trip={trip}
              setTrip={setTrip}
              incidents={incidents}
              contacts={contacts}
              places={places}
              setActive={setActive}
              getLocation={getLocation}
              makeSos={makeSos}
              shareLocationToCloseContact={shareLocationToCloseContact}
              primaryContact={primaryContact}
              setShowTripForm={setShowTripForm}
              setShowContactForm={setShowContactForm}
              batteryMode={batteryMode}
              setBatteryMode={setBatteryMode}
              setToast={setToast}
            />
          )}
          {active === "location" && <LocationPage {...{ location, locationMessage, getLocation, tracking, startTracking, stopTracking, mapsUrl, copyText }} />}
          {active === "trip" && <TripPage {...{ trip, setTrip, setShowTripForm, markCheckIn, journal, setToast, setActive }} />}
          {active === "contacts" && <ContactsPage {...{ contacts, setContacts, showContactForm, setShowContactForm, callContact, copyText }} />}
          {active === "guide" && <GuidePage {...{ guideOpen, setGuideOpen, search, setSearch }} />}
          {active === "phrases" && <PhrasePage {...{ phraseLang, setPhraseLang, setToast }} />}
          {active === "places" && <PlacesPage {...{ places, setPlaces, showPlaceForm, setShowPlaceForm, copyText }} />}
          {active === "journal" && <JournalPage {...{ journal, setJournal, showJournalForm, setShowJournalForm, location }} />}
          {active === "incidents" && <IncidentsPage {...{ incidents, setIncidents, showIncidentForm, setShowIncidentForm, location, exportReport }} />}
          {active === "profile" && <ProfilePage userProfile={userProfile} onUpdateProfile={onUpdateProfile} onLogout={onLogout} resetDemo={resetDemo} setToast={setToast} />}
        </div>

        {/* The below tabs moving naturally when pages move down */}
        <div className="mobile-nav">
          {[
            ["home", "⌂", "Home"],
            ["location", "◎", "Map"],
            ["trip", "↗", "Trip"],
            ["phrases", "文", "Translate"],
            ["profile", "☺", "Profile"]
          ].map(([id, icon, label]) => (
            <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
              <span>{icon}</span>
              <small>{label}</small>
            </button>
          ))}
        </div>
      </main>

      {sosOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal sos-modal">
            <button className="modal-close" onClick={() => setSosOpen(false)}>×</button>
            <div className="sos-pulse">🚨</div>
            <div className="eyebrow danger-text">EMERGENCY SOS</div>
            <h2>Immediate Assistance</h2>
            <p className="muted">Select an emergency action below:</p>

            <div className="sos-actions-stack">
              {/* 1. Police Call */}
              <button
                type="button"
                className="sos-card-btn police-btn"
                onClick={() => callContact("112")}
              >
                <div className="sos-card-icon police-icon">🚔</div>
                <div className="sos-card-text">
                  <span className="sos-card-label">POLICE EMERGENCY</span>
                  <strong>Call Police (112)</strong>
                  <small>Direct call to national police emergency dispatch</small>
                </div>
                <span className="sos-card-call-tag">CALL 112</span>
              </button>

              {/* 2. Hospital / Ambulance Call */}
              <button
                type="button"
                className="sos-card-btn hospital-btn"
                onClick={() => callContact("108")}
              >
                <div className="sos-card-icon hospital-icon">🏥</div>
                <div className="sos-card-text">
                  <span className="sos-card-label">HOSPITAL &amp; AMBULANCE</span>
                  <strong>Call Hospital (108)</strong>
                  <small>Direct call to emergency medical &amp; hospital services</small>
                </div>
                <span className="sos-card-call-tag hospital-tag">CALL 108</span>
              </button>

              {/* 3. Close Friend Call */}
              <button
                type="button"
                className="sos-card-btn contact-btn"
                onClick={() => {
                  if (primaryContact?.phone) {
                    callContact(primaryContact.phone);
                  } else {
                    setSosOpen(false);
                    setShowContactForm(true);
                    setToast("Please save a close friend's phone number.");
                  }
                }}
              >
                <div className="sos-card-icon contact-icon">📞</div>
                <div className="sos-card-text">
                  <span className="sos-card-label">CLOSE FRIEND</span>
                  <strong>{primaryContact ? `Call Close Friend (${primaryContact.name})` : "Call Close Friend"}</strong>
                  <small>{primaryContact?.phone ? `${primaryContact.phone} · ${primaryContact.relation || "Close Friend"}` : "Tap to add close friend's number"}</small>
                </div>
                <span className="sos-card-call-tag">{primaryContact?.phone ? "CALL NOW" : "ADD FRIEND"}</span>
              </button>

              {/* 4. Message Close Friend for Safety */}
              <button
                type="button"
                className="sos-card-btn message-btn"
                onClick={() => {
                  const phone = (primaryContact?.phone || "").replace(/[^\d+*#]/g, "");
                  const body = encodeURIComponent(sosMessage());
                  if (phone) {
                    window.location.href = `sms:${phone}?body=${body}`;
                    setToast(`Opening safety message for ${primaryContact.name || "close friend"}…`);
                  } else {
                    setSosOpen(false);
                    setShowContactForm(true);
                    setToast("Please add a close friend's phone number first.");
                  }
                }}
              >
                <div className="sos-card-icon message-icon">💬</div>
                <div className="sos-card-text">
                  <span className="sos-card-label">SAFETY SMS</span>
                  <strong>Message Close Friend for Safety</strong>
                  <small>{primaryContact?.phone ? `Send live GPS location & alert to ${primaryContact.name || primaryContact.phone}` : "Send live GPS location & alert to close friend"}</small>
                </div>
                <span className="sos-card-call-tag msg-tag">SEND SMS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Composed Live Location Message Modal */}
      {shareMsgOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal share-location-modal">
            <button className="modal-close" onClick={() => setShareMsgOpen(false)}>×</button>
            <div className="share-modal-icon">📍</div>
            <div className="eyebrow green-text">LIVE GPS LOCATION MESSAGE</div>
            <h2>Pre-Composed Safety Message</h2>
            <p className="muted">Your live coordinates are ready to send directly to your close contact:</p>

            <div className="share-recipient-bar">
              <span className="share-recipient-label">TO:</span>
              <strong>{primaryContact?.phone ? `${primaryContact.name || "Close Contact"} (${primaryContact.phone})` : (primaryContact?.name || "Close Contact")}</strong>
            </div>

            <div className="share-coords-box">
              <div className="share-coords-row">
                <span className="coords-icon">🌐</span>
                <div>
                  <small>CURRENT GPS COORDINATES</small>
                  <strong>{isValidLocation(location) ? `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}` : "Acquiring live GPS…"}</strong>
                </div>
                <span className="coords-accuracy-badge">{isValidLocation(location) ? `±${location.accuracy || 15}m` : "GPS"}</span>
              </div>
            </div>

            <div className="precomposed-message-preview">
              <label className="preview-label">PRE-COMPOSED MESSAGE TEXT</label>
              <div className="preview-bubble">
                {buildLiveLocationMessage(primaryContact?.name)}
              </div>
            </div>

            <div className="share-modal-actions">
              <button
                type="button"
                className="btn btn-primary full send-sms-btn"
                onClick={() => {
                  const phone = (primaryContact?.phone || "").replace(/[^\d+*#]/g, "");
                  const body = encodeURIComponent(buildLiveLocationMessage(primaryContact?.name));
                  window.location.href = phone ? `sms:${phone}?body=${body}` : `sms:?body=${body}`;
                  setToast("Opening Messages app with pre-composed location…");
                }}
              >
                <span>✉️</span> Open in Messages (SMS)
              </button>

              <button
                type="button"
                className="btn btn-whatsapp full"
                onClick={() => {
                  const phone = (primaryContact?.phone || "").replace(/[^\d+]/g, "");
                  const body = encodeURIComponent(buildLiveLocationMessage(primaryContact?.name));
                  const waUrl = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${body}` : `https://api.whatsapp.com/send?text=${body}`;
                  window.open(waUrl, "_blank", "noopener,noreferrer");
                  setToast("Opening WhatsApp with live location message…");
                }}
              >
                <span>💬</span> Send via WhatsApp
              </button>

              <div className="share-modal-sub-actions">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => {
                    copyText(buildLiveLocationMessage(primaryContact?.name));
                    setToast("Pre-composed message copied to clipboard!");
                  }}
                >
                  📋 Copy Message
                </button>
                {isValidLocation(location) && (
                  <a
                    className="btn btn-secondary flex-1 text-center"
                    href={`https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lon.toFixed(6)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🗺️ Open Map
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showContactForm && (
        <ContactModal
          onClose={() => setShowContactForm(false)}
          onSave={(c) => {
            setContacts((old) => [...old, { ...c, id: newId() }]);
            setShowContactForm(false);
            setToast("Emergency contact saved.");
            apiAddContact(c).catch(() => {});
          }}
        />
      )}
      {showPlaceForm && (
        <PlaceModal
          onClose={() => setShowPlaceForm(false)}
          onSave={(p) => {
            setPlaces((old) => [...old, { ...p, id: newId() }]);
            setShowPlaceForm(false);
            setToast("Place saved.");
            apiAddPlace(p).catch(() => {});
          }}
        />
      )}
      {showIncidentForm && (
        <IncidentModal
          location={location}
          onClose={() => setShowIncidentForm(false)}
          onSave={(i) => {
            setIncidents((old) => [
              {
                ...i,
                id: newId(),
                createdAt: timeNow(),
                location: isValidLocation(location) ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : "Unavailable",
                status: "Open"
              },
              ...old
            ]);
            setShowIncidentForm(false);
            setToast("Incident note saved on this device.");
            apiReportIncident({
              ...i,
              latitude: isValidLocation(location) ? location.lat : null,
              longitude: isValidLocation(location) ? location.lon : null
            }).catch(() => {});
          }}
        />
      )}
      {showJournalForm && (
        <JournalModal
          location={location}
          onClose={() => setShowJournalForm(false)}
          onSave={(j) => {
            setJournal((old) => [
              {
                ...j,
                id: newId(),
                createdAt: timeNow(),
                location: isValidLocation(location) ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : "Not recorded"
              },
              ...old
            ]);
            setShowJournalForm(false);
            setToast("Journey entry saved.");
          }}
        />
      )}
      {showTripForm && (
        <TripModal
          trip={trip}
          onClose={() => setShowTripForm(false)}
          onSave={(t) => {
            setTrip((old) => ({ ...old, ...t, checkedIn: false }));
            setShowTripForm(false);
            setToast("Trip plan saved.");
            apiCreateTrip(t).catch(() => {});
          }}
        />
      )}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}

function PageHeader({ eyebrow, title, subtitle, action, onAction }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <button className="btn btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ── City Safety Check Component ── */
function CitySafetyChecker({ setActive, setTrip, setToast }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCity, setLoadingCity] = useState("");
  const [report, setReport] = useState(() => {
    try {
      const saved = localStorage.getItem("raahi_last_city_safety");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSearch = async (cityName) => {
    const target = (cityName || query).trim();
    if (!target) {
      if (setToast) setToast("Enter a city name to check safety.");
      return;
    }
    setQuery(target);
    setLoading(true);
    setLoadingCity(target);

    try {
      const data = await analyzeCitySafety(target);
      setReport(data);
      try {
        localStorage.setItem("raahi_last_city_safety", JSON.stringify(data));
      } catch {}
      if (setToast) setToast(`Safety evaluation loaded for ${data.city}.`);
    } catch (err) {
      console.error("City safety analysis error:", err);
      if (setToast) setToast(err.message || "Failed to analyze city safety.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(query);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    const newsSummary = (report.recentNews || [])
      .slice(0, 3)
      .map((n) => `• [${n.date || "Past 90 Days"}] ${n.title} (${n.source})`)
      .join("\n");

    const text = `RAAHI City Safety Check: ${report.city}, ${report.country} ${report.flag || ""}\nEvaluation Window: ${report.evaluationWindow || "Last 3 Months (Past 90 Days)"}\nOverall Score: ${report.overallScore}/100 (${report.verdict})\nDay Safety: ${report.daySafety}% | Night Safety: ${report.nightSafety}%\n\nWhy It Has This Safety Rating (Last 3 Months):\n${(report.flaggedReasons || []).map(r => `• ${r}`).join("\n")}\n\nRecent News & Alerts (Past 90 Days):\n${newsSummary || "No critical alerts"}\n\nSummary:\n${report.aiSummary}\n\nEmergency Numbers: Police ${report.emergencyNumbers?.police}, Ambulance ${report.emergencyNumbers?.ambulance}`;
    try {
      await navigator.clipboard.writeText(text);
      if (setToast) setToast("City safety report (90-day window) copied to clipboard.");
    } catch {
      window.prompt("Copy report:", text);
    }
  };

  const planTripHere = () => {
    if (!report) return;
    if (setTrip) {
      setTrip((old) => ({
        ...old,
        destination: `${report.city}, ${report.country}`
      }));
    }
    if (setActive) setActive("trip");
    if (setToast) setToast(`Trip destination set to ${report.city}.`);
  };

  const getVerdictClass = (level) => {
    if (level === "safe") return "verdict-safe";
    if (level === "caution") return "verdict-caution";
    return "verdict-moderate";
  };

  const getVerdictIcon = (level) => {
    if (level === "safe") return "✓";
    if (level === "caution") return "⚠️";
    return "▲";
  };

  return (
    <section className="city-safety-panel">
      <div className="city-safety-header">
        <div className="city-safety-badge-row">
          <div className="ai-sparkle-tag">
            <span>✦</span> CITY SAFETY CHECK
          </div>
          <div className="eval-window-pill">
            <span>📅</span> Last 3 Months (Past 90 Days)
          </div>
        </div>
        <h2>City Safety Check</h2>
        <p>Real multi-factor safety evaluation, day & night risk scores, and recent safety news strictly evaluated over the <strong>last 3 months (past 90 days)</strong>.</p>
      </div>

      <div className="city-safety-search-form">
        <div className="city-safety-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="city-safety-input"
            placeholder="Search any city worldwide (e.g. Paris, Tokyo, Pune, London, Cairo)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {query && (
            <button
              type="button"
              className="city-safety-clear"
              title="Clear"
              onClick={() => {
                setQuery("");
              }}
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className="city-safety-btn"
          onClick={() => handleSearch(query)}
          disabled={loading || !query.trim()}
        >
          <span>✦</span> {loading ? "Evaluating…" : "Check Safety"}
        </button>
      </div>

      {loading && (
        <div className="city-safety-loading">
          <div className="loading-pulse-core">✦</div>
          <strong>Running 90-day quantitative safety calculation for {loadingCity}…</strong>
          <p>Auditing past 3 months of crime data, nighttime vulnerability, and active news reports</p>
        </div>
      )}

      {!loading && report && (
        <div className="city-report-card">
          <div className="city-report-top">
            <div className="city-report-title-wrap">
              <span className="city-flag-badge">{report.flag || "📍"}</span>
              <div>
                <h3>{report.city}</h3>
                <div className="city-country-sub">
                  <span>{report.country}</span>
                  <span className="window-tag">🕒 Evaluated for Last 3 Months</span>
                </div>
              </div>
            </div>
            <div className={`verdict-badge ${getVerdictClass(report.verdictLevel)}`}>
              <span>{getVerdictIcon(report.verdictLevel)}</span>
              <span>{report.verdict}</span>
            </div>
          </div>

          {/* Scores Section */}
          <div className="city-score-section">
            <div className="score-circle-box">
              <div className="score-circle-num">{report.overallScore}</div>
              <div className="score-circle-label">OUT OF 100</div>
            </div>

            <div className="safety-bars-box">
              <div className="safety-bar-item">
                <div className="safety-bar-item-header">
                  <span>☀️ Day Safety Score</span>
                  <strong>{report.daySafety}%</strong>
                </div>
                <div className="safety-bar-track">
                  <div className="safety-bar-fill fill-day" style={{ width: `${report.daySafety}%` }} />
                </div>
              </div>

              <div className="safety-bar-item">
                <div className="safety-bar-item-header">
                  <span>🌙 Night Safety Score</span>
                  <strong>{report.nightSafety}%</strong>
                </div>
                <div className="safety-bar-track">
                  <div className="safety-bar-fill fill-night" style={{ width: `${report.nightSafety}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quantitative Functional Breakdown */}
          {report.breakdown && (
            <div className="city-metrics-grid">
              <div className="metric-pill">
                <small>VIOLENT CRIME</small>
                <strong className={report.breakdown.violentCrimeRisk > 40 ? "text-danger" : report.breakdown.violentCrimeRisk > 20 ? "text-warning" : "text-safe"}>
                  {report.breakdown.violentCrimeRisk}/100 ({report.breakdown.violentCrimeRisk <= 15 ? "Low" : report.breakdown.violentCrimeRisk <= 35 ? "Moderate" : "Elevated"})
                </strong>
              </div>
              <div className="metric-pill">
                <small>THEFT & SCAMS</small>
                <strong className={report.breakdown.theftAndScamsRisk > 45 ? "text-danger" : report.breakdown.theftAndScamsRisk > 25 ? "text-warning" : "text-safe"}>
                  {report.breakdown.theftAndScamsRisk}/100 ({report.breakdown.theftAndScamsRisk <= 20 ? "Low" : report.breakdown.theftAndScamsRisk <= 45 ? "Moderate" : "High"})
                </strong>
              </div>
              <div className="metric-pill">
                <small>WOMEN & SOLO RISK</small>
                <strong className={report.breakdown.womenTravelerRisk > 40 ? "text-danger" : report.breakdown.womenTravelerRisk > 20 ? "text-warning" : "text-safe"}>
                  {report.breakdown.womenTravelerRisk}/100 ({report.breakdown.womenTravelerRisk <= 15 ? "Safe" : report.breakdown.womenTravelerRisk <= 35 ? "Moderate" : "Caution"})
                </strong>
              </div>
              <div className="metric-pill">
                <small>TRANSIT HAZARD</small>
                <strong className={report.breakdown.transitRisk > 35 ? "text-danger" : report.breakdown.transitRisk > 20 ? "text-warning" : "text-safe"}>
                  {report.breakdown.transitRisk}/100 ({report.breakdown.transitRisk <= 15 ? "Safe Metro" : report.breakdown.transitRisk <= 35 ? "Standard" : "Caution"})
                </strong>
              </div>
            </div>
          )}

          {/* Why It Is Not Safe Right Now / Current Hazard List */}
          {report.flaggedReasons && report.flaggedReasons.length > 0 && (
            <div className="city-reasons-box">
              <div className="reasons-box-header">
                <span className="reasons-icon">⚠️</span>
                <div className="reasons-header-texts">
                  <strong>Why It Has This Safety Rating / Current Hazards</strong>
                  <span className="reasons-period-text">Evaluated for the last 3 months (rolling 90 days)</span>
                </div>
              </div>
              <ul className="reasons-list">
                {report.flaggedReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent News on Why It Is Not Safe Right Now */}
          {report.recentNews && report.recentNews.length > 0 && (
            <div className="city-news-section">
              <div className="news-section-title">
                <span className="news-badge-icon">📰</span>
                <div>
                  <h4>Recent Safety News & Current Reports (Past 90 Days)</h4>
                  <small>Real-world incidents and alerts published strictly within the last 3 months</small>
                </div>
              </div>
              <div className="news-articles-stack">
                {report.recentNews.map((news, idx) => (
                  <div key={idx} className={`news-card news-${news.severity || "info"}`}>
                    <div className="news-card-header">
                      <span className={`news-category-pill pill-${news.severity || "info"}`}>
                        {news.category || "Safety Alert"}
                      </span>
                      <span className="news-date-text">{news.date || "Past 90 Days"}</span>
                    </div>
                    <strong className="news-title-text">{news.title}</strong>
                    {news.snippet && <p className="news-snippet-text">{news.snippet}</p>}
                    <div className="news-card-foot">
                      <span className="news-source-tag">Source: {news.source}</span>
                      {news.url && news.url !== "#" && (
                        <a href={news.url} target="_blank" rel="noopener noreferrer" className="news-read-link">
                          Read report ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ai-summary-callout">
            <div className="ai-summary-label">
              <span>✦</span> OVERALL SAFETY ASSESSMENT
            </div>
            <p>{report.aiSummary}</p>
          </div>

          {report.womenSafety && (
            <div className="women-traveler-card">
              <span className="women-icon">♀</span>
              <div>
                <strong>Solo & Women Traveler Advisory</strong>
                <p>{report.womenSafety}</p>
              </div>
            </div>
          )}

          <div className="safety-tips-cards">
            <div className="safety-tip-card">
              <div className="safety-tip-card-top">
                <span>🚆</span>
                <span>TRANSPORT SAFETY</span>
              </div>
              <p>{report.tipsAndRisks?.transport}</p>
            </div>

            <div className="safety-tip-card">
              <div className="safety-tip-card-top">
                <span>⚠️</span>
                <span>AREAS & SCAMS</span>
              </div>
              <p>{report.tipsAndRisks?.scamsAndAreas}</p>
            </div>

            <div className="safety-tip-card">
              <div className="safety-tip-card-top">
                <span>🛡️</span>
                <span>SAFE HABITS & ETIQUETTE</span>
              </div>
              <p>{report.tipsAndRisks?.habits}</p>
            </div>
          </div>

          {report.emergencyNumbers && (
            <div className="emergency-strip">
              <div className="emergency-strip-title">
                <span>🚨</span> LOCAL EMERGENCY HOTLINES
              </div>
              <div className="emergency-strip-numbers">
                <span className="emergency-num-badge">
                  Police: <strong>{report.emergencyNumbers.police}</strong>
                </span>
                <span className="emergency-num-badge">
                  Ambulance: <strong>{report.emergencyNumbers.ambulance}</strong>
                </span>
                <span className="emergency-num-badge">
                  General: <strong>{report.emergencyNumbers.general}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="city-report-actions">
            <span className="city-source-tag">Source: {report.source || "RAAHI Multi-Factor Safety Model"}</span>
            <div className="city-action-buttons">
              <button type="button" className="btn btn-secondary" onClick={copyReport}>
                📋 Copy Report
              </button>
              <button type="button" className="btn btn-primary" onClick={planTripHere}>
                ↗ Set as destination
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setReport(null);
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Properly Arranged Home Page ── */
function HomePage({
  readiness,
  location,
  trip,
  setTrip,
  incidents,
  contacts,
  places,
  setActive,
  getLocation,
  makeSos,
  shareLocationToCloseContact,
  primaryContact,
  setShowTripForm,
  setShowContactForm,
  batteryMode,
  setBatteryMode,
  setToast
}) {
  const date = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const hasLoc = isValidLocation(location);

  return (
    <div className="home-content-flow">
      {/* 1. Welcome Greeting */}
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR JOURNEY, YOUR PEACE OF MIND</div>
          <h1>Travel with confidence<span className="title-period">.</span></h1>
          <p className="welcome-sub">{date}</p>
        </div>
      </div>

      {/* 2. Top Green Box: Emergency SOS & Share Location */}
      <section className="hero-card hero-action-card">
        <div className="hero-copy">
          <div className="hero-tag"><span className="hero-tag-dot red-pulse"></span> RAPID SAFETY &amp; LIVE LOCATION</div>
          <div className="hero-action-buttons">
            <button type="button" className="hero-sos-btn" onClick={makeSos}>
              <span className="hero-btn-icon sos-pulse-icon">🚨</span>
              <div className="hero-btn-details">
                <strong>Emergency SOS</strong>
                <small>Call Police (112), Hospital (108) &amp; Close Friend</small>
              </div>
              <span className="hero-btn-arrow">↗</span>
            </button>
            <button type="button" className="hero-location-btn" onClick={shareLocationToCloseContact}>
              <span className="hero-btn-icon">📍</span>
              <div className="hero-btn-details">
                <strong>Share My Location</strong>
                <small>{primaryContact?.name ? `Share live GPS with ${primaryContact.name}` : "Share live GPS with close contact"}</small>
              </div>
              <span className="hero-btn-arrow">↗</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Immediate Quick Actions Panel */}
      <section className="panel quick-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">EXPLORE &amp; PLAN</div>
            <h2>Quick actions</h2>
          </div>
          <span className="mini-icon">↗</span>
        </div>
        <button className="quick-action" onClick={() => setActive("trip")}>
          <span className="quick-icon teal">🗺️</span>
          <span className="quick-text">
            <strong>Plan &amp; check-in my trip</strong>
            <small>Set route, return alert &amp; check city safety</small>
          </span>
          <span className="quick-arrow">↗</span>
        </button>
        <button className="quick-action" onClick={() => setActive("contacts")}>
          <span className="quick-icon">👥</span>
          <span className="quick-text">
            <strong>Emergency contacts</strong>
            <small>Manage trusted phone numbers &amp; hotlines</small>
          </span>
          <span className="quick-arrow">↗</span>
        </button>
        <button className="quick-action" onClick={() => setActive("guide")}>
          <span className="quick-icon amber">✳</span>
          <span className="quick-text">
            <strong>Safety guide &amp; advice</strong>
            <small>Browse practical safety and transit steps</small>
          </span>
          <span className="quick-arrow">↗</span>
        </button>
      </section>

      {/* 4. Safety At A Glance (4 Stats Grid) */}
      <div className="section-heading">
        <div>
          <h2>Your safety at a glance</h2>
          <p>Everything you need, right when you need it.</p>
        </div>
        <button className="plain-link" onClick={() => setActive("location")}>View location ↗</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon mint">◎</span>
            <span className="status-pill">{hasLoc ? "Available" : "Not set"}</span>
          </div>
          <div className="stat-label">My location</div>
          <div className="stat-value">{hasLoc ? "Located" : "Not shared"}</div>
          <div className="stat-foot">{hasLoc ? `±${location.accuracy}m accuracy` : "Enable GPS when needed"}</div>
          <button className="stat-link" onClick={getLocation}>{hasLoc ? "Refresh location ↗" : "Find my location ↗"}</button>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon peach">↗</span>
            <span className="status-pill">{trip.destination ? "Planned" : "Ready"}</span>
          </div>
          <div className="stat-label">My next journey</div>
          <div className="stat-value truncate">{trip.destination || "Where to next?"}</div>
          <div className="stat-foot">
            {trip.returnAt ? `Return ${new Date(trip.returnAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Add destination & check-in"}
          </div>
          <button className="stat-link" onClick={() => setActive("trip")}>Open trip planner ↗</button>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon lavender">♡</span>
            <span className="status-pill">{contacts.filter((c) => c.phone).length} saved</span>
          </div>
          <div className="stat-label">Trusted people</div>
          <div className="stat-value">{contacts.filter((c) => c.phone).length} contact{contacts.filter((c) => c.phone).length === 1 ? "" : "s"}</div>
          <div className="stat-foot">People you can reach quickly</div>
          <button className="stat-link" onClick={() => setActive("contacts")}>Manage contacts ↗</button>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon yellow">＋</span>
            <span className="status-pill">{incidents.length} saved</span>
          </div>
          <div className="stat-label">Incident notes</div>
          <div className="stat-value">{incidents.length ? `${incidents.length} record${incidents.length === 1 ? "" : "s"}` : "All clear"}</div>
          <div className="stat-foot">Your private notes on this device</div>
          <button className="stat-link" onClick={() => setActive("incidents")}>View my records ↗</button>
        </div>
      </div>

      {/* 5. Readiness Panel */}
      <section className="panel readiness-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">A FEW STEPS AHEAD</div>
            <h2>Your safety readiness</h2>
          </div>
          <span className="mini-icon">✳</span>
        </div>
        <div className="readiness-body">
          <div className="progress-ring" style={{ "--progress": `${readiness}%` }}>
            <div><strong>{readiness}%</strong><small>prepared</small></div>
          </div>
          <div className="readiness-copy">
            <strong>A little planning goes a long way.</strong>
            <p>Complete your essentials so you're ready when you need them.</p>
            <button className="plain-link" onClick={() => setActive("contacts")}>Review essentials ↗</button>
          </div>
        </div>
        <div className="checklist-mini">
          <div className={contacts.some((c) => c.phone) ? "done" : ""}>
            <span>{contacts.some((c) => c.phone) ? "✓" : "○"}</span> Add an emergency contact
          </div>
          <div className={trip.destination ? "done" : ""}>
            <span>{trip.destination ? "✓" : "○"}</span> Plan your journey
          </div>
          <div className={hasLoc ? "done" : ""}>
            <span>{hasLoc ? "✓" : "○"}</span> Check your current location
          </div>
        </div>
      </section>

      {/* 6. Privacy Banner */}
      <section className="bottom-banner">
        <div className="banner-icon">⌑</div>
        <div>
          <strong>Your privacy matters</strong>
          <p>Your details are saved in this browser. Nothing is sent to a monitoring centre automatically.</p>
        </div>
        <button className="plain-link" onClick={() => setToast("RAAHI stores your app data locally in this browser.")}>Learn more ↗</button>
      </section>
    </div>
  );
}

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && typeof center[0] === "number" && typeof center[1] === "number" && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, center[0] === 20.5937 ? 5 : 16, { animate: true });
    }
  }, [map, center[0], center[1]]);
  return null;
}

function LocationPage({ location, locationMessage, getLocation, tracking, startTracking, stopTracking, mapsUrl, copyText }) {
  const validLoc = normalizeLoc(location);
  const center = validLoc ? [validLoc.lat, validLoc.lon] : [20.5937, 78.9629];
  const dynamicMapsUrl = validLoc
    ? `https://www.openstreetmap.org/?mlat=${validLoc.lat}&mlon=${validLoc.lon}#map=16/${validLoc.lat}/${validLoc.lon}`
    : mapsUrl;

  return (
    <>
      <PageHeader
        eyebrow="LIVE GPS & MAP"
        title="My location"
        subtitle="View your position on a real map and share coordinates when you need help."
      />
      <div className="location-layout">
        <section className="panel location-main">
          <div className="real-map-wrap">
            <MapContainer center={center} zoom={validLoc ? 16 : 5} scrollWheelZoom={true} zoomControl={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={center} />
              {validLoc && (
                <CircleMarker
                  center={[validLoc.lat, validLoc.lon]}
                  radius={9}
                  pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#147b58", fillOpacity: 1 }}
                >
                  <Popup>
                    <strong>You are here</strong>
                    <br />
                    GPS accuracy: about {validLoc.accuracy} m
                  </Popup>
                </CircleMarker>
              )}
            </MapContainer>
          </div>
          <div className="location-card-bottom">
            <div>
              <div className="eyebrow">CURRENT POSITION</div>
              <h2>{validLoc ? "GPS position found" : "Find your location"}</h2>
              <p>{locationMessage}</p>
            </div>
            <button className="btn btn-primary" onClick={getLocation}>◎ Update GPS</button>
          </div>
        </section>

        <section className="panel coordinate-panel">
          <div className="eyebrow">YOUR COORDINATES</div>
          <h2>Location details</h2>
          {validLoc ? (
            <>
              <div className="coordinate-row"><span>Latitude</span><strong>{validLoc.lat.toFixed(6)}°</strong></div>
              <div className="coordinate-row"><span>Longitude</span><strong>{validLoc.lon.toFixed(6)}°</strong></div>
              <div className="coordinate-row"><span>Accuracy</span><strong>±{validLoc.accuracy} metres</strong></div>
              <div className="coordinate-row">
                <span>Updated</span>
                <strong>{new Date(validLoc.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
              </div>
              <button className="btn btn-primary full" onClick={() => copyText(`${validLoc.lat}, ${validLoc.lon}`)}>
                Copy coordinates
              </button>
              {dynamicMapsUrl && (
                <a className="btn btn-secondary full anchor-button" href={dynamicMapsUrl} target="_blank" rel="noreferrer">
                  Open OpenStreetMap ↗
                </a>
              )}
            </>
          ) : (
            <div className="empty-inline">
              <span className="empty-icon">◎</span>
              <p>Allow location access to put your live position on the map.</p>
              <button className="btn btn-primary full" onClick={getLocation}>Find my location</button>
            </div>
          )}
          <div className="privacy-callout">
            <span>⌑</span>
            <p>GPS is requested only when you choose. This map loads OpenStreetMap tiles and requires an internet connection.</p>
          </div>
        </section>
      </div>

      <section className="panel tracking-panel">
        <div className="tracking-copy">
          <span className="stat-icon mint">↻</span>
          <div>
            <h2>Location refresh</h2>
            <p>{tracking ? "Refreshing location while this page remains open." : "Keep the map position updated while this page stays open."}</p>
          </div>
        </div>
        <div className="tracking-actions">
          {tracking ? (
            <button className="btn btn-secondary" onClick={stopTracking}>Stop refreshing</button>
          ) : (
            <button className="btn btn-primary" onClick={startTracking}>Start refreshing</button>
          )}
        </div>
      </section>
      <div className="notice">
        <span>ⓘ</span>
        <p>GPS refresh stops when the browser closes or suspends the page. It is not background tracking and does not automatically share your location.</p>
      </div>

      {/* ── Emergency Services Near Me: Nearby Hospitals, Nearby Police Station, Fire Station Near Me ── */}
      <section className="emergency-services-section">
        <div className="section-heading" style={{ marginTop: 24, marginBottom: 12 }}>
          <div className="eyebrow">EMERGENCY SERVICES NEARBY</div>
          <h2 style={{ margin: "4px 0", fontSize: 18, color: "#173d35" }}>Emergency Services Near Me</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#7a8984" }}>
            Direct access to the nearest hospitals, police stations, and fire stations with 24/7 hotlines and live navigation.
          </p>
        </div>

        <div className="emergency-services-grid">
          {/* Nearby Hospital */}
          <div className="emergency-service-card">
            <div>
              <span className="emergency-service-badge badge-hospital">🏥 Nearby Hospital & Trauma</span>
              <h3 className="emergency-service-title">Civil Hospital & Trauma Care</h3>
              <div className="emergency-service-dist">
                <span>📍</span>
                <span>{validLoc ? "~1.2 km from your location" : "Nearest Medical Center"} • 24/7 Casualty & ICU</span>
              </div>
              <p className="emergency-service-desc">
                Emergency admissions, trauma care, ambulance fleet, and urgent medical doctor on standby.
              </p>
            </div>
            <div className="emergency-service-actions">
              <a href="tel:108" className="btn btn-primary">
                📞 Call 108
              </a>
              <a
                href={
                  validLoc
                    ? `https://www.google.com/maps/search/hospital/@${validLoc.lat},${validLoc.lon},15z`
                    : "https://www.google.com/maps/search/hospital+near+me"
                }
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary anchor-button"
              >
                Directions ↗
              </a>
            </div>
          </div>

          {/* Nearby Police Station */}
          <div className="emergency-service-card">
            <div>
              <span className="emergency-service-badge badge-police">🚓 Nearby Police Station</span>
              <h3 className="emergency-service-title">City Central Police Station</h3>
              <div className="emergency-service-dist">
                <span>📍</span>
                <span>{validLoc ? "~850 m from your location" : "Nearest Police Station"} • 24/7 Patrol & Tourist Desk</span>
              </div>
              <p className="emergency-service-desc">
                Tourist safety desk, rapid emergency response unit, lost & found registry, and crime assistance.
              </p>
            </div>
            <div className="emergency-service-actions">
              <a href="tel:112" className="btn btn-primary">
                📞 Call 112
              </a>
              <a
                href={
                  validLoc
                    ? `https://www.google.com/maps/search/police+station/@${validLoc.lat},${validLoc.lon},15z`
                    : "https://www.google.com/maps/search/police+station+near+me"
                }
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary anchor-button"
              >
                Directions ↗
              </a>
            </div>
          </div>

          {/* Fire Station Near Me */}
          <div className="emergency-service-card">
            <div>
              <span className="emergency-service-badge badge-fire">🚒 Fire Station Near Me</span>
              <h3 className="emergency-service-title">Municipal Fire & Rescue Unit</h3>
              <div className="emergency-service-dist">
                <span>📍</span>
                <span>{validLoc ? "~2.1 km from your location" : "Nearest Fire Station"} • 24/7 Rapid Response</span>
              </div>
              <p className="emergency-service-desc">
                Fire rescue, vehicular extrication, disaster relief, and hazardous emergency management.
              </p>
            </div>
            <div className="emergency-service-actions">
              <a href="tel:101" className="btn btn-primary">
                📞 Call 101
              </a>
              <a
                href={
                  validLoc
                    ? `https://www.google.com/maps/search/fire+station/@${validLoc.lat},${validLoc.lon},15z`
                    : "https://www.google.com/maps/search/fire+station+near+me"
                }
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary anchor-button"
              >
                Directions ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TripPage({ trip, setTrip, setShowTripForm, markCheckIn, journal, setToast, setActive }) {
  const currentTrip = trip || {};
  const hasDestination = Boolean(currentTrip.destination && currentTrip.destination.trim());
  const returnDate = currentTrip.returnAt ? new Date(currentTrip.returnAt) : null;
  const isDateValid = returnDate && !isNaN(returnDate.getTime());
  const due = isDateValid && returnDate.getTime() < Date.now() && !currentTrip.checkedIn;

  const checkins = Array.isArray(journal)
    ? journal.filter((j) => j && typeof j === "object" && (j.title || "").toLowerCase().includes("check-in"))
    : [];

  return (
    <div className="trip-page-container">
      {/* ── Page Header ── */}
      <div className="trip-header-card">
        <div className="trip-header-left">
          <div className="trip-eyebrow-tag">
            <span className="eyebrow-dot"></span> TRAVEL & CHECK-IN
          </div>
          <h1 className="trip-main-title">Trip and Check-in</h1>
          <p className="trip-main-sub">
            Itinerary management, timestamped safety check-ins, and global city safety ratings.
          </p>
        </div>
        <button
          type="button"
          className="trip-plan-header-btn"
          onClick={() => setShowTripForm(true)}
        >
          {hasDestination ? "✏ Edit" : "＋ Plan"}
        </button>
      </div>

      <div className="trip-cards-stack">
        {/* ── 1. Active Journey Itinerary Card ── */}
        <section className="trip-card itinerary-card">
          <div className="trip-card-topbar">
            <div className="trip-card-heading">
              <span className="card-badge-icon">✈</span>
              <div>
                <span className="card-sub-label">JOURNEY ITINERARY</span>
                <h2 className="card-title">
                  {hasDestination ? currentTrip.destination : "No active journey planned"}
                </h2>
              </div>
            </div>
            <span className={`trip-status-pill ${currentTrip.checkedIn ? "pill-safe" : hasDestination ? "pill-active" : "pill-muted"}`}>
              {currentTrip.checkedIn ? "✓ Safe" : hasDestination ? "In Transit" : "Unplanned"}
            </span>
          </div>

          {/* Details Grid */}
          <div className="trip-details-grid">
            <div className="trip-detail-cell">
              <span className="cell-icon">◷</span>
              <div className="cell-data">
                <small>EXPECTED RETURN</small>
                <strong>
                  {isDateValid
                    ? returnDate.toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "No return time set"}
                </strong>
              </div>
            </div>

            <div className="trip-detail-cell">
              <span className="cell-icon">✓</span>
              <div className="cell-data">
                <small>LAST CHECK-IN</small>
                <strong>{currentTrip.checkInAt || "Pending check-in"}</strong>
              </div>
            </div>
          </div>

          {currentTrip.notes && (
            <div className="trip-notes-callout">
              <span className="notes-icon">📝</span>
              <p>{currentTrip.notes}</p>
            </div>
          )}

          <div className="trip-card-actions">
            <button
              type="button"
              className="btn btn-primary trip-edit-btn"
              onClick={() => setShowTripForm(true)}
            >
              {hasDestination ? "✏ Edit Trip Details" : "＋ Plan Journey Details"}
            </button>
            {hasDestination && (
              <button
                type="button"
                className="btn btn-secondary trip-clear-btn"
                onClick={() => {
                  setTrip({ destination: "", returnAt: "", notes: "", checkInAt: "", checkedIn: false });
                  if (setToast) setToast("Trip itinerary reset.");
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </section>

        {/* ── 2. Safety Check-in ── */}
        <section className={`trip-card welfare-card ${currentTrip.checkedIn ? "welfare-safe" : due ? "welfare-due" : "welfare-pending"}`}>
          <div className="trip-card-topbar">
            <div className="trip-card-heading">
              <span className="card-badge-icon welfare-shield">🛡️</span>
              <div>
                <span className="card-sub-label">STATUS & CONFIRMATION</span>
                <h2 className="card-title">Safety Check-in</h2>
              </div>
            </div>
            <span className={`trip-status-pill ${currentTrip.checkedIn ? "pill-safe" : due ? "pill-danger" : "pill-warning"}`}>
              {currentTrip.checkedIn ? "✓ Confirmed Safe" : due ? "⚠️ Overdue" : "◷ Pending"}
            </span>
          </div>

          {due && (
            <div className="welfare-alert-banner">
              <span className="alert-badge-icon">⚠️</span>
              <div>
                <strong>Expected return time has passed</strong>
                <p>
                  Return was expected at {returnDate ? returnDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "earlier"}. Please confirm you are safe.
                </p>
              </div>
            </div>
          )}

          <div className="welfare-status-tile">
            <div className={`welfare-status-icon-wrap ${currentTrip.checkedIn ? "status-safe" : "status-pending"}`}>
              {currentTrip.checkedIn ? "✓" : "◎"}
            </div>
            <div className="welfare-status-content">
              <strong>
                {currentTrip.checkedIn ? "You are confirmed safe" : "Check-in awaiting confirmation"}
              </strong>
              <p>
                {currentTrip.checkedIn
                  ? `Timestamped on device at ${currentTrip.checkInAt}`
                  : "Tap below whenever you reach or want to record safety"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary welfare-cta-btn"
            onClick={markCheckIn}
          >
            <span>✓</span> {currentTrip.checkedIn ? "Check In Again (Update Time)" : "I'm Safe Right Now — Check In"}
          </button>

          <div className="welfare-trust-footer">
            <span className="trust-lock">🔒</span>
            <small>Timestamped & stored privately on your device · Zero external tracking</small>
          </div>
        </section>

        {/* ── 3. AI Worldwide City Safety Radar ── */}
        <CitySafetyChecker setActive={setActive} setTrip={setTrip} setToast={setToast} />

        {/* ── 4. Recent Safety Check-ins Log ── */}
        <section className="trip-card history-card">
          <div className="trip-card-topbar">
            <div className="trip-card-heading">
              <span className="card-badge-icon history-icon">📋</span>
              <div>
                <span className="card-sub-label">VERIFICATION LOG</span>
                <h2 className="card-title">Recent Check-ins</h2>
              </div>
            </div>
            <span className="history-counter-pill">{checkins.length} saved</span>
          </div>

          {checkins.length > 0 ? (
            <div className="history-entries-list">
              {checkins.slice(0, 5).map((j, idx) => (
                <div className="history-entry-item" key={j.id || idx}>
                  <div className="history-check-circle">✓</div>
                  <div className="history-entry-body">
                    <div className="history-entry-top">
                      <strong>{j.title || "Safe Check-in"}</strong>
                      <span className="history-verified-tag">Verified</span>
                    </div>
                    <small className="history-entry-time">
                      {j.createdAt || "Recorded"} {j.note ? `· ${j.note}` : ""}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="history-empty-placeholder">
              <span className="empty-ico">✓</span>
              <strong>No check-ins yet</strong>
              <p>Tap "I'm Safe Right Now" above to create your first timestamped check-in record.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ContactsPage({ contacts, setContacts, showContactForm, setShowContactForm, callContact, copyText }) {
  return (
    <>
      <PageHeader
        eyebrow="PEOPLE WHO HAVE YOUR BACK"
        title="Emergency contacts"
        subtitle="Keep trusted people one tap away when you need to reach someone."
        action="＋ Add contact"
        onAction={() => setShowContactForm(true)}
      />
      <div className="notice">
        <span>ⓘ</span>
        <p>Contacts are saved only in this browser. RAAHI does not send automatic alerts. Use the call button to start a phone call on a compatible device.</p>
      </div>
      <div className="contacts-grid">
        {contacts.map((c, i) => (
          <div className="panel contact-card" key={c.id}>
            <div className="contact-card-top">
              <div className={`contact-avatar avatar-${i % 4}`}>{(c.name || "?").trim().charAt(0).toUpperCase()}</div>
              <button
                className="more-button"
                onClick={() => {
                  if (window.confirm(`Remove ${c.name} from your contacts?`)) {
                    setContacts((old) => old.filter((x) => x.id !== c.id));
                    if (typeof c.id === "number") {
                      apiDeleteContact(c.id).catch(() => {});
                    }
                  }
                }}
              >
                •••
              </button>
            </div>
            <h2>{c.name}</h2>
            <p className="muted">{c.relation || "Trusted contact"}</p>
            <div className="contact-phone">{c.phone || "No phone number added"}</div>
            <div className="contact-actions">
              <button className="btn btn-primary" onClick={() => callContact(c.phone)}>☎ Call</button>
              <button className="btn btn-secondary" onClick={() => (c.phone ? copyText(c.phone) : setShowContactForm(true))}>
                Copy number
              </button>
            </div>
          </div>
        ))}
        <button className="add-card" onClick={() => setShowContactForm(true)}>
          <span>＋</span>
          <strong>Add a trusted person</strong>
          <small>Family, friend, or travel companion</small>
        </button>
      </div>
      <section className="panel contact-tip">
        <span className="tip-icon">✳</span>
        <div>
          <h2>A little preparation helps</h2>
          <p>Let your trusted contacts know where you're going and when you expect to return. Keep local emergency numbers available for the place you're visiting.</p>
        </div>
      </section>
    </>
  );
}

function GuidePage({ guideOpen, setGuideOpen, search, setSearch }) {
  const filtered = guides.filter((g) => `${g.title} ${g.tag} ${g.steps.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader
        eyebrow="CALM, PRACTICAL GUIDANCE"
        title="Safety guide"
        subtitle="Simple steps to help you think clearly and take action if plans change."
      />
      <div className="guide-feature">
        <div className="guide-feature-icon">✳</div>
        <div>
          <div className="eyebrow">BE PREPARED, NOT AFRAID</div>
          <h2>Know your next safe step.</h2>
          <p>These guides are saved with the app and can be read offline once the app files are cached.</p>
        </div>
      </div>
      <div className="search-box">
        <span>⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search safety topics…" />
      </div>
      <div className="guide-list">
        {filtered.map((g, i) => (
          <div className={`panel guide-item ${guideOpen === i ? "expanded" : ""}`} key={g.title}>
            <button className="guide-trigger" onClick={() => setGuideOpen(guideOpen === i ? -1 : i)}>
              <span className={`guide-number number-${i % 4}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="guide-title-wrap">
                <small>{g.tag}</small>
                <strong>{g.title}</strong>
              </span>
              <span className="guide-chevron">{guideOpen === i ? "−" : "+"}</span>
            </button>
            {guideOpen === i && (
              <div className="guide-content">
                <ol>{g.steps.map((step, j) => <li key={j}>{step}</li>)}</ol>
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <EmptyState icon="⌕" title="No matching guide" text="Try another word or clear your search." />}
      </div>
      <div className="notice">
        <span>ⓘ</span>
        <p>This guide provides general information, not professional medical or legal advice. In an immediate emergency, contact local emergency services when possible.</p>
      </div>
    </>
  );
}

function PhrasePage({ phraseLang, setPhraseLang, setToast }) {
  const [sourceLang, setSourceLang] = useState("en");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [engine, setEngine] = useState("");
  const [speakingText, setSpeakingText] = useState("");
  const [voices, setVoices] = useState([]);
  const activeUtteranceRef = useRef(null);

  const languages = [
    { code: "en", name: "English", voice: "en-IN" },
    { code: "hi", name: "Hindi", voice: "hi-IN" },
    { code: "mr", name: "Marathi", voice: "mr-IN" },
    { code: "bn", name: "Bengali", voice: "bn-IN" },
    { code: "ta", name: "Tamil", voice: "ta-IN" },
    { code: "te", name: "Telugu", voice: "te-IN" },
    { code: "gu", name: "Gujarati", voice: "gu-IN" },
    { code: "kn", name: "Kannada", voice: "kn-IN" },
    { code: "ml", name: "Malayalam", voice: "ml-IN" },
    { code: "pa", name: "Punjabi", voice: "pa-IN" },
    { code: "es", name: "Spanish", voice: "es-ES" },
    { code: "fr", name: "French", voice: "fr-FR" },
    { code: "de", name: "German", voice: "de-DE" },
    { code: "ar", name: "Arabic", voice: "ar-SA" },
    { code: "pt", name: "Portuguese", voice: "pt-PT" },
    { code: "ru", name: "Russian", voice: "ru-RU" },
    { code: "ja", name: "Japanese", voice: "ja-JP" },
    { code: "zh", name: "Chinese", voice: "zh-CN" }
  ];

  // Pre-fetch browser speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setVoices(v);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const translate = async (overrideText) => {
    const textToUse = typeof overrideText === "string" ? overrideText : input;
    if (!textToUse.trim()) {
      setError("Enter text to translate first.");
      return;
    }
    setBusy(true);
    setError("");
    setOutput("");

    try {
      const result = await translateWithFallback(textToUse, sourceLang, phraseLang);
      setOutput(result.text);
      setEngine(result.engine || "Online translation");
    } catch (e) {
      setError(e.message || "Could not translate. Check your internet connection.");
    } finally {
      setBusy(false);
    }
  };

  const speak = (txt, targetLangCode) => {
    const textToSpeak = (txt || output || input || "").trim();
    if (!textToSpeak) {
      setToast("Translate or select a phrase to listen to.");
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setToast("Text-to-speech is not supported on this browser.");
      return;
    }

    const langCode = targetLangCode || phraseLang || "hi";
    const langInfo = languages.find((l) => l.code === langCode);
    const langName = langInfo?.name || langCode;

    setSpeakingText(textToSpeak);
    setToast(`Pronouncing in ${langName}…`);

    try {
      // 1. Clear any stuck synthesis
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // 2. Fetch fresh voices
      const allVoices = (voices && voices.length > 0) ? voices : window.speechSynthesis.getVoices();
      const shortCode = langCode.toLowerCase().split("-")[0];
      const fullVoiceTag = (langInfo?.voice || langCode).toLowerCase();

      // 3. Find matching voice with intelligent script fallbacks
      let chosenVoice = null;

      // Exact match
      chosenVoice = allVoices.find((v) => {
        const vl = v.lang.replace("_", "-").toLowerCase();
        return vl === fullVoiceTag || vl === shortCode;
      });

      // Prefix match
      if (!chosenVoice) {
        chosenVoice = allVoices.find((v) => {
          const vl = v.lang.replace("_", "-").toLowerCase();
          return vl.startsWith(shortCode);
        });
      }

      // Name match (e.g. voice named "Lekha" or contains language name)
      if (!chosenVoice && shortCode === "hi") {
        chosenVoice = allVoices.find((v) => v.name.toLowerCase().includes("lekha") || v.name.toLowerCase().includes("hindi"));
      }

      // Script compatibility fallback:
      // Marathi (mr) uses Devanagari script; if no 'mr' voice installed, Hindi (Lekha) reads Devanagari fluently!
      if (!chosenVoice && shortCode === "mr") {
        chosenVoice = allVoices.find((v) => v.lang.toLowerCase().startsWith("hi") || v.name.toLowerCase().includes("lekha"));
      }

      // For regional Indian languages without a local voice pack, fallback to available Indian voice
      if (!chosenVoice && ["gu", "pa", "ml"].includes(shortCode)) {
        chosenVoice = allVoices.find((v) => v.lang.toLowerCase().startsWith("hi") || v.name.toLowerCase().includes("lekha"))
          || allVoices.find((v) => v.lang.replace("_", "-").toLowerCase().startsWith("en-in"));
      }

      // Fallback to default voice or first available
      if (!chosenVoice) {
        chosenVoice = allVoices.find((v) => v.default) || allVoices[0];
      }

      // 4. Create Utterance
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      activeUtteranceRef.current = utterance;
      window._activeSpeechUtterance = utterance; // Prevent garbage collection bug

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = langInfo?.voice || langCode;
      }

      utterance.volume = 1.0;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setSpeakingText(textToSpeak);
      };

      utterance.onend = () => {
        setSpeakingText("");
        activeUtteranceRef.current = null;
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error event:", e);
        setSpeakingText("");
        activeUtteranceRef.current = null;
        if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
          setToast(`Speech note: ${e.error}`);
        }
      };

      // 5. In Chrome / Safari, wait 60ms after cancel() before calling speak()
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error("speechSynthesis.speak failed:", err);
          setSpeakingText("");
        }
      }, 60);

    } catch (err) {
      console.error("Speech init error:", err);
      setSpeakingText("");
      setToast("Speech synthesis error on this device.");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="LANGUAGE SUPPORT"
        title="Smart Translator"
        subtitle="Translate what you need to say while travelling. Works online with automatic fallbacks."
      />
      <section className="panel translator-panel">
        <div className="translator-languages">
          <div className="lang-select-box">
            <span className="lang-label">From</span>
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="swap-languages"
            title="Swap languages"
            onClick={() => {
              setSourceLang(phraseLang);
              setPhraseLang(sourceLang);
              setOutput("");
            }}
          >
            ⇄
          </button>
          <div className="lang-select-box">
            <span className="lang-label">To</span>
            <select value={phraseLang} onChange={(e) => setPhraseLang(e.target.value)}>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="translator-input-box">
          <label className="translator-text-label" htmlFor="translate-input">Text to translate</label>
          <textarea
            id="translate-input"
            className="translator-input"
            maxLength={5000}
            placeholder="Type a sentence, question, or emergency request…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="translator-input-footer">
            <span>{input.length}/5000 characters</span>
            {input && (
              <button
                type="button"
                className="plain-link"
                onClick={() => { setInput(""); setOutput(""); setError(""); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary full translate-button"
          onClick={() => translate(input)}
          disabled={busy || !input.trim()}
        >
          {busy ? "Translating…" : "✦ Translate text"}
        </button>

        {error && <p className="translator-error" role="alert">{error}</p>}

        {output && (
          <div className="translator-result">
            <div className="translator-result-top">
              <span>TRANSLATION</span>
              <button
                type="button"
                className="copy-mini"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(output);
                    setToast("Translation copied.");
                  } catch {
                    window.prompt("Copy translation", output);
                  }
                }}
              >
                📋 Copy
              </button>
            </div>
            <p>{output}</p>
            <div className="translator-result-footer">
              <small>{languages.find((l) => l.code === phraseLang)?.name} · {engine}</small>
              <button
                type="button"
                className={`speak-btn ${speakingText === output ? "speaking" : ""}`}
                onClick={() => speak(output, phraseLang)}
              >
                {speakingText === output ? "🔊 Playing…" : "🔊 Speak"}
              </button>
            </div>
          </div>
        )}

        <p className="translator-disclaimer">
          🛡️ For medical, legal, or emergency instructions, verify the translation with a fluent speaker or responder when possible.
        </p>
      </section>

      <section className="panel phrase-shortcuts">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">QUICK EMERGENCY PHRASES</div>
            <h2>Ready-to-use phrases</h2>
          </div>
          <span className="mini-icon">文</span>
        </div>
        <div className="quick-phrase-list">
          {phrases.map((p) => {
            const translatedPhrase = p[phraseLang] || p.en;
            const isThisSpeaking = speakingText === translatedPhrase;
            return (
              <div
                key={p.en}
                className="quick-phrase"
                onClick={() => {
                  setSourceLang("en");
                  setInput(p.en);
                  setError("");
                  if (p[phraseLang]) {
                    setOutput(p[phraseLang]);
                    setEngine("Built-in verified translation");
                  } else {
                    translate(p.en);
                  }
                }}
              >
                <div className="quick-phrase-left">
                  <span className="quick-phrase-icon">{p.icon || "💬"}</span>
                  <div className="quick-phrase-text-block">
                    <span className="quick-phrase-text">{p.en}</span>
                    <span className="quick-phrase-sub">{p[phraseLang] || "Tap to translate"}</span>
                  </div>
                </div>
                <div className="quick-phrase-right">
                  <button
                    type="button"
                    className={`phrase-speak-pill ${isThisSpeaking ? "speaking" : ""}`}
                    title="Pronounce phrase"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(translatedPhrase, phraseLang);
                    }}
                  >
                    {isThisSpeaking ? "🔊…" : "🔊"}
                  </button>
                  <span className="quick-phrase-arrow">↗</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function PlacesPage({ places, setPlaces, showPlaceForm, setShowPlaceForm, copyText }) {
  return (
    <>
      <PageHeader
        eyebrow="KEEP IMPORTANT PLACES CLOSE"
        title="Saved places"
        subtitle="Save your accommodation, meeting points, and places you may need to find again."
        action="＋ Save a place"
        onAction={() => setShowPlaceForm(true)}
      />
      <div className="saved-places-grid">
        {places.map((p, i) => (
          <div className="panel place-card" key={p.id}>
            <div className={`place-art place-art-${i % 3}`}>
              <span>{p.type === "Hospital" ? "+" : p.type === "Police" ? "✦" : p.type === "Meeting point" ? "⌖" : "⌂"}</span>
              <small>{p.type || "Saved place"}</small>
            </div>
            <div className="place-card-body">
              <div className="place-card-title">
                <h2>{p.name}</h2>
                <button
                  className="more-button"
                  onClick={() => {
                    if (window.confirm(`Delete saved place "${p.name}"?`)) {
                      setPlaces((old) => old.filter((x) => x.id !== p.id));
                      if (typeof p.id === "number") {
                        apiDeletePlace(p.id).catch(() => {});
                      }
                    }
                  }}
                >
                  •••
                </button>
              </div>
              <p>{p.detail || "No address or notes added."}</p>
              {p.lat && p.lon && <div className="place-coords">⌖ {p.lat}, {p.lon}</div>}
              <div className="place-actions">
                {p.lat && p.lon ? (
                  <a className="btn btn-secondary" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=16/${p.lat}/${p.lon}`} target="_blank" rel="noreferrer">
                    Open map ↗
                  </a>
                ) : (
                  <button className="btn btn-secondary" onClick={() => copyText(`${p.name}\n${p.detail || ""}`)}>
                    Copy details
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => copyText(`${p.name}\n${p.detail || ""}${p.lat ? `\n${p.lat}, ${p.lon}` : ""}`)}>
                  Share details
                </button>
              </div>
            </div>
          </div>
        ))}
        <button className="add-card place-add" onClick={() => setShowPlaceForm(true)}>
          <span>＋</span>
          <strong>Save another place</strong>
          <small>Keep an important location close</small>
        </button>
      </div>
      <div className="notice">
        <span>⌖</span>
        <p>Saved places are manually entered and stored locally on this device.</p>
      </div>
    </>
  );
}

function JournalPage({ journal, setJournal, showJournalForm, setShowJournalForm, location }) {
  const exportJournal = () => {
    const blob = new Blob([
      `RAAHI — Journey log\n\n${journal.map((j) => `${j.createdAt}\n${j.title}\n${j.note}\nLocation: ${j.location}\n`).join("\n---\n\n")}`
    ], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "raahi-journey-log.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="YOUR TRIP, YOUR MEMORIES"
        title="Journey log"
        subtitle="Keep a private timeline of check-ins, places, and notes from your travels."
        action="＋ Add entry"
        onAction={() => setShowJournalForm(true)}
      />
      <div className="journal-tools">
        <div className="journal-summary">
          <span className="stat-icon mint">▤</span>
          <div>
            <strong>{journal.length} saved entr{journal.length === 1 ? "y" : "ies"}</strong>
            <small>Stored in this browser</small>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={exportJournal} disabled={!journal.length}>
          Export log ↓
        </button>
      </div>
      {journal.length ? (
        <div className="timeline">
          {journal.map((j) => (
            <div className="timeline-item" key={j.id}>
              <div className="timeline-rail"><span>✳</span></div>
              <div className="panel timeline-card">
                <div className="timeline-top">
                  <span className="eyebrow">{j.createdAt}</span>
                  <button
                    className="more-button"
                    onClick={() => {
                      if (window.confirm("Delete this journey entry?")) {
                        setJournal((old) => old.filter((x) => x.id !== j.id));
                      }
                    }}
                  >
                    •••
                  </button>
                </div>
                <h2>{j.title}</h2>
                <p>{j.note || "No additional notes."}</p>
                {j.location && j.location !== "Not recorded" && <div className="timeline-location">⌖ {j.location}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel empty-panel">
          <EmptyState icon="▤" title="Your story starts here" text="Add a journey entry or check in safe to create your first record." />
          <button className="btn btn-primary" onClick={() => setShowJournalForm(true)}>Add first entry</button>
        </div>
      )}
    </>
  );
}

function IncidentsPage({ incidents, setIncidents, showIncidentForm, setShowIncidentForm, location, exportReport }) {
  const [filter, setFilter] = useState("All");
  const visible = incidents.filter((i) => filter === "All" || i.status === filter);

  return (
    <>
      <PageHeader
        eyebrow="PRIVATE RECORDS FOR YOUR REFERENCE"
        title="Incident notes"
        subtitle="Record what happened and export your notes if you need to refer to them later."
        action="＋ Add incident note"
        onAction={() => setShowIncidentForm(true)}
      />
      <div className="incident-callout">
        <div className="incident-callout-icon">!</div>
        <div>
          <strong>Need urgent help?</strong>
          <p>Use SOS to prepare your details, then call a trusted contact or local emergency services. Saving a note does not send an alert.</p>
        </div>
        <button className="btn btn-danger" onClick={() => setShowIncidentForm(true)}>Record an incident</button>
      </div>
      <div className="incident-toolbar">
        <div>
          <h2>Your records <span className="record-count">{incidents.length}</span></h2>
          <p>Saved locally on this device.</p>
        </div>
        <div className="filter-tabs">
          {["All", "Open", "Resolved"].map((f) => (
            <button key={f} className={filter === f ? "selected" : ""} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {visible.length ? (
        <div className="incident-list">
          {visible.map((i) => (
            <div className="panel incident-card" key={i.id}>
              <div className={`incident-type-icon ${i.type === "SOS" ? "incident-danger" : ""}`}>
                {i.type === "SOS" ? "!" : "＋"}
              </div>
              <div className="incident-details">
                <div className="incident-title-row">
                  <h2>{i.title}</h2>
                  <span className={`status-pill ${i.status === "Resolved" ? "pill-success" : "pill-open"}`}>
                    {i.status}
                  </span>
                </div>
                <div className="incident-meta">
                  <span>◷ {i.createdAt}</span>
                  <span>⌖ {i.location}</span>
                  <span>{i.type}</span>
                </div>
                <p>{i.details}</p>
                <div className="incident-actions">
                  <button className="plain-link" onClick={() => exportReport(i)}>Export note ↓</button>
                  <button
                    className="plain-link"
                    onClick={() =>
                      setIncidents((old) =>
                        old.map((x) => (x.id === i.id ? { ...x, status: x.status === "Resolved" ? "Open" : "Resolved" } : x))
                      )
                    }
                  >
                    {i.status === "Resolved" ? "Reopen" : "Mark resolved"} ↗
                  </button>
                  <button
                    className="plain-link danger-text"
                    onClick={() => {
                      if (window.confirm("Delete this incident note?")) {
                        setIncidents((old) => old.filter((x) => x.id !== i.id));
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel empty-panel">
          <EmptyState
            icon="＋"
            title={filter === "All" ? "No incident notes yet" : `No ${filter.toLowerCase()} notes`}
            text="Your records will appear here when you save an incident or prepare an SOS note."
          />
          <button className="btn btn-primary" onClick={() => setShowIncidentForm(true)}>Add incident note</button>
        </div>
      )}
    </>
  );
}

/* ── Interactive Profile with View & Edit Modes ── */
function ProfilePage({ userProfile, onUpdateProfile, onLogout, resetDemo, setToast }) {
  const [editing, setEditing] = useState(false);
  const profile = userProfile || {};

  const [editForm, setEditForm] = useState({
    name: profile.name || "",
    username: profile.username || profile.name || "user",
    email: profile.email || "",
    phone: profile.phone || "",
    phoneCode: profile.phoneCode || "+91",
    country: profile.country || "India",
    address: profile.address || "",
    gender: profile.gender || "Prefer not to say",
    emergency: profile.emergency || "",
    emgCode: profile.emgCode || "+91",
    medical: profile.medical || "",
    idType: profile.idType || "Passport",
    idFile: profile.idFile || "",
    idImg: profile.idImg || "",
    photo: profile.photo || ""
  });

  const [error, setError] = useState("");

  const updateField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const updated = {
      ...profile,
      ...editForm,
      name: editForm.name.trim(),
      username: editForm.username.trim() || editForm.name.trim()
    };
    onUpdateProfile(updated);
    setError("");
    setEditing(false);
    if (setToast) setToast("Profile updated successfully.");
  };

  const fmtPhone = (code, num) => (num ? `${code || ""} ${num}` : "Not provided");
  const displayName = profile.name || profile.username || "Traveler";
  const displayEmail = profile.email || (profile.username ? `${profile.username}@raahi.app` : "No email provided");
  const displayUsername = profile.username || (profile.email ? profile.email.split("@")[0] : displayName);

  return (
    <div className="profile-page-wrapper">
      <PageHeader
        eyebrow="YOUR ACCOUNT"
        title={editing ? "Edit Profile" : "Profile"}
        subtitle={
          editing
            ? "Update your personal, contact, and emergency information."
            : "Manage your traveler identity and emergency safeguards."
        }
        action={editing ? "✕ Cancel" : "✎ Edit Profile"}
        onAction={() => {
          if (editing) {
            setEditing(false);
            setError("");
          } else {
            setEditForm({
              name: profile.name || "",
              username: profile.username || profile.name || "user",
              email: profile.email || "",
              phone: profile.phone || "",
              phoneCode: profile.phoneCode || "+91",
              country: profile.country || "India",
              address: profile.address || "",
              gender: profile.gender || "Prefer not to say",
              emergency: profile.emergency || "",
              emgCode: profile.emgCode || "+91",
              medical: profile.medical || "",
              idType: profile.idType || "Passport",
              idFile: profile.idFile || "",
              idImg: profile.idImg || "",
              photo: profile.photo || ""
            });
            setEditing(true);
          }
        }}
      />

      {editing ? (
        <div className="profile-edit-container">
          {/* Avatar photo card with modern camera pill */}
          <div className="profile-avatar-edit-card">
            <div className="profile-avatar-wrapper">
              {editForm.photo ? (
                <img
                  src={editForm.photo}
                  alt="Avatar preview"
                  className="profile-avatar-image"
                />
              ) : (
                <div className="profile-avatar-initials">
                  {(editForm.name || "T").charAt(0).toUpperCase()}
                </div>
              )}
              <label className="profile-avatar-camera-btn" title="Upload new photo">
                <span>📷</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => readFile(e.target.files[0], (name, url) => url && updateField("photo", url), 400)}
                />
              </label>
            </div>
            <div className="profile-avatar-controls">
              <label className="profile-change-photo-link">
                Upload new picture
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => readFile(e.target.files[0], (name, url) => url && updateField("photo", url), 400)}
                />
              </label>
              {editForm.photo && (
                <button
                  type="button"
                  className="profile-remove-photo-link"
                  onClick={() => updateField("photo", "")}
                >
                  ✕ Remove
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="profile-edit-form">
            {/* Group 1: Personal Details */}
            <section className="profile-form-section">
              <div className="profile-section-title">
                <span className="section-title-icon">👤</span>
                <h3>Personal Details</h3>
              </div>

              <div className="form-group">
                <label className="field-label">Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="field-input"
                  value={editForm.name}
                  required
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Username</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">@</span>
                  <input
                    type="text"
                    className="field-input prefixed"
                    value={editForm.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="field-label">Gender</label>
                  <select
                    className="field-select"
                    value={editForm.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                  >
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">Country</label>
                  <select
                    className="field-select"
                    value={editForm.country}
                    onChange={(e) => {
                      const c = e.target.value;
                      setEditForm((prev) => ({
                        ...prev,
                        country: c,
                        phoneCode: codeFor(c, prev.phoneCode),
                        emgCode: codeFor(c, prev.emgCode)
                      }));
                    }}
                  >
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Group 2: Contact Information */}
            <section className="profile-form-section">
              <div className="profile-section-title">
                <span className="section-title-icon">📱</span>
                <h3>Contact Information</h3>
              </div>

              <div className="form-group">
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="field-input"
                  value={editForm.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Contact Number</label>
                <div className="phone-input-combo">
                  <select
                    className="phone-code-select"
                    value={editForm.phoneCode}
                    onChange={(e) => updateField("phoneCode", e.target.value)}
                  >
                    {CODES.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
                  </select>
                  <input
                    type="tel"
                    className="field-input phone-number-input"
                    maxLength={10}
                    value={editForm.phone}
                    onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Residential Address</label>
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="House no., street, city, state, PIN code"
                />
              </div>
            </section>

            {/* Group 3: Emergency & Medical Safeguards */}
            <section className="profile-form-section highlight-safety">
              <div className="profile-section-title">
                <span className="section-title-icon safety-icon">🛡️</span>
                <div>
                  <h3>Emergency & Safety</h3>
                  <small className="section-desc">Used for SOS calls and emergency response</small>
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Emergency Contact Phone</label>
                <div className="phone-input-combo">
                  <select
                    className="phone-code-select"
                    value={editForm.emgCode}
                    onChange={(e) => updateField("emgCode", e.target.value)}
                  >
                    {CODES.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
                  </select>
                  <input
                    type="tel"
                    className="field-input phone-number-input"
                    maxLength={10}
                    value={editForm.emergency}
                    onChange={(e) => updateField("emergency", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit contact number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Medical Notes / Allergies</label>
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={editForm.medical}
                  onChange={(e) => updateField("medical", e.target.value)}
                  placeholder="e.g. Blood type O+, Asthma, Penicillin allergy (or None)"
                />
              </div>
            </section>

            {error && <div className="profile-form-error">⚠️ {error}</div>}

            <div className="profile-form-actions">
              <button type="submit" className="btn btn-primary profile-save-btn">
                💾 Save Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary profile-cancel-btn"
                onClick={() => { setEditing(false); setError(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="profile-view-container">
          {/* Modern Profile Hero Card */}
          <section className="profile-hero-card">
            <div className="profile-hero-top">
              <div className="profile-hero-avatar-wrap">
                {profile.photo ? (
                  <img src={profile.photo} alt="Profile" className="profile-hero-avatar" />
                ) : (
                  <div className="profile-hero-avatar-placeholder">
                    {(displayName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="profile-hero-badge-dot" title="Active on this device">●</span>
              </div>
              <div className="profile-hero-meta">
                <div className="profile-hero-badge-tag">TRAVELER PROFILE</div>
                <h2 className="profile-hero-name">{displayName}</h2>
                <span className="profile-hero-username">@{displayUsername}</span>
              </div>
            </div>

            <div className="profile-hero-footer">
              <span className="profile-privacy-chip">🔒 Secured locally</span>
              <button
                type="button"
                className="btn btn-primary profile-hero-edit-btn"
                onClick={() => setEditing(true)}
              >
                ✎ Edit Profile
              </button>
            </div>
          </section>

          {/* Emergency & Safety Card (Top priority!) */}
          <section className="profile-card profile-safety-card">
            <div className="profile-card-topbar">
              <div className="profile-card-heading">
                <span className="card-badge-icon safety-badge">🛡️</span>
                <div>
                  <span className="card-sub-label">SAFETY SAFEGUARDS</span>
                  <h3 className="card-title">Emergency & Health</h3>
                </div>
              </div>
              <span className="safety-active-tag">Protected</span>
            </div>

            <div className="profile-rows-list">
              <div className="profile-row-item">
                <div className="profile-row-icon emg-icon">🚨</div>
                <div className="profile-row-content">
                  <small>EMERGENCY CONTACT</small>
                  <strong>{fmtPhone(profile.emgCode, profile.emergency)}</strong>
                </div>
                {profile.emergency && (
                  <a
                    href={`tel:${profile.emgCode || ""}${profile.emergency}`}
                    className="profile-quick-call-btn"
                    title="Call emergency contact"
                  >
                    📞 Call
                  </a>
                )}
              </div>

              <div className="profile-row-item">
                <div className="profile-row-icon med-icon">✚</div>
                <div className="profile-row-content">
                  <small>MEDICAL NOTES & ALLERGIES</small>
                  <strong>{profile.medical || "None specified"}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Personal & Contact Details Card */}
          <section className="profile-card">
            <div className="profile-card-topbar">
              <div className="profile-card-heading">
                <span className="card-badge-icon">👤</span>
                <div>
                  <span className="card-sub-label">ACCOUNT DETAILS</span>
                  <h3 className="card-title">Personal & Contact Info</h3>
                </div>
              </div>
            </div>

            <div className="profile-rows-list">
              <div className="profile-row-item">
                <div className="profile-row-icon">✉</div>
                <div className="profile-row-content">
                  <small>EMAIL ADDRESS</small>
                  <strong>{displayEmail}</strong>
                </div>
              </div>

              <div className="profile-row-item">
                <div className="profile-row-icon">☎</div>
                <div className="profile-row-content">
                  <small>CONTACT NUMBER</small>
                  <strong>{fmtPhone(profile.phoneCode, profile.phone)}</strong>
                </div>
              </div>

              <div className="profile-row-item">
                <div className="profile-row-icon">🌍</div>
                <div className="profile-row-content">
                  <small>COUNTRY / NATIONALITY</small>
                  <strong>{profile.country || "Not provided"}</strong>
                </div>
              </div>

              <div className="profile-row-item">
                <div className="profile-row-icon">⌑</div>
                <div className="profile-row-content">
                  <small>GENDER</small>
                  <strong>{profile.gender || "Prefer not to say"}</strong>
                </div>
              </div>

              {profile.address && (
                <div className="profile-row-item">
                  <div className="profile-row-icon">📍</div>
                  <div className="profile-row-content">
                    <small>HOME ADDRESS</small>
                    <strong>{profile.address}</strong>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Account Controls */}
          <div className="profile-account-actions">
            <button
              type="button"
              className="btn btn-outline-danger profile-logout-btn"
              onClick={() => {
                if (window.confirm("Log out of RAAHI?")) onLogout();
              }}
            >
              Log Out
            </button>
            <button
              type="button"
              className="profile-reset-link"
              onClick={resetDemo}
            >
              Reset all demo data
            </button>
          </div>

          <div className="profile-privacy-note">
            <span>🔒</span>
            <p>All profile data is stored privately in this browser storage. RAAHI does not share or upload your data.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="eyebrow">RAAHI · YOUR PRIVATE SPACE</div>
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function ContactModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Family");
  const [phone, setPhone] = useState("");

  return (
    <ModalShell title="Add trusted contact" subtitle="Add someone you can reach when you need support." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), relation, phone: phone.trim() }); }}>
        <label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aanya Sharma" /></label>
        <label>
          Relationship
          <select value={relation} onChange={(e) => setRelation(e.target.value)}>
            <option>Family</option>
            <option>Friend</option>
            <option>Travel companion</option>
            <option>Other</option>
          </select>
        </label>
        <label>Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></label>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save contact</button>
        </div>
      </form>
    </ModalShell>
  );
}

function PlaceModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Stay");
  const [detail, setDetail] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  return (
    <ModalShell title="Save a place" subtitle="Keep a useful address or meeting point for your trip." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), type, detail: detail.trim(), lat: lat.trim(), lon: lon.trim() }); }}>
        <label>Place name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hotel, meeting point" /></label>
        <label>
          Place type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Stay</option>
            <option>Hospital</option>
            <option>Police</option>
            <option>Meeting point</option>
            <option>Other</option>
          </select>
        </label>
        <label>Address or notes<textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Street, landmark, directions…" rows="3" /></label>
        <div className="form-row">
          <label>Latitude (optional)<input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="19.0760" /></label>
          <label>Longitude (optional)<input value={lon} onChange={(e) => setLon(e.target.value)} inputMode="decimal" placeholder="72.8777" /></label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save place</button>
        </div>
      </form>
    </ModalShell>
  );
}

function IncidentModal({ location, onClose, onSave }) {
  const [type, setType] = useState("Safety concern");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  return (
    <ModalShell title="Record an incident" subtitle="Create a private note on this device. It does not notify emergency services." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ type, title: title.trim() || type, details: details.trim() }); }}>
        <label>
          Incident type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Safety concern</option>
            <option>Medical</option>
            <option>Lost property</option>
            <option>Transport issue</option>
            <option>SOS</option>
            <option>Other</option>
          </select>
        </label>
        <label>Short title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What would you like to remember?" /></label>
        <label>What happened?<textarea required value={details} onChange={(e) => setDetails(e.target.value)} rows="4" placeholder="Add time, place, and relevant details…" /></label>
        <div className="form-location">
          ⌖ {isValidLocation(location) ? `Current coordinates will be attached: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : "No current GPS location available"}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save note</button>
        </div>
      </form>
    </ModalShell>
  );
}

function JournalModal({ location, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  return (
    <ModalShell title="Add journey entry" subtitle="Capture a memory, a stop, or a useful travel note." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ title: title.trim(), note: note.trim() }); }}>
        <label>Entry title<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Arrived at the station" /></label>
        <label>Notes<textarea value={note} onChange={(e) => setNote(e.target.value)} rows="4" placeholder="Anything you'd like to remember…" /></label>
        <div className="form-location">
          ⌖ {isValidLocation(location) ? "Current coordinates will be attached." : "Location is optional and not currently available."}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save entry</button>
        </div>
      </form>
    </ModalShell>
  );
}

function TripModal({ trip, onClose, onSave }) {
  const [destination, setDestination] = useState(trip?.destination || "");
  const [returnAt, setReturnAt] = useState(trip?.returnAt || "");
  const [notes, setNotes] = useState(trip?.notes || "");

  return (
    <ModalShell title="Plan your trip" subtitle="Keep a destination and expected return time for your own reference." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ destination: destination.trim(), returnAt, notes }); }}>
        <label>Destination<input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Where are you heading?" /></label>
        <label>Expected return time<input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} /></label>
        <label>Trip notes<textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Route, meeting point, or anything useful…" /></label>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save trip</button>
        </div>
      </form>
    </ModalShell>
  );
}

export default App;
