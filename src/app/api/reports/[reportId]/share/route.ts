// 리포트 공유 API
// GET /api/reports/[reportId]/share - 공유 설정 조회
// POST /api/reports/[reportId]/share - 사용자와 공유
// PATCH /api/reports/[reportId]/share - 공유 링크 설정
// DELETE /api/reports/[reportId]/share - 공유 취소

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import type { ReportShare, SharePermission } from '@/types/report';
import { parseReportShares, toReportSharesJson } from '@/lib/validation/reportJson';

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

/**
 * 공유 설정 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    const { data: reportData, error } = await supabase
      .from('reports')
      .select('created_by, is_public, share_link, share_password, share_expiry, shares')
      .eq('id', reportId)
      .single();

    if (error || !reportData) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // 소유자만 공유 설정 조회 가능
    if (reportData.created_by !== user.id) {
      return NextResponse.json({
        success: false,
        error: '접근 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        isPublic: reportData.is_public,
        shareLink: reportData.share_link,
        sharePassword: reportData.share_password ? true : false, // 비밀번호 존재 여부만 전달
        shareExpiry: reportData.share_expiry,
        shares: reportData.shares || [],
      },
    });

  } catch (error) {
    console.error('Share get API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 사용자와 공유 (이메일로)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    const body = await request.json();
    const { email, permission = 'view' } = body as { email: string; permission?: SharePermission };

    if (!email) {
      return NextResponse.json({
        success: false,
        error: '이메일이 필요합니다',
        code: 'INVALID_INPUT',
      }, { status: 400 });
    }

    // 리포트 조회
    const { data: reportData, error: fetchError } = await supabase
      .from('reports')
      .select('created_by, shares')
      .eq('id', reportId)
      .single();

    if (fetchError || !reportData) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // 소유자만 공유 가능
    if (reportData.created_by !== user.id) {
      return NextResponse.json({
        success: false,
        error: '공유 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const { data: existingShares } = parseReportShares(reportData.shares, reportId);

    // 이미 공유되어 있는지 확인
    if (existingShares.some((s) => s.sharedWith === email)) {
      return NextResponse.json({
        success: false,
        error: '이미 공유된 사용자입니다',
        code: 'ALREADY_SHARED',
      }, { status: 409 });
    }

    // 본인에게 공유 불가
    if (email === user.email) {
      return NextResponse.json({
        success: false,
        error: '본인에게는 공유할 수 없습니다',
        code: 'CANNOT_SHARE_SELF',
      }, { status: 400 });
    }

    // 새 공유 추가
    const newShare: ReportShare = {
      id: randomBytes(8).toString('hex'),
      reportId,
      sharedWith: email,
      permission,
      sharedAt: new Date().toISOString(),
      sharedBy: user.id,
    };

    const updatedShares = [...existingShares, newShare];

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        shares: toReportSharesJson(updatedShares),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '공유 추가에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newShare,
    });

  } catch (error) {
    console.error('Share add API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 공유 링크 설정 (public 설정, 링크 생성, 비밀번호, 만료일)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      isPublic,
      generateLink,
      password,
      removePassword,
      expiryDays,
    } = body as {
      isPublic?: boolean;
      generateLink?: boolean;
      password?: string;
      removePassword?: boolean;
      expiryDays?: number;
    };

    // 리포트 조회
    const { data: reportData, error: fetchError } = await supabase
      .from('reports')
      .select('created_by')
      .eq('id', reportId)
      .single();

    if (fetchError || !reportData) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // 소유자만 설정 변경 가능
    if (reportData.created_by !== user.id) {
      return NextResponse.json({
        success: false,
        error: '설정 변경 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (isPublic !== undefined) {
      updateData.is_public = isPublic;
    }

    if (generateLink) {
      // 새 공유 링크 생성
      updateData.share_link = randomBytes(16).toString('hex');
    }

    if (password) {
      updateData.share_password = password; // 실제 환경에서는 해시 처리 필요
    }

    if (removePassword) {
      updateData.share_password = null;
    }

    if (expiryDays !== undefined) {
      if (expiryDays > 0) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + expiryDays);
        updateData.share_expiry = expiry.toISOString();
      } else {
        updateData.share_expiry = null;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update(updateData as never)
      .eq('id', reportId)
      .select('is_public, share_link, share_expiry')
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '설정 변경에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        isPublic: updated.is_public,
        shareLink: updated.share_link,
        shareExpiry: updated.share_expiry,
      },
    });

  } catch (error) {
    console.error('Share settings API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 공유 취소 (특정 사용자)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const shareId = url.searchParams.get('shareId');
    const email = url.searchParams.get('email');

    if (!shareId && !email) {
      return NextResponse.json({
        success: false,
        error: 'shareId 또는 email이 필요합니다',
        code: 'INVALID_INPUT',
      }, { status: 400 });
    }

    // 리포트 조회
    const { data: reportData, error: fetchError } = await supabase
      .from('reports')
      .select('created_by, shares')
      .eq('id', reportId)
      .single();

    if (fetchError || !reportData) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // 소유자만 공유 취소 가능
    if (reportData.created_by !== user.id) {
      return NextResponse.json({
        success: false,
        error: '공유 취소 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const { data: existingShares } = parseReportShares(reportData.shares, reportId);
    const filteredShares = existingShares.filter((s) =>
      shareId ? s.id !== shareId : s.sharedWith !== email
    );

    if (filteredShares.length === existingShares.length) {
      return NextResponse.json({
        success: false,
        error: '해당 공유를 찾을 수 없습니다',
        code: 'SHARE_NOT_FOUND',
      }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        shares: toReportSharesJson(filteredShares),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '공유 취소에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '공유가 취소되었습니다',
    });

  } catch (error) {
    console.error('Share remove API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
