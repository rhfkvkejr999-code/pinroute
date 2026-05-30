/**
 * PINROUTE Local Configuration Example
 * 
 * 실제 사용 시 복사해서 config.js로 만들고 키를 채워서 사용하세요.
 * 이 파일은 저장소에 커밋해도 안전하도록 예시 값만 포함합니다.
 */
const CONFIG = {
  VITE_KAKAO_MAP_KEY: "YOUR_KAKAO_JAVASCRIPT_KEY",
  VITE_GEMINI_API_KEY: "YOUR_GEMINI_API_KEY"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
