/**
 * PINROUTE Global Configuration
 * 
 * 카카오 지도 API Key 및 Google Gemini AI API Key를 관리하는 파일입니다.
 */
const CONFIG = {
  // 카카오 JavaScript API 키
  VITE_KAKAO_MAP_KEY: window.VITE_KAKAO_MAP_KEY || "814471ffcb6c88e1be1f34f5442061a2",
  
  // 구글 Gemini AI API 키
  VITE_GEMINI_API_KEY: window.VITE_GEMINI_API_KEY || "AQ.Ab8RN6JbvF1sx_RX1eXl8DvV6PQIjspGcWnHtyh-2N1IP7ohDw"
};

// 전역 바인딩
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
