# **Steam Market Intelligence Dashboard**

## **Product Requirements Document (PRD) v2.1**

**버전:** 2.1  
 **작성일:** 2025년 1월  
 **변경사항:** GitHub Codespaces 개발, IsThereAnyDeal 제거, Gemini 다중 키 로테이션  
 **개발 환경:** GitHub Codespaces \+ Claude  
 **상태:** Final Draft

---

# **Part 1: 제품 기획**

## **1\. 제품 개요**

### **1.1 제품명**

**Steam Market Intelligence** (코드명: SteamPulse)

### **1.2 제품 비전**

"데이터가 만드는 게임 비즈니스의 미래"

Steam 게임 시장의 트렌드를 실시간으로 파악하고, AI 기반 인사이트를 통해 시장 기회를 발굴하는 팀 협업용 대시보드.

### **1.3 목표 사용자 (페르소나)**

| 페르소나 | 핵심 니즈 | 주요 사용 기능 |
| ----- | ----- | ----- |
| **🎮 게임 개발자** | "내 게임을 어떻게 개선할까?" | 경쟁작 분석, 태그 최적화, 업데이트 벤치마킹 |
| **📢 마케터** | "언제, 얼마에 팔까?" | 할인 캘린더, 가격 전략, 출시일 최적화 |
| **💰 투자자/퍼블리셔** | "어떤 게임이 뜰까?" | 매출 추정, Hype Factor, 블루오션 탐색 |

### **1.4 핵심 가치 제안**

| 문제 | SteamPulse 솔루션 |
| ----- | ----- |
| SteamDB/SteamSpy 수동 확인 | 자동 트렌드 감지 \+ 알림 |
| 매출 추정 부정확 | Boxleiter 2.0 동적 승수 알고리즘 |
| 기회 시장 발굴 어려움 | 수요-공급 매트릭스 \+ AI 분석 |
| 출시 타이밍 감에 의존 | 경쟁작 캘린더 \+ Cannibalization 경고 |
| 마케팅 효과 측정 불가 | Hype Velocity 추적 |

---

## **2\. 핵심 알고리즘 (비즈니스 로직)**

### **2.1 Boxleiter Method 2.0 \- 매출 추정**

추정 판매량 \= 총 리뷰 수 × M (Multiplier)

M \= 기본승수 × 연도보정 × 가격보정 × 장르보정 × 평점보정

#### **승수 보정 테이블**

**연도 보정**

| 출시 연도 | 보정 계수 |
| ----- | ----- |
| 2015년 이전 | 1.5 |
| 2016-2018 | 1.3 |
| 2019-2021 | 1.1 |
| 2022-2023 | 1.0 |
| 2024-2025 | 0.85 |

**가격대 보정**

| 가격대 | 보정 계수 |
| ----- | ----- |
| 무료 (F2P) | 1.5 |
| $0.01 \- $9.99 | 1.3 |
| $10 \- $19.99 | 1.0 |
| $20 \- $39.99 | 0.9 |
| $40+ | 0.8 |

**장르 보정**

| 장르 | 보정 계수 |
| ----- | ----- |
| 전략/시뮬레이션 | 0.8 |
| RPG/어드벤처 | 1.0 |
| 액션/슈터 | 1.1 |
| 캐주얼/퍼즐 | 1.3 |
| 인디 | 1.1 |

**평점 보정**

| 긍정률 | 보정 계수 |
| ----- | ----- |
| 95%+ | 0.9 |
| 80-94% | 1.0 |
| 70-79% | 1.1 |
| 70% 미만 | 1.2 |

### **2.2 Hype Factor \- 출시 전 성공 예측**

위시리스트 추정 \= 팔로워 수 × 10  
첫 주 판매량 예측 \= 위시리스트 × 0.2 (전환율 20%)

### **2.3 기회 점수 (Opportunity Score)**

기회 점수 \= (시장 규모 / 평균 시장) × (1 / log(경쟁 강도 \+ 1)) × 성공률

### **2.4 트렌딩 점수 (Trending Score)**

트렌딩 점수 \= (CCU 성장률 × 0.40)   
           \+ (리뷰 속도 × 0.30)   
           \+ (가격 변동 × 0.15)   
           \+ (뉴스 빈도 × 0.15)

---

## **3\. 기능 요구사항**

### **3.1 시스템 구조도**

Steam Market Intelligence  
│  
├── 🔐 인증 시스템  
│   ├── Google OAuth 로그인  
│   ├── 세션 관리 (7일)  
│   └── 팀 멤버십  
│  
├── 📊 마켓 오버뷰 (Market Pulse)  
│   ├── 실시간 총 동접자 추이  
│   ├── 동접자 TOP 10  
│   ├── 24시간 급상승 게임  
│   ├── 신규 출시 / 출시 예정  
│   ├── 현재 세일 현황  
│   ├── 인기 태그 트렌드  
│   └── 월별 출시량 vs 리뷰 추이  
│  
├── 🔥 트렌딩 (Trending Games)  
│   ├── 트렌딩 점수 기반 순위  
│   ├── 기간 필터 (24h/7d/30d)  
│   └── 🤖 AI 트렌딩 인사이트  
│  
├── 🔍 게임 분석 (Game Scout)  
│   ├── 기본 정보 \+ Boxleiter 2.0 매출 추정  
│   ├── CCU 히스토리 차트  
│   ├── 리뷰 분석 (긍정률, 속도, 키워드)  
│   ├── 할인 패턴 분석표  
│   ├── 업데이트 뉴스 타임라인  
│   └── 🤖 AI 투자 인사이트  
│  
├── 📈 기회 발굴 (Niche Finder)  
│   ├── 수요-공급 매트릭스 (버블 차트)  
│   ├── 태그 조합 시뮬레이터  
│   ├── 기회 점수 테이블  
│   └── 🤖 AI 시장 기회 분석  
│  
├── 🏢 경쟁사 분석 (Competitor Intel)  
│   ├── 퍼블리셔 검색 \+ 게임 목록  
│   ├── 출시 타임라인 (Gantt)  
│   ├── 가격/할인 비교표  
│   └── 🤖 AI 경쟁 인사이트  
│  
├── 🚀 Hype 트래커 (Pre-launch)  
│   ├── 출시 예정작 팔로워 추적  
│   ├── Hype Velocity 차트  
│   ├── 위시리스트 추정  
│   └── 🤖 AI Hype 분석  
│  
├── 🎉 세일 모니터링 (Sale Monitor)  
│   ├── 현재 Steam 세일 이벤트  
│   ├── 세일 포함 게임 목록  
│   └── 세일 효과 분석 (CCU 변화)  
│  
└── ⭐ 워치리스트 (Watchlist)  
    ├── 게임 추가/제거 (DB 저장)  
    ├── 팀 공유 워치리스트  
    ├── 변동 알림 설정  
    └── 🤖 AI 워치리스트 요약

### **3.2 API 엔드포인트 활용**

| API | 용도 |
| ----- | ----- |
| `/api/appdetails` | 게임 상세 |
| `/appreviews` | 리뷰 분석 |
| `/featuredcategories` | 피처드/세일 |
| `/salepage` | 세일 이벤트 |
| `/storesearch` | 검색 |
| `IStoreQueryService/Query` | 태그 교차 검색 |
| 커뮤니티 팔로워 XML | Hype 측정 |
| SteamSpy | 보유자 추정 |
| Gemini Flash-Lite | AI 인사이트 (다중 키 로테이션) |

### **3.3 우선순위 정리**

| Phase | 기능 | 우선순위 |
| ----- | ----- | ----- |
| **Phase 1** | 인증, 마켓오버뷰, 게임분석(기본), 워치리스트 | P0 |
| **Phase 2** | AI 인사이트, 트렌딩, 기회발굴, Boxleiter 2.0 | P0 |
| **Phase 3** | 경쟁사분석, 세일모니터링 | P1 |
| **Phase 4** | Hype트래커, 태그시뮬레이터 | P2 |

---

## **4\. 데이터 아키텍처**

### **4.1 데이터베이스 스키마 (Supabase PostgreSQL)**

\-- \============================================  
\-- 사용자 & 팀  
\-- \============================================

CREATE TABLE teams (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  name VARCHAR(100) NOT NULL,  
  created\_at TIMESTAMP DEFAULT NOW()  
);

CREATE TABLE team\_members (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  team\_id UUID REFERENCES teams(id) ON DELETE CASCADE,  
  user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  
  role VARCHAR(20) DEFAULT 'member',  
  joined\_at TIMESTAMP DEFAULT NOW(),  
  UNIQUE(team\_id, user\_id)  
);

\-- \============================================  
\-- 워치리스트  
\-- \============================================

CREATE TABLE watchlist (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  
  team\_id UUID REFERENCES teams(id) ON DELETE SET NULL,  
  app\_id INTEGER NOT NULL,  
  app\_name VARCHAR(200),  
  added\_at TIMESTAMP DEFAULT NOW(),  
  alerts\_enabled BOOLEAN DEFAULT TRUE,  
  alert\_settings JSONB DEFAULT '{  
    "ccu\_spike": 30,  
    "ccu\_drop": 20,  
    "review\_spike": 50,  
    "price\_change": true,  
    "update\_news": true,  
    "rating\_change": 10  
  }',  
  UNIQUE(user\_id, app\_id)  
);

\-- \============================================  
\-- 시계열 데이터  
\-- \============================================

CREATE TABLE ccu\_history (  
  id BIGSERIAL PRIMARY KEY,  
  app\_id INTEGER NOT NULL,  
  ccu INTEGER NOT NULL,  
  recorded\_at TIMESTAMP DEFAULT NOW()  
);  
CREATE INDEX idx\_ccu\_app\_time ON ccu\_history(app\_id, recorded\_at DESC);

CREATE TABLE review\_history (  
  id BIGSERIAL PRIMARY KEY,  
  app\_id INTEGER NOT NULL,  
  total\_reviews INTEGER,  
  positive INTEGER,  
  negative INTEGER,  
  recorded\_at TIMESTAMP DEFAULT NOW()  
);  
CREATE INDEX idx\_review\_app\_time ON review\_history(app\_id, recorded\_at DESC);

CREATE TABLE follower\_history (  
  id BIGSERIAL PRIMARY KEY,  
  app\_id INTEGER NOT NULL,  
  follower\_count INTEGER NOT NULL,  
  recorded\_at TIMESTAMP DEFAULT NOW()  
);  
CREATE INDEX idx\_follower\_app\_time ON follower\_history(app\_id, recorded\_at DESC);

CREATE TABLE price\_history (  
  id BIGSERIAL PRIMARY KEY,  
  app\_id INTEGER NOT NULL,  
  price\_usd DECIMAL(10,2),  
  discount\_percent INTEGER DEFAULT 0,  
  recorded\_at TIMESTAMP DEFAULT NOW()  
);  
CREATE INDEX idx\_price\_app\_time ON price\_history(app\_id, recorded\_at DESC);

\-- \============================================  
\-- AI 인사이트 캐시  
\-- \============================================

CREATE TABLE insight\_cache (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  cache\_key VARCHAR(200) UNIQUE NOT NULL,  
  insight\_text TEXT NOT NULL,  
  created\_at TIMESTAMP DEFAULT NOW(),  
  expires\_at TIMESTAMP NOT NULL  
);  
CREATE INDEX idx\_insight\_key ON insight\_cache(cache\_key);  
CREATE INDEX idx\_insight\_expires ON insight\_cache(expires\_at);

\-- \============================================  
\-- Gemini API 키 사용량 추적  
\-- \============================================

CREATE TABLE gemini\_key\_usage (  
  id SERIAL PRIMARY KEY,  
  key\_index INTEGER NOT NULL,  
  used\_at DATE NOT NULL DEFAULT CURRENT\_DATE,  
  request\_count INTEGER DEFAULT 0,  
  UNIQUE(key\_index, used\_at)  
);

\-- \============================================  
\-- 알림 로그  
\-- \============================================

CREATE TABLE alert\_logs (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  
  app\_id INTEGER NOT NULL,  
  alert\_type VARCHAR(50),  
  message TEXT,  
  is\_read BOOLEAN DEFAULT FALSE,  
  created\_at TIMESTAMP DEFAULT NOW()  
);  
CREATE INDEX idx\_alert\_user ON alert\_logs(user\_id, created\_at DESC);

\-- \============================================  
\-- 게임 메타데이터 캐시  
\-- \============================================

CREATE TABLE game\_cache (  
  app\_id INTEGER PRIMARY KEY,  
  name VARCHAR(200),  
  developer VARCHAR(200),  
  publisher VARCHAR(200),  
  release\_date DATE,  
  genres TEXT\[\],  
  tags TEXT\[\],  
  price\_usd DECIMAL(10,2),  
  total\_reviews INTEGER,  
  positive\_ratio INTEGER,  
  header\_image TEXT,  
  updated\_at TIMESTAMP DEFAULT NOW()  
);

### **4.2 캐싱 전략**

┌─────────────────────────────────────────────────────────────────┐  
│                      3-Tier 캐싱 구조                            │  
├─────────────────────────────────────────────────────────────────┤  
│                                                                 │  
│  L1: React Query (브라우저)                                      │  
│  └── staleTime: 5분                                             │  
│  └── cacheTime: 30분                                            │  
│                                                                 │  
│  L2: Upstash Redis (서버)                                       │  
│  └── Steam API 응답: 5-60분 TTL                                 │  
│  └── AI 인사이트: 1-6시간 TTL                                    │  
│                                                                 │  
│  L3: Supabase PostgreSQL (영구)                                 │  
│  └── 시계열 데이터                                               │  
│  └── 게임 메타데이터                                             │  
│                                                                 │  
└─────────────────────────────────────────────────────────────────┘

---

## **5\. AI 인사이트 시스템 (Gemini 다중 키 로테이션)**

### **5.1 다중 API 키 전략**

**문제:** Gemini Free Tier는 1,000 RPD (Requests Per Day) 제한

**해결:** 여러 개의 API 키를 발급받아 라운드 로빈 \+ 사용량 기반 로테이션

// src/lib/api/gemini.ts

const GEMINI\_KEYS \= \[  
  process.env.GEMINI\_API\_KEY\_1,  
  process.env.GEMINI\_API\_KEY\_2,  
  process.env.GEMINI\_API\_KEY\_3,  
  process.env.GEMINI\_API\_KEY\_4,  
  process.env.GEMINI\_API\_KEY\_5,  
  // 필요한 만큼 추가 (권장: 5-10개)  
\].filter(Boolean);

const DAILY\_LIMIT\_PER\_KEY \= 950; // 안전 마진 50

// 키 선택 알고리즘  
async function selectApiKey(supabase) {  
  const today \= new Date().toISOString().split('T')\[0\];  
    
  // 각 키의 오늘 사용량 조회  
  const { data: usageData } \= await supabase  
    .from('gemini\_key\_usage')  
    .select('key\_index, request\_count')  
    .eq('used\_at', today);  
    
  // 사용량 맵 생성  
  const usageMap \= new Map();  
  usageData?.forEach(row \=\> {  
    usageMap.set(row.key\_index, row.request\_count);  
  });  
    
  // 한도 미달인 키 중 가장 적게 사용된 키 선택  
  let selectedIndex \= \-1;  
  let minUsage \= Infinity;  
    
  for (let i \= 0; i \< GEMINI\_KEYS.length; i++) {  
    const usage \= usageMap.get(i) || 0;  
    if (usage \< DAILY\_LIMIT\_PER\_KEY && usage \< minUsage) {  
      minUsage \= usage;  
      selectedIndex \= i;  
    }  
  }  
    
  if (selectedIndex \=== \-1) {  
    throw new Error('All API keys have reached daily limit');  
  }  
    
  return {  
    key: GEMINI\_KEYS\[selectedIndex\],  
    index: selectedIndex  
  };  
}

// 사용량 기록  
async function recordKeyUsage(supabase, keyIndex) {  
  const today \= new Date().toISOString().split('T')\[0\];  
    
  await supabase.rpc('increment\_gemini\_usage', {  
    p\_key\_index: keyIndex,  
    p\_date: today  
  });  
}

### **5.2 Supabase RPC 함수 (사용량 증가)**

\-- Supabase SQL Editor에서 실행  
CREATE OR REPLACE FUNCTION increment\_gemini\_usage(  
  p\_key\_index INTEGER,  
  p\_date DATE  
)  
RETURNS VOID AS $$  
BEGIN  
  INSERT INTO gemini\_key\_usage (key\_index, used\_at, request\_count)  
  VALUES (p\_key\_index, p\_date, 1\)  
  ON CONFLICT (key\_index, used\_at)  
  DO UPDATE SET request\_count \= gemini\_key\_usage.request\_count \+ 1;  
END;  
$$ LANGUAGE plpgsql;

### **5.3 캐싱 \+ Rate Limit 정책**

// 캐시 TTL 설정 (초)  
const INSIGHT\_TTL \= {  
  trending: 3600,      // 1시간  
  opportunity: 7200,   // 2시간    
  game: 21600,         // 6시간  
  competitor: 14400,   // 4시간  
  hype: 3600,          // 1시간  
  watchlist: 3600,     // 1시간  
};

// 사용자별 쿨다운  
const USER\_COOLDOWN \= 5 \* 60 \* 1000; // 5분

### **5.4 예상 용량 계산**

| API 키 수 | 일일 한도 | 예상 사용량 | 안전 마진 |
| ----- | ----- | ----- | ----- |
| 1개 | 1,000 | 400 | 60% |
| 3개 | 3,000 | 400 | 87% |
| 5개 | 5,000 | 400 | 92% |
| 10개 | 10,000 | 400 | 96% |

**권장:** 5개 이상의 키 발급으로 여유롭게 운영

---

## **6\. 기술 스택**

### **6.1 프론트엔드**

| 기술 | 버전 | 용도 |
| ----- | ----- | ----- |
| Next.js | 14.x | App Router, SSR/ISR |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 3.x | 스타일링 |
| shadcn/ui | latest | UI 컴포넌트 |
| React Query | 5.x | 데이터 페칭/캐싱 |
| Recharts | 2.x | 차트 |
| date-fns | 3.x | 날짜 처리 |

### **6.2 백엔드**

| 기술 | 용도 |
| ----- | ----- |
| Next.js API Routes | API 엔드포인트 |
| Supabase | Auth \+ PostgreSQL |
| Upstash Redis | 캐싱 |
| Vercel Cron | 스케줄러 |

### **6.3 외부 서비스 (모두 무료 티어)**

| 서비스 | 용도 | 한도 |
| ----- | ----- | ----- |
| Vercel | 호스팅 | 100GB BW |
| Supabase | DB \+ Auth | 500MB |
| Upstash Redis | 캐싱 | 10K req/day |
| Gemini (다중 키) | AI 인사이트 | N × 1K RPD |
| GitHub Codespaces | 개발 환경 | 60시간/월 |

---

# **Part 2: GitHub Codespaces 개발 가이드**

## **7\. 개발 환경 설정 (로컬 설치 불필요\!)**

### **7.1 왜 GitHub Codespaces인가?**

| 항목 | 로컬 개발 | GitHub Codespaces |
| ----- | ----- | ----- |
| Node.js 설치 | 필요 | ❌ 불필요 |
| Git 설치 | 필요 | ❌ 불필요 |
| VS Code 설치 | 필요 | ❌ 불필요 |
| 환경 설정 | 복잡 | 자동 |
| 어디서든 접속 | ❌ | ✅ 브라우저만 있으면 OK |
| 무료 한도 | \- | 60시간/월 (충분) |

### **7.2 GitHub Codespaces 시작하기**

#### **Step 1: GitHub 계정 생성/로그인**

1. https://github.com 접속  
2. 계정 없으면 "Sign up" 클릭하여 생성  
3. 이미 있으면 "Sign in"

#### **Step 2: Repository 생성**

1. 로그인 후 우측 상단 "+" 클릭 → "New repository"  
2. 설정:  
   * Repository name: `steam-pulse`  
   * Description: `Steam Market Intelligence Dashboard`  
   * Public 선택 (무료 Codespaces 사용을 위해)  
   * ✅ Add a README file 체크  
   * Add .gitignore: `Node` 선택  
3. "Create repository" 클릭

#### **Step 3: Codespaces 실행**

1. 생성된 Repository 페이지에서  
2. 녹색 "Code" 버튼 클릭  
3. "Codespaces" 탭 선택  
4. "Create codespace on main" 클릭  
5. **2-3분 대기** (VS Code가 브라우저에서 열림\!)

#### **Step 4: Codespaces 환경 설정**

Codespaces가 열리면, 하단 **터미널**에서 다음 명령어 실행:

\# 1\. Next.js 프로젝트 생성 (현재 폴더에)  
npx create-next-app@latest . \--typescript \--tailwind \--eslint \--app \--src-dir \--import-alias "@/\*" \--use-npm

\# 질문이 나오면:  
\# Would you like to use Turbopack? → No  
\# 나머지는 Enter (기본값)

\# 2\. 필수 패키지 설치  
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query @upstash/redis recharts date-fns lucide-react

\# 3\. shadcn/ui 설치  
npx shadcn-ui@latest init

\# 질문 답변:  
\# Which style would you like to use? → Default  
\# Which color would you like to use? → Slate  
\# Would you like to use CSS variables? → Yes

\# 4\. shadcn 컴포넌트 설치  
npx shadcn-ui@latest add button card input tabs table badge avatar dropdown-menu dialog toast skeleton

\# 5\. 개발 서버 실행 테스트  
npm run dev

#### **Step 5: 미리보기 확인**

1. 터미널에 `npm run dev` 실행 후  
2. 우측 하단에 "Open in Browser" 팝업 → 클릭  
3. 또는 "PORTS" 탭 → 포트 3000 → 🌐 아이콘 클릭  
4. 새 탭에서 Next.js 기본 페이지 확인\!

### **7.3 Codespaces 사용 팁**

| 작업 | 방법 |
| ----- | ----- |
| 파일 생성 | 좌측 Explorer에서 우클릭 → "New File" |
| 파일 저장 | Cmd+S (Mac) / Ctrl+S (Windows) |
| 터미널 열기 | 상단 메뉴 → Terminal → New Terminal |
| Git 커밋 | 좌측 Source Control 탭 → 메시지 입력 → ✓ 클릭 |
| Git 푸시 | Source Control → "..." → Push |
| Codespaces 종료 | 브라우저 탭 닫기 (자동 저장됨) |
| Codespaces 재시작 | GitHub Repo → Code → Codespaces → 기존 것 클릭 |

### **7.4 무료 한도 관리**

* GitHub Free: **60시간/월** (Core 2코어 기준)  
* 사용하지 않을 때 자동 중지 (30분 후)  
* 수동 중지: Codespaces 목록 → "..." → "Stop codespace"

**💡 팁:** 작업 끝나면 탭 닫기 → 자동 중지 → 시간 절약\!

---

## **8\. 프로젝트 구조**

### **8.1 디렉토리 구조**

steam-pulse/  
├── src/  
│   ├── app/  
│   │   ├── (auth)/  
│   │   │   ├── login/  
│   │   │   │   └── page.tsx              \# 로그인 페이지  
│   │   │   └── callback/  
│   │   │       └── route.ts              \# OAuth 콜백  
│   │   │  
│   │   ├── (dashboard)/  
│   │   │   ├── layout.tsx                \# 대시보드 레이아웃  
│   │   │   ├── page.tsx                  \# 마켓 오버뷰 (메인)  
│   │   │   ├── trending/  
│   │   │   │   └── page.tsx  
│   │   │   ├── game/  
│   │   │   │   └── \[appId\]/  
│   │   │   │       └── page.tsx  
│   │   │   ├── opportunities/  
│   │   │   │   └── page.tsx  
│   │   │   ├── competitors/  
│   │   │   │   └── page.tsx  
│   │   │   ├── hype/  
│   │   │   │   └── page.tsx  
│   │   │   ├── sales/  
│   │   │   │   └── page.tsx  
│   │   │   └── watchlist/  
│   │   │       └── page.tsx  
│   │   │  
│   │   ├── api/  
│   │   │   ├── steam/  
│   │   │   │   ├── ccu/route.ts  
│   │   │   │   ├── app/\[appId\]/route.ts  
│   │   │   │   ├── reviews/\[appId\]/route.ts  
│   │   │   │   ├── featured/route.ts  
│   │   │   │   ├── search/route.ts  
│   │   │   │   └── news/\[appId\]/route.ts  
│   │   │   │  
│   │   │   ├── steamspy/  
│   │   │   │   └── \[appId\]/route.ts  
│   │   │   │  
│   │   │   ├── insight/  
│   │   │   │   ├── trending/route.ts  
│   │   │   │   ├── game/\[appId\]/route.ts  
│   │   │   │   └── opportunity/route.ts  
│   │   │   │  
│   │   │   └── watchlist/route.ts  
│   │   │  
│   │   ├── layout.tsx  
│   │   └── globals.css  
│   │  
│   ├── components/  
│   │   ├── ui/                           \# shadcn (자동 생성)  
│   │   ├── layout/  
│   │   │   ├── Header.tsx  
│   │   │   ├── Sidebar.tsx  
│   │   │   └── UserMenu.tsx  
│   │   ├── charts/  
│   │   │   ├── CCUChart.tsx  
│   │   │   ├── ReviewChart.tsx  
│   │   │   └── BubbleChart.tsx  
│   │   ├── cards/  
│   │   │   ├── StatCard.tsx  
│   │   │   ├── GameCard.tsx  
│   │   │   └── InsightCard.tsx  
│   │   └── tables/  
│   │       ├── TrendingTable.tsx  
│   │       └── WatchlistTable.tsx  
│   │  
│   ├── lib/  
│   │   ├── api/  
│   │   │   ├── steam.ts  
│   │   │   ├── steamspy.ts  
│   │   │   └── gemini.ts                 \# 다중 키 로테이션  
│   │   ├── supabase/  
│   │   │   ├── client.ts  
│   │   │   └── server.ts  
│   │   ├── redis.ts  
│   │   ├── algorithms/  
│   │   │   ├── boxleiter.ts  
│   │   │   ├── trending.ts  
│   │   │   └── opportunity.ts  
│   │   └── utils/  
│   │       ├── formatters.ts  
│   │       └── constants.ts  
│   │  
│   ├── hooks/  
│   │   ├── useAuth.ts  
│   │   ├── useCCU.ts  
│   │   ├── useGameDetails.ts  
│   │   └── useWatchlist.ts  
│   │  
│   ├── types/  
│   │   ├── steam.ts  
│   │   ├── game.ts  
│   │   └── database.ts  
│   │  
│   └── middleware.ts  
│  
├── .env.local                            \# 환경 변수 (Git 제외)  
├── .env.local.example                    \# 환경 변수 템플릿  
├── package.json  
└── next.config.js

---

## **9\. 환경 변수 설정**

### **9.1 .env.local.example 파일**

Codespaces에서 `.env.local.example` 파일 생성 후 아래 내용 붙여넣기:

\# \============================================  
\# Supabase  
\# \============================================  
NEXT\_PUBLIC\_SUPABASE\_URL=https://your-project.supabase.co  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=your-anon-key  
SUPABASE\_SERVICE\_ROLE\_KEY=your-service-role-key

\# \============================================  
\# Steam API  
\# \============================================  
STEAM\_API\_KEY=your-steam-api-key

\# \============================================  
\# Google AI (Gemini) \- 다중 키  
\# \============================================  
GEMINI\_API\_KEY\_1=your-gemini-key-1  
GEMINI\_API\_KEY\_2=your-gemini-key-2  
GEMINI\_API\_KEY\_3=your-gemini-key-3  
GEMINI\_API\_KEY\_4=your-gemini-key-4  
GEMINI\_API\_KEY\_5=your-gemini-key-5  
\# 필요시 더 추가  
\# GEMINI\_API\_KEY\_6=...  
\# GEMINI\_API\_KEY\_7=...

\# \============================================  
\# Upstash Redis  
\# \============================================  
UPSTASH\_REDIS\_REST\_URL=https://your-redis.upstash.io  
UPSTASH\_REDIS\_REST\_TOKEN=your-redis-token

\# \============================================  
\# App Config  
\# \============================================  
NEXT\_PUBLIC\_APP\_URL=http://localhost:3000

### **9.2 실제 .env.local 파일 생성**

1. Codespaces에서 `.env.local` 파일 생성  
2. `.env.local.example` 내용 복사  
3. 각 서비스에서 발급받은 실제 키 입력

### **9.3 키 발급 위치**

| 서비스 | 발급 URL | 비고 |
| ----- | ----- | ----- |
| Supabase | https://supabase.com/dashboard | 프로젝트 Settings → API |
| Steam API | https://steamcommunity.com/dev/apikey | 도메인: `localhost` |
| Gemini | https://aistudio.google.com/app/apikey | **5개 이상 발급** (계정 여러 개 또는 프로젝트별) |
| Upstash | https://console.upstash.com/ | Redis 생성 후 REST API 탭 |

### **9.4 Gemini 다중 키 발급 방법**

**방법 1: 같은 계정에서 여러 프로젝트 생성**

1. Google Cloud Console → 프로젝트 생성 (steam-pulse-1, steam-pulse-2...)  
2. 각 프로젝트에서 Gemini API 활성화  
3. 각각 API 키 발급

**방법 2: 여러 Google 계정 사용**

1. 각 계정으로 AI Studio 접속  
2. API 키 발급

**방법 3: AI Studio에서 여러 키 생성**

1. https://aistudio.google.com/app/apikey  
2. "Create API key" 반복 클릭 (프로젝트별로 생성)

---

## **10\. 개발 Phase별 가이드**

### **Phase 1: 프로젝트 셋업 \+ 인증**

#### **Claude에게 첫 요청 (Codespaces 터미널에서 진행)**

안녕하세요\! SteamPulse 개발을 시작합니다.

저는 코딩을 직접 못하고, Claude가 제공하는 코드를 복사/붙여넣기로 파일을 만들 예정입니다.

현재 상태:  
\- GitHub Codespaces에서 Next.js 프로젝트 생성 완료  
\- 패키지 설치 완료  
\- Supabase, Upstash, Gemini 계정 생성 완료

Phase 1 Day 1을 시작해주세요:  
1\. src/types/steam.ts  
2\. src/types/database.ts    
3\. src/lib/utils/constants.ts  
4\. src/lib/utils/formatters.ts

각 파일의 전체 코드와 Codespaces에서 파일 생성하는 방법을 알려주세요.

#### **Codespaces에서 파일 생성하는 방법**

1. **좌측 Explorer 패널**에서 `src` 폴더 우클릭  
2. "New Folder" → 폴더명 입력 (예: `types`)  
3. 생성된 폴더 우클릭 → "New File" → 파일명 입력 (예: `steam.ts`)  
4. Claude가 제공한 코드 **전체 복사**  
5. 파일에 **붙여넣기** (Cmd+V)  
6. **저장** (Cmd+S)

### **Phase 2-4: 이후 개발**

PRD의 Phase별 가이드 동일하게 진행. 단, 모든 작업은 **브라우저의 Codespaces**에서\!

---

## **11\. 배포 (Vercel)**

### **11.1 GitHub 연동 배포**

1. https://vercel.com 접속 → GitHub로 로그인  
2. "Add New Project" 클릭  
3. `steam-pulse` Repository 선택 → "Import"  
4. 환경 변수 입력:  
   * "Environment Variables" 섹션에서  
   * `.env.local`의 모든 키-값 추가  
5. "Deploy" 클릭

### **11.2 환경 변수 입력 (Vercel)**

| Key | Value |
| ----- | ----- |
| NEXT\_PUBLIC\_SUPABASE\_URL | (Supabase URL) |
| NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY | (Supabase Anon Key) |
| SUPABASE\_SERVICE\_ROLE\_KEY | (Supabase Service Role Key) |
| STEAM\_API\_KEY | (Steam API Key) |
| GEMINI\_API\_KEY\_1 | (Gemini Key 1\) |
| GEMINI\_API\_KEY\_2 | (Gemini Key 2\) |
| GEMINI\_API\_KEY\_3 | (Gemini Key 3\) |
| GEMINI\_API\_KEY\_4 | (Gemini Key 4\) |
| GEMINI\_API\_KEY\_5 | (Gemini Key 5\) |
| UPSTASH\_REDIS\_REST\_URL | (Upstash URL) |
| UPSTASH\_REDIS\_REST\_TOKEN | (Upstash Token) |
| NEXT\_PUBLIC\_APP\_URL | (Vercel 배포 URL) |

---

## **12\. 비용 요약**

| 서비스 | 무료 티어 한도 | 예상 사용량 | 상태 |
| ----- | ----- | ----- | ----- |
| Vercel | 100GB BW | \~10GB/월 | ✅ 충분 |
| Supabase | 500MB DB | \~100MB | ✅ 충분 |
| Upstash Redis | 10K req/day | \~5K | ✅ 충분 |
| Gemini (5키) | 5,000 RPD | \~400 | ✅ 충분 |
| GitHub Codespaces | 60시간/월 | \~20시간 | ✅ 충분 |
| **총 월 비용** | \- | \- | **$0** |

---

## **13\. 체크리스트**

### **초기 설정 체크리스트**

* \[ \] GitHub 계정 생성/로그인  
* \[ \] Repository 생성 (`steam-pulse`)  
* \[ \] Codespaces 실행  
* \[ \] Next.js 프로젝트 생성  
* \[ \] 패키지 설치 완료  
* \[ \] shadcn/ui 설치 완료

### **외부 서비스 체크리스트**

* \[ \] Supabase 프로젝트 생성  
* \[ \] Supabase Google OAuth 설정  
* \[ \] Steam API 키 발급  
* \[ \] Gemini API 키 5개 이상 발급  
* \[ \] Upstash Redis 생성  
* \[ \] `.env.local` 파일 작성

### **Phase 1 완료 체크리스트**

* \[ \] DB 스키마 적용 (Supabase SQL)  
* \[ \] Gemini RPC 함수 생성  
* \[ \] 인증 시스템 구현  
* \[ \] 로그인/로그아웃 동작 확인

### **배포 체크리스트**

* \[ \] Vercel 연동  
* \[ \] 환경 변수 입력  
* \[ \] 배포 성공  
* \[ \] 프로덕션 URL 동작 확인

---

**문서 끝**

