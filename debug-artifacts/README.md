# Debug Artifacts Drop Folder

이 폴더에 자료를 넣어주시면 제가 같은 날짜 기준으로 아래 흐름을 직접 대조합니다.

입력
-> Excel `Table_HQ`
-> Power Automate `List rows`
-> `Filter array`
-> `Condition`
-> 이메일 분기

## 폴더 구조

- `excel/`
- `powerautomate/`
- `gemini/`

## 1. excel 폴더

가장 좋은 자료:

- `table_hq_target_date.xlsx`
- 또는 `table_hq_target_date.png`

필수 확인 열:

- `Id`
- `Branch`
- `Date`
- `Zone`
- `Issue Category`
- `Issue Detail`
- `Action Taken`

권장 필터:

- `Branch = AMNY`
- `Date = 메일 제목에 나온 날짜`

## 2. powerautomate 폴더

같은 날짜의 run 1건 기준으로 아래 자료를 넣어주세요.

- `run-summary.png`
- `list-rows-input-output.json` 또는 캡처
- `filter-array-input-output.json` 또는 캡처
- `condition-input-output.json` 또는 캡처
- `send-email-input-output.json` 또는 캡처

가능하면 파일명에 날짜를 넣어주세요.

예시:

- `2026-04-15-run-summary.png`
- `2026-04-15-list-rows.json`
- `2026-04-15-filter-array.json`
- `2026-04-15-condition.json`
- `2026-04-15-send-email.json`

## 3. gemini 폴더

선택 사항입니다. 있으면 판단 근거를 더 정확히 맞출 수 있습니다.

- `conversation.txt`
- `conversation.md`
- 대화 캡처 이미지

## 가장 최소한으로 필요한 자료

아래 2가지만 있어도 1차 원인 특정은 가능합니다.

1. `excel/`에 `Table_HQ`의 대상 날짜 화면 또는 파일
2. `powerautomate/`에 같은 날짜 run의 `List rows`, `Filter array`, `Condition`, `Send email` 캡처

자료를 넣으신 뒤 `넣었다`고만 말씀해 주세요.
