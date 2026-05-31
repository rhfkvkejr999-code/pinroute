/**
 * PINROUTE UI Components Engine
 * 
 * 정해진 CSS 디자인 시스템 토큰을 기반으로, 
 * 홈 카드, 채팅 메시지, 일정 타임라인 노드, 커뮤니티 피드 등의 DOM 객체를 안전하고 미려하게 생성해주는 컴포넌트 팩토리입니다.
 */

const Components = {
  
  /**
   * 홈 화면 - 저장된 여행 계획 카드 생성
   */
  createPlanCard: function(plan, onClick) {
    const card = document.createElement("div");
    card.className = "plan-card";
    
    // 지역 명칭에 따른 테마 이모지 결정
    let emoji = "✈️";
    if (plan.destination.includes("제주")) emoji = "🍊";
    else if (plan.destination.includes("강릉")) emoji = "🌲";
    else if (plan.destination.includes("부산")) emoji = "🌊";
    else if (plan.destination.includes("경주")) emoji = "🌸";
    else if (plan.destination.includes("서울")) emoji = "🗼";

    card.innerHTML = `
      <div class="card-img-placeholder">
        ${emoji}
      </div>
      <div class="card-body">
        <div class="card-tag-row">
          <span class="card-tag">${plan.type === 'healing' ? '🌱 힐링' : plan.type === 'tour' ? '📸 관광' : '🍣 맛집'}</span>
          <span class="card-tag">📍 ${plan.destination}</span>
        </div>
        <h4 class="card-title">${plan.title}</h4>
        <p class="card-desc">${plan.desc.slice(0, 75)}...</p>
      </div>
    `;

    if (onClick) {
      card.addEventListener("click", () => onClick(plan));
    }
    return card;
  },

  /**
   * AI 채팅 - 말풍선 버블 생성
   */
  createChatBubble: function(sender, text) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${sender}`;
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    return bubble;
  },

  /**
   * 성향 분석 화면 - 삭제 가능한 취향 태그 칩 생성
   */
  createEditableTag: function(tagName, onDelete) {
    const chip = document.createElement("span");
    chip.className = "editable-tag";
    chip.innerHTML = `
      #${tagName}
      <span class="delete-tag-btn" title="삭제">&times;</span>
    `;

    const deleteBtn = chip.querySelector(".delete-tag-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (onDelete) onDelete(tagName);
    });

    return chip;
  },

  /**
   * 성향 분석 화면 - 3가지 추천 대안 카드 생성
   */
  createOptionCard: function(plan, isSelected, onClick) {
    const card = document.createElement("div");
    card.className = `option-card ${isSelected ? 'selected' : ''}`;
    
    let typeName = "🌱 힐링 중심";
    if (plan.type === 'tour') typeName = "📸 관광 중심";
    else if (plan.type === 'gourmet') typeName = "🍣 맛집 중심";

    card.innerHTML = `
      <span class="option-badge">${typeName}</span>
      <h4 class="option-title">${plan.title.replace(/🌱|📸|🍣|\[.*?\]/g, "").trim()}</h4>
      <p class="option-desc">${plan.desc}</p>
      <div class="option-summary">
        <span>📍 장소 ${plan.schedule.length}곳</span>
        <span>🚘 ${plan.type === 'healing' ? '여유로운 쉼' : plan.type === 'tour' ? '알찬 동선' : '식도락 특화'}</span>
      </div>
    `;

    if (onClick) {
      card.addEventListener("click", () => onClick(plan));
    }
    return card;
  },

  /**
   * 지도 일정 리스트 - 1개 스케줄 노드 카드 생성
   */
  createTimelineItem: function(spot, index, total, onUp, onDown, onDelete, onClick) {
    const item = document.createElement("div");
    item.className = "timeline-item";

    let nodeClass = "spot";
    let icon = "📍";
    if (index === 0) {
      nodeClass = "start";
      icon = "🚩";
    } else if (spot.type === 'food') {
      nodeClass = "food";
      icon = "🍣";
    } else if (spot.type === 'hotel') {
      nodeClass = "hotel";
      icon = "🏨";
    } else if (spot.type === 'spot') {
      nodeClass = "spot";
      icon = "🔥";
    } else if (spot.type === 'convenience') {
      nodeClass = "convenience";
      icon = "🛒";
    }

    item.innerHTML = `
      <div class="timeline-node ${nodeClass}">${index === 0 ? '출발' : icon}</div>
      <div class="timeline-info">
        <div>
          <div class="timeline-name">${spot.name.split(" ").slice(-1)[0]}</div>
          <div class="timeline-type">${spot.time} • ${spot.type === 'food' ? '식당/카페' : spot.type === 'hotel' ? '숙소' : spot.type === 'convenience' ? '편의점' : '핫플'}</div>
        </div>
        <div class="timeline-edit-controls">
          ${index > 0 ? `<button class="timeline-action-btn btn-up" title="순서 위로">▲</button>` : ''}
          ${index < total - 1 ? `<button class="timeline-action-btn btn-down" title="순서 아래로">▼</button>` : ''}
          <button class="timeline-action-btn btn-delete" title="삭제" style="color: var(--danger)">&times;</button>
        </div>
      </div>
    `;

    // 이벤트 바인딩
    const infoArea = item.querySelector(".timeline-info");
    const upBtn = item.querySelector(".btn-up");
    const downBtn = item.querySelector(".btn-down");
    const delBtn = item.querySelector(".btn-delete");

    infoArea.addEventListener("click", (e) => {
      // 제어 버튼 영역 클릭 시 부모 클릭 방지
      if (e.target.classList.contains("timeline-action-btn")) return;
      if (onClick) onClick(spot);
    });

    if (upBtn) {
      upBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onUp) onUp(index);
      });
    }

    if (downBtn) {
      downBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onDown) onDown(index);
      });
    }

    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(index);
      });
    }

    return item;
  },

  /**
   * 커뮤니티 화면 - 게시글 소셜 카드 생성
   */
  createPostCard: function(post, onLike, onBookmark, onShare) {
    const card = document.createElement("div");
    card.className = "post-card";
    
    // 초기 로컬 스토리지 상태 반영
    const isLiked = post.isLiked ? "liked" : "";
    const isBookmarked = post.isBookmarked ? "bookmarked" : "";
    const likeIcon = post.isLiked ? "❤️" : "🤍";
    const bookmarkIcon = post.isBookmarked ? "⭐️" : "☆";

    card.innerHTML = `
      <div class="post-header">
        <div class="post-author-row">
          <div class="post-avatar" style="background: radial-gradient(circle, #81C784 0%, #4CAF50 100%)"></div>
          <div>
            <div class="post-author">${post.author}</div>
            <div style="font-size: 10px; color: var(--medium-gray)">${post.date || '방금 전'}</div>
          </div>
        </div>
        <span class="post-region">📍 ${post.region}</span>
      </div>
      <h4 class="post-title">${post.title}</h4>
      <p class="post-content">${post.content}</p>
      <div class="post-actions">
        <span class="post-action-item action-like ${isLiked}">
          <span class="like-icon-sym">${likeIcon}</span> <span class="like-count">${post.likes}</span>
        </span>
        <span class="post-action-item action-comment">
          💬 <span>${post.comments}</span>
        </span>
        <span class="post-action-item action-bookmark ${isBookmarked}">
          <span class="bookmark-icon-sym">${bookmarkIcon}</span> 북마크
        </span>
        <span class="post-action-item action-share">
          🔗 공유
        </span>
      </div>
    `;

    // 이벤트 리스너 바인딩
    const likeBtn = card.querySelector(".action-like");
    const bmkBtn = card.querySelector(".action-bookmark");
    const shareBtn = card.querySelector(".action-share");

    likeBtn.addEventListener("click", () => {
      post.isLiked = !post.isLiked;
      if (post.isLiked) {
        post.likes += 1;
        likeBtn.classList.add("liked");
        likeBtn.querySelector(".like-icon-sym").innerText = "❤️";
      } else {
        post.likes -= 1;
        likeBtn.classList.remove("liked");
        likeBtn.querySelector(".like-icon-sym").innerText = "🤍";
      }
      likeBtn.querySelector(".like-count").innerText = post.likes;
      if (onLike) onLike(post);
    });

    bmkBtn.addEventListener("click", () => {
      post.isBookmarked = !post.isBookmarked;
      if (post.isBookmarked) {
        bmkBtn.classList.add("bookmarked");
        bmkBtn.querySelector(".bookmark-icon-sym").innerText = "⭐️";
      } else {
        bmkBtn.classList.remove("bookmarked");
        bmkBtn.querySelector(".bookmark-icon-sym").innerText = "☆";
      }
      if (onBookmark) onBookmark(post);
    });

    shareBtn.addEventListener("click", () => {
      if (onShare) onShare(post);
    });

    return card;
  },

  /**
   * 모바일 화면 하단 - 프리미엄 플로팅 토스트 알림창
   */
  showToast: function(message) {
    // 기존 토스트 제거
    const existing = document.querySelector(".toast");
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    
    // 활성화된 뷰 영역 안에 삽입
    const phoneScreen = document.querySelector(".phone-screen");
    if (phoneScreen) {
      phoneScreen.appendChild(toast);
      
      // 마운트 틱 뒤 쇼잉
      setTimeout(() => {
        toast.classList.add("show");
      }, 50);

      // 2.5초 뒤 서서히 아웃
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
          toast.remove();
        }, 350);
      }, 2500);
    } else {
      alert(message);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Components;
} else {
  window.Components = Components;
}
