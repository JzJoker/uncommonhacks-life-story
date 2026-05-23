# LifeStory

A collaborative living memory journal for people with Alzheimer's and memory loss. Family and loved ones contribute photos, stories, and voice narration — patients explore their history through a calm, guided experience that helps them reconnect with familiar faces and moments.

**Winner: Social Impact — UncommonHacks 2026**

---

## Inspiration

Justin's grandmother progressively lost her memory to Alzheimer's. Dementia doesn't just affect the patient — it creates disconnection across entire families. A pivotal observation: patients often ask the same questions dozens of times a day. That repetition isn't failure — it's a need. We asked: *what if technology could help those with memory loss remember their LifeStory?*

---

## What It Does

Caregivers, friends, and family collaboratively build a memory journal using photos, stories, and voice narration. Patients explore these materials at their own pace through a UI designed to feel like a tangible memory book — never a test.

- Tapping a photo plays warm narration identifying the people and providing context
- Tapping a person opens additional memories connected to them
- The experience never quizzes patients or creates failure scenarios
- Patients can ask questions about their memories; responses are spoken aloud

---

## Features

- **Collaborative memory journal** — caregivers invite friends and family via SMS to contribute photos and narration
- **ElevenLabs voice narration** — familiar voices aid recognition and emotional regulation; voice cloning lets deceased loved ones narrate in third-person using only family-supplied facts
- **SMS OTP auth** — contributors join via invite link, no password required
- **Experience modes** — self-paced or caregiver-guided depending on the patient's stage
- **No hallucination** — AI only uses information explicitly provided by family; nothing is invented or inferred
- **Ethically bounded AI** — human validation before any content reaches a patient

---

## How We Built It

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS |
| Backend / DB | Supabase (auth, storage, database) |
| Voice | ElevenLabs (voice cloning + TTS) |
| Design | Figma |
| Object Detection | Person detection models (no facial recognition) |
| Hosting | Vercel |

---

## Challenges

The primary challenge was ethical, not technical — designing for a vulnerable population where a wrong interaction can cause real distress. We redesigned core interaction models to ensure patients are never made to feel tested or confused. Balancing personalization with safety required explicit consent protocols and human validation of all AI-generated content before it reaches a patient.

---

## Key Learnings

- Consistency matters more than intelligence for dementia care
- Calm repetition can itself be therapeutic
- Ethical constraints strengthen products rather than weaken them
- Designing for vulnerable populations demands emotional sensitivity alongside technical expertise
- Knowing *where to set limits* on AI is as important as what AI can do

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [ElevenLabs](https://elevenlabs.io) API key

### Installation

```bash
git clone https://github.com/your-org/uncommonhacks-life-story.git
cd uncommonhacks-life-story
npm install
```

### Environment Variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# Kimi (LLM for Q&A agent)
KIMI_API_KEY=your_kimi_api_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (tts, invite, ask, summarize)
│   ├── patient/[id]/         # Patient journal view + settings
│   ├── onboarding/           # Caregiver setup flow
│   ├── signup/               # Caregiver registration
│   └── signin/               # Contributor SMS OTP sign-in
├── components/               # Shared UI components
├── hooks/                    # Custom React hooks
└── lib/                      # Supabase clients, ElevenLabs wrapper, utilities
supabase/                     # Database migrations
```

---

## Team

- **Justin Zhao** — Backend/database (SWE @ RIT)
- **Andy Lin**
- **Junheng Zheng**
- **Vincent Lin**
