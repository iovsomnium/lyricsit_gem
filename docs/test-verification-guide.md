# Test Verification Guide

## 목적
- 외부 API(웹검색/Gemini) 비결정성을 완전히 없앨 수 없으므로, 먼저 **우리 코드의 결정적 로직**을 고정 mock 기반으로 검증한다.
- 테스트 완료 후 사람이 확인해야 할 항목(스모크/운영 관점)을 한 문서에서 빠르게 점검한다.

## 자동 테스트 범위
- 발음/라임 엔진 단위 테스트
  - `src/lib/phonetics/*.test.ts`
  - `src/lib/rhyme-engine/similarity.test.ts`
- 스토어 API 액션 테스트 (fetch mock)
  - `src/hooks/useAppStore.test.ts`
- 유사도 API 라우트 통합 테스트 (고정 mock)
  - `src/app/api/similarity/route.test.ts`
  - DuckDuckGo fetch와 Gemini 응답을 고정하여 정규화/정렬/에러코드 매핑 검증

## 실행 명령
```bash
pnpm lint
pnpm test
pnpm build
```

## 테스트 완료 후 확인 체크리스트
1. `pnpm test` 결과에서 다음이 포함되는지 확인
   - `src/app/api/similarity/route.test.ts` 통과
   - 전체 테스트 파일/테스트 케이스 수가 예상 범위인지 확인
2. `pnpm build` 성공 여부 확인
   - API route(`/api/rhyme`, `/api/generate`, `/api/similarity`)가 빌드 출력에 표시되는지 확인
3. UI 스모크 확인 (수동)
   - 라임 결과에서 선택 해제 시 취소선+페이드 후 해제되는지
   - 가사 편집에서 textarea 편집, 확정(box), 라인 미리보기 타이핑이 동작하는지
   - 유사도 비교 카드에서 겹치는 단어가 하이라이트되는지

## 유사도 검사(표절도) 관련 해석 주의
- 같은 입력이어도 실서비스 결과가 매번 동일하지 않을 수 있다.
  - 원인 1: 웹검색 스니펫이 시간에 따라 달라짐
  - 원인 2: Gemini 생성 결과의 확률적 변동
- 따라서 자동 테스트는 “정확도 자체”가 아니라 아래를 보장한다.
  - 응답 스키마 정규화가 안정적인지
  - 점수 clamp/정렬/타입 fallback이 정확한지
  - 에러 상태코드(400/429/500) 매핑이 일관적인지

## 장애/회귀 발생 시 우선 확인 순서
1. `src/app/api/similarity/route.test.ts` 실패 케이스 확인
2. `useAppStore`에서 `checkSimilarity` 요청 payload 우선순위(편집본 vs 생성본) 확인
3. 실제 DuckDuckGo 응답 형식 변화 여부 확인
4. Gemini JSON 스키마 이탈 여부 확인

## 기록 템플릿
아래 템플릿으로 테스트 완료 결과를 남긴다.

```md
Date:
Branch/Commit:

lint:
test:
build:

Similarity route test:
- 400 invalid input:
- 200 normalization/sort:
- 200 fallback on web fetch fail:
- 429 rate limited:

Manual smoke:
- Rhyme deselect animation:
- Lyrics textarea + confirm box:
- Similarity overlap highlight:

Notes:
```
