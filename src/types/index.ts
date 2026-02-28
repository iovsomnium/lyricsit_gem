// ============================================================
// Primitive Union Types
// ============================================================

/** Supported languages */
export type Language = "ko" | "en";

/** K-pop and general music genres */
export type Genre =
  | "kpop"
  | "hiphop"
  | "rnb"
  | "ballad"
  | "rock"
  | "pop"
  | "indie"
  | "edm";

/** Mood/emotion for lyrics generation */
export type Mood =
  | "happy"
  | "sad"
  | "energetic"
  | "chill"
  | "romantic"
  | "angry"
  | "nostalgic"
  | "hopeful";

/** Thematic category for rhyme search context */
export type Theme =
  | "love"
  | "farewell"
  | "freedom"
  | "dream"
  | "night"
  | "youth"
  | "pain"
  | "party";

// ============================================================
// Phonetics
// ============================================================

/** Phonetic representation of a word or phrase */
export interface Phonetics {
  /** Original text as entered */
  original: string;
  /** Romanized form (e.g., "sa-rang" for "사랑") */
  romanized: string;
  /** IPA transcription (e.g., "/sɐɾɐŋ/") */
  ipa: string;
  /** Decomposed syllable array (e.g., ["sa", "rang"]) */
  syllables: string[];
  /** Total syllable count */
  syllableCount: number;
}

// ============================================================
// Rhyme Types
// ============================================================

/** A single rhyme match candidate */
export interface RhymeCandidate {
  /** The candidate word */
  word: string;
  /** Language of the candidate */
  language: Language;
  /** Phonetic analysis of the candidate */
  phonetics: Phonetics;
  /** Phonetic similarity score (0.0 = no match, 1.0 = perfect) */
  similarityScore: number;
  /** Whether syllable counts match the input */
  syllableMatch: boolean;
}

/** A selected Korean-English rhyme pair for lyrics generation */
export interface RhymePair {
  /** Korean word/phrase */
  ko: string;
  /** English word/phrase */
  en: string;
}

/** Request payload for POST /api/rhyme */
export interface RhymeRequest {
  /** Text input to find rhymes for */
  input: string;
  /** Language of the input */
  inputLanguage: Language;
  /** Target language for rhyme candidates */
  targetLanguage: Language;
  /** Optional thematic context to guide rhyme search */
  theme?: Theme;
  /** Maximum number of candidates to return (default: 10) */
  maxResults?: number;
}

/** Response payload from POST /api/rhyme */
export interface RhymeResponse {
  /** Original input with phonetic analysis */
  inputPhonetics: Phonetics;
  /** Ranked list of rhyme candidates, sorted by similarityScore desc */
  candidates: RhymeCandidate[];
}

// ============================================================
// Lyrics Types
// ============================================================

/** A single line in generated lyrics */
export interface LyricsLine {
  /** The lyric text content */
  text: string;
  /** Language of this line */
  language: Language;
  /** Whether this line contains a rhyming word from the pair */
  hasRhyme: boolean;
  /** The specific rhyme word used in this line (if hasRhyme is true) */
  rhymeWord?: string;
  /** The matching rhyme pair for reference */
  rhymePair?: RhymePair;
}

/** Request payload for POST /api/generate */
export interface LyricsGenerateRequest {
  /** The rhyme pair to build lyrics around */
  rhymePair: RhymePair;
  /** Music genre */
  genre: Genre;
  /** Mood/emotion */
  mood: Mood;
  /** Number of lyric lines to generate (default: 4) */
  lineCount?: number;
}

/** Response payload from POST /api/generate */
export interface LyricsGenerateResponse {
  /** Generated lyrics lines */
  lines: LyricsLine[];
  /** The rhyme pair used */
  rhymePair: RhymePair;
  /** Genre used for generation */
  genre: Genre;
  /** Mood used for generation */
  mood: Mood;
}

// ============================================================
// Similarity Types
// ============================================================

/** Type of similarity detected between lyrics */
export type SimilarityType = "exact" | "semantic" | "structural";

/** A single similarity match against an existing song */
export interface SimilarityResult {
  /** Matched song name and artist */
  matchedSong: {
    title: string;
    artist: string;
  };
  /** The specific line/phrase that matched */
  matchedLine: string;
  /** Similarity score (0.0 = no match, 1.0 = identical) */
  similarityScore: number;
  /** Classification of the similarity */
  similarityType: SimilarityType;
}

/** Request payload for POST /api/similarity */
export interface SimilarityRequest {
  /** Full generated lyrics text to check */
  lyrics: string;
}

/** Response payload from POST /api/similarity */
export interface SimilarityResponse {
  /** List of similarity matches found */
  results: SimilarityResult[];
}

// ============================================================
// Error Types
// ============================================================

/** Application-level error with structured information */
export interface AppError {
  /** Error message for display */
  message: string;
  /** Machine-readable error code */
  code:
    | "API_KEY_MISSING"
    | "GEMINI_ERROR"
    | "NETWORK_ERROR"
    | "INVALID_INPUT"
    | "RATE_LIMITED";
  /** Optional additional details */
  details?: string;
}

/** API response wrapper for error cases */
export interface ApiErrorResponse {
  /** Error information */
  error: AppError;
}

// ============================================================
// Saved Lyrics Memo Types
// ============================================================

/** Metadata for saved lyrics memo */
export interface LyricsMemoMetadata {
  /** The rhyme pair used for generation */
  rhymePair?: RhymePair;
  /** Genre used for generation */
  genre?: Genre;
  /** Mood used for generation */
  mood?: Mood;
  /** Number of lines in the lyrics */
  lineCount: number;
  /** Whether similarity check has been performed */
  hasBeenChecked: boolean;
  /** Results from last similarity check */
  lastCheckResults?: SimilarityResult[];
}

/** A saved lyrics memo with metadata */
export interface SavedLyricsMemo {
  /** Unique identifier (crypto.randomUUID()) */
  id: string;
  /** Title (first line preview, max 30 chars) */
  title: string;
  /** Full lyrics text content */
  content: string;
  /** Structured lyrics lines */
  lines: LyricsLine[];
  /** Creation timestamp (Date.now()) */
  createdAt: number;
  /** Last update timestamp (Date.now()) */
  updatedAt: number;
  /** Associated metadata */
  metadata: LyricsMemoMetadata;
}
