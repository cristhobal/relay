<div align="center">

# relay

**एक तेज़, मुफ़्त और ओपन-सोर्स URL शॉर्टनर।**

[![लाइसेंस: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Astro के साथ बनाया](https://img.shields.io/badge/Built%20with-Astro-ff5d01.svg)](https://astro.build)
[![ओपन सोर्स](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-green.svg)](https://github.com/cristhobal/relay)

![relay का पूर्वावलोकन](https://i.postimg.cc/BQjpN6Vy/relay.png)

🔗 **लाइव डेमो:** [relay.vercel.app](https://relay.vercel.app) &nbsp;·&nbsp; ⭐ **GitHub:** [cristhobal/relay](https://github.com/cristhobal/relay)

</div>

---

### उपलब्ध भाषाएँ

[🇺🇸 English](./README.md) · [🇨🇳 中文](./docs/README.zh.md) · [🇮🇳 हिन्दी](./docs/README.hi.md) · [🇪🇸 Español](./docs/README.es.md) · [🇫🇷 Français](./docs/README.fr.md)

---

## परिचय

**relay** Astro, React, Tailwind v4 और shadcn/ui के साथ बना एक सादा URL शॉर्टनर है। आप बिना खाता बनाए तुरंत लिंक छोटे कर सकते हैं। Google या GitHub से साइन इन करें और अपने लिंक सभी डिवाइसों पर सुरक्षित रखें — आपके बनाए गए अनाम लिंक स्वतः आपके खाते में स्थानांतरित हो जाते हैं।

जब **MySQL डेटाबेस** कॉन्फ़िगर किया गया हो, तो छोटे URL वहाँ से रिज़ॉल्व होते हैं, इसलिए आपके बनाए लिंक किसी भी डिवाइस पर, किसी के लिए भी काम करते हैं — न कि केवल आपके ब्राउज़र में।

## विशेषताएँ

- **तत्काल छोटे लिंक** — कस्टम slug या स्वचालित रूप से उत्पन्न (7 अक्षर)
- **अनाम मोड** — साइन इन किए बिना 10 लिंक तक (`localStorage` में संग्रहीत)
- **स्थायी लिंक** — जब MySQL कॉन्फ़िगर हो, लिंक सभी डिवाइसों पर सभी के लिए रिज़ॉल्व होते हैं
- **डैशबोर्ड** — क्लिक काउंटर, संपादन, हटाने और कॉपी क्रियाओं के साथ आपके लिंक की पूरी सूची
- **लिंक संपादन** — गंतव्य URL, slug या विवरण कभी भी बदलें
- **स्वतः माइग्रेशन** — पहले साइन इन पर अनाम लिंक आपके खाते में स्थानांतरित हो जाते हैं, कुछ खोए नहीं
- **लाइट / डार्क मोड** — वरीयता सहेजी जाती है, लोड पर कोई चमक नहीं
- **डेमो मोड** — OAuth या डेटाबेस के बिना पूरी तरह काम करता है (`localStorage` में नकली सत्र का उपयोग करता है)

## लॉगिन कैसे काम करता है

relay Google और GitHub के साथ OAuth के लिए **Auth.js** (`auth-astro`) का उपयोग करता है:

1. उपयोगकर्ता **Google से जारी रखें** या **GitHub से जारी रखें** पर क्लिक करता है
2. Auth.js प्रदाता की ओर रीडायरेक्ट करता है और उपयोगकर्ता प्रोफ़ाइल (`name`, `email`, `image`) प्राप्त करता है
3. Auth.js `AUTH_SECRET` का उपयोग करके एक हस्ताक्षरित सत्र बनाता है और इसे एक कुकी में संग्रहीत करता है
4. हर अनुरोध पर, Astro सर्वर साइड पर सत्र पढ़कर `/` या `/dashboard` दिखाने का निर्णय लेता है
5. पहले साइन इन पर, अनाम लिंक स्वतः खाते में माइग्रेट हो जाते हैं

OAuth क्रेडेंशियल कॉन्फ़िगर न होने पर, ऐप **डेमो मोड** में प्रवेश करता है: बटन `localStorage` में एक नकली सत्र बनाते हैं ताकि आप पूरे प्रवाह को एक्सप्लोर कर सकें। लॉगिन डायलॉग में "डेमो मोड" बैनर यह संकेत देता है कि आप इस मोड में हैं।

## स्टोरेज कैसे काम करता है

relay के पास **दो बैकएंड** हैं जो एक ही async API साझा करते हैं:

| मोड      | बैकएंड                     | कब उपयोग होता है                           |
| -------- | -------------------------- | ------------------------------------------ |
| अनाम     | `localStorage`             | उपयोगकर्ता साइन इन नहीं है                 |
| प्रमाणित | API रूट के माध्यम से MySQL | उपयोगकर्ता के पास वास्तविक या डेमो सत्र है |

जब `DATABASE_HOST` सेट हो, तो साइन इन किए उपयोगकर्ताओं के लिंक सर्वर पर सहेजे जाते हैं और सार्वजनिक रीडायरेक्ट (`/[slug]`) डेटाबेस में खोज करता है ताकि कोई भी छोटा URL किसी भी ब्राउज़र से काम करे। जब डेटाबेस **कॉन्फ़िगर नहीं** हो, तो ऐप सभी के लिए localStorage पर वापस आ जाता है।

स्कीमा छोटा है (`users`, `accounts`, `links`) और [`schema.sql`](./schema.sql) में है।

## तकनीकी स्टैक

| तकनीक                                              | भूमिका                                     |
| -------------------------------------------------- | ------------------------------------------ |
| **Astro 6** (`output: server` + Vercel अडैप्टर)    | मुख्य फ्रेमवर्क / SSR                      |
| **React 19**                                       | इंटरएक्टिव क्लाइंट कंपोनेंट                |
| **Tailwind v4** + **shadcn/ui** (`radix-vega` थीम) | स्टाइलिंग और UI कंपोनेंट                   |
| **Auth.js** `auth-astro` के माध्यम से              | Google और GitHub के साथ OAuth              |
| **MySQL** (`mysql2`)                               | उपयोगकर्ताओं और लिंक के लिए स्थायी स्टोरेज |
| **localStorage**                                   | अनाम मोड + वरीयता कैश                      |

## ओपन सोर्स

यह प्रोजेक्ट **MIT लाइसेंस** के अंतर्गत **मुफ़्त और ओपन सोर्स** है। आप इसे:

- अपने डोमेन पर ज्यों का त्यों डिप्लॉय कर सकते हैं
- अपनी ज़रूरतों के अनुसार संशोधित और अनुकूलित कर सकते हैं
- सुधार, सुधार या नई सुविधाओं के साथ योगदान कर सकते हैं
- फ़ोर्क करके अपना संस्करण बना सकते हैं

कोई प्रतिबंध नहीं। यदि आप इसका उपयोग या अनुकूलन करते हैं, तो एक उल्लेख हमेशा सराहनीय होगा! 🙌

---

## शुरुआत करें

### स्थानीय रूप से चलाएँ

```bash
npm install
cp .env.example .env    # फिर वेरिएबल भरें (नीचे देखें)
npm run dev
```

ऐप `http://localhost:4321` पर खुलता है। OAuth और डेटाबेस वेरिएबल के बिना यह **डेमो मोड** में चलता है — पूरा प्रवाह, कोई कॉन्फ़िगरेशन नहीं।

---

## वास्तविक OAuth कॉन्फ़िगर करें

### 1. `AUTH_SECRET` जनरेट करें

Auth.js इस secret का उपयोग सत्र कुकीज़ पर हस्ताक्षर करने के लिए करता है।

```bash
openssl rand -base64 32
```

परिणाम को `.env` में जोड़ें:

```env
AUTH_SECRET=<openssl-का-आउटपुट>
AUTH_TRUST_HOST=true
```

### 2. Google OAuth

1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) पर जाएँ
2. कोई प्रोजेक्ट बनाएँ या चुनें
3. **APIs और सेवाएँ → क्रेडेंशियल → + क्रेडेंशियल बनाएँ → OAuth क्लाइंट ID**
   - यदि कहा जाए, तो पहले **OAuth सहमति स्क्रीन** कॉन्फ़िगर करें:
     - उपयोगकर्ता प्रकार: **बाहरी** · ऐप का नाम: `relay`
     - स्कोप: `userinfo.email` और `userinfo.profile` जोड़ें
4. पूरा करें:
   - एप्लिकेशन प्रकार: **वेब एप्लिकेशन**
   - **अधिकृत रीडायरेक्ट URIs:**
     - `http://localhost:4321/api/auth/callback/google`
     - `https://relay.vercel.app/api/auth/callback/google`
5. `.env` में जोड़ें:

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 3. GitHub OAuth

GitHub प्रति OAuth App केवल **एक callback URL** की अनुमति देता है, इसलिए आपको **दो ऐप** की आवश्यकता होगी: एक localhost के लिए, एक प्रोडक्शन के लिए।

[github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → नई OAuth App** पर जाएँ

- **प्रोडक्शन callback:** `https://relay.vercel.app/api/auth/callback/github`
- **Localhost callback:** `http://localhost:4321/api/auth/callback/github`

---

## डेटाबेस कॉन्फ़िगर करें (MySQL)

जब कोई डेटाबेस कॉन्फ़िगर नहीं होता, तो ऐप localStorage पर वापस आ जाता है, इसलिए यह चरण स्थानीय विकास के लिए वैकल्पिक है। प्रोडक्शन में यह ज़रूरी है यदि आप चाहते हैं कि छोटे URL लेखक के अलावा अन्य उपयोगकर्ताओं के लिए भी काम करें।

### 1. स्कीमा बनाएँ

अपने MySQL सर्वर पर [`schema.sql`](./schema.sql) चलाएँ:

```bash
mysql -u root -p < schema.sql
```

यह `relay` डेटाबेस और तीन टेबल बनाता है: `users`, `accounts`, `links`।

### 2. एक समर्पित ऐप उपयोगकर्ता बनाएँ

```sql
CREATE USER 'relay_app'@'%' IDENTIFIED BY 'एक-मज़बूत-पासवर्ड-चुनें';
GRANT SELECT, INSERT, UPDATE, DELETE ON relay.* TO 'relay_app'@'%';
FLUSH PRIVILEGES;
```

### 3. कनेक्शन को `.env` में जोड़ें

```env
DATABASE_HOST=आपका-mysql-होस्ट
DATABASE_PORT=3306
DATABASE_USER=relay_app
DATABASE_PASSWORD=<चरण-2-का-पासवर्ड>
DATABASE_NAME=relay
```

`src/lib/db.ts` एक एकल कनेक्शन पूल उजागर करता है जिसकी कनेक्शन सीमा कम (5) है, जो serverless के लिए उपयुक्त है। यदि `DATABASE_HOST` खाली है, तो API रूट जल्दी वापस आ जाते हैं और ऐप localStorage-only मोड में चलता रहता है।

> **सुरक्षा:** पोर्ट 3306 को सार्वजनिक इंटरनेट पर **उजागर न करें**। Vercel की IP श्रेणियों तक फ़ायरवॉल के माध्यम से पहुँच प्रतिबंधित करें, अपने VPS पर इसके सामने एक छोटी HTTPS API रखें, या कोई प्रबंधित ड्राइवर (PlanetScale, Vercel Postgres, आदि) उपयोग करें।

---

## Vercel पर डिप्लॉय करें

`@astrojs/vercel` अडैप्टर पहले से `astro.config.mjs` में कॉन्फ़िगर है।

1. प्रोजेक्ट को GitHub पर पुश करें
2. [vercel.com/new](https://vercel.com/new) → रेपो इम्पोर्ट करें (Vercel Astro को स्वचालित रूप से पहचानता है)
3. **Settings → Environment Variables** में एनवायरनमेंट वेरिएबल जोड़ें:

| वेरिएबल                | मान                                 |
| ---------------------- | ----------------------------------- |
| `AUTH_SECRET`          | `openssl rand -base64 32` का आउटपुट |
| `AUTH_TRUST_HOST`      | `true`                              |
| `GOOGLE_CLIENT_ID`     | आपका Google क्लाइंट ID              |
| `GOOGLE_CLIENT_SECRET` | आपका Google क्लाइंट secret          |
| `GITHUB_CLIENT_ID`     | आपका GitHub क्लाइंट ID (प्रोडक्शन)  |
| `GITHUB_CLIENT_SECRET` | आपका GitHub क्लाइंट secret          |
| `DATABASE_HOST`        | आपका MySQL होस्ट                    |
| `DATABASE_PORT`        | `3306`                              |
| `DATABASE_USER`        | `relay_app`                          |
| `DATABASE_PASSWORD`    | ऐप उपयोगकर्ता का पासवर्ड            |
| `DATABASE_NAME`        | `relay`                              |

4. वेरिएबल जोड़ने के बाद, **Deployments → ⋯ → Redeploy** से पुनः डिप्लॉय करें

सत्यापित करें कि Google और GitHub में callback URIs बिल्कुल मेल खाते हैं:

- `https://relay.vercel.app/api/auth/callback/google`
- `https://relay.vercel.app/api/auth/callback/github`

---

## एनवायरनमेंट वेरिएबल

| वेरिएबल                | आवश्यक | विवरण                                                        |
| ---------------------- | :----: | ------------------------------------------------------------ |
| `AUTH_SECRET`          |   ✓    | कुकी साइनिंग secret। `openssl` से जनरेट करें।                |
| `AUTH_TRUST_HOST`      |   ✓    | Vercel के लिए `true` सेट करें।                               |
| `GOOGLE_CLIENT_ID`     |   —    | Google OAuth। इसके बिना, डेमो मोड।                           |
| `GOOGLE_CLIENT_SECRET` |   —    | Google OAuth।                                                |
| `GITHUB_CLIENT_ID`     |   —    | GitHub OAuth। इसके बिना, डेमो मोड।                           |
| `GITHUB_CLIENT_SECRET` |   —    | GitHub OAuth।                                                |
| `DATABASE_HOST`        |   —    | MySQL होस्ट। इसके बिना, लिंक केवल localStorage में रहते हैं। |
| `DATABASE_PORT`        |   —    | MySQL पोर्ट। डिफ़ॉल्ट `3306`।                                |
| `DATABASE_USER`        |   —    | `relay.*` पर रीड/राइट एक्सेस वाला MySQL उपयोगकर्ता।           |
| `DATABASE_PASSWORD`    |   —    | `DATABASE_USER` का पासवर्ड।                                  |
| `DATABASE_NAME`        |   —    | MySQL डेटाबेस का नाम। डिफ़ॉल्ट `relay`।                       |

यदि `GOOGLE_CLIENT_ID` **या** `GITHUB_CLIENT_ID` अनुपस्थित है, तो ऐप स्वचालित रूप से डेमो मोड में प्रवेश करता है (तर्क `src/pages/index.astro` और `src/pages/dashboard.astro` में)।

---

## प्रोजेक्ट संरचना

```
src/
├── components/
│   ├── ui/                   ← shadcn (radix-vega): button, dialog, input, label,
│   │                             textarea, card, separator, avatar, dropdown-menu
│   ├── Wordmark.tsx           ← "relay" लोगो
│   ├── ThemeToggle.tsx        ← persistence के साथ लाइट/डार्क
│   ├── AuthDialog.tsx         ← Google + GitHub OAuth (वास्तविक या डेमो)
│   ├── CreateLinkDialog.tsx
│   ├── Landing.tsx            ← सादा होम पेज
│   └── Dashboard.tsx          ← Links और Configuration टैब
├── lib/
│   ├── auth.ts                ← सत्र प्रकार + helpers, डेमो fallback
│   ├── db.ts                  ← MySQL पूल + query/execute helpers
│   ├── repo.ts                ← सर्वर-साइड डेटा एक्सेस (उपयोगकर्ता + लिंक)
│   ├── links.ts               ← हाइब्रिड क्लाइंट API: localStorage या HTTP → DB
│   ├── preferences.ts         ← उपयोगकर्ता वरीयताएँ
│   └── utils.ts               ← cn() helper
├── layouts/Layout.astro       ← पूरा SEO: OG, Twitter Card, JSON-LD, canonical
├── pages/
│   ├── index.astro            ← सर्वर: सत्र? → /dashboard
│   ├── dashboard.astro        ← सर्वर: सत्र नहीं? → /
│   ├── [slug].astro           ← DB खोज से सर्वर-साइड रीडायरेक्ट
│   └── api/
│       ├── me.ts              ← प्रोफ़ाइल + workspace अपडेट
│       └── links/             ← सूची / बनाएँ / अपडेट / हटाएँ / माइग्रेट
└── styles/global.css          ← radix-vega थीम (अपरिवर्तित)

auth.config.ts                 ← Auth.js कॉन्फ़िग (Google + GitHub)
astro.config.mjs               ← output: 'server' + adapter: vercel
schema.sql                     ← users / accounts / links के लिए MySQL स्कीमा
.env.example                   ← आवश्यक एनवायरनमेंट वेरिएबल
```

---

## तकनीकी नोट्स

- **अनाम उपयोगकर्ता** अधिकतम **10 मुफ़्त लिंक** बना सकते हैं (`src/lib/links.ts` में `ANONYMOUS_LINK_LIMIT` देखें)। उसके बाद उन्हें साइन इन करना होगा। पहले साइन इन पर, अनाम लिंक `POST /api/links/migrate` के माध्यम से डेटाबेस में माइग्रेट हो जाते हैं।
- **स्टोरेज रूटिंग** `src/lib/links.ts` में है। `isAuthenticated` फ़्लैग `localStorage` (अनाम) और `/api/links` HTTP एंडपॉइंट (`src/lib/repo.ts` के माध्यम से MySQL से जुड़े) के बीच चुनाव करता है।
- **कनेक्शन पूलिंग** `src/lib/db.ts` में एक साझा पूल (`connectionLimit: 5`) से प्रबंधित होती है। प्रति सर्वर इंस्टेंस एक पूल अनुरोधों के बीच पुनः उपयोग होता है, जो serverless cold start के अनुकूल है।
- **Auth.js** हस्ताक्षरित कुकीज़ और सत्रों सहित पूरे OAuth प्रवाह को संभालता है। `/api/auth/*` रूट `auth-astro` द्वारा स्वचालित रूप से इंजेक्ट होती है। हर साइन इन पर `upsertUserFromOAuth` (`repo.ts` में) मिलते-जुलते उपयोगकर्ता रो को खोजता या बनाता है।
- **लाइट/डार्क थीम** सफ़ेद चमक से बचने के लिए `Layout.astro` में एक inline स्क्रिप्ट के माध्यम से पेंट से पहले लागू होती है।
- **उपयोगकर्ता अवतार** OAuth प्रदाता से आता है (`picture` / `avatar_url` → Auth.js सत्र में `image` फ़ील्ड)। डेमो मोड में एक deterministic fallback उपयोग होता है।
- **SEO** `Layout.astro` में केंद्रीकृत है: प्रति-पृष्ठ शीर्षक और विवरण, Open Graph (`/relay.png`), Twitter Card, canonical URL, JSON-LD और डैशबोर्ड जैसे निजी पृष्ठों के लिए `noindex` फ़्लैग।

---

## लाइसेंस

[MIT](./LICENSE) — उपयोग, संशोधन और वितरण के लिए स्वतंत्र।
