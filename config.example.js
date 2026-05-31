/**
 * PINROUTE Local Configuration Example
 * 
 * 실제 사용 시 복사해서 config.js로 만들고 키를 채워서 사용하세요.
 * 이 파일은 저장소에 커밋해도 안전하도록 예시 값만 포함합니다.
 */
const CONFIG = {
  VITE_KAKAO_MAP_KEY: "814471ffcb6c88e1be1f34f5442061a2",
  VITE_GEMINI_API_KEY: "AQ.Ab8RN6JbvF1sx_RX1eXl8DvV6PQIjspGcWnHtyh-2N1IP7ohDw"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
