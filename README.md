# CrossRhyme

A guided workflow for bilingual lyric writing. Find Korean-English rhyme pairs through phonetic analysis, generate AI-powered lyrics, and check for similarity against existing songs — all in one streamlined interface.

If you write bilingual K-pop or hip-hop lyrics — or want to start but feel intimidated by the complexity — CrossRhyme is built for exactly that. It bridges Korean and English through IPA analysis, generates contextual lyrics with AI, and helps you avoid accidental plagiarism while learning the craft.

## What it is

The problem: writing bilingual lyrics means juggling rhyme dictionaries, phonetic tables, language-switching context, and plagiarism paranoia. You're constantly asking "does 사랑 (sarang) rhyme with 'falling'?" or "did someone already write this line?"

CrossRhyme is a three-step workflow that solves this:

1. **A phonetic rhyme engine** — analyzes Korean and English words using IPA (International Phonetic Alphabet), calculates cross-language similarity scores, and suggests rhyme pairs based on sound, not spelling
2. **An AI lyrics generator** — uses Google's Gemini to create lyrics incorporating your selected rhyme pairs, with genre and mood controls (K-pop, hip-hop, ballad, etc.)
3. **A similarity checker** — validates your lyrics against existing songs to catch potential overlap before you publish

The state lives in Zustand. The phonetics engine is pure TypeScript with syllable decomposition and IPA mapping. The AI calls happen server-side through Next.js API routes. Everything stays local — your lyrics, your memos, your creative flow.

## The Creative Flow

The whole workflow is three steps: **Discover, Create, Validate.**

**1. Discover** — Open CrossRhyme in your browser. Enter a Korean word like "사랑" (love). Set the target language to English and optionally pick a theme like "romantic" or "farewell." Hit search.

The phonetic engine analyzes the IPA transcription (`/sɐɾɐŋ/`), breaks it into syllables (`["sa", "rang"]`), and generates English candidates that sound similar: "falling," "calling," "darling." Each gets a similarity score (0.0–1.0) and syllable match indicator.

Select the pairs that feel right. Click "Continue to Generate."

**2. Create** — Pick a genre (K-pop, hip-hop, R&B, ballad, rock, pop, indie, EDM) and mood (happy, sad, energetic, chill, romantic, angry, nostalgic, hopeful).

Click "Generate Lyrics." Gemini creates 4–8 lines incorporating your rhyme pairs, mixing Korean and English naturally. The generator knows which lines contain your rhymes and marks them for reference.

**3. Validate** — Edit the lyrics in the built-in editor. Each line shows its language and whether it contains a rhyme word. When you're satisfied, click "Check Similarity."

The AI analyzes your lyrics against existing songs, returning matches with:
- **Exact** — word-for-word duplicates (red flag)
- **Semantic** — meaning overlap (review recommended)
- **Structural** — rhythm/pattern similarity (usually fine)

If the coast is clear, save the memo. It stores locally with metadata: rhyme pairs used, genre, mood, line count, similarity check results, timestamps. You can reload any saved memo to continue working or use it as reference.

## Quick Start

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 20+ | For Next.js 16 and React 19 |
| Google AI API key | For Gemini. Get at [aistudio.google.com](https://aistudio.google.com/app/apikey) |

### Installation

```bash
git clone https://github.com/yourusername/crossrhyme.git
cd crossrhyme
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey). The free tier includes 15 requests per minute, which is plenty for lyric writing.

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The interface guides you through the three-step workflow automatically.

## Features Deep Dive

### Phonetic Analysis Engine

CrossRhyme doesn't rely on spelling — it analyzes sound through IPA transcription:

- **Korean IPA** — Decomposes Hangul into jamo (초성, 중성, 종성), maps to IPA symbols, handles phonetic rules like nasalization and aspiration
- **English IPA** — Uses pronunciation dictionary mapping with syllable stress markers, handles irregular pronunciations
- **Syllable Decomposition** — Breaks both languages into comparable syllable units for accurate matching

The similarity algorithm weighs:
1. **Final syllable rhyme** (40%) — the classic rhyme position
2. **Vowel pattern match** (30%) — assonance and vowel harmony
3. **Consonant cluster similarity** (20%) — alliteration and consonance
4. **Syllable count match** (10%) — rhythmic compatibility

### AI-Powered Generation

Gemini receives:
- Your selected rhyme pairs
- Genre and mood settings
- Theme context (if you used it in rhyme search)
- Line count preference

It returns structured lyrics with:
- Mixed Korean/English lines that feel natural
- Rhyme words placed in strong positions (end of lines, before breaks)
- Genre-appropriate vocabulary and phrasing
- Mood-consistent imagery and tone

The generator maintains context across lines, so the lyrics tell a coherent story instead of random rhyming phrases.

### Similarity Validation

The checker analyzes:
- **Exact matches** — direct phrase overlap with known songs (uses fuzzy string matching with ≥90% similarity threshold)
- **Semantic similarity** — meaning overlap detected through embedding comparison
- **Structural patterns** — rhythm, meter, and syllable structure similarities

Results show:
- Matched song (title + artist)
- Specific line that triggered the match
- Similarity score (0.0–1.0)
- Match type (exact/semantic/structural)

This helps you catch potential issues before publishing while still allowing inspiration and common phrases.

### Local-First Memos

All saved lyrics live in browser localStorage with full metadata:

```typescript
{
  id: "uuid",
  title: "First 30 chars of lyrics...",
  content: "Full lyrics text",
  lines: [/* structured LyricsLine objects */],
  createdAt: 1709251200000,
  updatedAt: 1709251200000,
  metadata: {
    rhymePair: { ko: "사랑", en: "falling" },
    genre: "kpop",
    mood: "romantic",
    lineCount: 8,
    hasBeenChecked: true,
    lastCheckResults: [/* SimilarityResult objects */]
  }
}
```

You can reload, edit, re-check, and export your work anytime.

## Tech Stack

- **Framework** — Next.js 16 with App Router, React 19 with compiler
- **Language** — TypeScript 5 with strict mode
- **State** — Zustand 5 for global store (rhymes, lyrics, memos)
- **AI** — Google Generative AI SDK (Gemini Pro)
- **Styling** — Tailwind CSS 4 with custom design tokens
- **Animation** — Framer Motion 12 for step transitions
- **UI** — rough-notation for hand-drawn highlights, lucide-react for icons
- **Testing** — Vitest for unit tests (phonetics, similarity algorithms)

## Project Structure

```
src/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── rhyme/        # POST /api/rhyme - find rhyme candidates
│   │   ├── generate/     # POST /api/generate - create lyrics
│   │   └── similarity/   # POST /api/similarity - check overlap
│   ├── layout.tsx        # Root layout with metadata
│   └── page.tsx          # Main workflow orchestrator
├── components/
│   ├── lyrics/           # Lyrics generation, editing, similarity UI
│   ├── rhyme/            # Rhyme search input and results
│   └── ui/               # Reusable UI primitives
├── hooks/
│   └── useAppStore.ts    # Zustand store with actions
├── lib/
│   ├── phonetics/        # IPA analysis for Korean and English
│   ├── rhyme-engine/     # Similarity calculation algorithms
│   └── gemini/           # AI client wrapper
└── types/
    └── index.ts          # TypeScript definitions
```

## API Reference

### POST /api/rhyme

Find rhyme candidates in target language.

**Request:**
```typescript
{
  input: string;              // Word to find rhymes for
  inputLanguage: "ko" | "en"; // Language of input
  targetLanguage: "ko" | "en";// Language for candidates
  theme?: string;             // Optional theme context
  maxResults?: number;        // Max candidates (1-30, default 10)
}
```

**Response:**
```typescript
{
  inputPhonetics: Phonetics;  // IPA analysis of input
  candidates: [               // Sorted by similarityScore desc
    {
      word: string;
      language: "ko" | "en";
      phonetics: Phonetics;
      similarityScore: number;  // 0.0 - 1.0
      syllableMatch: boolean;
    }
  ]
}
```

### POST /api/generate

Generate lyrics using AI.

**Request:**
```typescript
{
  rhymePair: { ko: string; en: string };
  genre: "kpop" | "hiphop" | "rnb" | "ballad" | "rock" | "pop" | "indie" | "edm";
  mood: "happy" | "sad" | "energetic" | "chill" | "romantic" | "angry" | "nostalgic" | "hopeful";
  lineCount?: number;  // Default 4
}
```

**Response:**
```typescript
{
  lines: [
    {
      text: string;
      language: "ko" | "en";
      hasRhyme: boolean;
      rhymeWord?: string;
      rhymePair?: { ko: string; en: string };
    }
  ],
  rhymePair: { ko: string; en: string };
  genre: string;
  mood: string;
}
```

### POST /api/similarity

Check lyrics for similarity to existing songs.

**Request:**
```typescript
{
  lyrics: string;  // Full lyrics text
}
```

**Response:**
```typescript
{
  results: [
    {
      matchedSong: { title: string; artist: string };
      matchedLine: string;
      similarityScore: number;  // 0.0 - 1.0
      similarityType: "exact" | "semantic" | "structural";
    }
  ]
}
```

## Development

### Run tests

```bash
npm test
```

Tests cover:
- Korean IPA mapping and syllable decomposition
- English IPA pronunciation rules
- Rhyme similarity calculation edge cases
- API route request/response validation

### Type checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

### Build for production

```bash
npm run build
npm start
```

The production build enables React Compiler optimizations and bundle splitting.

## Troubleshooting

### "API key missing" error

Make sure `.env.local` exists in the project root with:
```
GEMINI_API_KEY=your_actual_key_here
```

Restart the dev server after creating the file.

### Rhyme search returns empty results

- Check that your input language matches the text (Korean input → `inputLanguage: "ko"`)
- Try a simpler word (1-2 syllables work best)
- Remove the theme filter to get broader results
- Verify your Gemini API key has quota remaining

### Similarity check says "no matches" for known duplicate

The similarity checker uses a mock database for demo purposes. In production, you'd integrate:
- Genius API for lyrics database
- OpenAI embeddings for semantic similarity
- Elasticsearch for exact phrase matching

### Generated lyrics don't use my rhyme pairs

The AI sometimes interprets rhyme pairs as theme context instead of required words. This is a known limitation of prompt-based generation. You can:
- Edit the lyrics manually to include your rhymes
- Regenerate with different genre/mood settings
- Use simpler, more common rhyme pairs

## Roadmap

- [ ] Custom word list import for rhyme search
- [ ] Multi-pair generation (verse 1 + chorus + verse 2 with different rhymes)
- [ ] Export to popular formats (Markdown, PDF, .txt)
- [ ] Real lyrics database integration for similarity checking
- [ ] Rhyme pattern templates (AABB, ABAB, ABCB, etc.)
- [ ] Audio preview with TTS for phonetic validation
- [ ] Collaborative editing with real-time sync

## Contributing

Pull requests welcome. For major changes, open an issue first to discuss what you'd like to change.

Please make sure to update tests as appropriate.

## License

MIT

## Acknowledgements

CrossRhyme was built to solve a real problem I faced while writing bilingual lyrics. The phonetic analysis engine is inspired by linguistic research on Korean phonology and IPA standardization. Special thanks to the Next.js and Gemini teams for making modern web AI development accessible.
