# LifeStory — CLAUDE.md

## Project Overview

LifeStory is a mobile/tablet/desktop app for people living with Alzheimer's and memory loss. Family and loved ones build a collaborative "memory journal" — photos with voice narration — that patients can explore to rediscover their identity and relationships.

Hackathon: UncommonHacks
Competition tracks: Social Impact, Best Use of ElevenLabs

---

## User Roles

**Caregiver (account owner)**
- Creates the account and enters patient information
- Invites friends and family to contribute
- Selects experience mode for the patient (self-paced vs. caregiver-guided) based on Alzheimer's stage

**Friends & Family (contributors)**
- Sign up via invite link
- Upload photos and record narration for each photo
- Optionally upload voice clips of a deceased loved one for voice cloning
- Leave messages of encouragement / memorable quotes (played after introduction)

**Patient (Alzheimer's user)**
- Browses their memory journal
- Taps a photo → narration audio plays, introducing people in the image
- After the introduction, a personal message from that person plays

---

## Core Features

### Photo + Narration Journal
Each memory entry = a photo + an audio narration recorded by a family member.

### ElevenLabs Voice Cloning
- Family members can upload audio samples of a **deceased** loved one
- ElevenLabs clones the voice; the clone narrates photos in **third-person only**
- Constraint: narration is strictly factual and family-supplied — no first-person dialogue, no invented content
- Example: *"This is your daughter Sara. She was born in 1985 and loves hiking."*
- NOT: *"Hey honey, I miss you..."*

**Ethical framing to keep in mind:**
> "We deliberately constrained the cloned voice to third-person factual narration, never first-person speech, to avoid puppeting the dead."

### Experience Modes
- **Self-paced**: patient explores independently
- **Caregiver-guided**: caregiver navigates alongside the patient

---

## Design Principles

1. **Simplicity above all** — UI must be usable by someone with significant cognitive decline. Large tap targets, minimal text, calm colors.
2. **Voice authenticity matters** — familiar voices aid recognition and emotional regulation in dementia patients (research-backed). This is the core ElevenLabs use case.
3. **No hallucination** — narration script only uses information explicitly provided by family. Never invent or infer biographical details.
4. **Third-person only for cloned voices** — reduces risk of patient feeling deceived by a simulation of a deceased person speaking as themselves.
5. **Emotional safety** — every content decision should ask: *could this distress or confuse the patient?*

---

## Tech Stack

- Frontend: Next.js, hosted on Vercel
- Backend: Supabase (database, storage, auth)
- Voice: ElevenLabs API (voice cloning + TTS)
- Storage: Supabase Storage (photos, audio files)
- Auth: Supabase SMS OTP — caregiver enters contributor phone numbers; contributors visit the site, enter their number, and sign in via OTP text

---

## Out of Scope (Non-MVP)

- AI-generated video
- Physical photo detection via camera (QR/NFC/CV scanning of printed photos)
- "Visual Memory Record Player" (tangible UI concept)
- Snowflake integration

---

## Key ElevenLabs Notes

- Use voice cloning endpoint with uploaded audio samples
- Generate narration server-side before storing; do not call ElevenLabs at playback time
- Keep generated scripts short and factual — easier to QA for hallucinations
- Narration format: *"This is [name]. [One or two family-supplied facts]."*
