-- ============================================
-- Steam Pulse: 스트리밍-게임 분석 시스템 SQL 스키마
--
-- 사용법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- ============================================
-- 1. 스트리밍 히스토리 테이블 (시간당 집계)
-- ============================================
CREATE TABLE IF NOT EXISTS streaming_history (
  id BIGSERIAL PRIMARY KEY,
  game_name VARCHAR(200) NOT NULL,
  steam_app_id INTEGER,
  platform VARCHAR(20) NOT NULL,  -- 'twitch' | 'chzzk' | 'total'
  total_viewers INTEGER NOT NULL DEFAULT 0,
  live_streams INTEGER NOT NULL DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  unique_streamers INTEGER DEFAULT 0,
  top_streamers JSONB DEFAULT '[]',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT streaming_history_unique UNIQUE (game_name, platform, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_streaming_game_time ON streaming_history(game_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_streaming_app_time ON streaming_history(steam_app_id, recorded_at DESC) WHERE steam_app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_streaming_platform_time ON streaming_history(platform, recorded_at DESC);

-- ============================================
-- 2. 일별 스트리밍 집계 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS streaming_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  game_name VARCHAR(200) NOT NULL,
  steam_app_id INTEGER,
  platform VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  avg_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_stream_hours DECIMAL(10,2) DEFAULT 0,
  unique_streamers INTEGER DEFAULT 0,
  avg_streams INTEGER DEFAULT 0,
  viewer_change_pct DECIMAL(5,2),
  stream_change_pct DECIMAL(5,2),
  CONSTRAINT streaming_daily_unique UNIQUE (game_name, platform, date)
);

CREATE INDEX IF NOT EXISTS idx_streaming_daily_game ON streaming_daily_stats(game_name, date DESC);
CREATE INDEX IF NOT EXISTS idx_streaming_daily_app ON streaming_daily_stats(steam_app_id, date DESC) WHERE steam_app_id IS NOT NULL;

-- ============================================
-- 3. 스트리머(인플루언서) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS streamers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(20) NOT NULL,
  platform_id VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  login_name VARCHAR(200),
  profile_image_url TEXT,
  description TEXT,
  language VARCHAR(10) DEFAULT 'ko',
  follower_count INTEGER DEFAULT 0,
  subscriber_count INTEGER,
  tier VARCHAR(20) DEFAULT 'micro',  -- 'mega' | 'macro' | 'micro' | 'nano'
  contact_email VARCHAR(200),
  contact_discord VARCHAR(100),
  contact_twitter VARCHAR(100),
  business_inquiry_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT streamers_platform_unique UNIQUE (platform, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_streamers_tier ON streamers(tier);
CREATE INDEX IF NOT EXISTS idx_streamers_followers ON streamers(follower_count DESC);

-- ============================================
-- 4. 스트리머 활동 기록
-- ============================================
CREATE TABLE IF NOT EXISTS streamer_activity (
  id BIGSERIAL PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  game_name VARCHAR(200) NOT NULL,
  steam_app_id INTEGER,
  stream_title VARCHAR(500),
  viewer_count INTEGER NOT NULL DEFAULT 0,
  follower_count_snapshot INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streamer_activity_streamer ON streamer_activity(streamer_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_streamer_activity_game ON streamer_activity(game_name, recorded_at DESC);

-- ============================================
-- 5. 스트리머-게임 관계 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS streamer_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  game_name VARCHAR(200) NOT NULL,
  steam_app_id INTEGER,
  total_streams INTEGER DEFAULT 0,
  total_hours DECIMAL(10,2) DEFAULT 0,
  avg_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  last_streamed_at TIMESTAMP WITH TIME ZONE,
  first_streamed_at TIMESTAMP WITH TIME ZONE,
  affinity_score INTEGER DEFAULT 0,  -- 0-100: 게임에 대한 스트리머 친화도
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT streamer_games_unique UNIQUE (streamer_id, game_name)
);

CREATE INDEX IF NOT EXISTS idx_streamer_games_game ON streamer_games(game_name);
CREATE INDEX IF NOT EXISTS idx_streamer_games_app ON streamer_games(steam_app_id) WHERE steam_app_id IS NOT NULL;

-- ============================================
-- 6. 통합 일별 메트릭 (상관관계 분석용)
-- ============================================
CREATE TABLE IF NOT EXISTS game_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  steam_app_id INTEGER NOT NULL,
  game_name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,

  -- Steam 메트릭
  ccu_avg INTEGER,
  ccu_peak INTEGER,
  review_count INTEGER,
  review_positive INTEGER,
  price_usd DECIMAL(10,2),
  discount_percent INTEGER DEFAULT 0,

  -- 스트리밍 메트릭 (합산)
  streaming_viewers_avg INTEGER,
  streaming_viewers_peak INTEGER,
  streaming_streams_avg INTEGER,
  streaming_unique_streamers INTEGER,
  streaming_hours_total DECIMAL(10,2),

  -- 플랫폼별
  twitch_viewers_avg INTEGER,
  twitch_streams_avg INTEGER,
  chzzk_viewers_avg INTEGER,
  chzzk_streams_avg INTEGER,

  -- 변화율
  ccu_change_1d DECIMAL(5,2),
  ccu_change_7d DECIMAL(5,2),
  streaming_change_1d DECIMAL(5,2),
  streaming_change_7d DECIMAL(5,2),

  -- 계산 지표
  streaming_to_ccu_ratio DECIMAL(10,4),  -- 스트리밍 시청자 / CCU
  viewer_conversion_rate DECIMAL(5,4),   -- 추정 전환율

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT game_daily_metrics_unique UNIQUE (steam_app_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_app ON game_daily_metrics(steam_app_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON game_daily_metrics(date DESC);

-- ============================================
-- 7. 인플루언서 효과 측정 이벤트
-- ============================================
CREATE TABLE IF NOT EXISTS influencer_impact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID REFERENCES streamers(id) ON DELETE SET NULL,
  streamer_name VARCHAR(200) NOT NULL,
  streamer_tier VARCHAR(20),
  streamer_followers INTEGER,

  game_name VARCHAR(200) NOT NULL,
  steam_app_id INTEGER,

  stream_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stream_ended_at TIMESTAMP WITH TIME ZONE,
  stream_duration_minutes INTEGER,
  stream_peak_viewers INTEGER NOT NULL,
  stream_avg_viewers INTEGER,

  -- 영향 측정
  ccu_before INTEGER,        -- 방송 시작 1시간 전 CCU
  ccu_during_peak INTEGER,   -- 방송 중 최고 CCU
  ccu_after INTEGER,         -- 방송 종료 1시간 후 CCU
  ccu_change_pct DECIMAL(5,2),

  reviews_before_24h INTEGER,  -- 방송 전 24시간 리뷰 수
  reviews_after_24h INTEGER,   -- 방송 후 24시간 리뷰 수
  review_spike_pct DECIMAL(5,2),

  -- 추정값
  estimated_views INTEGER,       -- 추정 총 시청
  estimated_purchases INTEGER,   -- 추정 구매 수
  estimated_revenue_usd DECIMAL(10,2),

  -- 점수
  impact_score INTEGER,  -- 0-100
  impact_grade VARCHAR(5),  -- S, A, B, C, D

  is_sponsored BOOLEAN DEFAULT FALSE,
  campaign_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impact_game ON influencer_impact_events(game_name, stream_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_app ON influencer_impact_events(steam_app_id, stream_started_at DESC) WHERE steam_app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_impact_streamer ON influencer_impact_events(streamer_id, stream_started_at DESC);

-- ============================================
-- 8. 마케팅 캠페인 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  game_name VARCHAR(200) NOT NULL,
  steam_app_id INTEGER,

  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',  -- 'draft' | 'active' | 'paused' | 'completed'

  budget_usd DECIMAL(12,2),
  spent_usd DECIMAL(12,2) DEFAULT 0,

  target_streamers UUID[] DEFAULT '{}',
  confirmed_streamers UUID[] DEFAULT '{}',

  -- 성과 (자동 계산)
  total_streams INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  total_stream_hours DECIMAL(10,2) DEFAULT 0,
  estimated_impressions INTEGER DEFAULT 0,
  estimated_purchases INTEGER DEFAULT 0,
  estimated_revenue_usd DECIMAL(12,2) DEFAULT 0,

  -- ROI 지표
  roi_percentage DECIMAL(8,2),
  cost_per_viewer DECIMAL(8,4),
  cost_per_purchase DECIMAL(8,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON marketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_game ON marketing_campaigns(game_name);

-- ============================================
-- 9. 스트리밍 알림 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS streaming_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,  -- 'viewer_spike' | 'new_influencer' | 'competitor_surge' | 'trend_change'
  game_name VARCHAR(200),
  steam_app_id INTEGER,
  streamer_id UUID REFERENCES streamers(id) ON DELETE SET NULL,
  streamer_name VARCHAR(200),
  title VARCHAR(300) NOT NULL,
  message TEXT,
  metrics JSONB,  -- 알림 관련 수치 데이터
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streaming_alerts_user ON streaming_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streaming_alerts_game ON streaming_alerts(game_name, created_at DESC);

-- ============================================
-- 10. PostgreSQL 함수 및 트리거
-- ============================================

-- 스트리머 등급 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_streamer_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.follower_count >= 100000 THEN 'mega'
    WHEN NEW.follower_count >= 10000 THEN 'macro'
    WHEN NEW.follower_count >= 1000 THEN 'micro'
    ELSE 'nano'
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_streamer_tier ON streamers;
CREATE TRIGGER trigger_update_streamer_tier
BEFORE INSERT OR UPDATE OF follower_count ON streamers
FOR EACH ROW EXECUTE FUNCTION update_streamer_tier();

-- 일별 스트리밍 집계 함수
CREATE OR REPLACE FUNCTION aggregate_streaming_daily_stats(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS INTEGER AS $$
DECLARE
  rows_inserted INTEGER;
BEGIN
  INSERT INTO streaming_daily_stats (
    game_name, steam_app_id, platform, date,
    avg_viewers, peak_viewers, unique_streamers, avg_streams
  )
  SELECT
    sh.game_name,
    sh.steam_app_id,
    sh.platform,
    p_date,
    ROUND(AVG(sh.total_viewers)),
    MAX(sh.peak_viewers),
    MAX(sh.unique_streamers),
    ROUND(AVG(sh.live_streams))
  FROM streaming_history sh
  WHERE DATE(sh.recorded_at) = p_date
  GROUP BY sh.game_name, sh.steam_app_id, sh.platform
  ON CONFLICT (game_name, platform, date)
  DO UPDATE SET
    avg_viewers = EXCLUDED.avg_viewers,
    peak_viewers = EXCLUDED.peak_viewers,
    unique_streamers = EXCLUDED.unique_streamers,
    avg_streams = EXCLUDED.avg_streams;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$ LANGUAGE plpgsql;

-- 영향도 점수 계산 함수
CREATE OR REPLACE FUNCTION calculate_impact_score(
  p_stream_viewers INTEGER,
  p_ccu_change_pct DECIMAL,
  p_review_spike_pct DECIMAL
) RETURNS INTEGER AS $$
DECLARE
  viewer_score INTEGER;
  ccu_score INTEGER;
  review_score INTEGER;
BEGIN
  -- 시청자 수 점수 (최대 30점)
  viewer_score := LEAST(GREATEST(p_stream_viewers / 100, 0), 30);

  -- CCU 변화 점수 (최대 40점)
  ccu_score := CASE
    WHEN p_ccu_change_pct >= 50 THEN 40
    WHEN p_ccu_change_pct >= 20 THEN 30
    WHEN p_ccu_change_pct >= 10 THEN 20
    WHEN p_ccu_change_pct >= 5 THEN 10
    ELSE 0
  END;

  -- 리뷰 급증 점수 (최대 30점)
  review_score := CASE
    WHEN p_review_spike_pct >= 100 THEN 30
    WHEN p_review_spike_pct >= 50 THEN 20
    WHEN p_review_spike_pct >= 20 THEN 10
    ELSE 0
  END;

  RETURN LEAST(viewer_score + ccu_score + review_score, 100);
END;
$$ LANGUAGE plpgsql;

-- 영향도 등급 계산 함수
CREATE OR REPLACE FUNCTION get_impact_grade(p_score INTEGER)
RETURNS VARCHAR(5) AS $$
BEGIN
  RETURN CASE
    WHEN p_score >= 90 THEN 'S'
    WHEN p_score >= 70 THEN 'A'
    WHEN p_score >= 50 THEN 'B'
    WHEN p_score >= 30 THEN 'C'
    ELSE 'D'
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. Row Level Security (RLS) 정책
-- ============================================

-- 스트리밍 히스토리: 모든 인증 사용자 읽기 가능
ALTER TABLE streaming_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_history_read_policy" ON streaming_history
  FOR SELECT USING (true);

-- 스트리머: 모든 인증 사용자 읽기 가능
ALTER TABLE streamers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streamers_read_policy" ON streamers
  FOR SELECT USING (true);

-- 마케팅 캠페인: 본인 것만 접근 가능
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_user_policy" ON marketing_campaigns
  FOR ALL USING (auth.uid() = user_id);

-- 스트리밍 알림: 본인 것만 접근 가능
ALTER TABLE streaming_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_user_policy" ON streaming_alerts
  FOR ALL USING (auth.uid() = user_id);

-- 인플루언서 효과: 모든 인증 사용자 읽기 가능
ALTER TABLE influencer_impact_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impact_read_policy" ON influencer_impact_events
  FOR SELECT USING (true);

-- 일별 메트릭: 모든 인증 사용자 읽기 가능
ALTER TABLE game_daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_read_policy" ON game_daily_metrics
  FOR SELECT USING (true);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '스트리밍 분석 스키마가 성공적으로 생성되었습니다!';
  RAISE NOTICE '생성된 테이블: streaming_history, streaming_daily_stats, streamers, streamer_activity, streamer_games, game_daily_metrics, influencer_impact_events, marketing_campaigns, streaming_alerts';
END $$;
