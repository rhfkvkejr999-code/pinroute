/**
 * PINROUTE Global Controller & SPA Router
 * 
 * 애플리케이션의 핵심 라이프사이클을 통제하고,
 * 각 뷰의 스위칭, 폼 검증, AI 규칙 적용 대화, 일정 편집 시 지도 핀의 실시간 동기화,
 * CSV 다운로드 및 로컬스토리지 퍼시스턴시를 매끄럽게 핸들링하는 통합 프레임워크입니다.
 */

// 글로벌 상태 초기화
const AppState = {
  user: {
    isLoggedIn: false,
    name: "비회원 여행자",
    profilePic: "👤"
  },
  onboarding: {
    hasDestination: null, // true: 예, false: 아니오
    destination: "",
    tags: [] // 선택된 여행 취향 태그
  },
  chatSession: {
    history: [], // { sender: 'ai'|'user', text: '...' }
    gauge: 10,   // 취향 분석도 진척율 %
    isCompleted: false
  },
  savedPlans: [], // 사용자가 직접 저장한 계획 목록 (로컬스토리지 저장)
  currentPlan: null, // 지도 상에 로드된 계획 객체
  mapFilters: {
    activeCategory: 'all',
    searchKeyword: ''
  },
  mapSearchResults: [],
  activeTab: 'home',
  isFreeMapMode: false, // 자유 선택 모드 여부
  
  // 마이페이지 환경설정
  settings: {
    isDarkMode: false,
    isPremium: false,
    notifications: true
  },

  // 가상의 커뮤니티 데이터베이스
  communityPosts: [
    { id: 1, author: "제주바람", region: "제주도", title: "부모님 모시고 가기 딱 좋은 서귀포 힐링 1일 코스", content: "비밀의 숲 오솔길은 경사가 완만해서 부모님이 걷기 정말 편하셨어요. 돌담 식당 오가닉 밥상 먹고 오션뷰 다원 카페까지 완벽한 힐링이었습니다. 강추해요!", likes: 42, comments: 8, isLiked: false, isBookmarked: false, date: "3시간 전" },
    { id: 2, author: "익스트림러", region: "강원 강릉", title: "강릉 정동진 짚라인 타고 해안선 뽀개기 동선 공유", content: "역사 성곽 둘러보고 바로 짚라인 타러 갔습니다. 바다 해안 열차에서 보는 일몰은 진짜 최고네요. 다들 맛집 웨이팅도 잊어버릴 만큼 바쁜 하루였지만 후회 없습니다!", likes: 89, comments: 19, isLiked: false, isBookmarked: false, date: "1일 전" },
    { id: 3, author: "푸드파이터", region: "부산", title: "부산 광안리 SNS 오픈런 맛집 도장깨기", content: "백년 가게 떡으로 디저트 먹고 수제버거 오픈런 성공! 로스터리 카페 들렀다가 수산시장 대게 코스까지 달리니 하루에 3kg 찐 것 같아요. 그래도 너무 행복합니다.", likes: 112, comments: 24, isLiked: false, isBookmarked: false, date: "2일 전" }
  ]
};

const App = {
  
  /**
   * 앱 실행 엔트리 포인트
   */
  init: function() {
    console.log("PINROUTE [App]: Initializing Application Life Cycle...");
    
    // 로컬 스토리지에서 저장된 계획 복원
    this.loadFromStorage();

    // 해시 변경 리스너 등록
    window.addEventListener("hashchange", () => this.handleRouting());
    
    // 첫 화면 라우팅 처리
    this.handleRouting();
    
    // 글로벌 이벤트 바인딩
    this.bindEvents();
    
    // 홈 화면 리스트업
    this.renderHomePlans();
  },

  /**
   * 로컬 스토리지 데이터 백업 및 복원
   */
  loadFromStorage: function() {
    try {
      const saved = localStorage.getItem("PINROUTE_saved_plans");
      if (saved) {
        AppState.savedPlans = JSON.parse(saved);
      }
      const settings = localStorage.getItem("PINROUTE_settings");
      if (settings) {
        AppState.settings = JSON.parse(settings);
        this.applySettings();
      }
      const user = localStorage.getItem("PINROUTE_user");
      if (user) {
        AppState.user = JSON.parse(user);
      }
    } catch (e) {
      console.error("PINROUTE [App]: Failed to load storage.", e);
    }
  },

  saveToStorage: function() {
    try {
      localStorage.setItem("PINROUTE_saved_plans", JSON.stringify(AppState.savedPlans));
      localStorage.setItem("PINROUTE_settings", JSON.stringify(AppState.settings));
      localStorage.setItem("PINROUTE_user", JSON.stringify(AppState.user));
    } catch (e) {
      console.error("PINROUTE [App]: Failed to save storage.", e);
    }
  },

  applySettings: function() {
    const screen = document.querySelector(".phone-screen");
    if (screen) {
      if (AppState.settings.isDarkMode) {
        screen.classList.add("dark-mode");
      } else {
        screen.classList.remove("dark-mode");
      }
    }
  },

  /**
   * SPA 해시 기반 라우터
   */
  handleRouting: function() {
    const hash = window.location.hash || "#login";
    console.log(`PINROUTE [Router]: Navigating to ${hash}`);
    
    // 1. 모든 뷰 비활성화
    const views = document.querySelectorAll(".view, .fullscreen-view");
    views.forEach(v => v.classList.remove("active"));
    
    // 2. 탭바 액티브 갱신 및 헤더/탭바 가시성 제어
    const tabbar = document.querySelector(".app-tabbar");
    const header = document.querySelector(".app-header");
    const headerTitle = document.getElementById("header-title");
    
    const isTabbedView = ["#home", "#chat", "#map", "#community", "#mypage"].includes(hash);
    
    if (isTabbedView) {
      tabbar.style.display = "flex";
      header.style.display = "flex";
      
      // 탭바 액티브 표시 변경
      const tabItems = document.querySelectorAll(".tabbar-item");
      tabItems.forEach(item => {
        if (item.getAttribute("href") === hash) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      // 헤더 타이틀 매핑
      if (hash === "#home") headerTitle.innerText = "PINROUTE";
      else if (hash === "#chat") headerTitle.innerText = "맞춤형 여행 플래너";
      else if (hash === "#map") headerTitle.innerText = "여행 코스 지도";
      else if (hash === "#community") headerTitle.innerText = "커뮤니티";
      else if (hash === "#mypage") headerTitle.innerText = "마이페이지";
    } else {
      // 로그인, 온보딩, 성향 분석 등 풀스크린 뷰에서는 숨겨서 몰입도 상승
      tabbar.style.display = "none";
      header.style.display = "none";
    }

    // 3. 타겟 뷰 활성화
    const targetViewId = hash.replace("#", "") + "-view";
    const targetView = document.getElementById(targetViewId);
    if (targetView) {
      targetView.classList.add("active");
      
      // 개별 뷰가 열릴 때 실행해야 하는 초기화 코드 연동
      this.onViewReady(hash);
    }
  },

  /**
   * 각 화면이 브라우저에 마운트(활성화)되었을 때 비즈니스 콜백
   */
  onViewReady: function(hash) {
    if (hash === "#home") {
      this.renderHomePlans();
      this.renderAIRecommendSection();
    } else if (hash === "#chat") {
      this.initChatSession();
    } else if (hash === "#map") {
      this.initMapScreen();
    } else if (hash === "#community") {
      this.renderCommunity();
    } else if (hash === "#mypage") {
      this.renderMyPage();
    }
  },

  /**
   * 1. 로그인 뷰 로직 및 SNS 로그인 원형 버튼 바인딩
   */
  handleLogin: function(username, password) {
    if (!username || !password) {
      Components.showToast("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    
    // 간편 로그인
    AppState.user.isLoggedIn = true;
    AppState.user.name = username.split("@")[0] + " 여행자";
    this.saveToStorage();
    
    Components.showToast(`환영합니다! ${AppState.user.name}님`);
    
    // 온보딩으로 진입
    window.location.hash = "#onboarding";
  },

  handleGuestStart: function() {
    AppState.user.isLoggedIn = false;
    AppState.user.name = "비회원 여행자";
    this.saveToStorage();
    
    Components.showToast("비회원으로 여행 플래너를 시작합니다.");
    window.location.hash = "#onboarding";
  },

  /**
   * 2. 온보딩 STEP 전환 및 취향 태그 선택
   */
  nextOnboardingStep: function(nextStep) {
    const s1 = document.getElementById("onb-step-1");
    const s2 = document.getElementById("onb-step-2");
    const fill = document.querySelector(".onboarding-progress-fill");

    if (nextStep === 2) {
      s1.classList.remove("active");
      s2.classList.add("active");
      fill.style.width = "100%";
    } else {
      s2.classList.remove("active");
      s1.classList.add("active");
      fill.style.width = "50%";
    }
  },

  toggleOnboardingTag: function(tagChip, tagValue) {
    tagChip.classList.toggle("selected");
    
    const idx = AppState.onboarding.tags.indexOf(tagValue);
    if (idx > -1) {
      AppState.onboarding.tags.splice(idx, 1);
    } else {
      AppState.onboarding.tags.push(tagValue);
    }
  },

  addCustomTag: function() {
    const input = document.getElementById("other-tag-input");
    const val = input.value.trim();
    if (!val) return;

    if (AppState.onboarding.tags.includes(val)) {
      Components.showToast("이미 선택된 태그입니다.");
      input.value = "";
      return;
    }

    // 상태 추가
    AppState.onboarding.tags.push(val);

    // 태그 리스트에 칩 추가
    const tagsGrid = document.querySelector(".tags-container");
    const chip = document.createElement("div");
    chip.className = "tag-chip selected";
    chip.innerText = `#${val}`;
    chip.addEventListener("click", () => this.toggleOnboardingTag(chip, val));
    
    // '기타' 칩 앞에 삽입
    const otherChip = document.getElementById("tag-other-trigger");
    tagsGrid.insertBefore(chip, otherChip);

    input.value = "";
    document.querySelector(".other-input-container").style.display = "none";
    Components.showToast(`태그 [${val}] 추가 완료!`);
  },

  /**
   * 3. AI 채팅 서비스 및 규칙 엄격 준수
   */
  initChatSession: function() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    // 만약 이미 세션이 진행 중이라면 유지, 비어 있으면 온보딩 기반 첫 대화 시작
    if (AppState.chatSession.history.length === 0) {
      container.innerHTML = "";
      
      const destText = AppState.onboarding.destination ? `[📍${AppState.onboarding.destination}]` : "[무작정 힐링]";
      const tagsText = AppState.onboarding.tags.length > 0 ? ` #${AppState.onboarding.tags.join(" #")}` : "";

      const welcomeMsg = `안녕하세요! 당신만을 위한 여행 취향 분석 전문 가이드 AI 플래너입니다. 🧭\n현재 ${destText}${tagsText} 성향을 바탕으로 최적의 설계를 구성 중입니다.\n\n정교한 동선을 만들기 전에 몇 가지 궁금한 점이 있어요. 혹시 이번 여행은 누구와 함께 가시나요? (가족, 연인, 친구 혹은 혼자만의 쉼 등)`;
      
      AppState.chatSession.history.push({ sender: 'ai', text: welcomeMsg });
      AppState.chatSession.gauge = 15;
      AppState.chatSession.isCompleted = false;
      
      this.appendMessageBubble('ai', welcomeMsg);
      this.updateChatProgress();
    } else {
      // 기존 히스토리 다시 렌더링
      container.innerHTML = "";
      AppState.chatSession.history.forEach(msg => {
        this.appendMessageBubble(msg.sender, msg.text);
      });
      this.updateChatProgress();
    }
  },

  appendMessageBubble: function(sender, text) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    const bubble = Components.createChatBubble(sender, text);
    container.appendChild(bubble);
    
    // 자동 하단 스크롤
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  },

  sendUserMessage: async function() {
    const input = document.getElementById("chat-user-input");
    const text = input.value.trim();
    if (!text) return;

    // 1. 유저 메시지 기록
    AppState.chatSession.history.push({ sender: 'user', text: text });
    this.appendMessageBubble('user', text);
    input.value = "";

    // 2. 분석 진척 게이지 상승
    AppState.chatSession.gauge = AIEngine.calculateGauge(AppState.chatSession.history, AppState.onboarding.tags);
    this.updateChatProgress();

    // 타이핑 로딩 버블 임시 표출
    const container = document.getElementById("chat-messages-container");
    const typingBubble = document.createElement("div");
    typingBubble.className = "message-bubble ai";
    typingBubble.innerHTML = `<span style="opacity: 0.6; font-size:12.5px;">🤖 PINROUTE AI 분석 중... 💬</span>`;
    container.appendChild(typingBubble);
    container.scrollTop = container.scrollHeight;

    // 3. AI 답변 생성 (진짜 구글 Gemini API 비동기 실시간 호출)
    try {
      let aiResponse = await this.callGeminiAPI(text, AppState.chatSession.history);

      // API 장애 혹은 키 누락 시 백업 모킹 엔진 작동
      if (!aiResponse) {
        aiResponse = AIEngine.generateAIResponse(text, AppState.chatSession.history, AppState.onboarding.tags);
      }

      // AI 규칙 검증 및 강제 보정 (혹여나 종결문구가 들어가거나 버튼 누르라는 표현 방어)
      aiResponse = this.applyAIRuleFilters(aiResponse);

      // 타이핑 로더 제거 후 진짜 응답 출력
      typingBubble.remove();

      AppState.chatSession.history.push({ sender: 'ai', text: aiResponse });
      this.appendMessageBubble('ai', aiResponse);

      // 게이지가 60% 이상이면 '최적 여행 동선 만들기' 플로팅 버튼 등장!
      if (AppState.chatSession.gauge >= 60) {
        document.getElementById("floating-gen-btn").classList.add("show");
      }
    } catch (e) {
      typingBubble.remove();
      console.error("PINROUTE Chat handling error", e);
    }
  },

  /**
   * 구글 Gemini AI API 직접 비동기 호출 브릿지
   */
  callGeminiAPI: async function(prompt, chatHistory) {
    const apiKey = (window.CONFIG && window.CONFIG.VITE_GEMINI_API_KEY) || "";
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey.includes("API_KEY")) {
      return null;
    }

    try {
      const systemInstruction = `너는 여행 계획 통합 플랫폼 "PINROUTE"의 친근한 여행 가이드 AI야.
목표: 사용자가 편안하게 이야기하도록 이끌며, 정중하지만 딱딱하지 않은 대화체로 여행 취향을 깊게 파악하는 것이다.
응답 스타일:
- 딱딱한 보고서형 문장은 피하고, 친구에게 이야기하듯 부드럽고 자연스럽게 말해라.
- 사용자의 감정을 공감하고, 작은 칭찬이나 이해의 표현을 넣어라.
- 최대한 질문 형태로 마무리해서 대화가 계속되게 만들어라.
행동 규칙:
1. 절대 대화가 완료되었다거나 조사가 끝났다는 표현("조사가 끝났습니다", "감사합니다", "완료되었습니다" 등)을 쓰지 마라.
2. 버튼을 누르라거나 다음 단계로 이동하라는 UI 관련 안내를 하지 마라.
3. 이전에 이미 물어본 내용을 그대로 반복하지 말고 자연스러운 꼬리질문을 이어가라.
4. 사용자가 쉽게 답할 수 있도록 구체적인 예시를 섞어 질문하되 부담스럽지 않게 하라.
현재 사용자의 목적지: ${AppState.onboarding.destination || '미정'}, 관심 취향 태그: ${AppState.onboarding.tags.join(", ") || '없음'}`;

      const contents = [
        {
          role: 'system',
          parts: [{ text: systemInstruction }]
        }
      ];
      chatHistory.forEach(h => {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'assistant',
          parts: [{ text: h.text }]
        });
      });

      // 가장 최근 user 메시지에 지시사항 강제 병입
      if (contents.length > 0) {
        const lastMsg = contents[contents.length - 1];
        if (lastMsg.role === 'user') {
          lastMsg.parts[0].text = `[지시사항: 아래 규칙을 100% 엄수해 대답해줘]\n${systemInstruction}\n\n사용자 메시지: ${prompt}`;
        }
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            candidateCount: 1
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("PINROUTE [Gemini API] non-OK response:", response.status, errText);
        return null;
      }

      const data = await response.json();
      const reply = data.candidates[0].content.parts[0].text;
      return reply;
    } catch (e) {
      console.error("PINROUTE [Gemini API] call failed.", e);
      return null;
    }
  },

  /**
   * AI 규칙 강제 필터
   */
  applyAIRuleFilters: function(text) {
    let clean = text;
    // 1. 금지: 대화 종료 표현 강제 치환
    clean = clean.replace(/조사가 끝났습니다|감사합니다|완료되었습니다|수고하셨습니다/g, "당신에 대해 한 걸음 더 알아가게 되어 기뻐요.");
    // 2. 금지: UI 관련 행동 유도 치환
    clean = clean.replace(/버튼을 눌러주세요|다음 단계로 이동하세요|아래 클릭/g, "함께 이야기를 좀 더 나누어 보아요.");
    
    // 3. 항상 끝은 질문으로 끝나게 강제 보정
    if (!clean.endsWith("?") && !clean.endsWith("요")) {
      clean += " 이 점에 대해서는 어떻게 생각하시나요?";
    }
    return clean;
  },

  updateChatProgress: function() {
    const fill = document.getElementById("chat-gauge-fill");
    const num = document.getElementById("chat-gauge-num");
    if (fill) fill.style.width = `${AppState.chatSession.gauge}%`;
    if (num) num.innerText = `${AppState.chatSession.gauge}%`;
  },

  /**
   * 4. 성향 분석 리포트 및 3대 대안 추천
   */
  buildAnalysisReport: function() {
    // 온보딩과 채팅 데이터 기반 3대 대안 생성
    const dest = AppState.onboarding.destination || "제주";
    const report = AIEngine.analyzePersona(AppState.onboarding.tags, AppState.chatSession.history);
    
    document.getElementById("report-persona-badge").innerText = report.title;
    document.getElementById("report-persona-title").innerText = `"${report.title}"`;
    document.getElementById("report-persona-desc").innerText = report.desc;

    // 취향 태그 칩 빌딩
    this.renderAnalysisTags();

    // 3대 추천안 생성 및 렌더링
    const plans = AIEngine.generateThreePlans(dest, AppState.onboarding.tags, AppState.chatSession.history);
    this.recommendPlans = plans; // 임시 저장

    const container = document.getElementById("plans-options-container");
    container.innerHTML = "";

    // 1안 기본 선택
    this.selectedRecommendPlan = plans[0];

    plans.forEach((plan, idx) => {
      const card = Components.createOptionCard(plan, idx === 0, (selected) => {
        this.selectedRecommendPlan = selected;
        // 기존 카드 해제 후 선택 표시
        document.querySelectorAll(".option-card").forEach((c, cidx) => {
          c.classList.toggle("selected", cidx === idx);
        });
      });
      container.appendChild(card);
    });

    window.location.hash = "#analysis";
  },

  renderAnalysisTags: function() {
    const tagLayer = document.getElementById("analysis-tags-layer");
    if (!tagLayer) return;

    tagLayer.innerHTML = "";
    if (AppState.onboarding.tags.length === 0) {
      AppState.onboarding.tags = ["힐링", "자연", "쉼"];
    }

    AppState.onboarding.tags.forEach(tag => {
      const chip = Components.createEditableTag(tag, (deletedTag) => {
        // 태그 삭제 상태 반영
        const idx = AppState.onboarding.tags.indexOf(deletedTag);
        if (idx > -1) {
          AppState.onboarding.tags.splice(idx, 1);
          Components.showToast(`취향 [#${deletedTag}]이 삭제되었습니다.`);
          
          // 실시간으로 3대 대안 계획의 타이틀/추천사유 태그 등을 간접 재조정
          this.renderAnalysisTags();
        }
      });
      tagLayer.appendChild(chip);
    });
  },

  /**
   * 분석 보완 기능: 추가 고난도 2차 질문
   */
  openSupplementaryModal: function() {
    // 겹치지 않는 보완 질문 무작위 선택
    const randQ = AIEngine.supplementaryQuestions[Math.floor(Math.random() * AIEngine.supplementaryQuestions.length)];
    
    const container = document.body;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.id = "supp-modal-overlay";
    overlay.style.zIndex = "1005";

    overlay.innerHTML = `
      <div class="detail-modal" style="transform: translateY(0); padding: 28px 24px;">
        <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 12px; color: var(--dark);">🔍 상세 분석 보완 질문</h4>
        <p style="font-size: 13.5px; line-height:1.5; color: var(--dark-gray); margin-bottom: 16px;">
          더 정확한 맞춤 코스를 조율하기 위해 추가 조사를 시작합니다. 아래 질문에 대한 힌트를 적어주세요.
        </p>
        <div style="background-color: var(--primary-soft); padding: 14px; border-radius: 12px; font-size:13.5px; font-weight: 600; color: var(--primary); margin-bottom: 16px;">
          Q. ${randQ}
        </div>
        <textarea id="supp-answer-text" placeholder="예: 무조건 늦잠 자고 밤 바다 야경을 즐기는 스타일이에요!" style="width: 100%; height: 80px; border: 1.5px solid var(--light-gray); border-radius: 12px; padding: 12px; font-size:13px; outline:none; margin-bottom: 20px; resize:none;"></textarea>
        
        <button id="supp-submit-btn" class="primary-btn">분석 갱신 완료</button>
      </div>
    `;

    container.appendChild(overlay);

    const submitBtn = overlay.querySelector("#supp-submit-btn");
    submitBtn.addEventListener("click", () => {
      const ans = overlay.querySelector("#supp-answer-text").value.trim();
      if (ans) {
        // AI 채팅 히스토리에 주입하여 페르소나 및 정밀 튜닝 학습
        AppState.chatSession.history.push({ sender: 'user', text: `[보완답변] ${ans}` });
        
        // 칩 태그 꼬리 키워드 매칭 인젝션
        if (ans.includes("야경") || ans.includes("밤")) AppState.onboarding.tags.push("야경");
        if (ans.includes("여유") || ans.includes("천천히")) AppState.onboarding.tags.push("쉼");
        if (ans.includes("현지인") || ans.includes("노포")) AppState.onboarding.tags.push("숨은노포");

        this.renderAnalysisTags();
        Components.showToast("동선 보정 알고리즘이 성공적으로 적용되었습니다!");
      }
      overlay.remove();
    });

    // 바깥 영역 터치 시 닫기
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  },

  /**
   * 5. 지도 및 일정 리스트 & 실시간 핀 동기화 편집
   */
  initMapScreen: function() {
    if (!this.selectedRecommendPlan && !AppState.currentPlan) {
      // 만약 계획을 고르지 않고 지도로 바로 왔다면 기본 생성된 3대 계획 중 1안 로딩
      const dest = AppState.onboarding.destination || "제주";
      const plans = AIEngine.generateThreePlans(dest, AppState.onboarding.tags, AppState.chatSession.history);
      this.selectedRecommendPlan = plans[0];
    }

    if (this.selectedRecommendPlan && (!AppState.currentPlan || !AppState.currentPlan.schedule || AppState.currentPlan.schedule.length === 0 || AppState.currentPlan.title !== this.selectedRecommendPlan.title)) {
      // 선택된 추천 플랜이 있고 현재 계획이 비어 있거나 다른 플랜이면 추천 플랜을 로드
      AppState.currentPlan = JSON.parse(JSON.stringify(this.selectedRecommendPlan));
    } else if (!AppState.currentPlan) {
      AppState.currentPlan = { title: '나만의 자유 지도 일정', schedule: [] };
    }

    AppState.mapFilters = { activeCategory: 'all', searchKeyword: '' };
    AppState.mapSearchResults = [];
    
    this.refreshMapAndTimeline();
  },

  refreshMapAndTimeline: function() {
    const plan = AppState.currentPlan;
    if (!plan) return;

    const planToRender = {
      ...plan,
      schedule: plan.schedule || []
    };

    // 1. 지도 핀 초기화 & 로딩
    MapModule.initMap("map-container-layer", planToRender, 
      (clickedSpot) => {
        this.openSpotDetailModal(clickedSpot);
      },
      (clickedLat, clickedLng) => {
        this.openCustomPinRegisterModal(clickedLat, clickedLng);
      }
    );

    // 2. 바텀 시트 일정 리스트 렌더링
    this.renderTimelineList();
    this.renderSearchResults();
  },

  getFilteredMapSpots: function() {
    const plan = AppState.currentPlan;
    if (!plan || !plan.schedule) return [];

    const keyword = (AppState.mapFilters.searchKeyword || "").trim().toLowerCase();
    return plan.schedule.filter(spot => {
      const matchesCategory = AppState.mapFilters.activeCategory === 'all' || spot.type === AppState.mapFilters.activeCategory;
      const matchesKeyword = !keyword ||
        spot.name.toLowerCase().includes(keyword) ||
        (spot.desc || '').toLowerCase().includes(keyword) ||
        this.mapTypeLabel(spot.type).includes(keyword);
      return matchesCategory && matchesKeyword;
    });
  },

  mapTypeLabel: function(type) {
    if (type === 'food') return '맛집';
    if (type === 'spot') return '핫플';
    if (type === 'convenience') return '편의점';
    if (type === 'hotel') return '숙소';
    return type || '';
  },

  limitResults: function(results, limit = 20, randomize = false) {
    if (!Array.isArray(results) || results.length === 0) return [];
    let sliced = results;
    if (randomize && results.length > limit) {
      sliced = results.slice();
      for (let i = sliced.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sliced[i], sliced[j]] = [sliced[j], sliced[i]];
      }
    }
    return sliced.slice(0, limit);
  },

  buildFallbackSearchResults: function(keyword, category = 'all') {
    if (!keyword) return [];
    const lowered = keyword.toLowerCase();
    return (AppState.currentPlan?.schedule || [])
      .filter(spot => {
        const matchText = spot.name.toLowerCase().includes(lowered) ||
          (spot.desc || '').toLowerCase().includes(lowered) ||
          this.mapTypeLabel(spot.type).toLowerCase().includes(lowered);
        const matchCategory = category === 'all' || spot.type === category;
        return matchText && matchCategory;
      })
      .map(spot => ({
        id: spot.id,
        title: spot.name,
        address: spot.desc || '',
        category: this.mapTypeLabel(spot.type),
        lat: spot.lat,
        lng: spot.lng,
        internalSpot: spot
      }));
  },

  buildTemporarySpotFromSearchResult: function(result) {
    const mappedType = this.getTypeFromCategoryString(result.category || '');
    return {
      id: `search_${Date.now()}`,
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      desc: result.address || '지도에서 검색한 장소입니다.',
      type: mappedType,
      external: '길찾기',
      rating: '4.5',
      time: '원하는 시간대에 추가하세요',
      duration: '1.5시간',
      reviews: [{ user: '지도 검색', text: '검색 결과로 추가한 장소입니다.', stars: '★★★★' }],
      reason: '지도에서 선택한 장소를 통해 자유롭게 나만의 동선을 만들 수 있습니다.'
    };
  },

  getTypeFromCategoryString: function(category) {
    if (category.includes('맛집') || category.includes('카페') || category.includes('식당')) return 'food';
    if (category.includes('편의점') || category.includes('마트')) return 'convenience';
    if (category.includes('숙박') || category.includes('호텔') || category.includes('게스트하우스')) return 'hotel';
    return 'spot';
  },

  performMapSearch: function() {
    const keyword = (AppState.mapFilters.searchKeyword || '').trim();
    const category = AppState.mapFilters.activeCategory || 'all';

    // 카테고리 선택 + 키워드 없음 → 주변 검색 실행 (자유 모드 여부 무관)
    if (category !== 'all' && !keyword) {
      this._showNearbySearchLoading(category);
      MapModule.searchNearbyByCategory(category, (results) => {
        AppState.mapSearchResults = results;
        this.renderSearchResults();
      }, { limit: 20 });
      return;
    }

    if (!keyword && category === 'all') {
      AppState.mapSearchResults = [];
      MapModule.clearSearchMarkers();
      this.renderSearchResults();
      return;
    }

    if (!MapModule.isMockMode && window.kakao && window.kakao.maps) {
      if (keyword) {
        MapModule.searchPlaces(keyword, (results) => {
          AppState.mapSearchResults = this.limitResults(results, 20, false);
          this.renderSearchResults();
        });
      } else {
        MapModule.searchNearbyByCategory(category, (results) => {
          AppState.mapSearchResults = this.limitResults(results, 20, true);
          this.renderSearchResults();
        });
      }
    } else {
      if (keyword) {
        AppState.mapSearchResults = this.limitResults(this.buildFallbackSearchResults(keyword, category), 20, false);
      } else if (category !== 'all') {
        // Mock 모드 카테고리 검색 → 가상 주변 데이터
        AppState.mapSearchResults = this.limitResults(
          MapModule._generateMockNearbyData(category, MapModule.nearbySearchCenter || { lat: 33.5056213, lng: 126.5311884 }, 20),
          20, false
        );
      } else {
        AppState.mapSearchResults = this.limitResults(this.getFilteredMapSpots().map(spot => ({
          id: spot.id,
          title: spot.name,
          address: spot.desc || '',
          category: this.mapTypeLabel(spot.type),
          lat: spot.lat,
          lng: spot.lng,
          internalSpot: spot
        })), 20, true);
      }
      this.renderSearchResults();
    }
  },

  /**
   * 바텀 시트를 자동으로 펼치는 헬퍼
   */
  _expandBottomSheet: function() {
    const sheet = document.querySelector('.bottom-sheet');
    if (sheet && !sheet.classList.contains('expanded')) {
      sheet.classList.add('expanded');
    }
  },

  /**
   * 주변 검색 실행 중 로딩 UI 표시
   */
  _showNearbySearchLoading: function(category) {
    this._expandBottomSheet(); // 바텀 시트 자동 펼치기
    const list = document.getElementById('map-search-results-list');
    const header = document.getElementById('map-search-results-header');
    const label = this.mapTypeLabel(category);
    if (header) header.innerText = `📍 ${label} 주변 검색 중...`;
    if (list) list.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--primary); font-size: 13px; font-weight: 600; animation: pulse 1.2s infinite;">
        🔍 ${label} 주변 장소를 불러오는 중...
      </div>
    `;
  },

  updateMapSearch: function() {
    this.refreshMapAndTimeline();
    this.performMapSearch();
  },

  renderSearchResults: function() {
    const list = document.getElementById('map-search-results-list');
    const header = document.getElementById('map-search-results-header');
    if (!list || !header) return;

    const keyword = (AppState.mapFilters.searchKeyword || '').trim();
    const category = AppState.mapFilters.activeCategory;
    const isFiltered = keyword || category !== 'all';
    const isNearbyMode = category !== 'all' && !keyword;
    let results = [];

    if (AppState.mapSearchResults.length) {
      results = AppState.mapSearchResults;
    } else if (keyword) {
      results = this.buildFallbackSearchResults(keyword, category);
    } else if (category !== 'all') {
      results = this.getFilteredMapSpots().map(spot => ({
        id: spot.id,
        title: spot.name,
        address: spot.desc || '',
        category: this.mapTypeLabel(spot.type),
        lat: spot.lat,
        lng: spot.lng,
        internalSpot: spot
      }));
    }

    if (!keyword && !isFiltered) {
      header.innerText = '검색 결과';
      list.innerHTML = '<div class="empty-state" style="padding: 16px; border-radius: 16px; background: rgba(247,247,247,0.95); font-size:13px;">📍 카테고리를 선택하면 현위치 주변 장소를 검색합니다.</div>';
      return;
    }

    if (results.length === 0) {
      header.innerText = `검색 결과 0건`;
      list.innerHTML = '<div class="empty-state" style="padding: 16px; border-radius: 16px; background: rgba(247,247,247,0.95); font-size:13px;">검색어와 일치하는 장소가 없습니다.</div>';
      return;
    }

    // 결과가 있으면 바텀 시트 자동 펼치기
    this._expandBottomSheet();

    const categoryLabel = this.mapTypeLabel(category);
    if (isNearbyMode) {
      header.innerHTML = `<span style="color:var(--primary);">📍 현위치 주변</span> ${categoryLabel} ${results.length}곳`;
    } else {
      header.innerText = `검색 결과 ${results.length}건`;
    }
    list.innerHTML = '';

    results.slice(0, 20).forEach(result => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'search-result-card' + (isNearbyMode ? ' nearby-result-card' : '');
      const distanceBadge = result.distance
        ? `<span class="result-distance-badge">${result.distance}</span>`
        : '';
      const emoji = result.emoji ? `${result.emoji} ` : '';
      card.innerHTML = `
        <div class="result-title">${emoji}${result.title || result.name}</div>
        <div class="result-meta">
          <span>${result.address || '위치 정보 없음'}</span>
          <div style="display:flex;gap:4px;align-items:center;">
            ${distanceBadge}
            <span class="result-label">${result.category || '검색 결과'}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (result.internalSpot) {
          this.openSpotDetailModal(result.internalSpot);
        } else if (result.lat && result.lng) {
          this.openSpotDetailModal(this.buildTemporarySpotFromSearchResult(result));
        } else {
          Components.showToast(`${result.title || result.name}을(를) 지도로 표시합니다.`);
        }
      });

      list.appendChild(card);
    });
  },
  startFreeMapMode: function() {
    AppState.currentPlan = { title: '나만의 자유 지도 일정', schedule: [] };
    AppState.mapFilters = { activeCategory: 'all', searchKeyword: '' };
    AppState.mapSearchResults = [];
    AppState.isFreeMapMode = true;

    // 카테고리 칩 전체 비활성 효과
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.category-chip[data-type="all"]')?.classList.add('active');

    Components.showToast('📍 자유 선택 모드! 카테고리를 선택하면 주변 장소를 검색합니다.');
    this.refreshMapAndTimeline();
  },

  openCustomPinRegisterModal: function(lat, lng) {
    const container = document.body;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.id = "custom-pin-modal-overlay";
    overlay.style.zIndex = "1005";

    // 직전 마지막 시각 가져오기 (시간 자동 제안)
    const spots = AppState.currentPlan.schedule;
    let suggestedTime = "15:00 - 16:30";
    if (spots.length > 0) {
      const lastSpot = spots[spots.length - 1];
      const lastTime = lastSpot.time.split("-").pop().trim();
      if (lastTime.includes(":") && !lastTime.includes("체크인")) {
        const parts = lastTime.split(":");
        const hour = parseInt(parts[0]);
        suggestedTime = `${hour + 1}:00 - ${hour + 2}:30`;
      }
    }

    overlay.innerHTML = `
      <div class="detail-modal" style="transform: translateY(0); padding: 24px;">
        <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 12px; color: var(--dark);">📌 나만의 커스텀 핀 직접 꽂기</h4>
        <p style="font-size: 12.5px; line-height: 1.4; color: var(--medium-gray); margin-bottom: 16px;">
          지도상에서 클릭한 좌표에 원하는 나만의 맞춤 일정을 직접 등록해 내 여행 동선에 끼워넣습니다.
        </p>
        
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom: 20px;">
          <div>
            <label style="font-size: 12px; font-weight:700; color:var(--medium-gray); display:block; margin-bottom:4px;">장소명 입력</label>
            <input type="text" id="custom-spot-name" placeholder="예: 한적한 애월 해변 카페" style="width: 100%; height: 44px; border: 1.5px solid var(--light-gray); border-radius: 12px; padding: 0 12px; font-size:13px; outline:none; background-color: white; color: var(--dark);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight:700; color:var(--medium-gray); display:block; margin-bottom:4px;">시간대 설정</label>
            <input type="text" id="custom-spot-time" value="${suggestedTime}" style="width: 100%; height: 44px; border: 1.5px solid var(--light-gray); border-radius: 12px; padding: 0 12px; font-size:13px; outline:none; background-color: white; color: var(--dark);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight:700; color:var(--medium-gray); display:block; margin-bottom:4px;">장소 분류 선택</label>
            <select id="custom-spot-type" style="width: 100%; height: 44px; border: 1.5px solid var(--light-gray); border-radius: 12px; padding: 0 12px; font-size:13px; outline:none; background-color: white; color: var(--dark);">
              <option value="spot">🏞️ 일반 관광지</option>
              <option value="food">🍣 맛집 / 카페</option>
              <option value="convenience">🛒 편의점</option>
              <option value="hotel">🏨 숙소 / 숙박</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button id="custom-pin-cancel-btn" style="flex:1; height:48px; border-radius:14px; border:1px solid var(--light-gray); background-color: var(--bg-gray); color:var(--dark-gray); font-weight:700; cursor:pointer;">취소</button>
          <button id="custom-pin-submit-btn" class="primary-btn" style="flex:2; height:48px; border-radius:14px;">동선에 추가하기</button>
        </div>
      </div>
    `;

    container.appendChild(overlay);

    overlay.querySelector("#custom-pin-cancel-btn").onclick = () => overlay.remove();

    overlay.querySelector("#custom-pin-submit-btn").onclick = () => {
      const name = overlay.querySelector("#custom-spot-name").value.trim();
      const time = overlay.querySelector("#custom-spot-time").value.trim();
      const type = overlay.querySelector("#custom-spot-type").value;

      if (!name) {
        Components.showToast("장소명을 입력해 주세요.");
        return;
      }

      // 새 스케줄 핀 추가
      const newSpot = {
        id: `custom_spot_${Date.now()}`,
        name: `${AppState.onboarding.destination || '제주'} ${name}`,
        lat: lat,
        lng: lng,
        desc: "내가 직접 등록한 낭만적인 맞춤 장소입니다.",
        type: type,
        external: type === 'food' ? '식당 예약' : type === 'hotel' ? '숙소 예약' : '길찾기',
        rating: "5.0",
        time: time || "15:00 - 16:30",
        duration: "1.5시간",
        reviews: [{ user: "나만의 장소", text: "직접 등록한 소중한 장소!", stars: "★★★★★" }],
        reason: "여행자 본인이 직접 지도 좌표를 탐색하여 꽂은 커스텀 핀 일정입니다."
      };

      // 숙소 전(마지막 바로 직전)에 핀을 예쁘게 삽입
      const schedule = AppState.currentPlan.schedule;
      const insertIdx = Math.max(schedule.length - 1, 1);
      schedule.splice(insertIdx, 0, newSpot);

      Components.showToast(`[${name}]가 핀으로 지도에 직접 추가되었습니다.`);
      this.refreshMapAndTimeline();
      overlay.remove();
    };
  },

  renderTimelineList: function() {
    const plan = AppState.currentPlan;
    const container = document.getElementById("timeline-list-container");
    if (!container || !plan) return;

    container.innerHTML = "";
    const filteredSpots = this.getFilteredMapSpots();
    const isFiltering = AppState.mapFilters.searchKeyword || AppState.mapFilters.activeCategory !== 'all';
    const spots = filteredSpots.length ? filteredSpots : (isFiltering ? [] : plan.schedule);

    document.getElementById("sheet-spots-count").innerText = `총 장소 ${spots.length}곳`;

    if (spots.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding: 24px; border-radius: 20px; background: rgba(247,247,247,0.95); margin: 10px 0; text-align:center; font-size:13px;">필터에 맞는 일정이 없습니다. 검색어를 바꾸거나 카테고리를 전체로 되돌려주세요.</div>';
      return;
    }

    spots.forEach((spot, idx) => {
      const item = Components.createTimelineItem(
        spot,
        idx,
        spots.length,
        (upIdx) => {
          this.swapTimelineSpots(upIdx, upIdx - 1);
        },
        (downIdx) => {
          this.swapTimelineSpots(downIdx, downIdx + 1);
        },
        (delIdx) => {
          this.deleteTimelineSpot(delIdx);
        },
        (clickedSpot) => {
          this.openSpotDetailModal(clickedSpot);
        }
      );
      container.appendChild(item);
    });
  },

  swapTimelineSpots: function(idx1, idx2) {
    const spots = AppState.currentPlan.schedule;
    const temp = spots[idx1];
    spots[idx1] = spots[idx2];
    spots[idx2] = temp;

    Components.showToast("일정 순서가 조정되었습니다.");
    this.refreshMapAndTimeline();
  },

  deleteTimelineSpot: function(idx) {
    const spots = AppState.currentPlan.schedule;
    const deletedName = spots[idx].name.split(" ").slice(-1)[0];
    spots.splice(idx, 1);

    Components.showToast(`[${deletedName}] 장소가 제외되었습니다.`);
    this.refreshMapAndTimeline();
  },

  /**
   * 핀 고정 기능: 지도 위 추천 장소를 임의로 클릭했을 때 상세 팝업에서 "경로에 추가"
   */
  addSpotToCurrentRoute: function(newSpot) {
    if (!AppState.currentPlan) return;
    
    // 이미 추가되어 있는지 검증
    const exists = AppState.currentPlan.schedule.some(s => s.name === newSpot.name);
    if (exists) {
      Components.showToast("이미 여행 경로에 등록되어 있는 장소입니다.");
      return;
    }

    // 뒤에 추가하고 숙소(체크인) 전인 4번째 자리에 예쁘게 끼워넣음
    const schedule = AppState.currentPlan.schedule;
    const insertIdx = Math.max(schedule.length - 1, 1);
    schedule.splice(insertIdx, 0, newSpot);

    Components.showToast(`[${newSpot.name.split(" ").slice(-1)[0]}]가 경로에 추가되었습니다.`);
    this.refreshMapAndTimeline();
  },

  /**
   * 장소 상세 모달 팝업 렌더링
   */
  openSpotDetailModal: function(spot) {
    const overlay = document.getElementById("spot-detail-overlay");
    if (!overlay) return;

    // 장소 테마에 맞는 이모지 썸네일
    let thumEmoji = "📍";
    if (spot.type === 'food') thumEmoji = "🍣";
    else if (spot.type === 'hotel') thumEmoji = "🏨";
    else if (spot.type === 'spot') thumEmoji = "🔥";
    else if (spot.type === 'convenience') thumEmoji = "🛒";
    else if (spot.type === 'start') thumEmoji = "🚩";

    document.getElementById("modal-thum-emoji").innerText = thumEmoji;
    document.getElementById("modal-spot-name").innerText = spot.name;
    document.getElementById("modal-rating").innerText = spot.rating || "4.7";
    document.getElementById("modal-reviews-count").innerText = `후기 ${spot.reviews ? spot.reviews.length : 1}개`;
    document.getElementById("modal-desc").innerText = spot.desc;
    document.getElementById("modal-ai-reason-text").innerText = spot.reason || "사용자의 맞춤 성향과 꼭 맞아서 강력 추천드립니다.";
    
    document.getElementById("modal-hours").innerText = spot.time || "09:00 - 18:00";
    document.getElementById("modal-address").innerText = `${AppState.onboarding.destination || '제주'} 로컬 스팟`;

    // 외부 예약 연동 서비스 타이틀 매핑
    const extBtn = document.getElementById("modal-external-btn");
    extBtn.innerText = `🔗 ${spot.external || '예약 바로가기'}`;
    
    // 버튼 클릭 시 외부 서비스 호출 모킹 시뮬레이션
    extBtn.onclick = () => {
      Components.showToast(`[${spot.name.split(" ").slice(-1)[0]}] ${spot.external} 페이지로 이동합니다.`);
    };

    // "경로에 추가" 핀 고정 버튼 구성
    const pinPinBtn = document.getElementById("modal-pin-lock-btn");
    const isAlreadyAdded = AppState.currentPlan.schedule.some(s => s.name === spot.name);
    
    if (isAlreadyAdded) {
      pinPinBtn.style.backgroundColor = "var(--medium-gray)";
      pinPinBtn.innerText = "✓ 경로에 등록 완료";
      pinPinBtn.disabled = true;
    } else {
      pinPinBtn.style.backgroundColor = "var(--primary)";
      pinPinBtn.innerText = "📌 이 핀 고정 및 내 경로에 추가";
      pinPinBtn.disabled = false;
      pinPinBtn.onclick = () => {
        this.addSpotToCurrentRoute(spot);
        overlay.classList.remove("active");
      };
    }

    overlay.classList.add("active");
  },

  /**
   * 6. 계획 저장 & 내보내기 모듈 (Google Sheets CSV 완벽 지원)
   */
  saveCurrentPlan: function() {
    if (!AppState.currentPlan) return;

    // 동일한 타이틀 중복 저장 방지
    const exists = AppState.savedPlans.some(p => p.title === AppState.currentPlan.title);
    if (exists) {
      Components.showToast("이미 마이페이지/홈에 보존된 계획입니다.");
      return;
    }

    AppState.savedPlans.unshift(JSON.parse(JSON.stringify(AppState.currentPlan)));
    this.saveToStorage();

    Components.showToast("🎉 여행 계획이 안전하게 저장되었습니다!");
    
    // 홈 화면 목록 리플레시 후 홈 탭 이동
    this.renderHomePlans();
    window.location.hash = "#home";
  },

  openExportModal: function() {
    const overlay = document.getElementById("export-modal-overlay");
    if (overlay) overlay.classList.add("active");
  },

  exportPlan: function(format) {
    const plan = AppState.currentPlan;
    if (!plan) return;

    const overlay = document.getElementById("export-modal-overlay");
    if (overlay) overlay.classList.remove("active");

    if (format === 'csv') {
      this.downloadCSV(plan);
    } else if (format === 'timetable') {
      this.showTimetableModal(plan);
    } else if (format === 'list') {
      this.showTextListModal(plan);
    }
  },

  /**
   * Google Sheets 형식 표 .CSV 파일 실제 다운로드
   */
  downloadCSV: function(plan) {
    // CSV 헤더 및 행 구성 (BOM 추가하여 엑셀 한글 깨짐 완전 방지)
    let csvContent = "\uFEFF";
    csvContent += "순서,일정 시각,장소명,카테고리,상세 설명,별점\r\n";

    plan.schedule.forEach((spot, index) => {
      const name = spot.name.replace(/,/g, " ");
      const desc = spot.desc.replace(/,/g, " ");
      const cat = spot.type === 'food' ? '식당/카페' : spot.type === 'hotel' ? '숙소' : '관광지';
      csvContent += `${index + 1},${spot.time},${name},${cat},${desc},${spot.rating}\r\n`;
    });

    // 다운로드 실행
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PINROUTE_${plan.destination}_여행일정표.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Components.showToast("💾 Google Sheets용 CSV가 다운로드되었습니다.");
  },

  showTimetableModal: function(plan) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay active";
    modal.style.zIndex = "1006";

    let rowsHtml = "";
    plan.schedule.forEach((spot, idx) => {
      rowsHtml += `
        <div style="display:flex; border-bottom:1px solid var(--light-gray); padding:10px 0; font-size:12px;">
          <div style="width:70px; font-weight:700; color:var(--primary);">${spot.time}</div>
          <div style="flex:1;">
            <div style="font-weight:700;">${spot.name.split(" ").slice(-1)[0]}</div>
            <div style="color:var(--medium-gray); font-size:11px; margin-top:2px;">${spot.desc}</div>
          </div>
        </div>
      `;
    });

    modal.innerHTML = `
      <div class="detail-modal" style="transform:translateY(0); max-height:75%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h4 style="font-weight:800; font-size:16px;">📅 타임테이블 스케줄표</h4>
          <button class="modal-close-btn" style="position:static;" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div style="overflow-y:auto; flex:1; padding-right:4px;">
          <h3 style="font-size:14px; font-weight:700; margin-bottom:12px; color:var(--dark);">${plan.title}</h3>
          ${rowsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  showTextListModal: function(plan) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay active";
    modal.style.zIndex = "1006";

    let textStr = `[PINROUTE] ${plan.destination} 여행 일정표\n\n`;
    plan.schedule.forEach((spot, idx) => {
      textStr += `${idx + 1}. [${spot.time}] ${spot.name.split(" ").slice(-1)[0]} (${spot.type === 'food' ? '미식' : spot.type === 'hotel' ? '숙소' : '관광'})\n   - 내용: ${spot.desc}\n`;
    });

    modal.innerHTML = `
      <div class="detail-modal" style="transform:translateY(0);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h4 style="font-weight:800; font-size:16px;">📋 텍스트 목록형 복사</h4>
          <button class="modal-close-btn" style="position:static;" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <textarea style="width:100%; height:200px; border:1px solid var(--light-gray); border-radius:12px; font-family:monospace; font-size:11px; padding:12px; outline:none; resize:none;" readonly>${textStr}</textarea>
        <button class="primary-btn" style="margin-top:16px;" id="text-copy-btn">클립보드에 복사</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#text-copy-btn").addEventListener("click", () => {
      navigator.clipboard.writeText(textStr).then(() => {
        Components.showToast("복사 완료!");
        modal.remove();
      });
    });
  },

  /**
   * 7. 홈 화면 저장 계획 카드 및 추천 카드 렌더링
   */
  renderHomePlans: function() {
    const container = document.getElementById("home-saved-plans-container");
    if (!container) return;

    container.innerHTML = "";

    if (AppState.savedPlans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🗺️</div>
          <div class="empty-text">저장된 나만의 여행 계획이 없습니다.<br>AI 채팅에서 1초 만에 맞춤 동선을 뽑아보세요!</div>
        </div>
      `;
      return;
    }

    AppState.savedPlans.forEach(plan => {
      const card = Components.createPlanCard(plan, (clickedPlan) => {
        // 홈에서 저장된 계획 누르면 해당 계획으로 지도 세션 복원 및 지도 로딩
        this.selectedRecommendPlan = clickedPlan;
        AppState.currentPlan = JSON.parse(JSON.stringify(clickedPlan));
        window.location.hash = "#map";
      });
      container.appendChild(card);
    });
  },

  renderAIRecommendSection: function() {
    const list = document.getElementById("home-ai-recommends-list");
    if (!list) return;

    list.innerHTML = "";
    
    // 사용자 관심 기반 가상 추천 지역 매칭 (기본 '제주', '강릉' 등)
    const mockRecs = [
      { region: "강릉 솔향 계곡", reason: "자연 속 힐링을 추구하는 당신께 아침 안개가 물든 푸른 소나무 숲길을 강력 추천합니다.", type: "healing" },
      { region: "부산 광안대교 오션뷰", reason: "활기찬 도시 야경과 미식을 즐기는 성향이 도드라져 광안리 조개구이 해안 투어를 추천합니다.", type: "gourmet" }
    ];

    mockRecs.forEach(rec => {
      const card = document.createElement("div");
      card.className = "plan-card";
      
      let badgeEmoji = rec.type === 'healing' ? "🌱" : "🍣";

      card.innerHTML = `
        <div class="card-img-placeholder" style="background:linear-gradient(135deg, #81C784 0%, #2E7D32 100%)">
          🏞️
        </div>
        <div class="card-body">
          <div class="card-tag-row">
            <span class="card-tag">${badgeEmoji} AI 추천</span>
            <span class="card-tag">📍 ${rec.region}</span>
          </div>
          <h4 class="card-title">${rec.region} 테마 추천안</h4>
          <p class="card-desc">${rec.reason}</p>
        </div>
      `;

      card.addEventListener("click", () => {
        // 추천 지역 누르면 온보딩을 강제 해당 지역으로 세팅하고 즉시 생성 모션
        AppState.onboarding.destination = rec.region.split(" ")[0];
        AppState.onboarding.tags = rec.type === 'healing' ? ["힐링", "자연"] : ["맛집", "카페"];
        this.selectedRecommendPlan = null;
        window.location.hash = "#chat";
        Components.showToast(`[${AppState.onboarding.destination}] 맞춤 플래너 대화를 가동합니다.`);
      });

      list.appendChild(card);
    });
  },

  /**
   * 8. 커뮤니티 소셜 연동 렌더링
   */
  renderCommunity: function() {
    const container = document.getElementById("community-posts-container");
    if (!container) return;

    container.innerHTML = "";
    AppState.communityPosts.forEach(post => {
      const card = Components.createPostCard(
        post,
        // 좋아요 콜백
        (p) => {
          console.log("Post liked", p);
        },
        // 북마크 콜백
        (p) => {
          Components.showToast(p.isBookmarked ? "⭐️ 마이페이지 북마크 리스트에 보존되었습니다." : "북마크 해제.");
        },
        // 공유 콜백
        (p) => {
          Components.showToast(`🔗 [${p.title}] 링크가 클립보드에 복사되었습니다.`);
        }
      );
      container.appendChild(card);
    });
  },

  /**
   * 9. 마이페이지 렌더링 & 환경설정
   */
  renderMyPage: function() {
    document.getElementById("my-profile-name").innerText = AppState.user.name;
    document.getElementById("mypage-avatar-view").innerText = AppState.user.profilePic;
    document.getElementById("switch-darkmode").checked = AppState.settings.isDarkMode;
    document.getElementById("switch-premium").checked = AppState.settings.isPremium;
    document.getElementById("switch-noti").checked = AppState.settings.notifications;
  },

  toggleDarkMode: function(checked) {
    AppState.settings.isDarkMode = checked;
    this.saveToStorage();
    this.applySettings();
    Components.showToast(checked ? "🌙 다크 모드가 활성화되었습니다." : "☀️ 라이트 모드가 활성화되었습니다.");
  },

  togglePremium: function(checked) {
    AppState.settings.isPremium = checked;
    this.saveToStorage();
    
    const badge = document.getElementById("my-premium-badge");
    if (badge) {
      badge.innerText = checked ? "AI PREMIUM" : "AI FREE";
      badge.style.backgroundColor = checked ? "gold" : "var(--primary-soft)";
      badge.style.color = checked ? "var(--dark)" : "var(--primary)";
    }
    
    Components.showToast(checked ? "👑 AI 초고성능 프리미엄 엔진 가동 중" : "일반 모델 사용 중");
  },

  editProfileName: function() {
    const newName = prompt("변경할 새로운 사용자 이름을 입력하세요:", AppState.user.name);
    if (newName && newName.trim()) {
      AppState.user.name = newName.trim();
      
      // 아바타 첫 글자로 자동 변경
      AppState.user.profilePic = Array.from(AppState.user.name)[0];

      this.saveToStorage();
      this.renderMyPage();
      Components.showToast("프로필 정보가 업데이트되었습니다.");
    }
  },

  /**
   * 글로벌 엘리먼트 인터랙션 바인딩
   */
  bindEvents: function() {
    // 로그인 처리
    const loginBtn = document.getElementById("login-submit-btn");
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        const id = document.getElementById("login-username").value;
        const pw = document.getElementById("login-password").value;
        this.handleLogin(id, pw);
      });
    }

    // 비회원 시작
    const guestBtn = document.getElementById("login-guest-btn");
    if (guestBtn) {
      guestBtn.addEventListener("click", () => this.handleGuestStart());
    }

    // 온보딩 목적지 '예' / '아니오' 분기
    const destYes = document.getElementById("onb-dest-yes");
    const destNo = document.getElementById("onb-dest-no");
    if (destYes) {
      destYes.addEventListener("click", () => {
        AppState.onboarding.hasDestination = true;
        document.getElementById("onb-dest-selector-flow").style.display = "block";
        document.getElementById("onb-tags-selector-flow").style.display = "none";
        this.nextOnboardingStep(2);
      });
    }
    if (destNo) {
      destNo.addEventListener("click", () => {
        AppState.onboarding.hasDestination = false;
        AppState.onboarding.destination = "";
        document.getElementById("onb-dest-selector-flow").style.display = "none";
        document.getElementById("onb-tags-selector-flow").style.display = "block";
        this.nextOnboardingStep(2);
      });
    }

    // 온보딩 목적지 한글 칩 클릭
    const chips = document.querySelectorAll(".suggestion-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("selected"));
        chip.classList.add("selected");
        
        const destInput = document.getElementById("onb-dest-input");
        destInput.value = chip.getAttribute("data-val");
        AppState.onboarding.destination = destInput.value;
      });
    });

    const destInput = document.getElementById("onb-dest-input");
    if (destInput) {
      destInput.addEventListener("input", (e) => {
        AppState.onboarding.destination = e.target.value.trim();
      });
    }

    // 온보딩 태그 멀티 선택
    const tags = document.querySelectorAll(".tag-chip:not(#tag-other-trigger)");
    tags.forEach(chip => {
      const val = chip.getAttribute("data-val");
      chip.addEventListener("click", () => this.toggleOnboardingTag(chip, val));
    });

    // 온보딩 기타 태그 수동 추가 트리거
    const otherTrigger = document.getElementById("tag-other-trigger");
    if (otherTrigger) {
      otherTrigger.addEventListener("click", () => {
        const container = document.querySelector(".other-input-container");
        container.style.display = container.style.display === "flex" ? "none" : "flex";
      });
    }

    const otherBtn = document.getElementById("other-tag-add-btn");
    if (otherBtn) {
      otherBtn.addEventListener("click", () => this.addCustomTag());
    }

    // 온보딩 완료 -> AI 채팅 시작
    const onbSubmit = document.getElementById("onb-finish-btn");
    if (onbSubmit) {
      onbSubmit.addEventListener("click", () => {
        if (AppState.onboarding.hasDestination && !AppState.onboarding.destination) {
          Components.showToast("목적지를 입력하시거나 추천 명소를 선택해 주세요!");
          return;
        }
        
        // AI 채팅 초기화 및 탭 이동
        this.initChatSession();
        window.location.hash = "#chat";
        Components.showToast("AI 플래너 채널에 연결되었습니다.");
      });
    }

    // 온보딩 이전 버튼
    const onbBack = document.getElementById("onb-back-btn");
    if (onbBack) {
      onbBack.addEventListener("click", () => this.nextOnboardingStep(1));
    }

    // AI 채팅 메시지 전송
    const sendBtn = document.getElementById("chat-send-btn");
    const chatInput = document.getElementById("chat-user-input");
    if (sendBtn) {
      sendBtn.addEventListener("click", () => this.sendUserMessage());
    }
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendUserMessage();
      });
    }

    // 플로팅 "최적 동선 만들기"
    const floatBtn = document.getElementById("floating-gen-btn");
    if (floatBtn) {
      floatBtn.addEventListener("click", () => {
        // 플로팅 숨김 처리 후 빌딩
        floatBtn.classList.remove("show");
        
        // 페이징 이동
        this.buildAnalysisReport();
        Components.showToast("📊 AI 입체 성향 리포트가 완성되었습니다!");
      });
    }

    // 분석 보완 버튼
    const suppBtn = document.getElementById("report-supplement-btn");
    if (suppBtn) {
      suppBtn.addEventListener("click", () => this.openSupplementaryModal());
    }

    // 최종 지도 이동 3대안 승인
    const confirmPlanBtn = document.getElementById("report-confirm-plan-btn");
    if (confirmPlanBtn) {
      confirmPlanBtn.addEventListener("click", () => {
        window.location.hash = "#map";
      });
    }

    // 지도 상단 제어 버튼들 (저장 / 내보내기 / 수정)
    const mapSaveBtn = document.getElementById("map-ctrl-save");
    const mapExportBtn = document.getElementById("map-ctrl-export");
    
    if (mapSaveBtn) {
      mapSaveBtn.addEventListener("click", () => this.saveCurrentPlan());
    }
    if (mapExportBtn) {
      mapExportBtn.addEventListener("click", () => this.openExportModal());
    }

    const mapFreeModeBtn = document.getElementById("map-free-mode-btn");
    if (mapFreeModeBtn) {
      mapFreeModeBtn.addEventListener("click", () => {
        this.startFreeMapMode();
      });
    }

    // 지도 우측 줌인 / 줌아웃 제어
    const zoomInBtn = document.getElementById("map-zoom-in");
    const zoomOutBtn = document.getElementById("map-zoom-out");
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => {
        MapModule.zoomIn();
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => {
        MapModule.zoomOut();
      });
    }

    const mapSearchInput = document.getElementById("map-search-input");
    const mapSearchBtn = document.getElementById("map-search-btn");
    if (mapSearchInput) {
      mapSearchInput.addEventListener("input", (e) => {
        AppState.mapFilters.searchKeyword = e.target.value.trim();
        this.updateMapSearch();
      });
      mapSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.performMapSearch();
        }
      });
    }
    if (mapSearchBtn) {
      mapSearchBtn.addEventListener("click", () => {
        this.performMapSearch();
      });
    }

    const mapCategoryChips = document.querySelectorAll(".category-chip");
    mapCategoryChips.forEach(chip => {
      chip.addEventListener("click", () => {
        mapCategoryChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const newCategory = chip.getAttribute("data-type") || 'all';
        AppState.mapFilters.activeCategory = newCategory;

        if (AppState.isFreeMapMode && newCategory !== 'all') {
          // 자유 모드에서 카테고리 선택 → 주변 검색
          Components.showToast(`📍 현위치 주변 '${this.mapTypeLabel(newCategory)}' 검색 중...`);
          this.performMapSearch();
        } else {
          this.updateMapSearch();
        }
      });
    });

    // 상세 모달 닫기
    const detailOverlay = document.getElementById("spot-detail-overlay");
    if (detailOverlay) {
      detailOverlay.addEventListener("click", (e) => {
        if (e.target === detailOverlay || e.target.classList.contains("modal-close-btn")) {
          detailOverlay.classList.remove("active");
        }
      });
    }

    // 바텀 시트 드래그 & 확장 토글
    const handle = document.querySelector(".sheet-handle");
    const sheet = document.querySelector(".bottom-sheet");
    if (handle && sheet) {
      handle.addEventListener("click", () => {
        sheet.classList.toggle("expanded");
      });
    }

    // 내보내기 모달 닫기
    const exportOverlay = document.getElementById("export-modal-overlay");
    if (exportOverlay) {
      exportOverlay.addEventListener("click", (e) => {
        if (e.target === exportOverlay || e.target.classList.contains("modal-close-btn")) {
          exportOverlay.classList.remove("active");
        }
      });
    }

    // 내보내기 포맷 옵션 클릭
    const expOptions = document.querySelectorAll(".export-option-btn");
    expOptions.forEach(opt => {
      opt.addEventListener("click", () => {
        const fmt = opt.getAttribute("data-format");
        this.exportPlan(fmt);
      });
    });

    // 커뮤니티 탭 변경
    const commTabs = document.querySelectorAll(".comm-tab");
    commTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        commTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        Components.showToast(`${tab.innerText} 탭 목록을 로드했습니다.`);
      });
    });

    // 마이페이지 환경 토글 스위치들
    const switchDark = document.getElementById("switch-darkmode");
    if (switchDark) {
      switchDark.addEventListener("change", (e) => this.toggleDarkMode(e.target.checked));
    }
    const switchPrem = document.getElementById("switch-premium");
    if (switchPrem) {
      switchPrem.addEventListener("change", (e) => this.togglePremium(e.target.checked));
    }
    const switchNoti = document.getElementById("switch-noti");
    if (switchNoti) {
      switchNoti.addEventListener("change", (e) => {
        AppState.settings.notifications = e.target.checked;
        this.saveToStorage();
        Components.showToast(e.target.checked ? "🔔 푸시 알림이 설정되었습니다." : "🔕 알림이 거부되었습니다.");
      });
    }

    // 프로필 이름 클릭 수정
    const profileSection = document.querySelector(".mypage-profile-section");
    if (profileSection) {
      profileSection.addEventListener("click", (e) => {
        // 아바타 혹은 프로필 전체 클릭 시 수정
        this.editProfileName();
      });
    }
  }
};

// DOM 로드 완료 시 전역 가동
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});


window.App = App;
