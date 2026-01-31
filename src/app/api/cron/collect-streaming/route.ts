/**
 * 스트리밍 데이터 수집 Cron Job
 * 매 시간 실행: Twitch, Chzzk에서 인기 게임 스트리밍 데이터를 수집하여 DB 저장
 *
 * Vercel Cron: 매 시간 0분 (0 * * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as twitch from '@/lib/streaming/twitch';
import * as chzzk from '@/lib/streaming/chzzk';
import { standardizeGameName } from '@/lib/streaming/gameNameMatcher';
import type { Database, Json } from '@/types/database';

// Lazy initialization to avoid build-time env requirement
function getSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface StreamerData {
  id: string;
  name: string;
  platform: 'twitch' | 'chzzk';
  viewers: number;
  followers?: number;
}

interface GameStreamingData {
  gameName: string;
  steamAppId?: number;
  platform: 'twitch' | 'chzzk';
  totalViewers: number;
  liveStreams: number;
  peakViewers: number;
  uniqueStreamers: number;
  topStreamers: StreamerData[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const CRON_SECRET = process.env.CRON_SECRET || '';

    // Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Collecting streaming data...');
    const startTime = Date.now();

    // 병렬로 Twitch, Chzzk 데이터 수집
    const [twitchData, chzzkData] = await Promise.all([
      collectTwitchData(),
      collectChzzkData(),
    ]);

    // 게임별로 데이터 통합 및 저장
    const gameDataMap = new Map<string, {
      twitch?: GameStreamingData;
      chzzk?: GameStreamingData;
    }>();

    // Twitch 데이터 정리
    for (const data of twitchData) {
      const standardName = standardizeGameName(data.gameName, 'twitch');
      const existing = gameDataMap.get(standardName) || {};
      existing.twitch = { ...data, gameName: standardName };
      gameDataMap.set(standardName, existing);
    }

    // Chzzk 데이터 정리
    for (const data of chzzkData) {
      const standardName = standardizeGameName(data.gameName, 'chzzk');
      const existing = gameDataMap.get(standardName) || {};
      existing.chzzk = { ...data, gameName: standardName };
      gameDataMap.set(standardName, existing);
    }

    // DB에 저장
    const now = new Date().toISOString();
    const insertPromises: Promise<unknown>[] = [];
    let insertedCount = 0;
    let errorCount = 0;

    for (const [gameName, platforms] of gameDataMap) {
      // Twitch 데이터 저장
      if (platforms.twitch) {
        insertPromises.push(
          insertStreamingHistory(supabase, platforms.twitch, now)
            .then(() => insertedCount++)
            .catch((e) => {
              console.error(`[Cron] Error inserting Twitch data for ${gameName}:`, e);
              errorCount++;
            })
        );
      }

      // Chzzk 데이터 저장
      if (platforms.chzzk) {
        insertPromises.push(
          insertStreamingHistory(supabase, platforms.chzzk, now)
            .then(() => insertedCount++)
            .catch((e) => {
              console.error(`[Cron] Error inserting Chzzk data for ${gameName}:`, e);
              errorCount++;
            })
        );
      }

      // 통합 데이터 저장
      const totalViewers = (platforms.twitch?.totalViewers || 0) + (platforms.chzzk?.totalViewers || 0);
      const totalStreams = (platforms.twitch?.liveStreams || 0) + (platforms.chzzk?.liveStreams || 0);

      if (totalViewers > 0) {
        const topStreamers: StreamerData[] = [
          ...(platforms.twitch?.topStreamers || []),
          ...(platforms.chzzk?.topStreamers || []),
        ].sort((a, b) => b.viewers - a.viewers).slice(0, 10);

        insertPromises.push(
          insertStreamingHistory(supabase, {
            gameName,
            platform: 'total' as const,
            totalViewers,
            liveStreams: totalStreams,
            peakViewers: Math.max(
              platforms.twitch?.peakViewers || 0,
              platforms.chzzk?.peakViewers || 0
            ),
            uniqueStreamers: (platforms.twitch?.uniqueStreamers || 0) + (platforms.chzzk?.uniqueStreamers || 0),
            topStreamers,
          } as GameStreamingData & { platform: 'total' }, now)
            .then(() => insertedCount++)
            .catch((e) => {
              console.error(`[Cron] Error inserting total data for ${gameName}:`, e);
              errorCount++;
            })
        );
      }
    }

    // 스트리머 정보도 저장/업데이트
    const allStreamers: StreamerData[] = [];
    for (const data of twitchData) {
      allStreamers.push(...data.topStreamers);
    }
    for (const data of chzzkData) {
      allStreamers.push(...data.topStreamers);
    }

    // 중복 제거 후 스트리머 upsert
    const uniqueStreamers = new Map<string, StreamerData>();
    for (const streamer of allStreamers) {
      const key = `${streamer.platform}:${streamer.id}`;
      if (!uniqueStreamers.has(key)) {
        uniqueStreamers.set(key, streamer);
      }
    }

    for (const streamer of uniqueStreamers.values()) {
      insertPromises.push(upsertStreamer(supabase, streamer));
    }

    await Promise.all(insertPromises);

    const elapsed = Date.now() - startTime;
    console.log(`[Cron] Streaming data collection complete: ${insertedCount} records, ${errorCount} errors, ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      message: 'Streaming data collected',
      stats: {
        gamesCollected: gameDataMap.size,
        recordsInserted: insertedCount,
        errors: errorCount,
        streamersUpdated: uniqueStreamers.size,
        elapsedMs: elapsed,
      },
    });

  } catch (error) {
    console.error('[Cron] Failed to collect streaming data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Twitch 데이터 수집
 */
async function collectTwitchData(): Promise<GameStreamingData[]> {
  try {
    const topGames = await twitch.getTopGameStreams();

    return topGames.map(item => ({
      gameName: item.game.name,
      platform: 'twitch' as const,
      totalViewers: item.viewerCount,
      liveStreams: item.streamCount,
      peakViewers: item.viewerCount, // 현재 시점 데이터
      uniqueStreamers: item.streamCount,
      topStreamers: [], // 개별 스트림 조회 필요 시 확장
    }));
  } catch (error) {
    console.error('[Cron] Twitch data collection failed:', error);
    return [];
  }
}

/**
 * Chzzk 데이터 수집
 */
async function collectChzzkData(): Promise<GameStreamingData[]> {
  try {
    const topGames = await chzzk.getTopGameStreams();

    return topGames.map(item => ({
      gameName: item.categoryName,
      platform: 'chzzk' as const,
      totalViewers: item.viewerCount,
      liveStreams: item.streamCount,
      peakViewers: item.viewerCount,
      uniqueStreamers: item.streamCount,
      topStreamers: [],
    }));
  } catch (error) {
    console.error('[Cron] Chzzk data collection failed:', error);
    return [];
  }
}

/**
 * streaming_history 테이블에 데이터 삽입
 */
async function insertStreamingHistory(
  supabase: SupabaseClient<Database>,
  data: GameStreamingData & { platform: 'twitch' | 'chzzk' | 'total' },
  recordedAt: string
): Promise<void> {
  const { error } = await supabase
    .from('streaming_history')
    .upsert({
      game_name: data.gameName,
      steam_app_id: data.steamAppId || null,
      platform: data.platform,
      total_viewers: data.totalViewers,
      live_streams: data.liveStreams,
      peak_viewers: data.peakViewers,
      unique_streamers: data.uniqueStreamers,
      top_streamers: data.topStreamers as unknown as Json,
      recorded_at: recordedAt,
    }, {
      onConflict: 'game_name,platform,recorded_at',
    });

  if (error) {
    throw error;
  }
}

/**
 * streamers 테이블에 스트리머 정보 upsert
 */
async function upsertStreamer(
  supabase: SupabaseClient<Database>,
  streamer: StreamerData
): Promise<void> {
  const { error } = await supabase
    .from('streamers')
    .upsert({
      platform: streamer.platform,
      platform_id: streamer.id,
      display_name: streamer.name,
      follower_count: streamer.followers || 0,
    }, {
      onConflict: 'platform,platform_id',
    });

  if (error && !error.message.includes('duplicate')) {
    console.warn(`[Cron] Streamer upsert warning for ${streamer.name}:`, error.message);
  }
}

// Vercel Cron 설정을 위한 config
export const runtime = 'nodejs';
export const maxDuration = 60;
