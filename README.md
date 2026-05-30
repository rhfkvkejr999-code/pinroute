# PINROUTE - 스마트 여행 플래너

PINROUTE는 복잡한 여행 계획을 AI가 대신 설계해주는 모바일 최적화 웹 애플리케이션입니다.

## 주요 기능
- **AI 맞춤형 여행 계획 생성**: 취향, 예산, 동행인 등을 분석하여 최적의 일정 제공
- **지도 기반 직관적 동선 확인**: 카카오 지도를 연동하여 장소와 핀을 실시간으로 확인
- **드래그 앤 드롭 일정 수정**: 자유롭게 일정을 변경하고 맵에 반영
- **장소 직접 추가 (핀 등록)**: 원하는 장소를 지도에서 직접 클릭하여 내 여행에 추가
- **계획 내보내기**: CSV, Google Sheets 형태로 여행 일정 공유 가능

## 기술 스택
- HTML5, CSS3, JavaScript (ES6)
- Kakao Maps API
- Google Gemini AI API

## 시작하기

본 프로젝트는 바닐라 JavaScript로 작성되어 별도의 빌드 과정 없이 바로 실행할 수 있습니다.
- `index.html` 파일을 브라우저에서 열거나, 로컬 서버(예: `Live Server`, `python -m http.server`)를 띄워서 확인할 수 있습니다.

### API 설정 주의사항
- `config.js` 파일에 API 키를 직접 넣지 않고, 예시 파일(`config.example.js`)을 참고하여 로컬에서만 실 키를 채워 사용하세요.
- `config.local.js`를 만들어 `config.js` 앞에 로드하면 실행 환경에서 비밀 키를 안전하게 관리할 수 있습니다.
- GitHub에 업로드할 때는 반드시 **Private (비공개) 저장소**로 설정하여 API 키가 외부로 유출되지 않도록 주의하세요.
- 실제 키는 `window.VITE_KAKAO_MAP_KEY` 또는 `window.VITE_GEMINI_API_KEY`로 주입하는 방식으로 관리하는 것이 안전합니다.
- Public 저장소로 전환해야 한다면 `config.js`를 커밋하지 말고 `.gitignore`에 추가하거나, 배포 환경에서 별도 환경 변수를 사용하세요.

## 배포
이 프로젝트는 정적 파일 배포를 지원하는 서비스(Netlify, Vercel, GitHub Pages 등)를 통해 쉽게 배포할 수 있습니다. 
단, 카카오 지도 API를 사용하려면 배포된 도메인을 **카카오 디벨로퍼스 - 내 애플리케이션 - Web 플랫폼**에 반드시 등록해야 합니다.
