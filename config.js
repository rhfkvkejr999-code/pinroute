/**
 * PINROUTE Global Configuration
 * 
 * 카카오 지도 API Key 및 Google Gemini AI API Key를 관리하는 파일입니다.
 *
 * 실제 API 키는 절대로 공개 저장소에 하드코딩하여 커밋하지 마세요.
 * 로컬에서는 window.VITE_KAKAO_MAP_KEY / window.VITE_GEMINI_API_KEY를 사용하거나
 * 별도의 비공개 구성 파일을 만들어 로드하는 방식으로 관리하세요.
 */
const CONFIG = {
  // 카카오 JavaScript API 키 (로컬에서 주입하거나 별도 파일로 관리)
  VITE_KAKAO_MAP_KEY: window.VITE_KAKAO_MAP_KEY || "YOUR_KAKAO_JAVASCRIPT_KEY",
  
  // 구글 Gemini AI API 키
  VITE_GEMINI_API_KEY: window.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY"
};

// 전역 바인딩
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
