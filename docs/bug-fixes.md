# Mingle Bug Fixes Report

## 주요 이슈

11. 버튼 기본 타입 미지정
- 증상: 일부 상호작용 컴포넌트가 추후 form 문맥에 들어갈 경우 의도치 않은 submit으로 이어질 수 있었다.
- 조치: 공용 `Button` 컴포넌트의 기본 타입을 `button`으로 고정했다.

12. 입력 품질과 접근성 표식 부족
- 증상: 체크인 코드, 신고 상세, 프로필 입력이 자동완성/패턴/힌트 연결 측면에서 다소 prototype 수준에 머물러 있었다.
- 조치: `autocomplete`, `pattern`, `maxLength`, `aria-describedby`, disabled gating을 추가해 입력 UX를 운영형으로 보강했다.

13. 모션과 포커스 시스템의 규칙 부족
- 증상: hover/reveal은 있었지만 탭 전환, 운영 적용, reduced motion, focus ring 기준이 충분히 체계화되지 않았다.
- 조치: motion token을 확장하고 `prefers-reduced-motion`과 dark/light focus ring을 추가했다.

14. 운영 콘솔 우선순위 신호 부족
- 증상: KPI는 있었지만 미해결 신고, 공개 게이트, 보호 대상 리스크 같은 즉시 판단 정보가 한 번에 안 보였다.
- 조치: admin hero 아래 `ops signal` 계층을 추가했다.

1. 깨진 한국어 인코딩
- 증상: 고객/운영 핵심 화면과 시드 데이터, 토스트, 옵션 문자열이 광범위하게 mojibake 상태였다.
- 조치: 고객/운영 UI, 도메인 카피, 시드 데이터, 테스트 문구를 UTF-8 기준으로 전면 재작성했다.

2. Next.js 16 + `next-pwa` runtime 충돌
- 증상: `next dev` / `next build`가 Turbopack 기본값으로 실행되며 webpack plugin과 충돌했다.
- 조치: `package.json` 스크립트를 `next dev --webpack`, `next build --webpack`으로 고정했다.

3. Playwright가 다른 로컬 서비스에 붙는 문제
- 증상: `127.0.0.1:3000` 재사용으로 전혀 다른 로그인 화면이 열렸다.
- 조치: Playwright 전용 포트를 `3200`으로 분리하고 `reuseExistingServer: false`로 바꿨다.

4. Next dev origin 차단
- 증상: `127.0.0.1` HMR 리소스가 차단되어 E2E 로딩이 멈췄다.
- 조치: `next.config.ts`에 `allowedDevOrigins: ["127.0.0.1"]`를 추가했다.

5. Zustand 파생 selector 무한 렌더
- 증상: 고객 화면이 `Maximum update depth exceeded`로 무너졌다.
- 원인: `useMingleStore(selectHeartInbox)`와 같은 파생 selector가 매 렌더 새 객체를 반환했다.
- 조치: snapshot 기반 `useMemo` 계산으로 이동했다.

6. AdminDashboard 훅 순서 위반
- 증상: 운영 화면에서 `Rendered more hooks than during the previous render` 오류가 발생했다.
- 원인: `if (!hydrated || !snapshot) return ...` 아래에서 `useMemo`를 호출했다.
- 조치: 모든 훅을 early return 이전으로 옮겼다.

7. Vitest가 donor 테스트와 Playwright 파일을 함께 수집
- 증상: `_sources/**`와 `tests/e2e/**`까지 unit runner가 읽어 실패했다.
- 조치: `vitest.config.ts`에 include/exclude를 명확히 설정했다.

8. `typecheck`가 dev 산출물 `.next/dev/types`에 오염
- 증상: 실제 앱과 무관한 generated type file 때문에 `tsc`가 실패했다.
- 조치: `tsconfig.json`에서 `.next` generated 타입 include를 제거하고 merged source만 검사하도록 고정했다.

9. 회전 미리보기 생성 후 apply 버튼이 보이지 않는 운영 UX
- 증상: 미리보기는 생성되지만 운영 패널이 `overview`에 머물러 apply 흐름이 끊겼다.
- 조치: `generateRotationPreview()` 시 `adminPanel: "rotation"`으로 자동 전환했다.

10. E2E strict-mode selector 충돌
- 증상: `하트` 탭과 `하트 보내기` 버튼 이름이 겹쳐 Playwright strict mode가 실패했다.
- 조치: 테스트 선택자를 exact match 기준으로 좁혔다.

## 제거한 항목

- legacy customer/admin `.jsx` donor 파일
- root-level legacy engine/store mock JS
- donor 원본을 merged runtime에 섞어두는 테스트 수집 경로

## 결과

- `npm run typecheck`: 통과
- `npm test`: 통과
- `npm run test:e2e`: 통과
