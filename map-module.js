/**
 * PINROUTE Hybrid Map Module (Kakao Map & Premium Mock Vector Map)
 * 
 * 카카오 맵 JavaScript API를 비동기로 안전하게 로드하고,
 * API 키가 없거나 로드 오류가 발생한 경우 미려한 SVG/Canvas 기반의
 * 인터랙티브 맵 환경으로 자동 스위칭(Fallback)하여 핀 배치, 경로 라인, 핀 추가 등 모든 핵심 인터랙션을 완전히 작동시킵니다.
 */

const MapModule = {
  kakaoMapInstance: null,
  markers: [],
  searchMarkers: [],
  mockSearchMarkerEls: [], // Mock 모드 검색 마커 DOM 요소 목록
  polyline: null,
  isMockMode: false,
  kakaoLoaded: false,
  kakaoLoading: false,
  currentPlan: null,
  zoomScale: 1.0,
  nearbySearchCenter: null, // { lat, lng } - 주변 검색 기준 좌표

  /**
   * 카카오 맵 SDK 비동기 로딩
   */
  loadKakaoSDK: function(callback) {
    const apiKey = (window.CONFIG && window.CONFIG.VITE_KAKAO_MAP_KEY) || "814471ffcb6c88e1be1f34f5442061a2";
    
    // 만약 API 키가 비어있으면 즉시 모크 모드로 실행
    if (!apiKey) {
      console.warn("PINROUTE [MapModule]: Kakao API Key is missing. Falling back to Premium Interactive Mock Map.");
      this.isMockMode = true;
      if (callback) callback(false);
      return;
    }

    // 이미 카카오 객체가 로드되어 있는 경우
    if (window.kakao && window.kakao.maps && this.kakaoLoaded) {
      if (callback) callback(true);
      return;
    }

    // 로딩 중인 경우, 콜백 소비를 대기
    if (this.kakaoLoading) {
      const waitInterval = setInterval(() => {
        if (this.kakaoLoaded) {
          clearInterval(waitInterval);
          if (callback) callback(true);
        } else if (this.isMockMode) {
          clearInterval(waitInterval);
          if (callback) callback(false);
        }
      }, 150);
      return;
    }

    // 동적 스크립트 엘리먼트 생성 및 주입
    this.kakaoLoading = true;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    
    script.onload = () => {
      // kakao.maps.load를 호출하여 autoload 완료 후 콜백 실행
      window.kakao.maps.load(() => {
        console.log("PINROUTE [MapModule]: Kakao Map SDK loaded successfully.");
        this.isMockMode = false;
        this.kakaoLoaded = true;
        this.kakaoLoading = false;
        if (callback) callback(true);
      });
    };

    script.onerror = () => {
      console.error("PINROUTE [MapModule]: Failed to load Kakao SDK. Activating Mock Map Mode.");
      this.isMockMode = true;
      if (callback) callback(false);
    };

    document.head.appendChild(script);
  },

  /**
   * 지정된 DOM 엘리먼트에 지도 초기화 및 일정 데이터 바인딩
   */
  initMap: function(elementId, plan, onMarkerClick, onMapClick) {
    this.currentPlan = plan;
    this.zoomScale = 1.0;
    const container = document.getElementById(elementId);
    if (!container) return;

    // 초기화 전에 기존 컨텐츠 삭제
    container.innerHTML = "";

    // SDK 로딩 및 맵 설정
    this.loadKakaoSDK((success) => {
      if (success && window.kakao && window.kakao.maps) {
        this.renderKakaoMap(container, plan, onMarkerClick, onMapClick);
      } else {
        this.renderMockMap(container, plan, onMarkerClick, onMapClick);
      }
    });
  },

  /**
   * 실제 카카오 맵 렌더링 및 핀 배치
   */
  renderKakaoMap: function(container, plan, onMarkerClick, onMapClick) {
    const spots = plan.schedule || [];

    const defaultCenter = new kakao.maps.LatLng(33.5056213, 126.5311884);
    const centerLatLng = spots.length ? new kakao.maps.LatLng(spots[0].lat, spots[0].lng) : defaultCenter;
    const mapOptions = {
      center: centerLatLng,
      level: spots.length ? 5 : 7
    };

    const map = new kakao.maps.Map(container, mapOptions);
    this.kakaoMapInstance = map;
    this.clearMarkers();

    // 현재 지도 중심 좌표 저장 (주변 검색 기준점)
    const centerPos = centerLatLng;
    this.nearbySearchCenter = { lat: centerPos.getLat(), lng: centerPos.getLng() };

    // 지도 이동 시 중심 좌표 업데이트
    kakao.maps.event.addListener(map, 'center_changed', () => {
      const c = map.getCenter();
      this.nearbySearchCenter = { lat: c.getLat(), lng: c.getLng() };
    });

    const linePath = [];
    const bounds = new kakao.maps.LatLngBounds();

    // 핀 생성 루프
    spots.forEach((spot, index) => {
      const position = new kakao.maps.LatLng(spot.lat, spot.lng);
      linePath.push(position);
      bounds.extend(position);

      // 마커 이미지 커스텀 차별화 (출발지, 관광지, 맛집, 숙소)
      let markerColor = "#5DBB63"; // 기본 Green
      if (index === 0) markerColor = "#3B82F6"; // 출발지 Blue
      else if (spot.type === 'food') markerColor = "#EF4444"; // 맛집 Red
      else if (spot.type === 'hotel') markerColor = "#F59E0B"; // 숙소 Yellow
      else if (spot.type === 'convenience') markerColor = "#8B5CF6"; // 편의점 Purple

      // 카카오 맵 커스텀 마커 HTML 오버레이 구성
      const content = `
        <div class="mock-marker marker-${index === 0 ? 'start' : spot.type}" id="k-marker-${spot.id}">
          <div class="marker-pin" style="background-color: ${markerColor}"></div>
          <div class="marker-label">${index + 1}. ${spot.name.split(" ").slice(-1)[0]}</div>
        </div>
      `;

      const customOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 1
      });

      customOverlay.setMap(map);
      this.markers.push(customOverlay);

      // 마커 엘리먼트 획득을 위해 약간의 틱 후에 클릭 이벤트 수동 바인딩
      setTimeout(() => {
        const el = document.getElementById(`k-marker-${spot.id}`);
        if (el) {
          el.addEventListener("click", () => {
            if (onMarkerClick) onMarkerClick(spot);
          });
        }
      }, 100);
    });

    if (spots.length > 0) {
      // 핀들을 이을 굵은 초록색 폴리라인 그리기 (PINROUTE 요구사항: 초록색 라인)
      const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: '#5DBB63',
        strokeOpacity: 0.9,
        strokeStyle: 'solid'
      });

      polyline.setMap(map);
      this.polyline = polyline;

      // 모든 마커가 화면에 잘 들어오도록 지도의 바운드 재조정
      map.setBounds(bounds);
    }

    // 지도 클릭 시 나만의 핀 꽂기 콜백 연동
    if (onMapClick) {
      kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
        const latlng = mouseEvent.latLng;
        onMapClick(latlng.getLat(), latlng.getLng());
      });
    }
  },

  /**
   * 최고급 인터랙티브 모크 벡터 지도를 SVG로 컨테이너 내부로 렌더링
   */
  renderMockMap: function(container, plan, onMarkerClick, onMapClick) {
    console.log("PINROUTE [MapModule]: Rendering Premium Mock Interactive Vector Map.");
    this.isMockMode = true;
    const spots = plan.schedule;

    // 지도 모양을 띤 미려한 SVG 레이아웃 구성 (해안선, 오름/산, 도로 가상 렌더링)
    let svgContent = `
      <div class="map-element" style="background: radial-gradient(circle, #E0F2F1 0%, #B2DFDB 100%); width: 100%; height: 100%; position: relative;">
        <!-- 가상 해안선 및 도로망 SVG 뒷배경 -->
        <svg class="mock-map-svg" viewBox="0 0 400 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.45;">
          <!-- 바다 물결 무늬 -->
          <path d="M 0,100 C 150,150 250,50 400,100 L 400,0 L 0,0 Z" fill="#80CBC4" opacity="0.6"/>
          
          <!-- 가상의 구불구불한 낭만 해안 도로선 -->
          <path d="M 30,350 Q 150,220 280,320 T 400,150" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 6"/>
          <path d="M 30,350 Q 150,220 280,320 T 400,150" fill="none" stroke="#90A4AE" stroke-width="1.5" stroke-linecap="round"/>
          
          <path d="M 0,200 Q 180,100 350,380" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="8 6"/>
          <path d="M 0,200 Q 180,100 350,380" fill="none" stroke="#90A4AE" stroke-width="1.5"/>

          <!-- 테마 가상 섬 외각 윤곽 -->
          <path d="M 120,180 C 180,140 280,170 300,240 C 310,310 200,320 150,290 C 100,260 90,210 120,180 Z" fill="#E8F5E9" stroke="#A5D6A7" stroke-width="2"/>
        </svg>

        <div style="position: absolute; bottom: 100px; left: 16px; background-color: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 6px; font-size: 9px; font-weight: 500; pointer-events: none; z-index: 15;">
          🛰️ PINROUTE 모크 맵 모드 작동 중 (빈 곳을 눌러 내 핀을 등록하세요!)
        </div>

        <div id="mock-markers-layer" style="width: 100%; height: 100%; position: absolute; top:0; left:0; z-index: 10;"></div>
        
        <!-- 실시간 핀들을 잇는 초록색 경로 라인 (PINROUTE 요구사항: 초록색 라인) -->
        <svg id="mock-polyline-layer" viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; pointer-events: none; z-index: 5;"></svg>
      </div>
    `;

    container.innerHTML = svgContent;

    // 조금 뒤 마커와 커넥팅 라인을 그립니다 (DOM 렌더가 완전히 마쳐진 후)
    setTimeout(() => {
      this.drawMockMarkersAndLines(spots, onMarkerClick);

      // 모크 맵 직접 클릭 시 핀 등록 연동
      if (onMapClick) {
        const mapEl = container.querySelector(".map-element");
        if (mapEl) {
          mapEl.addEventListener("click", (e) => {
            // 마커 클릭 시 전파 방지를 했으므로, 맵 바닥만 클릭했을 때 활성화됨
            const rect = mapEl.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            const pctX = clickX / rect.width;
            const pctY = clickY / rect.height;
            
            // 현재 활성화된 일정의 극값을 기준으로 가상의 lat, lng 복원
            let minLat = 33.4996213;
            let maxLat = 33.5296213;
            let minLng = 126.5311884;
            let maxLng = 126.5611884;
            
            if (spots.length > 0) {
              minLat = Math.min(...spots.map(s => s.lat));
              maxLat = Math.max(...spots.map(s => s.lat));
              minLng = Math.min(...spots.map(s => s.lng));
              maxLng = Math.max(...spots.map(s => s.lng));
            }
            
            const latDiff = maxLat - minLat || 0.03;
            const lngDiff = maxLng - minLng || 0.03;
            
            // X는 15%~85% 스케일링, Y는 15%~75% 스케일링에 기반하여 계산
            const xPct = pctX * 100;
            const yPct = pctY * 100;
            
            const lngRatio = Math.max(0, Math.min(1, (xPct - 15) / 70));
            const latRatio = Math.max(0, Math.min(1, (75 - yPct) / 60));
            
            const calcLat = minLat + latRatio * latDiff;
            const calcLng = minLng + lngRatio * lngDiff;
            
            onMapClick(calcLat, calcLng);
          });
        }
      }
    }, 50);
  },

  /**
   * SVG 컨테이너 위에 마커 핀들과 순서 연결선을 그리는 서브 엔진
   */
  drawMockMarkersAndLines: function(spots, onMarkerClick) {
    const markersLayer = document.getElementById("mock-markers-layer");
    const polylineLayer = document.getElementById("mock-polyline-layer");
    if (!markersLayer || !polylineLayer) return;

    markersLayer.innerHTML = "";
    polylineLayer.innerHTML = "";

    if (spots.length === 0) return;

    // 위경도 데이터를 지도 상의 가상 퍼센트 좌표(10% ~ 90%)로 정규화 매핑하여
    // 핀들이 모바일 화면 한가운데에 아주 예쁘게 밀집하여 렌더링되도록 스케일링
    let minLat = Math.min(...spots.map(s => s.lat));
    let maxLat = Math.max(...spots.map(s => s.lat));
    let minLng = Math.min(...spots.map(s => s.lng));
    let maxLng = Math.max(...spots.map(s => s.lng));

    // 단일 좌표일 시 나눗셈 0 에러 방지
    const latDiff = maxLat - minLat || 1;
    const lngDiff = maxLng - minLng || 1;

    const coordsInPct = spots.map(spot => {
      // 폰 스크린 가로(X: 15%~85%), 세로(Y: 15%~75%) 여백 확보
      const x = 15 + ((spot.lng - minLng) / lngDiff) * 70;
      // 위도는 북쪽이 더 크므로 화면 Y좌표를 뒤집어줌
      const y = 75 - ((spot.lat - minLat) / latDiff) * 60;
      return { spot, x, y };
    });

    // 1. 초록색 연결선(Polyline) 그리기 (SVG 라인 엘리먼트 생성)
    let pathD = "";
    coordsInPct.forEach((coord, index) => {
      if (index === 0) {
        pathD += `M ${coord.x} ${coord.y}`;
      } else {
        pathD += ` L ${coord.x} ${coord.y}`;
      }
    });

    const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathElement.setAttribute("d", pathD);
    pathElement.setAttribute("fill", "none");
    pathElement.setAttribute("stroke", "#5DBB63"); // PINROUTE 그린 메인칼라
    pathElement.setAttribute("stroke-width", "3");
    pathElement.setAttribute("stroke-linecap", "round");
    pathElement.setAttribute("stroke-linejoin", "round");
    pathElement.setAttribute("opacity", "0.95");
    
    // 연결 선로에 부드러운 대시 애니메이션 효과를 주어 dynamic 느낌 강화
    pathElement.style.strokeDasharray = "300";
    pathElement.style.strokeDashoffset = "300";
    pathElement.style.animation = "draw-line 2.5s ease-out forwards";

    // 스타일시트에 다이나믹 키프레임 인젝션 (없을 시 추가)
    if (!document.getElementById("mock-map-keyframes")) {
      const style = document.createElement("style");
      style.id = "mock-map-keyframes";
      style.innerHTML = `
        @keyframes draw-line {
          to { stroke-dashoffset: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    polylineLayer.appendChild(pathElement);

    // 2. 핀 랜드마크 생성
    coordsInPct.forEach((coord, index) => {
      const spot = coord.spot;
      
      let markerColor = "#5DBB63"; // 기본 Green
      if (index === 0) markerColor = "#3B82F6"; // 출발지 Blue
      else if (spot.type === 'food') markerColor = "#EF4444"; // 맛집 Red
      else if (spot.type === 'hotel') markerColor = "#F59E0B"; // 숙소 Yellow
      else if (spot.type === 'convenience') markerColor = "#8B5CF6"; // 편의점 Purple

      const markerEl = document.createElement("div");
      markerEl.className = `mock-marker marker-${index === 0 ? 'start' : spot.type}`;
      markerEl.style.left = `${coord.x}%`;
      markerEl.style.top = `${coord.y}%`;
      
      // 인터랙티브 HTML 핀
      markerEl.innerHTML = `
        <div class="marker-pin" style="background-color: ${markerColor}; transition: transform 0.2s;"></div>
        <div class="marker-label" style="box-shadow: var(--shadow-sm);">${index + 1}. ${spot.name.split(" ").slice(-1)[0]}</div>
      `;

      // 핀 클릭 시 상세 정보보기 콜백 연결
      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onMarkerClick) onMarkerClick(spot);
      });

      markersLayer.appendChild(markerEl);
    });
  },

  /**
   * 카카오 맵 핀들 청소
   */
  clearMarkers: function() {
    this.markers.forEach(marker => {
      if (marker.setMap) marker.setMap(null);
    });
    this.markers = [];
    if (this.polyline && this.polyline.setMap) {
      this.polyline.setMap(null);
      this.polyline = null;
    }
  },

  clearSearchMarkers: function() {
    // 카카오맵 마커 제거
    if (this.searchMarkers) {
      this.searchMarkers.forEach(marker => {
        if (marker.setMap) marker.setMap(null);
      });
    }
    this.searchMarkers = [];

    // Mock 맵 DOM 마커 제거
    if (this.mockSearchMarkerEls) {
      this.mockSearchMarkerEls.forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    }
    this.mockSearchMarkerEls = [];
  },

  /**
   * Mock 지도 위에 검색 결과 핀을 시각적으로 표시
   */
  drawMockSearchMarkers: function(results, onMarkerClick) {
    this.clearSearchMarkers();
    const markersLayer = document.getElementById('mock-markers-layer');
    if (!markersLayer || !results.length) return;

    // 현재 일정 핀들의 좌표 범위 가져오기 (지도 스케일 맞춰주기 위해)
    const spots = (this.currentPlan && this.currentPlan.schedule) || [];
    let minLat = this.nearbySearchCenter ? this.nearbySearchCenter.lat - 0.005 : 33.4996;
    let maxLat = this.nearbySearchCenter ? this.nearbySearchCenter.lat + 0.005 : 33.5296;
    let minLng = this.nearbySearchCenter ? this.nearbySearchCenter.lng - 0.005 : 126.5212;
    let maxLng = this.nearbySearchCenter ? this.nearbySearchCenter.lng + 0.005 : 126.5612;

    if (spots.length > 0) {
      minLat = Math.min(minLat, ...spots.map(s => s.lat));
      maxLat = Math.max(maxLat, ...spots.map(s => s.lat));
      minLng = Math.min(minLng, ...spots.map(s => s.lng));
      maxLng = Math.max(maxLng, ...spots.map(s => s.lng));
    }

    // 결과 핀들을 지도 범위 안에 배치
    results.forEach((spot, i) => {
      // lat/lng 좌표가 있으면 실좌표 기반, 없으면 무작위 위치
      const lat = spot.lat || (minLat + Math.random() * (maxLat - minLat));
      const lng = spot.lng || (minLng + Math.random() * (maxLng - minLng));

      const latDiff = maxLat - minLat || 0.01;
      const lngDiff = maxLng - minLng || 0.01;

      const x = 15 + ((lng - minLng) / lngDiff) * 70;
      const y = 75 - ((lat - minLat) / latDiff) * 60;

      // 카테고리별 색상
      const colorMap = {
        food: '#EF4444',
        spot: '#5DBB63',
        convenience: '#8B5CF6',
        hotel: '#F59E0B'
      };
      const color = colorMap[spot.type] || colorMap[spot.category?.includes('편의') ? 'convenience' : 'spot'] || '#5DBB63';
      const emoji = spot.emoji || '📍';

      const markerEl = document.createElement('div');
      markerEl.className = 'mock-marker mock-search-marker';
      markerEl.style.cssText = `
        position: absolute;
        left: ${Math.max(5, Math.min(95, x))}%;
        top: ${Math.max(5, Math.min(85, y))}%;
        transform: translate(-50%, -100%);
        z-index: 12;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: marker-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        animation-delay: ${i * 0.05}s;
      `;

      markerEl.innerHTML = `
        <div style="
          width: 32px; height: 32px;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="transform: rotate(45deg); font-size: 14px;">${emoji}</span>
        </div>
        <div style="
          margin-top: 3px;
          background: ${color};
          color: white;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 8px;
          white-space: nowrap;
          max-width: 70px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">${spot.name}</div>
      `;

      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onMarkerClick) onMarkerClick(spot);
      });

      markersLayer.appendChild(markerEl);
      this.mockSearchMarkerEls.push(markerEl);
    });

    // 폐 애니메이션 키프레임 동적 주입
    if (!document.getElementById('mock-search-marker-keyframes')) {
      const style = document.createElement('style');
      style.id = 'mock-search-marker-keyframes';
      style.innerHTML = `
        @keyframes marker-pop {
          0% { transform: translate(-50%, -100%) scale(0); opacity: 0; }
          100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  },

  getKakaoCategoryCode: function(type) {
    const categoryMap = {
      food: 'FD6',
      spot: 'AT4',
      convenience: 'CE7',
      hotel: 'AD5'
    };
    return categoryMap[type] || null;
  },

  searchPlaces: function(keyword, callback, options = {}) {
    const { limit = 20, randomize = false } = options;
    this.clearSearchMarkers();
    if (!keyword || keyword.trim().length === 0) {
      if (callback) callback([]);
      return;
    }
    if (this.isMockMode) {
      if (callback) callback([]);
      return;
    }

    const performSearch = () => {
      if (!window.kakao || !window.kakao.maps || !this.kakaoLoaded) {
        if (callback) callback([]);
        return;
      }

      const ensureServices = (cb) => {
        try {
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            cb();
          } else if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
            window.kakao.maps.load(() => cb());
          } else {
            setTimeout(() => ensureServices(cb), 150);
          }
        } catch (e) {
          setTimeout(() => ensureServices(cb), 150);
        }
      };

      ensureServices(() => {
        const ps = new kakao.maps.services.Places();
        ps.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          let results = data.map(item => ({
            id: item.id,
            name: item.place_name,
            address: item.road_address_name || item.address_name || '',
            category: item.category_name,
            lat: parseFloat(item.y),
            lng: parseFloat(item.x)
          }));

          if (randomize && results.length > limit) {
            for (let i = results.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [results[i], results[j]] = [results[j], results[i]];
            }
          }

          results = results.slice(0, limit);

          if (this.kakaoMapInstance) {
            results.forEach(item => {
              const marker = new kakao.maps.Marker({
                map: this.kakaoMapInstance,
                position: new kakao.maps.LatLng(item.lat, item.lng),
                title: item.name
              });
              this.searchMarkers.push(marker);
            });
          }

          if (callback) callback(results);
          return;
        }

        if (callback) callback([]);
      });
      });
    };

    if (window.kakao && window.kakao.maps && this.kakaoLoaded) {
      performSearch();
    } else if (window.kakao && window.kakao.maps && !this.kakaoLoaded) {
      window.kakao.maps.load(() => {
        this.kakaoLoaded = true;
        this.kakaoLoading = false;
        performSearch();
      });
    } else if (this.kakaoLoading) {
      setTimeout(() => this.searchPlaces(keyword, callback, options), 250);
    } else {
      if (callback) callback([]);
    }
  },

  /**
   * 현재 지도 중심 기준 반경 내 카테고리 주변 검색
   * 카카오 Maps: radius + location 옵션 사용
   * Mock 모드: 가상 샘플 데이터 반환
   */
  searchNearbyByCategory: function(category, callback, options = {}) {
    const { limit = 20 } = options;
    this.clearSearchMarkers();

    if (!category || category === 'all') {
      if (callback) callback([]);
      return;
    }

    // Mock 모드 — 가상 주변 장소 데이터 반환
    if (this.isMockMode) {
      const center = this.nearbySearchCenter || { lat: 33.5056213, lng: 126.5311884 };
      const mockNearby = this._generateMockNearbyData(category, center, limit);
      if (callback) callback(mockNearby);
      return;
    }

    const code = this.getKakaoCategoryCode(category);
    if (!code) {
      if (callback) callback([]);
      return;
    }

    const performSearch = () => {
      const ensureServices = (cb) => {
        try {
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            cb();
          } else if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
            window.kakao.maps.load(() => cb());
          } else {
            setTimeout(() => ensureServices(cb), 150);
          }
        } catch (e) {
          setTimeout(() => ensureServices(cb), 150);
        }
      };

      ensureServices(() => {
        const ps = new kakao.maps.services.Places();
        const center = this.nearbySearchCenter;
        const searchOptions = center
          ? {
              location: new kakao.maps.LatLng(center.lat, center.lng),
              radius: 2000,  // 반경 2km
              sort: kakao.maps.services.SortBy.DISTANCE
            }
          : { useMapBounds: true };

        ps.categorySearch(code, (data, status) => {
          if (status === kakao.maps.services.Status.OK) {
            let results = data.map(item => ({
              id: item.id,
              name: item.place_name,
              address: item.road_address_name || item.address_name || '',
              category: item.category_name,
              lat: parseFloat(item.y),
              lng: parseFloat(item.x),
              distance: item.distance ? `${Math.round(item.distance)}m` : null
            }));

            results = results.slice(0, limit);

            if (this.kakaoMapInstance) {
              results.forEach(item => {
                const marker = new kakao.maps.Marker({
                  map: this.kakaoMapInstance,
                  position: new kakao.maps.LatLng(item.lat, item.lng),
                  title: item.name
                });
                this.searchMarkers.push(marker);
              });
            }

            if (callback) callback(results);
            return;
          }
          if (callback) callback([]);
        }, searchOptions);
      });
    };

    if (window.kakao && window.kakao.maps && this.kakaoLoaded) {
      performSearch();
    } else if (this.kakaoLoading) {
      setTimeout(() => this.searchNearbyByCategory(category, callback, options), 250);
    } else {
      if (callback) callback([]);
    }
  },

  /**
   * Mock 모드용 가상 주변 장소 데이터 생성기
   */
  _generateMockNearbyData: function(category, center, limit = 10) {
    const categoryMocks = {
      food: [
        { name: '현지 맛집 한식당', address: '인근 골목 2번지', category: '음식점 > 한식', emoji: '🍚' },
        { name: '해안가 해물 뚝배기', address: '바닷가 1길 15', category: '음식점 > 해산물', emoji: '🦞' },
        { name: '로컬 감성 카페', address: '돌담로 7', category: '음식점 > 카페', emoji: '☕' },
        { name: '고기굽는 집', address: '중앙로 33', category: '음식점 > 고기', emoji: '🥩' },
        { name: '해장국 전문점', address: '아침시장 2가', category: '음식점 > 해장국', emoji: '🍲' },
        { name: '디저트 공방', address: '카페거리 12', category: '음식점 > 디저트', emoji: '🍰' },
      ],
      spot: [
        { name: '전망대 공원', address: '언덕 정상 1', category: '관광명소 > 자연', emoji: '🌅' },
        { name: '역사 문화 박물관', address: '문화로 55', category: '관광명소 > 역사', emoji: '🏛️' },
        { name: '오름 트레킹 코스', address: '등산로 입구', category: '관광명소 > 자연', emoji: '⛰️' },
        { name: '해변 산책로', address: '해안길 1km', category: '관광명소 > 해안', emoji: '🌊' },
        { name: '야시장 명소', address: '야시장 거리', category: '관광명소 > 문화', emoji: '🏮' },
      ],
      convenience: [
        { name: 'CU 편의점', address: '중앙로 10', category: '편의점', emoji: '🛒' },
        { name: 'GS25', address: '해안로 22', category: '편의점', emoji: '🛒' },
        { name: '세븐일레븐', address: '상가 1층', category: '편의점', emoji: '🛒' },
        { name: 'CU 24시간', address: '관광지 입구', category: '편의점', emoji: '🛒' },
      ],
      hotel: [
        { name: '오션뷰 펜션', address: '해변로 8', category: '숙박 > 펜션', emoji: '🏖️' },
        { name: '감성 게스트하우스', address: '골목길 3', category: '숙박 > 게스트하우스', emoji: '🏡' },
        { name: '비즈니스 호텔', address: '중심가 50', category: '숙박 > 호텔', emoji: '🏨' },
        { name: '에어비앤비 독채', address: '조용한 마을', category: '숙박 > 독채', emoji: '🏠' },
      ]
    };

    const baseData = categoryMocks[category] || [];
    return baseData.slice(0, limit).map((item, i) => ({
      id: `mock_nearby_${category}_${i}`,
      name: item.name,
      title: item.name,
      address: item.address,
      category: item.category,
      lat: center.lat + (Math.random() - 0.5) * 0.01,
      lng: center.lng + (Math.random() - 0.5) * 0.01,
      distance: `${Math.round(100 + Math.random() * 1900)}m`,
      emoji: item.emoji
    }));
  },

  searchPlacesByCategory: function(category, callback, options = {}) {
    const { limit = 20, randomize = true } = options;
    this.clearSearchMarkers();
    if (!category || category === 'all') {
      if (callback) callback([]);
      return;
    }
    if (this.isMockMode) {
      if (callback) callback([]);
      return;
    }

    const code = this.getKakaoCategoryCode(category);
    if (!code) {
      if (callback) callback([]);
      return;
    }

    const performCategorySearch = () => {
      if (!window.kakao || !window.kakao.maps || !this.kakaoLoaded) {
        if (callback) callback([]);
        return;
      }

      const ensureServices = (cb) => {
        try {
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            cb();
          } else if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
            window.kakao.maps.load(() => cb());
          } else {
            setTimeout(() => ensureServices(cb), 150);
          }
        } catch (e) {
          setTimeout(() => ensureServices(cb), 150);
        }
      };

      ensureServices(() => {
        const ps = new kakao.maps.services.Places();
        const searchOptions = { useMapBounds: true };
        ps.categorySearch(code, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          let results = data.map(item => ({
            id: item.id,
            name: item.place_name,
            address: item.road_address_name || item.address_name || '',
            category: item.category_name,
            lat: parseFloat(item.y),
            lng: parseFloat(item.x)
          }));

          if (randomize && results.length > limit) {
            for (let i = results.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [results[i], results[j]] = [results[j], results[i]];
            }
          }

          results = results.slice(0, limit);

          if (this.kakaoMapInstance) {
            results.forEach(item => {
              const marker = new kakao.maps.Marker({
                map: this.kakaoMapInstance,
                position: new kakao.maps.LatLng(item.lat, item.lng),
                title: item.name
              });
              this.searchMarkers.push(marker);
            });
          }

          if (callback) callback(results);
          return;
        }

        if (callback) callback([]);
      }, searchOptions);
      });
    };

    if (window.kakao && window.kakao.maps && this.kakaoLoaded) {
      performCategorySearch();
    } else if (window.kakao && window.kakao.maps && !this.kakaoLoaded) {
      window.kakao.maps.load(() => {
        this.kakaoLoaded = true;
        this.kakaoLoading = false;
        performCategorySearch();
      });
    } else if (this.kakaoLoading) {
      setTimeout(() => this.searchPlacesByCategory(category, callback, options), 250);
    } else {
      if (callback) callback([]);
    }
  },

  /**
   * 지도 확대 줌인
   */
  zoomIn: function() {
    if (!this.isMockMode && this.kakaoMapInstance) {
      const level = this.kakaoMapInstance.getLevel();
      // 카카오 맵 줌인 (레벨이 낮을수록 확대)
      if (level > 1) {
        this.kakaoMapInstance.setLevel(level - 1);
      }
    } else {
      // 모크 지도의 CSS 스케일 줌인
      this.zoomScale = Math.min(this.zoomScale + 0.15, 2.2);
      this.applyMockZoom();
    }
  },

  /**
   * 지도 축소 줌아웃
   */
  zoomOut: function() {
    if (!this.isMockMode && this.kakaoMapInstance) {
      const level = this.kakaoMapInstance.getLevel();
      // 카카오 맵 줌아웃 (레벨이 높을수록 축소)
      if (level < 14) {
        this.kakaoMapInstance.setLevel(level + 1);
      }
    } else {
      // 모크 지도의 CSS 스케일 줌아웃
      this.zoomScale = Math.max(this.zoomScale - 0.15, 0.5);
      this.applyMockZoom();
    }
  },

  /**
   * 모크 맵에 줌 스케일 트랜지션 적용
   */
  applyMockZoom: function() {
    const el = document.querySelector(".map-element");
    if (el) {
      el.style.transform = `scale(${this.zoomScale})`;
      el.style.transformOrigin = "center center";
      el.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapModule;
} else {
  window.MapModule = MapModule;
}
