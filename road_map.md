================================================================
CrossRhyme 구현 로드맵
================================================================

현재 상태: STEP 1 완료 (타입 정의 + Gemini 클라이언트 + 유틸리티 전부 완료)
남은 작업: STEP 2부터 순서대로 구현

================================================================
STEP 1. 기반 코드 (먼저 해야 다른 것들이 돌아감)
================================================================

- [x] 1-1. 타입 정의 — src/types/index.ts
  - Language, Genre, Mood, Theme 유니온 타입
  - Phonetics (발음 정보: original, romanized, ipa, syllables, syllableCount)
  - RhymeCandidate (라임 후보: word, language, phonetics, similarityScore, syllableMatch)
  - RhymePair (ko, en)
  - RhymeRequest / RhymeResponse
  - LyricsGenerateRequest / LyricsGenerateResponse
  - LyricsLine (text, language, hasRhyme)
  - AppError / ApiErrorResponse
  - SimilarityType ("exact" | "semantic" | "structural")
  - SimilarityResult (matchedSong, matchedLine, similarityScore, similarityType)
  - SimilarityRequest / SimilarityResponse

- [x] 1-2. Gemini 클라이언트 — src/lib/gemini/client.ts
  - @google/generative-ai SDK 초기화
  - gemini-2.0-flash 모델 인스턴스 export
  - API 키는 process.env.GEMINI_API_KEY에서 읽기
  - generateText() / generateJSON<T>() 헬퍼 함수
  - AppError 기반 에러 핸들링

- [x] 1-3. 유틸리티 — src/lib/utils/cn.ts
  - clsx + tailwind-merge 조합 cn() 함수

================================================================
STEP 2. 한국어 발음 처리 (라임 엔진의 핵심)
================================================================

- [ ] 2-1. 한글 분해 — src/lib/phonetics/korean-ipa.ts
  - 한글 유니코드 → 초성/중성/종성 분해
  - 초성/중성/종성 → IPA 매핑 테이블
  - 초성/중성/종성 → 로마자 매핑 테이블
  - 함수: decomposeHangul(char) → { initial, medial, final, ipa, roman }
  - 함수: koreanToIPA(text) → string
  - 함수: koreanToRoman(text) → string
  - 함수: countKoreanSyllables(text) → number

- [ ] 2-2. 영어 발음 처리 — src/lib/phonetics/english-ipa.ts
  - 영어 음절 수 추정 함수 (모음 기반 heuristic)
  - 추후: CMU Pronouncing Dictionary JSON 로드해서 정확한 IPA 조회

================================================================
STEP 3. 라임 엔진 (핵심 로직)
================================================================

- [ ] 3-1. 음소 유사도 — src/lib/rhyme-engine/similarity.ts
  - IPA 문자열 간 Levenshtein distance 계산
  - 유사도 스코어 0~1로 정규화
  - 모음 유사성 가중치 (라임은 모음이 더 중요)

- [ ] 3-2. 라임 매칭 — src/lib/rhyme-engine/index.ts
  - findRhymes(request) 메인 함수
  - 입력 발음 분석 → Gemini에 후보 요청 → 유사도 계산 → 정렬 반환
  - Gemini 프롬프트: "이 한국어 발음과 비슷한 영어 단어 10개 찾아줘" 방식

================================================================
STEP 4. API 라우트
================================================================

- [ ] 4-1. 라임 검색 API — src/app/api/rhyme/route.ts
  - POST 핸들러
  - body에서 input, inputLanguage, targetLanguage, theme, maxResults 받기
  - 입력 발음 분석 → Gemini로 크로스링구얼 라임 후보 생성
  - 유사도 스코어 계산 후 정렬해서 응답

- [ ] 4-2. 가사 생성 API — src/app/api/generate/route.ts
  - POST 핸들러
  - body에서 rhymePair(ko, en), genre, mood, lineCount 받기
  - Gemini에 라임 쌍 + 장르 + 무드 전달해서 가사 생성
  - 시스템 프롬프트에 K-pop 코드스위칭 스타일 지시

- [ ] 4-3. 가사 유사도 검사 API — src/app/api/similarity/route.ts
  - POST 핸들러
  - body에서 lyrics (생성된 가사 전문) 받기
  - 가사에서 핵심 구절(후렴구, 반복 패턴) 추출
  - 웹 검색으로 기존 곡 가사와 비교
    - 검색 전략: 핵심 구절 단위로 검색 → 결과 수집
    - Gemini로 유사도 판정 (단순 문자열 매칭이 아닌 의미적 유사도)
  - 응답: SimilarityResult[]
    - matchedSong (곡명, 아티스트)
    - matchedLine (일치 구절)
    - similarityScore (0~1)
    - similarityType ("exact" | "semantic" | "structural")
  - 유사도 임계값 이상이면 경고 표시

================================================================
STEP 5. 상태 관리
================================================================

- [ ] 5-1. Zustand 스토어 — src/hooks/useAppStore.ts
  - inputText, inputLanguage, targetLanguage
  - theme, genre, mood
  - rhymeResults[], selectedRhymes[]
  - generatedLyrics[]
  - similarityResults[], isCheckingSimilarity
  - isSearching, isGenerating, error

================================================================
STEP 6. UI 컴포넌트
================================================================

디자인 컨셉: "고심하며 한 줄 한 줄 적는 작사가의 노트"
→ Rough Notation (rough-notation) 라이브러리 활용
→ hand-drawn 스타일의 밑줄, 동그라미, 취소선, 하이라이트
→ 가사가 생성될 때 한 줄씩 써내려가는 애니메이션
→ 라임 매칭 시 손으로 동그라미 치듯 강조
→ 수정/삭제 시 취소선으로 지우는 느낌

Rough Notation 활용 포인트:
  - underline: 라임이 맞는 단어/구절 밑줄
  - circle: 선택된 라임 후보에 동그라미
  - highlight: 유사도 높은 구절 형광펜
  - strike-through: 수정 전 가사에 취소선
  - bracket: 한국어/영어 코드스위칭 구간 표시
  - box: 최종 확정된 가사 라인

색상 팔레트:
  - 라임 매칭: 파란색 계열 (연필/펜 느낌)
  - 한국어 가사: 검정 (기본 잉크)
  - 영어 가사: 진한 파란색 (다른 펜)
  - 경고(유사도 높음): 빨간색 취소선
  - 확정: 초록색 밑줄

- [ ] 6-1. 공통 UI — src/components/ui/
  - Button, Input, Card, Badge, Select, Textarea
  - Loading spinner
  - RoughAnnotation 래퍼 컴포넌트 (rough-notation React 통합)
    - 타입별 프리셋 (underline, circle, highlight, strike-through 등)
    - 애니메이션 타이밍 커스터마이징
    - Framer Motion과 연동 (등장 시퀀스)

- [ ] 6-2. 라임 입력 — src/components/rhyme/RhymeInput.tsx
  - 텍스트 입력 필드 (노트 위에 쓰는 느낌의 스타일링)
  - 입력 언어 토글 (한국어 ↔ 영어)
  - 테마 선택 (love, farewell, freedom 등)
  - 검색 버튼
  - 입력 중 실시간으로 음절 수 카운트 표시

- [ ] 6-3. 라임 결과 — src/components/rhyme/RhymeResults.tsx
  - 라임 후보 카드 리스트
  - 각 카드: 단어, 발음(로마자/IPA), 유사도 바, 음절 수
  - 클릭하면 Rough Notation circle 애니메이션으로 선택 표시
  - 유사도 높은 후보에 highlight 자동 적용
  - 선택 해제 시 strike-through 후 페이드아웃

- [ ] 6-4. 가사 생성 — src/components/lyrics/LyricsGenerator.tsx
  - 선택된 라임 쌍 표시 (bracket으로 묶어서)
  - 장르/무드 선택
  - "가사 생성" 버튼
  - 생성된 가사가 한 줄씩 타이핑되듯 등장
  - 각 라인에 라임 단어 underline 자동 표시
  - 한국어/영어 라인 색상 구분 (잉크 색 차이)

- [ ] 6-5. 가사 에디터 — src/components/lyrics/LyricsEditor.tsx
  - 생성된 가사를 편집할 수 있는 textarea
  - 수정 시 원본에 strike-through, 새 텍스트 옆에 표시
  - 한국어/영어 라인 색상 구분
  - 확정된 라인에 box 표시
  - 복사 버튼

- [ ] 6-6. 유사도 검사 — src/components/lyrics/SimilarityChecker.tsx
  - "유사도 검사" 버튼
  - 검사 결과 카드 리스트
    - 유사 곡명 + 아티스트
    - 일치 구절 비교 (원본 vs 생성 가사) — highlight로 겹치는 부분 표시
    - 유사도 스코어 바
    - 유사도 타입 뱃지 (exact / semantic / structural)
  - 임계값 이상 시 빨간색 경고 + strike-through 권고
  - 전체 통과 시 초록색 체크 표시

================================================================
STEP 7. 메인 페이지
================================================================

- [ ] 7-1. 페이지 레이아웃 — src/app/page.tsx
  - 상단: 로고 + 설명
  - 좌측: 라임 입력 + 결과
  - 우측: 가사 생성 + 에디터
  - 또는 모바일 대응 단일 컬럼 플로우

- [ ] 7-2. 레이아웃 — src/app/layout.tsx
  - 폰트 설정 (Pretendard + Inter)
  - 다크/라이트 테마

================================================================
구현 우선순위 (추천)
================================================================

Phase 1 — 돌아가는 것부터
→ STEP 1 + 2 + 3 + 4 (4-1, 4-2)
→ API만 완성해서 curl/Postman으로 테스트 가능한 상태

Phase 2 — 화면 붙이기
→ STEP 5 + 6 (6-1 ~ 6-5) + 7
→ rough-notation 설치 및 Rough Notation 래퍼 컴포넌트 구현
→ 브라우저에서 라임 검색 + 가사 생성 가능한 상태
→ hand-drawn 스타일 인터랙션 적용

Phase 3 — 유사도 검사 + 다듬기
→ STEP 4-3 (유사도 검사 API)
→ STEP 6-6 (SimilarityChecker 컴포넌트)
→ 발음 시각화 (IPA 표기 비교 뷰)
→ 라임 결과 애니메이션 (Rough Notation + Framer Motion 시퀀스)
→ 반응형 디자인
→ 에러 핸들링/로딩 UX

================================================================
