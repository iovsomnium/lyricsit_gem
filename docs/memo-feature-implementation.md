# 메모 저장 기능 구현 가이드

## 📋 목차

1. [기능 개요](#기능-개요)
2. [백엔드 vs 프론트엔드 구분](#백엔드-vs-프론트엔드-구분)
3. [데이터 모델 설계](#데이터-모델-설계)
4. [구현 단계](#구현-단계)
5. [테스트 시나리오](#테스트-시나리오)
6. [주의사항](#주의사항)

---

## 기능 개요

### 요구사항
- 생성된 가사를 저장할 수 있는 기능
- 오른쪽 패널에 저장된 메모 목록 표시
- 각 메모에서 독립적으로 유사도 검사 실행 가능
- localStorage를 이용한 클라이언트 측 영구 저장

### 핵심 기능
1. **저장 버튼**: LyricsEditor에서 가사를 메모로 저장
2. **메모 패널**: 3단 레이아웃의 오른쪽에 저장된 메모 목록
3. **메모 카드**: 개별 메모 표시 (제목, 시간, 미리보기, 메타데이터)
4. **유사도 검사**: 각 메모에서 독립적으로 유사도 검사
5. **메모 관리**: 삭제, 전체 삭제 기능

### 저장소 제한
- **최대 메모 수**: 50개
- **최대 용량**: 5MB (localStorage 제한)
- **저장소 키**: `"crossrhyme:saved-lyrics"`

---

## 백엔드 vs 프론트엔드 구분

### ⚠️ 중요: 이 기능은 100% 프론트엔드 기능입니다

**백엔드 작업 필요 없음**
- 새로운 API 엔드포인트 **불필요**
- 데이터베이스 연동 **불필요**
- 서버 사이드 로직 **불필요**

**이유**:
- localStorage 사용 (클라이언트 사이드 저장소)
- Zustand로 상태 관리 (클라이언트)
- 유사도 검사는 **기존 `/api/similarity` 엔드포인트 재사용**

### 구현 범위 구분

| 구분 | 작업 내용 | Phase |
|------|----------|-------|
| **🎨 프론트엔드** | 타입 정의 (types/index.ts) | Phase 1 |
| **🎨 프론트엔드** | Zustand store 확장 (useAppStore.ts) | Phase 1 |
| **🎨 프론트엔드** | localStorage 유틸리티 함수 | Phase 1 |
| **🎨 프론트엔드** | MemoCard 컴포넌트 | Phase 2 |
| **🎨 프론트엔드** | SavedMemosPanel 컴포넌트 | Phase 2 |
| **🎨 프론트엔드** | 3단 레이아웃 적용 (page.tsx) | Phase 3 |
| **🎨 프론트엔드** | 저장 버튼 추가 (LyricsEditor.tsx) | Phase 3 |
| **🎨 프론트엔드** | 기능 테스트 및 검증 | Phase 4 |
| **🔗 기존 API 재사용** | `/api/similarity` (유사도 검사) | - |

### Phase별 백엔드/프론트엔드 구분

```
Phase 1: 타입 및 스토어 (1-2시간)
└─ 🎨 프론트엔드 100%
   ├─ 타입 정의
   ├─ Zustand store
   └─ localStorage 로직

Phase 2: UI 컴포넌트 (2-3시간)
└─ 🎨 프론트엔드 100%
   ├─ MemoCard
   └─ SavedMemosPanel

Phase 3: 레이아웃 통합 (1시간)
└─ 🎨 프론트엔드 100%
   ├─ page.tsx 레이아웃
   └─ LyricsEditor 버튼

Phase 4: 기능 완성 (1-2시간)
└─ 🎨 프론트엔드 100%
   ├─ 에러 처리
   ├─ 테스트
   └─ 반응형 검증
```

### 유사도 검사 API 재사용

메모에서 유사도 검사를 실행할 때:
- **기존 엔드포인트**: `POST /api/similarity`
- **요청 형식**: `{ lyrics: string }`
- **응답 형식**: `{ results: SimilarityResult[] }`
- **변경 사항**: 없음 (기존 API 그대로 사용)

---

## 데이터 모델 설계

### SavedLyricsMemo 인터페이스

```typescript
export interface SavedLyricsMemo {
  id: string;                    // crypto.randomUUID()로 생성
  title: string;                 // 첫 라인 미리보기 (최대 30자)
  content: string;               // 전체 가사 텍스트
  lines: LyricsLine[];           // 구조화된 가사 라인 배열
  createdAt: number;             // Date.now()
  updatedAt: number;             // Date.now()
  metadata: LyricsMemoMetadata;  // 메타데이터
}
```

### LyricsMemoMetadata 인터페이스

```typescript
export interface LyricsMemoMetadata {
  rhymePair?: RhymePair;         // 사용된 라임 페어 (선택)
  genre?: Genre;                 // 장르 (선택)
  mood?: Mood;                   // 분위기 (선택)
  lineCount: number;             // 라인 수
  hasBeenChecked: boolean;       // 유사도 검사 여부
  lastCheckResults?: SimilarityResult[];  // 마지막 유사도 검사 결과
}
```

---

## 구현 단계

### Phase 1: 타입 및 스토어 구현 (1-2시간)

#### 1.1 타입 정의 추가

**파일**: `src/types/index.ts`

**위치**: 파일 끝 (line 203 이후)

```typescript
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
```

#### 1.2 Zustand Store 확장

**파일**: `src/hooks/useAppStore.ts`

**Step 1**: AppState 인터페이스에 추가 (line 25 근처)

```typescript
interface AppState {
  // ... 기존 상태들 ...

  // 메모 상태
  savedMemos: SavedLyricsMemo[];
}
```

**Step 2**: initialState에 추가 (line 90 근처)

```typescript
const initialState: AppState = {
  // ... 기존 초기값들 ...
  savedMemos: [],
};
```

**Step 3**: localStorage 유틸리티 함수 추가 (line 115 근처, 캐시 선언 다음)

```typescript
// ============================================================
// localStorage Utilities
// ============================================================

const STORAGE_KEY = "crossrhyme:saved-lyrics";
const MAX_MEMOS = 50;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

function loadMemosFromLocalStorage(): SavedLyricsMemo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("Invalid memos data in localStorage, resetting");
      return [];
    }

    return parsed as SavedLyricsMemo[];
  } catch (error) {
    console.error("Failed to load memos from localStorage:", error);
    // Backup corrupted data
    try {
      const corrupted = localStorage.getItem(STORAGE_KEY);
      if (corrupted) {
        localStorage.setItem(`${STORAGE_KEY}-backup-${Date.now()}`, corrupted);
      }
    } catch {
      // Ignore backup failure
    }
    return [];
  }
}

function saveMemosToLocalStorage(memos: SavedLyricsMemo[]): AppError | null {
  try {
    const serialized = JSON.stringify(memos);

    // Check size limit
    if (serialized.length > MAX_STORAGE_SIZE) {
      return {
        code: "INVALID_INPUT",
        message: "저장 용량이 초과되었습니다. 일부 메모를 삭제해주세요.",
      };
    }

    localStorage.setItem(STORAGE_KEY, serialized);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      return {
        code: "INVALID_INPUT",
        message: "저장 공간이 부족합니다. 일부 메모를 삭제해주세요.",
      };
    }
    return {
      code: "NETWORK_ERROR",
      message: "메모 저장 중 오류가 발생했습니다.",
    };
  }
}
```

**Step 4**: AppActions 인터페이스에 추가 (line 54 근처)

```typescript
interface AppActions {
  // ... 기존 액션들 ...

  // 메모 액션
  loadMemosFromStorage: () => void;
  saveMemo: (memo: Omit<SavedLyricsMemo, "id" | "createdAt" | "updatedAt">) => void;
  deleteMemo: (id: string) => void;
  clearAllMemos: () => void;
  checkMemoSimilarity: (id: string) => Promise<void>;
}
```

**Step 5**: Store 구현에 액션 추가 (line 285 근처, store 정의 내부)

```typescript
export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  ...initialState,

  // ... 기존 액션들 ...

  // ============================================================
  // 메모 액션
  // ============================================================

  loadMemosFromStorage: () => {
    const memos = loadMemosFromLocalStorage();
    set({ savedMemos: memos });
  },

  saveMemo: (memo) => {
    const state = get();

    // 빈 가사 체크
    if (!memo.content.trim()) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: "저장할 가사가 없습니다.",
        },
      });
      return;
    }

    // 최대 개수 체크
    if (state.savedMemos.length >= MAX_MEMOS) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: `최대 ${MAX_MEMOS}개까지만 저장할 수 있습니다.`,
        },
      });
      return;
    }

    const now = Date.now();
    const newMemo: SavedLyricsMemo = {
      ...memo,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const updatedMemos = [newMemo, ...state.savedMemos];

    // localStorage에 저장
    const saveError = saveMemosToLocalStorage(updatedMemos);
    if (saveError) {
      set({ error: saveError });
      return;
    }

    set({
      savedMemos: updatedMemos,
      error: null,
    });
  },

  deleteMemo: (id) => {
    const state = get();
    const updatedMemos = state.savedMemos.filter((memo) => memo.id !== id);

    const saveError = saveMemosToLocalStorage(updatedMemos);
    if (saveError) {
      set({ error: saveError });
      return;
    }

    set({ savedMemos: updatedMemos });
  },

  clearAllMemos: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ savedMemos: [] });
  },

  checkMemoSimilarity: async (id) => {
    const state = get();
    const memo = state.savedMemos.find((m) => m.id === id);

    if (!memo) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: "메모를 찾을 수 없습니다.",
        },
      });
      return;
    }

    const payload: SimilarityRequest = {
      lyrics: memo.content,
    };
    const cacheKey = JSON.stringify(payload);

    set({
      isCheckingSimilarity: true,
      error: null,
    });

    try {
      const response = await getCachedOrFetch(
        cacheKey,
        SIMILARITY_CACHE,
        SIMILARITY_INFLIGHT,
        () =>
          fetchJSONWithRetry<SimilarityResponse>("/api/similarity", payload, {
            retries: 1,
            timeoutMs: SIMILARITY_TIMEOUT_MS,
          }),
      );

      // 메모 업데이트
      const updatedMemos = state.savedMemos.map((m) =>
        m.id === id
          ? {
              ...m,
              metadata: {
                ...m.metadata,
                hasBeenChecked: true,
                lastCheckResults: response.results,
              },
              updatedAt: Date.now(),
            }
          : m
      );

      const saveError = saveMemosToLocalStorage(updatedMemos);
      if (saveError) {
        set({ error: saveError });
        return;
      }

      set({
        savedMemos: updatedMemos,
      });
    } catch (error) {
      set({
        error: isAppError(error)
          ? error
          : toUnknownError("유사도 검사 중 오류가 발생했습니다."),
      });
    } finally {
      set({ isCheckingSimilarity: false });
    }
  },
}));
```

**Step 6**: Store 초기화 시 localStorage 로드

Store 정의 맨 끝에 추가:

```typescript
// 초기화 시 localStorage에서 메모 로드
if (typeof window !== "undefined") {
  useAppStore.getState().loadMemosFromStorage();
}
```

---

### Phase 2: UI 컴포넌트 구현 (2-3시간)

#### 2.1 MemoCard 컴포넌트 생성

**파일**: `src/components/lyrics/MemoCard.tsx` (새 파일)

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Trash2, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { SavedLyricsMemo } from "@/types";

interface MemoCardProps {
  memo: SavedLyricsMemo;
  onDelete: (id: string) => void;
  onCheckSimilarity: (id: string) => void;
  isCheckingNow: boolean;
}

export function MemoCard({
  memo,
  onDelete,
  onCheckSimilarity,
  isCheckingNow,
}: MemoCardProps) {
  const [showActions, setShowActions] = useState(false);

  const previewLines = memo.content
    .split("\n")
    .filter(Boolean)
    .slice(0, 3);

  const hasHighSimilarity =
    memo.metadata.hasBeenChecked &&
    memo.metadata.lastCheckResults?.some((result) => result.similarityScore >= 0.7);

  const timeAgo = formatTimeAgo(memo.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-foreground">
              {memo.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
          </div>

          {hasHighSimilarity && (
            <Badge variant="warning" className="shrink-0">
              ⚠️ 유사
            </Badge>
          )}
        </div>

        {/* Preview */}
        <div className="px-3 py-2">
          {previewLines.map((line, index) => (
            <p
              key={index}
              className="truncate text-sm leading-relaxed text-foreground/80"
            >
              {line}
            </p>
          ))}
          {memo.content.split("\n").filter(Boolean).length > 3 && (
            <p className="mt-1 text-xs text-muted">...</p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
          {memo.metadata.genre && (
            <Badge variant="muted" className="text-xs">
              {memo.metadata.genre}
            </Badge>
          )}
          {memo.metadata.mood && (
            <Badge variant="muted" className="text-xs">
              {memo.metadata.mood}
            </Badge>
          )}
          <Badge variant="muted" className="text-xs">
            {memo.metadata.lineCount}줄
          </Badge>
        </div>

        {/* Actions */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center gap-2 bg-surface/95 backdrop-blur-sm"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCheckSimilarity(memo.id)}
              disabled={isCheckingNow}
            >
              <Shield className="h-4 w-4" />
              {isCheckingNow ? "검사 중..." : "유사도 검사"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(memo.id)}
            >
              <Trash2 className="h-4 w-4 text-warning-red" />
              삭제
            </Button>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return "방금 전";
}
```

#### 2.2 SavedMemosPanel 컴포넌트 생성

**파일**: `src/components/lyrics/SavedMemosPanel.tsx` (새 파일)

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MemoCard } from "./MemoCard";

export function SavedMemosPanel() {
  const savedMemos = useAppStore((s) => s.savedMemos);
  const deleteMemo = useAppStore((s) => s.deleteMemo);
  const clearAllMemos = useAppStore((s) => s.clearAllMemos);
  const checkMemoSimilarity = useAppStore((s) => s.checkMemoSimilarity);
  const isCheckingSimilarity = useAppStore((s) => s.isCheckingSimilarity);

  const handleClearAll = () => {
    if (savedMemos.length === 0) return;
    if (window.confirm("모든 메모를 삭제하시겠습니까?")) {
      clearAllMemos();
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>저장된 가사 ({savedMemos.length})</CardTitle>
          {savedMemos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-warning-red hover:bg-warning-red-light"
            >
              <Trash2 className="h-4 w-4" />
              전체 삭제
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {savedMemos.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted">저장된 가사가 없습니다</p>
              <p className="mt-1 text-xs text-muted/70">
                가사를 생성하고 저장 버튼을 눌러보세요
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            className="flex flex-col gap-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <AnimatePresence>
              {savedMemos.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onDelete={deleteMemo}
                  onCheckSimilarity={checkMemoSimilarity}
                  isCheckingNow={isCheckingSimilarity}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
```

---

### Phase 3: 레이아웃 통합 (1시간)

#### 3.1 page.tsx 3단 레이아웃 적용

**파일**: `src/app/page.tsx`

**변경 전** (line 44-58):
```tsx
<div className="grid gap-6 lg:grid-cols-2">
  {/* 좌측: 라임 검색 */}
  <div className="flex flex-col gap-6">
    <RhymeInput />
    <RhymeResults />
  </div>

  {/* 우측: 가사 생성 + 에디터 */}
  <div className="flex flex-col gap-6">
    <LyricsGenerator />
    <LyricsEditor key={lyricsEditorKey} />
    <SimilarityChecker />
  </div>
</div>
```

**변경 후**:
```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr,1.2fr,0.8fr]">
  {/* 좌측: 라임 검색 */}
  <div className="flex flex-col gap-6">
    <RhymeInput />
    <RhymeResults />
  </div>

  {/* 중앙: 가사 생성 + 에디터 + 유사도 */}
  <div className="flex flex-col gap-6">
    <LyricsGenerator />
    <LyricsEditor key={lyricsEditorKey} />
    <SimilarityChecker />
  </div>

  {/* 우측: 저장된 메모 */}
  <div className="md:col-span-2 lg:col-span-1">
    <SavedMemosPanel />
  </div>
</div>
```

**import 추가** (line 8 근처):
```tsx
import { SavedMemosPanel } from "@/components/lyrics/SavedMemosPanel";
```

#### 3.2 LyricsEditor에 저장 버튼 추가

**파일**: `src/components/lyrics/LyricsEditor.tsx`

**Step 1**: import 추가 (line 4 근처)
```typescript
import { Copy, Check, Save } from "lucide-react";
```

**Step 2**: Store 액션 가져오기 (line 22-23 근처)
```typescript
const generatedLyrics = useAppStore((s) => s.generatedLyrics);
const setLyricsDraftText = useAppStore((s) => s.setLyricsDraftText);
const saveMemo = useAppStore((s) => s.saveMemo);
const genre = useAppStore((s) => s.genre);
const mood = useAppStore((s) => s.mood);
const rhymePair = useAppStore((s) => s.selectedRhymes[0]);
```

**Step 3**: 저장 핸들러 추가 (line 54 근처, handleCopy 다음)
```typescript
const handleSave = () => {
  const content = draftText || generatedLyrics.map((line) => line.text).join("\n");

  if (!content.trim()) {
    return;
  }

  const lines = draftText
    ? splitDraftLines(draftText).map((text, index) => ({
        text,
        language: generatedLyrics[index]?.language || "ko",
        hasRhyme: generatedLyrics[index]?.hasRhyme || false,
      }))
    : generatedLyrics;

  const firstLine = content.split("\n")[0] || "제목 없음";
  const title = firstLine.slice(0, 30) + (firstLine.length > 30 ? "..." : "");

  saveMemo({
    title,
    content,
    lines,
    metadata: {
      rhymePair,
      genre,
      mood,
      lineCount: content.split("\n").filter(Boolean).length,
      hasBeenChecked: false,
    },
  });
};
```

**Step 4**: UI 업데이트 (line 70-80 근처)
```tsx
<CardHeader>
  <CardTitle>가사</CardTitle>
  <div className="flex gap-2">
    <Button variant="ghost" size="sm" onClick={handleSave}>
      <Save className="h-4 w-4" />
      저장
    </Button>
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? (
        <Check className="h-4 w-4 text-confirm-green" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "복사됨" : "복사"}
    </Button>
  </div>
</CardHeader>
```

---

### Phase 4: 기능 완성 및 테스트 (1-2시간)

#### 4.1 에러 처리 개선

모든 에러 케이스가 Phase 1의 Store 구현에 포함되어 있습니다:
- ✅ 빈 가사 저장 방지
- ✅ 최대 개수 제한 (50개)
- ✅ localStorage 용량 제한 (5MB)
- ✅ localStorage 손상 데이터 처리 (백업 생성)

#### 4.2 시간 표시 포맷팅

MemoCard 컴포넌트에 `formatTimeAgo` 함수가 이미 구현되어 있습니다.

#### 4.3 반응형 디자인 확인

3단 레이아웃은 다음과 같이 반응합니다:
- **모바일** (<md): 단일 컬럼 스택
- **태블릿** (md-lg): 2단 레이아웃 (메모 패널은 하단에 전체 너비로 표시)
- **데스크톱** (lg+): 3단 레이아웃 (1fr : 1.2fr : 0.8fr)

---

## 테스트 시나리오

### 1. 저장 기능 테스트

#### 테스트 케이스 1.1: 정상 저장
- [ ] 가사 생성
- [ ] 저장 버튼 클릭
- [ ] 오른쪽 패널에 메모 카드 표시 확인
- [ ] 제목이 첫 라인 미리보기로 설정되었는지 확인
- [ ] 시간이 "방금 전"으로 표시되는지 확인

#### 테스트 케이스 1.2: 빈 가사 저장 시도
- [ ] 가사 없이 저장 버튼 클릭
- [ ] 에러 메시지 표시 확인: "저장할 가사가 없습니다."

#### 테스트 케이스 1.3: 최대 개수 초과
- [ ] 50개 메모 저장
- [ ] 51번째 저장 시도
- [ ] 에러 메시지 표시 확인: "최대 50개까지만 저장할 수 있습니다."

### 2. 메모 관리 테스트

#### 테스트 케이스 2.1: 개별 삭제
- [ ] 메모 카드에 마우스 호버
- [ ] 삭제 버튼 표시 확인
- [ ] 삭제 버튼 클릭
- [ ] 메모가 목록에서 제거되는지 확인
- [ ] localStorage 동기화 확인 (개발자 도구)

#### 테스트 케이스 2.2: 전체 삭제
- [ ] 여러 메모 저장
- [ ] "전체 삭제" 버튼 클릭
- [ ] 확인 다이얼로그 표시 확인
- [ ] "확인" 클릭
- [ ] 모든 메모 삭제 확인
- [ ] 빈 상태 UI 표시 확인

### 3. 유사도 검사 테스트

#### 테스트 케이스 3.1: 유사도 검사 실행
- [ ] 메모 카드에 마우스 호버
- [ ] "유사도 검사" 버튼 클릭
- [ ] 로딩 상태 확인 ("검사 중..." 표시)
- [ ] 검사 완료 후 결과 저장 확인

#### 테스트 케이스 3.2: 높은 유사도 경고
- [ ] 유사도 점수 ≥0.7인 메모 생성
- [ ] 메모 카드에 "⚠️ 유사" 배지 표시 확인

### 4. 영구 저장 테스트

#### 테스트 케이스 4.1: 페이지 새로고침
- [ ] 메모 저장
- [ ] 페이지 새로고침 (F5)
- [ ] 메모가 유지되는지 확인

#### 테스트 케이스 4.2: 브라우저 재시작
- [ ] 메모 저장
- [ ] 브라우저 완전 종료
- [ ] 브라우저 재시작 및 페이지 재방문
- [ ] 메모가 유지되는지 확인

### 5. 반응형 디자인 테스트

#### 테스트 케이스 5.1: 데스크톱 (lg+)
- [ ] 3단 레이아웃 표시 확인
- [ ] 각 컬럼 너비 비율 확인 (1fr : 1.2fr : 0.8fr)

#### 테스트 케이스 5.2: 태블릿 (md-lg)
- [ ] 2단 레이아웃 표시 확인
- [ ] 메모 패널이 하단에 전체 너비로 표시되는지 확인

#### 테스트 케이스 5.3: 모바일 (<md)
- [ ] 단일 컬럼 스택 레이아웃 확인
- [ ] 모든 섹션이 세로로 정렬되는지 확인

### 6. 에지 케이스 테스트

#### 테스트 케이스 6.1: 긴 제목
- [ ] 매우 긴 첫 라인 (100자 이상) 가사 저장
- [ ] 제목이 30자로 잘리고 "..." 추가되는지 확인

#### 테스트 케이스 6.2: 특수 문자
- [ ] 이모지, 특수 문자 포함 가사 저장
- [ ] 정상 저장 및 표시 확인

#### 테스트 케이스 6.3: localStorage 손상
- [ ] 개발자 도구에서 localStorage 직접 수정 (잘못된 JSON)
- [ ] 페이지 새로고침
- [ ] 백업 생성 확인
- [ ] 빈 상태로 초기화 확인

---

## 주의사항

### 개발 시 주의할 점

1. **타입 안전성**
   - 모든 타입은 `src/types/index.ts`에서 import
   - `as` 캐스팅 최소화, 타입 가드 사용

2. **에러 처리**
   - 모든 에러는 AppError 형태로 통일
   - localStorage 작업 시 try-catch 필수
   - 사용자에게 명확한 에러 메시지 제공

3. **성능 최적화**
   - 메모 목록이 길어질 경우 가상 스크롤 고려
   - localStorage 읽기는 초기화 시 1회만
   - localStorage 쓰기는 변경 시에만

4. **접근성**
   - 모든 버튼에 적절한 aria-label
   - 키보드 내비게이션 지원
   - 색상 대비 확인 (WCAG AA 준수)

### 일반적인 함정

1. **crypto.randomUUID() 사용 시**
   - SSR 환경에서는 사용 불가
   - 반드시 클라이언트 사이드에서만 호출

2. **localStorage 용량 제한**
   - 5MB 제한은 브라우저마다 다를 수 있음
   - 실제로는 약 4.5MB 정도로 여유 두기

3. **시간 표시**
   - Date.now()는 UTC 기준
   - 표시는 로컬 시간으로 변환 필요

4. **Framer Motion 애니메이션**
   - AnimatePresence는 직접적인 부모여야 함
   - key prop 필수

### 테스트 체크리스트

- [ ] Phase 1 완료: 타입 및 스토어 구현
- [ ] Phase 2 완료: UI 컴포넌트 구현
- [ ] Phase 3 완료: 레이아웃 통합
- [ ] Phase 4 완료: 기능 완성 및 테스트
- [ ] 모든 테스트 시나리오 통과
- [ ] 반응형 디자인 확인
- [ ] 접근성 검증
- [ ] 브라우저 호환성 확인 (Chrome, Firefox, Safari, Edge)

---

## 완료 기준

이 기능은 다음 조건을 모두 만족할 때 완료된 것으로 간주합니다:

1. ✅ 가사 저장 기능이 정상 작동
2. ✅ 저장된 메모가 3단 레이아웃 오른쪽에 표시
3. ✅ 개별 메모에서 유사도 검사 가능
4. ✅ 메모 삭제 및 전체 삭제 기능 작동
5. ✅ localStorage 영구 저장 확인
6. ✅ 모든 에러 케이스 처리
7. ✅ 반응형 디자인 적용
8. ✅ 접근성 기준 충족
9. ✅ 모든 테스트 시나리오 통과

---

## 다음 단계

기능 완료 후 고려할 수 있는 추가 개선 사항:

1. **메모 편집 기능**: 저장된 메모를 수정할 수 있는 기능
2. **메모 검색**: 저장된 메모를 검색하는 기능
3. **메모 정렬**: 날짜, 제목, 유사도 등으로 정렬
4. **메모 필터링**: 장르, 분위기 등으로 필터링
5. **메모 내보내기**: JSON, TXT 파일로 내보내기
6. **메모 가져오기**: 파일에서 메모 가져오기
7. **무한 스크롤**: 메모 목록 가상화

---

**문서 버전**: 1.0
**작성일**: 2026-02-28
**최종 수정일**: 2026-02-28
