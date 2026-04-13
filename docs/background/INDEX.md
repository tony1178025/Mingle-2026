# Mingle 프로젝트 배경지식 인덱스

이 폴더는 **Mingle 프로젝트 구현/리뷰/리서치에 필요한 배경지식 “포인터(원문 경로)”와 “핵심 불변 규칙”을 한 곳에 고정**하기 위한 저장소다.

## 원문 소스(외부 파일)

- **Deep research report (MD)**  
  - path: `c:\Users\hyunh\Desktop\사업개발\deep-research-report_260413_1.00pm.md`
  - purpose: 프리미엄 UI/UX 근거 수집 + Codex 실행 프롬프트(비즈니스 불변 규칙 포함)

- **Mingle UI/운영 데모 코드 (JSX)**  
  - path: `c:\Users\hyunh\Desktop\사업개발\MingleV4.jsx`
  - purpose: 고객/어드민 단일 파일 데모(탭/게임/테이블/하트/운영 대시보드 등)

- **Mingle UI/운영 데모 코드 최종본 (JSX)**  
  - path: `c:\Users\hyunh\Desktop\사업개발\MingleV4_Final_20260412_1537.jsx`
  - purpose: `MingleV4.jsx` 대비 게임(이상형 키워드/매력 카드 등) 확장 버전

- **프로덕션 번들(아카이브, tar.gz)**  
  - path: `c:\Users\hyunh\Desktop\사업개발\mingle-prod_20260412_1650.tar.gz`
  - note: 바이너리이므로 레포에 복사하지 않고, 무결성 추적용 메타데이터만 보관
  - size(bytes): `63956`
  - lastWriteTime(local): `2026-04-13 오전 9:58:55`
  - sha256: `DD57610845E854D619F23B07298B121ABD8A64471F8145D50C854B10524D6410`

## 레포 내부 배경지식(이미 포함)

- **Cursor onboarding background for Mingle (MD)**  
  - path: `.cursor/Mingle_Background_Knowledge_260413_0614.md`
  - purpose: 제품 구조/운영 플로우/고정 비즈니스 규칙/디자인 의도

## “고정 비즈니스 규칙” (요약 고정본)

아래 규칙은 제품 방향성/수익/운영 안전과 직결되며, 구현/리팩토링 시 **절대 임의 변경 금지**.

- **하트 가격**: 남녀 모두 유료 하트 1개 5,000원
- **1부**: 받은 하트 “개수만” 노출(상대/디테일 공개 금지)
- **2부 공개(리빌) 조건**: 아래가 모두 true일 때만
  - `phase === ROUND_2`
  - `admin reveal toggle === ON`
  - `usedFreeHearts >= 3`
  - “타이머 자동 공개” 금지(관리자 트리거 기반)
- **Heat**: admin-only (고객 화면 노출 금지)
- **탐색 UX**: 고객 탐색은 table-based 유지(플랫 리스트로 퇴행 금지)
- **프로필**: MBTI는 E/I만, 한줄소개 없음, 불필요 필드 확장 금지

