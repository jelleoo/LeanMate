# LeanMate

LeanMate는 목표 체중에 맞춰 하루 섭취 칼로리와 탄단지를 계산하고, 식단 기록과 그룹 운동 출석을 함께 관리하는 웹앱입니다.

## 주요 기능

- 성별, 나이, 키, 현재 체중, 목표 체중 기반 기초대사량 계산
- 커팅, 유지, 린매스업, 근육량 증가 목적별 하루 권장 칼로리 계산
- 탄수화물, 단백질, 지방 목표 g 계산
- 음식별 kcal와 탄단지 기록
- 확장된 로컬 음식 DB, 직접 입력 음식 저장, 즐겨찾기 기반 빠른 식단 추가
- 목표 대비 남은 kcal와 탄단지 진행률 표시
- 날짜별 그룹 운동 출석 기록
- 최근 7일 운동 스트릭과 월간 운동 잔디 시각화
- 주간 출석 횟수와 연속 출석일 기반 랭킹
- 친구 출석 상태와 내 스트릭을 비교한 동기부여 문구
- `/api/food-search` 서버리스 함수 기반 음식 영양정보 검색
- 기본 음식 DB 검색 결과 또는 직접 입력값 확인/수정 후 식단 추가
- OOP 상속 구조를 별도 Architecture 메뉴에서 시각화

## BMR 공식

```text
남자: 66.47 + (13.75 * 체중) + (5 * 키) - (6.76 * 나이)
여자: 655.1 + (9.56 * 체중) + (1.85 * 키) - (4.68 * 나이)
```

## OOP 구조

```text
FitnessModule
├─ GoalPlan
│  ├─ CuttingPlan
│  ├─ MaintainPlan
│  ├─ LeanBulkPlan
│  └─ MuscleGainPlan
├─ MealRecord
└─ AttendanceRecord
```

- `FitnessModule`: 공통 `run()` 인터페이스를 정의하는 부모 클래스
- `GoalPlan`: 목표 계산 클래스들의 부모 클래스
- `CuttingPlan`, `MaintainPlan`, `LeanBulkPlan`, `MuscleGainPlan`: 목적별 칼로리와 탄단지 계산을 오버라이딩
- `MealRecord`: 식단 배열을 합산해 오늘 섭취량을 계산
- `AttendanceRecord`: 날짜별 출석 기록을 바탕으로 주간 랭킹 계산

## 사용한 자료구조

- `Map`: 음식 이름을 key로 영양성분 조회
- `Array`: 식단 목록, 검색 후보 목록, 그룹원 목록, 출석 날짜 목록 관리
- `Stack`: 마지막 식단 추가 기록 되돌리기
- `Sort`: 주간 운동 출석 랭킹 계산
- `Set`: 즐겨찾기 음식 중복 방지와 연속 출석일 계산 시 날짜 포함 여부 확인

## 실행 방법

`index.html` 파일을 브라우저에서 열면 바로 실행됩니다.

로컬 서버로 확인하려면 아래 명령을 사용할 수 있습니다.

```bash
python -m http.server 4173
```

이후 `http://127.0.0.1:4173/index.html`에 접속합니다.

## 백엔드 설정

실제 친구들과 같은 그룹 출석 데이터를 공유하려면 Supabase와 Vercel 환경 변수를 설정합니다.

1. Supabase 프로젝트 생성
2. Supabase SQL Editor에서 `supabase-schema.sql` 실행
3. Vercel 프로젝트 환경 변수에 아래 값 추가

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

4. GitHub에 push 후 Vercel 재배포

서버리스 API는 아래 경로를 사용합니다.

```text
GET  /api/members
POST /api/members
GET  /api/attendance?date=YYYY-MM-DD
POST /api/attendance
POST /api/food-search
```

## 배포 메모

Vercel 환경 변수와 Supabase가 설정되어 있으면 그룹 출석은 Supabase에 저장됩니다. 로컬에서 `file://`로 실행하거나 백엔드 설정이 없으면 브라우저 `localStorage`를 fallback 저장소로 사용합니다.

OpenAI API 키는 프론트엔드에 노출하지 않고 `/api/food-search` 서버리스 함수에서만 사용합니다. 음식 검색 결과는 곧바로 저장하지 않고, 사용자가 kcal와 탄단지를 확인하거나 수정한 뒤 식단에 추가합니다.
