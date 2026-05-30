/**
 * PINROUTE Intelligent Mock AI Engine
 * 
 * 온보딩 태그, 대화 히스토리 및 사용자 프로필 데이터를 입력받아
 * 정교하게 분석된 페르소나, 맞춤 취향 태그, 보완 추가 질문, 
 * 그리고 3개 대안의 상세 여행 계획(동선, GPS좌표, 예약연동링크 포함)을 생성하는 클라이언트측 자연어 처리 시뮬레이터입니다.
 */

const AIEngine = {
  // AI 질문 뱅크 - 대화 흐름을 풍성하게 이끌기 위한 취향 심층 질문 목록
  questions: [
    "꼭 가고 싶은 장소(지역, 랜드마크 등)가 마음속에 있나요?",
    "이번 여행은 누구와 함께 떠나시나요? (가족, 연인, 친구, 혹은 혼자만의 힐링 등)",
    "대략적인 예산 범위는 어느 정도 생각하시나요? (가성비 중심, 적당한 여유, 럭셔리 호캉스 등)",
    "주요 이동수단은 무엇인가요? (렌터카, 버스/지하철 대중교통, 도보 여행 등)",
    "선호하시는 숙소 스타일이 궁금합니다! (조용한 감성 독채, 고급 호텔/리조트, 깔끔한 게스트하우스 등)",
    "과거 여행 중에 가장 기억에 남거나 행복했던 순간은 어떤 스타일이었나요?"
  ],

  // 분석 보완을 위한 2차 꼬리 질문 풀 (이전 질문과 절대 겹치지 않는 참신한 질문)
  supplementaryQuestions: [
    "일정 중 아침형 인간이신가요, 아니면 늦잠과 야경을 즐기는 밤샘형이신가요?",
    "여행지에서의 식사는 SNS 핫플레이스 대기 줄 서기 vs 현지인 추천 숨은 맛집 중 어느 쪽을 선호하시나요?",
    "이동 동선이 촘촘하고 바쁜 일정 vs 하루 1~2개 장소에서 여유롭게 머물기 중 마음이 끌리는 쪽은?",
    "비가 오거나 날씨가 안 좋을 때의 실내 전시 관람 대안을 미리 세워둘까요?"
  ],

  // 지역별 기본 GPS 좌표 데이터베이스 (실제 지도 매핑 및 핀 드로잉을 위함)
  destinationsDB: {
    "제주": { lat: 33.4996213, lng: 126.5311884, region: "제주도" },
    "강릉": { lat: 37.751853, lng: 128.8760574, region: "강원 강릉시" },
    "부산": { lat: 35.1795543, lng: 129.0756416, region: "부산광역시" },
    "경주": { lat: 35.8561719, lng: 129.2247477, region: "경북 경주시" },
    "서울": { lat: 37.566535, lng: 126.9779692, region: "서울특별시" }
  },

  // 기본 목적지 폴백
  defaultLocation: { lat: 33.3616666, lng: 126.5291666, region: "제주도 서귀포" },

  /**
   * 사용자의 취향 태그 및 대화 내용을 분석하여 최적의 페르소나 도출
   */
  analyzePersona: function(tags, chatHistory) {
    const textContext = (tags.join(" ") + " " + chatHistory.map(m => m.text).join(" ")).toLowerCase();
    
    let title = "자유로운 발길의 여행자";
    let desc = "계획에 얽매이지 않고 즉흥적인 탐험을 즐기는 영혼입니다.";
    
    // 키워드 매칭 기반 정교한 페르소나 설정
    if (textContext.includes("부모") || textContext.includes("가족") || textContext.includes("효도") || textContext.includes("가족여행")) {
      title = "효자가 되고 싶은 세심한 설계자";
      desc = "동행하는 부모님의 체력과 식성을 꼼꼼하게 고려하여 편안하면서도 품격 있는 일정을 그리는 따뜻한 여행자입니다.";
    } else if (textContext.includes("힐링") || textContext.includes("자연") || textContext.includes("휴식") || textContext.includes("쉼")) {
      title = "지친 일상을 치유하는 힐링 주의자";
      desc = "바쁜 일상을 잠시 멈추고 숲길 산책, 오션뷰 카페에서의 멍때리기, 온전한 조용함 속에서 배터리를 충전하려는 여행가입니다.";
    } else if (textContext.includes("커플") || textContext.includes("연인") || textContext.includes("데이트") || textContext.includes("추억") || textContext.includes("낭만")) {
      title = "로맨틱한 추억을 기록하는 낭만주의자";
      desc = "아름다운 노을 아래서의 스냅 사진 한 컷, 감성 돋는 카페 투어, 연인의 웃음소리로 1분 1초를 채우고 싶어 하는 로맨티스트입니다.";
    } else if (textContext.includes("맛집") || textContext.includes("미식") || textContext.includes("식도락") || textContext.includes("카페") || textContext.includes("먹방")) {
      title = "미식과 트렌드에 진심인 푸드 파이터";
      desc = "여행이란 곧 미각의 즐거움! 웨이팅마저 축제로 만드는 핫플레이스 도장깨기와 현지 고유 감성 맛집에 열정을 다하는 탐식가입니다.";
    } else if (textContext.includes("관광") || textContext.includes("문화") || textContext.includes("체험") || textContext.includes("유적")) {
      title = "지적 탐구와 체험이 풍성한 프로 관광러";
      desc = "랜드마크는 무조건 사수! 역사와 스토리가 숨 쉬는 유적지 방문, 다채로운 액티비티 체험으로 알찬 하루를 알뜰하게 채우는 모험가입니다.";
    }

    return { title, desc };
  },

  /**
   * 취향 분석도 진척율 계산 (채팅 턴 수 및 태그 개수 반영)
   */
  calculateGauge: function(chatHistory, tags) {
    // 최소 10% 시작, 챗 한 턴당 15% 상승, 최대 100%
    const chatTurns = chatHistory.filter(m => m.sender === 'user').length;
    const tagBonus = Math.min(tags.length * 5, 20);
    const progress = Math.min(10 + (chatTurns * 15) + tagBonus, 100);
    return progress;
  },

  /**
   * AI의 자연어 분석 반응 및 다음 적절한 취향 질문 매칭
   */
  generateAIResponse: function(userMessage, chatHistory, tags) {
    const userMsgClean = userMessage.trim();
    const chatTurns = chatHistory.filter(m => m.sender === 'user').length;
    
    // 사용자가 입력한 메시지의 키워드를 매핑하여 피드백 문구를 부드럽게 조합
    let feedback = "";
    if (userMsgClean.includes("가족") || userMsgClean.includes("부모")) {
      feedback = "부모님과 함께 가시는 효도 여행이시군요! 휠체어 이용이나 이동 동선의 경사도까지 꼼꼼히 살피겠습니다. ";
    } else if (userMsgClean.includes("연인") || userMsgClean.includes("커플") || userMsgClean.includes("남자친구") || userMsgClean.includes("여자친구")) {
      feedback = "사랑하는 연인과의 기념일 여행이라니 정말 설레네요! 사진이 그림처럼 나오는 감성 스팟 위주로 조율하겠습니다. ";
    } else if (userMsgClean.includes("힐링") || userMsgClean.includes("바다") || userMsgClean.includes("자연")) {
      feedback = "자연 속에서 여유롭게 바람을 쐬는 평화로운 일정이 제격이겠네요. 숲내음 가득한 코스를 얹어볼게요. ";
    } else if (userMsgClean.includes("맛집") || userMsgClean.includes("카페") || userMsgClean.includes("먹")) {
      feedback = "현지 미식을 빼놓으면 여행의 반을 잃는 셈이죠! 현지인들만 찾아가는 알짜배기 노포 식당들도 동선에 끼워넣어 드릴게요. ";
    } else if (userMsgClean.includes("렌터카") || userMsgClean.includes("차")) {
      feedback = "자가용/렌터카를 타시는군요! 주차가 편리하고 드라이브 코스가 환상적인 숨은 핫플로 묶어 드려야겠어요. ";
    } else if (userMsgClean.includes("뚜벅이") || userMsgClean.includes("대중교통") || userMsgClean.includes("도보")) {
      feedback = "대중교통을 이용하시는 뚜벅이 여행이시라면 버스 정류장에서 가깝고 걷기 편한 집약적인 동선이 최선이겠네요. ";
    } else {
      feedback = "말씀해주신 취향 조각들이 마음 깊이 와닿네요. PINROUTE 맞춤 알고리즘에 소중하게 반영하겠습니다. ";
    }

    // 다음 질문 선택 (턴 수 기반 순환 질문 및 꼬리 질문 응답)
    let nextQuestionIndex = chatTurns % this.questions.length;
    let nextQuestion = this.questions[nextQuestionIndex];

    // 만약 이미 해당 질문에 대한 대답을 한 것 같으면 다른 질문 추천
    if (userMsgClean.match(/원|예산|돈/) && nextQuestion.includes("예산")) {
      nextQuestion = this.questions[(nextQuestionIndex + 1) % this.questions.length];
    }

    // AI 규칙 준수: 절대로 종결 표현 사용 안 하고 항상 질문으로 마무리
    return `${feedback}그렇다면, ${nextQuestion}`;
  },

  /**
   * 목적지 이름 기반 검색 및 GPS 센터 정보 조회
   */
  getDestinationCoords: function(destName) {
    if (!destName) return this.defaultLocation;
    
    for (let key in this.destinationsDB) {
      if (destName.includes(key) || key.includes(destName)) {
        return this.destinationsDB[key];
      }
    }
    return {
      lat: 33.4996213 + (Math.random() - 0.5) * 0.05,
      lng: 126.5311884 + (Math.random() - 0.5) * 0.05,
      region: destName
    };
  },

  /**
   * 입력된 모든 데이터를 기반으로 3대 대안 여행 코스(1안: 힐링, 2안: 관광, 3안: 맛집) 생성
   */
  generateThreePlans: function(destination, tags, chatHistory) {
    const center = this.getDestinationCoords(destination);
    const regionName = center.region;

    // 기본 가상 장소 라이브러리 (제주/서울/부산에 걸쳐 동적으로 GPS 핀을 뿌려주기 위함)
    // 중심 좌표 근처에 오프셋을 주어 지도에 핀이 미려하게 배치되도록 세팅
    const spotsLib = {
      healing: [
        { name: "비밀의 숲 오크 오솔길", latOffset: 0.015, lngOffset: 0.022, desc: "초록빛 피톤치드가 가득 뿜어져 나오는 숲길에서 즐기는 아침 산책", type: "spot", external: "길찾기", rating: "4.8", time: "09:00 - 11:30" },
        { name: "풀내음 가득 돌담 식당", latOffset: 0.008, lngOffset: -0.012, desc: "신선한 유기농 로컬 채소와 수제 소스로 빚어낸 웰빙 밥상", type: "food", external: "식당 예약", rating: "4.7", time: "12:00 - 13:30" },
        { name: "바람이 쉬어가는 다원 카페", latOffset: -0.012, lngOffset: 0.018, desc: "푸르른 녹차 밭을 한눈에 조망하며 직접 내린 고급 우전 홍차 한 잔의 힐링", type: "food", external: "길찾기", rating: "4.9", time: "14:00 - 15:30" },
        { name: "노을빛 억새 오름 언덕", latOffset: -0.022, lngOffset: -0.008, desc: "바람에 흔들리는 억새풀 사이로 지는 오렌지빛 일몰을 눈에 담는 스팟", type: "spot", external: "길찾기", rating: "4.6", time: "16:30 - 18:00" },
        { name: "스테이 잔잔 감성 독채", latOffset: -0.005, lngOffset: 0.005, desc: "새소리와 바람소리만 들리는 고요한 자연 속 프리미엄 자쿠지 한옥 펜션", type: "hotel", external: "숙소 예약", rating: "4.95", time: "19:00 ~ 체크인" }
      ],
      tour: [
        { name: "오래된 성곽 문화 역사관", latOffset: -0.018, lngOffset: 0.011, desc: "역사 해설가의 친절한 스토리텔링과 함께 즐기는 고궁/성곽 성지 순례", type: "spot", external: "입장권 구매", rating: "4.6", time: "09:30 - 11:30" },
        { name: "줄 서서 먹는 향토 전통가", latOffset: 0.022, lngOffset: -0.022, desc: "수십 년 전통의 레시피로 우려내어 국물맛이 깊고 진한 명품 요리", type: "food", external: "식당 예약", rating: "4.8", time: "12:00 - 13:00" },
        { name: "액티브 짚라인 & 카트 테마파크", latOffset: 0.005, lngOffset: 0.028, desc: "창공을 가르며 달리는 짜릿한 속도감의 레이싱 카트와 와이어 액티비티", type: "spot", external: "입장권 구매", rating: "4.7", time: "13:30 - 16:00" },
        { name: "바다 위를 달리는 해안 열차", latOffset: -0.025, lngOffset: -0.015, desc: "탁 트인 망망대해를 창문 밖으로 감상하며 해안선을 따라 달리는 열차 투어", type: "spot", external: "입장권 구매", rating: "4.5", time: "16:30 - 18:00" },
        { name: "그랜드 오션 뷰 호텔", latOffset: 0.012, lngOffset: 0.012, desc: "인피니티 풀에서 해질녘 수영을 즐길 수 있는 특급 프리미엄 리조트", type: "hotel", external: "숙소 예약", rating: "4.88", time: "18:30 ~ 체크인" }
      ],
      gourmet: [
        { name: "백년 가게 수제 떡 명인관", latOffset: 0.005, lngOffset: -0.005, desc: "매일 아침 명인이 정성을 다해 빚어 쫄깃함이 남다른 정통 디저트 가게", type: "food", external: "길찾기", rating: "4.5", time: "09:30 - 10:30" },
        { name: "SNS 핫플 오픈런 수제버거", latOffset: 0.018, lngOffset: 0.018, desc: "육즙이 뚝뚝 떨어지는 패티와 수제 번, 특제 소스가 빚어낸 줄 서서 먹는 로컬 버거집", type: "food", external: "식당 예약", rating: "4.75", time: "11:30 - 13:00" },
        { name: "스페셜티 로스터리 핸드드립숍", latOffset: -0.015, lngOffset: -0.022, desc: "바리스타 챔피언이 직접 내린 독특한 산미의 에티오피아 게이샤 커피와 무화과 파이", type: "food", external: "길찾기", rating: "4.9", time: "13:30 - 15:00" },
        { name: "수산시장 직영 랍스터 & 제철 모듬회", latOffset: -0.028, lngOffset: 0.008, desc: "살이 꽉 찬 특대 랍스터 버터구이와 갓 썰어내어 식감이 활기찬 자연산 모듬회 한 상", type: "food", external: "식당 예약", rating: "4.85", time: "17:30 - 19:30" },
        { name: "도심 속 감성 야경 어반 부티크", latOffset: 0.01, lngOffset: -0.015, desc: "탑층 루프탑 바에서 낭만적인 칵테일을 홀짝일 수 있는 가성비 극상의 부티크 디자인 호텔", type: "hotel", external: "숙소 예약", rating: "4.65", time: "20:00 ~ 체크인" }
      ]
    };

    // 맵핑 헬퍼 함수
    const buildSchedule = (libKey) => {
      return spotsLib[libKey].map((item, idx) => {
        return {
          id: `${libKey}_spot_${idx}`,
          name: `${destination} ${item.name}`,
          lat: center.lat + item.latOffset,
          lng: center.lng + item.lngOffset,
          desc: item.desc,
          type: item.type,
          external: item.external,
          rating: item.rating,
          time: item.time,
          duration: "1.5시간",
          reviews: [
            { user: "코코넛_99", text: "여기 오려고 이 여행 계획 잡았는데 정말 후회 1도 안 해요!! 강추!", stars: "★★★★★" },
            { user: "길치탈출기", text: "동선이 깔끔하게 연결돼서 주차하기 편하고 한적해서 부모님이 정말 만족하셨어요.", stars: "★★★★★" }
          ],
          reason: `AI 분석 결과, 당신이 선택하신 '${tags.join(", ") || "쉼"}' 성향과 찰떡궁합인 장소입니다. 복잡하지 않고 조용하게 여행의 멋을 느끼기 최고입니다.`
        };
      });
    };

    // 3가지 최적 대안 구축
    const plan1 = {
      title: `🌱 [1안] ${destination} 숨 쉬는 초록빛 힐링 슬로우 코스`,
      desc: "피톤치드 가득한 비밀 오솔길과 통창 유리 너머 다원에서 차 한 잔을 마시며 속도를 늦추고 삶의 쉼표를 찍어가는 온전한 힐링 테라피 여정입니다.",
      schedule: buildSchedule("healing"),
      type: "healing",
      destination: destination
    };

    const plan2 = {
      title: `📸 [2안] ${destination} 랜드마크 & 짜릿한 액티비티 올패스 코스`,
      desc: "성곽 역사 짚어보기부터 바다를 시원하게 활주하는 해안 열차와 스릴 넘치는 루지 카트 탑승까지, 지루할 틈 없이 추억 앨범을 꽉 채워줄 고밀도 관광 투어입니다.",
      schedule: buildSchedule("tour"),
      type: "tour",
      destination: destination
    };

    const plan3 = {
      title: `🍣 [3안] ${destination} 미식 웨이팅 명가 & 오션뷰 로스터리 탐식 코스`,
      desc: "SNS 핫플레이스 오픈런부터 명인의 손맛이 깃든 쫄깃한 백년가게, 랍스터 해산물 플래터와 트렌디한 도심 야경 루프탑 바까지 아우르는 혀끝의 미식 파라다이스입니다.",
      schedule: buildSchedule("gourmet"),
      type: "gourmet",
      destination: destination
    };

    return [plan1, plan2, plan3];
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEngine;
} else {
  window.AIEngine = AIEngine;
}
