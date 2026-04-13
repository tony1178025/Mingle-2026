# Mingle Source Comparison

이 문서는 두 번의 병합 기준을 함께 기록한다.

- 1차 기준:
  - `A`: `mingle-prod_20260412_1650.tar.gz`
  - `B`: `Mingle_Refactor_260412_0658.zip`
  - `C`: `package.zip`
- 2차 기준:
  - `A`: 현재 merged codebase
  - `B`: [deep-research-report_260413_1.00pm.md](</C:/Users/hyunh/Desktop/사업개발/deep-research-report_260413_1.00pm.md>)

## 2차 비교: 현재 코드 vs 리서치 문서

| 카테고리 | 판단 | 이유 | 최종 반영 |
| --- | --- | --- | --- |
| Architecture | `A 우세, B가 기준 강화` | 현재 구조는 이미 App Router, Zustand slice, repository boundary를 갖췄다. 다만 리서치 문서는 이 구조를 premium spec과 performance budget까지 연결하도록 요구했다. | 구조는 유지하고 `WebVitalsReporter`, performance budget, docs 기준을 추가 |
| State management | `A 우세` | Zustand slice와 파생 selector 정리는 이미 되어 있었다. 리서치 문서는 source of truth와 desync 방지를 강조했다. | 기존 구조 유지, 리서치 문서와 일치함을 문서화 |
| Rotation realism | `A 우세` | 현재 엔진은 preview/apply, audit, 보호 로직을 포함한다. 리서치 문서는 이를 “fake가 아닌 deterministic engine”으로 계속 검증하라고 요구한다. | 구조 유지, 운영 신호층을 강화해 실제 판단 맥락을 더 두껍게 함 |
| Reveal correctness | `A 우세` | 현재 구현이 이미 `ROUND_2 + admin toggle + usedFreeHearts >= 3`를 단일 규칙으로 사용한다. | 유지 |
| Customer UX | `상호 보완` | 현재 앱은 table-based explore를 지키고 있다. 리서치 문서는 여기서 더 나아가 입력 품질, 단계 전달, 감정 밀도, 절제된 wow를 요구한다. | 체크인/신고 폼 품질, 라운드 상태 전달, hero signal 강화 |
| Admin UX | `상호 보완` | 현재 어드민은 기능은 충분하지만 리서치 문서는 “몇 초 안에 우선순위를 읽는 화면”을 더 강하게 요구한다. | KPI 위에 `ops signal` 계층을 추가해 미해결 신고, 공개 게이트, 보호 대상 리스크, 회전 상태를 즉시 읽게 개선 |
| Visual design quality | `상호 보완` | 현재 다크 럭셔리 방향은 맞지만, 리서치 문서는 primitive → semantic → component 토큰과 더 분명한 hierarchy를 요구한다. | 색/모션/포커스/gradient/focus ring 토큰을 확장 |
| Motion / animation quality | `B 우세` | 기존 모션은 있었지만 이름과 역할이 다소 얕았다. 리서치 문서는 tab switch, reveal, apply feedback, reduced motion까지 체계화하라고 요구한다. | `tabPanel`, `roundShift`, `opsCommit`, reduced-motion 대응 추가 |
| Backend readiness | `A 우세` | 현재 repository boundary가 이미 Supabase 정렬을 마쳤다. | 유지 |
| Testing quality | `상호 보완` | 기존 테스트는 기능 커버가 충분하다. 리서치 문서는 performance budget 같은 새 품질 축도 테스트에 포함시키라고 요구한다. | web vitals budget unit test 추가 |
| Production safety | `상호 보완` | 현재 안정성은 높지만 폼 submit type, focus handling, reduced motion, 입력 속성은 더 다듬을 여지가 있었다. | `Button type="button"` 기본화, input autocomplete/pattern/maxLength, reduced motion 대응 추가 |
| Maintainability | `A 우세` | 현재 코드가 이미 도메인 경계를 갖췄다. 리서치 문서는 이를 design system/observability 기준까지 연결하라고 요구한다. | 문서와 성능 관측 경계를 보강 |
| Business / monetization fit | `A 우세` | 하트 가격과 reveal gate가 이미 제품 진실과 일치한다. | 유지 |
| Consumer psychology | `B 우세` | 리서치 문서는 “설렘은 색 하나가 아니라 위계, 피드백, 레이어, 반응성의 시스템”임을 더 잘 설명했다. | hero signal, round narrative, input polish, restrained motion으로 반영 |
| Korean market fit | `상호 보완` | 현재 한국어 우선 UI는 충족하지만, 리서치 문서는 Korean-first utility copy와 premium tone의 균형을 더 정교하게 제안했다. | 카피와 설명을 더 절제된 한국어 중심으로 정리 |
| Live operations practicality | `B 우세` | 현재도 usable하지만, 리서치 문서가 운영 우선순위와 압박 상황에서의 스캔성을 더 명확히 제시했다. | ops signal strip, pending report awareness, protected cold table count 추가 |

## 1차 비교: donor archives

공식 비교 축은 `A vs B`로 유지했고, `C`는 두 결과보다 명확히 나은 부분만 donor로 채택했다.

| 카테고리 | 판단 | 이유 | 최종 반영 |
| --- | --- | --- | --- |
| Architecture | `A 우세, C 보완` | `A`가 App Router와 도메인 분리에 더 가까웠고, `C`는 리포지토리 경계가 더 현실적이었다. | Next App Router + `features/engine/stores/lib/types/tests/docs` 구조로 재편 |
| State management | `C 우세` | `C`의 Zustand 타입 기반 액션/셀렉터가 더 명확했다. | slice 기반 store로 통합하고 레거시 JS store 삭제 |
| Rotation realism | `B + C 보완, 둘 다 재작성 필요` | `B`는 미리보기 의도, `C`는 preview/apply 골격은 있었지만 둘 다 운영 품질이 낮았다. | deterministic scoring, tier 보호, 반복 회피, heat/quality diff, audit 적용 |
| Reveal correctness | `C 우세` | `C`가 4-state UX에 더 가까웠고 `A`는 예외 규칙이 섞여 있었다. | `ROUND_2 + admin toggle + usedFreeHearts >= 3` 단일 규칙으로 통일 |
| Customer UX | `B + C 보완` | `B`는 테이블 중심 감각이 좋았고 `C`는 온보딩 프레이밍이 나았다. | 테이블 기반 탐색, 얕은 리스트 UX 제거, 신고/설정/콘텐츠 동선 정리 |
| Admin UX | `C 우세` | KPI, reveal-ready, intervention 감각이 더 실제 운영에 가까웠다. | 한 화면 운영 대시보드, heat/risk/history/rotation preview/apply 정리 |
| Visual design | `C 우세` | 토큰화된 다크 서피스와 계층이 가장 낫지만 premium 마감은 부족했다. | 고객은 dark luxury, 운영은 crisp light ops로 재아트 |
| Motion quality | `C 우세` | Framer Motion 토큰 접근은 유효했지만 적용이 산발적이었다. | page enter, hover lift, reveal unlock, toast motion을 named primitive로 고정 |
| Backend readiness | `A + C 보완` | `A`는 순수 엔진 사고가 좋았고 `C`는 Supabase row mapping이 더 나았다. | repository boundary, seed repository, Supabase adapter, polling transport 정리 |
| Testing quality | `C 우세` | Vitest/Playwright scaffold가 가장 현실적이었다. | unit/integration/e2e를 실제 merged app 기준으로 재작성 |
| Production safety | `둘 다 약함` | mock truth, local state 분산, unstable runtime 설정이 남아 있었다. | `_sources` 제외, dev origin 허용, Next 16 webpack 명시, stale selector 제거 |
| Maintainability | `A 우세, C 보완` | `A`는 경계 의식이 있었고 `C`는 타입 자산이 있었다. | 중복 JS tree 제거, typed domain 모델 고정 |
| Business / monetization fit | `C 우세` | 5,000원 하트 정책과 무료/유료 구분이 명확했다. | 결제는 adapter boundary로 남기고 fake purchase success 제거 |
| Consumer psychology | `B + C 보완` | 과장되지 않은 분위기 설계와 테이블 프레이밍이 둘을 합쳤을 때 가장 좋았다. | 고객 카피를 과소음 없이 premium tone으로 재작성 |
| Korean market fit | `B + C 보완` | 한국어 중심 레이블과 운영 문구는 두 소스의 조합이 가장 적합했다. | Korean-first UI copy 전면 재작성 |
| Live ops practicality | `C 우세` | reveal-ready, intervention, audit 중심 사고가 더 실제 현장형이었다. | 미리보기 생성 시 회전 패널 자동 이동, 운영 판단 속도 최적화 |

최종 결론:

- `A`는 구조 감각이 좋았지만 실제 제품 완성도는 낮았다.
- `B`는 테이블 기반 UX 방향성은 맞았지만 코드베이스가 너무 prototype 중심이었다.
- `C`는 가장 가까운 출발점이었지만 상태, 카피, runtime safety, UX polish가 부족했다.
- 최종 merged codebase는 `C`를 donor base로 삼되, `A`의 구조 원칙과 `B`의 테이블 중심 UX를 흡수한 greenfield 재구성이다.
