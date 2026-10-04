'use client';

import { createClient } from '@/lib/supabase/client';

export type DutyKtx = string;

export interface DutyAssignmentRow {
  id?: string;
  duty_date: string;
  profile_id: string;
  duty_ktx: string;
  updated_by?: string | null;
  updated_at?: string;
}

export interface SpecialistWithDuty {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'staff';
  assignedBlocks: string[];
  dutyKtx: DutyKtx;
  status: 'on_duty' | 'off_duty';
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Vietnam timezone (Asia/Ho_Chi_Minh)
 */
export function getTodayDateVietnam(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const vnTime = new Date(utc + (3600000 * 7));
    return vnTime.toISOString().split('T')[0];
  }
}

/**
 * Helper to check if Supabase error is caused by missing table in schema cache
 */
export function isTableMissingError(msg?: string, code?: string): boolean {
  if (!msg && !code) return false;
  const m = (msg || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    m.includes('could not find the table') ||
    m.includes('relation') && m.includes('does not exist') ||
    m.includes('schema cache')
  );
}

/**
 * Fetches duty assignments from Supabase `duty_assignments` table for a specific date
 */
export async function fetchDutyAssignmentsFromSupabase(
  targetDate?: string
): Promise<{ data: Record<string, string> | null; isTableMissing: boolean; error: string | null }> {
  try {
    const supabase = createClient();
    const dateStr = targetDate || getTodayDateVietnam();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select('profile_id, duty_ktx')
      .eq('duty_date', dateStr);

    if (error) {
      if (isTableMissingError(error.message, error.code)) {
        // Table hasn't been created in Supabase yet; return empty map gracefully
        return { data: {}, isTableMissing: true, error: null };
      }
      console.warn('Duty assignments fetch warning:', error.message);
      return { data: null, isTableMissing: false, error: error.message };
    }

    const map: Record<string, string> = {};
    (data || []).forEach((row: { profile_id: string; duty_ktx: string }) => {
      if (row.profile_id) {
        map[row.profile_id] = row.duty_ktx || 'Nghỉ';
      }
    });

    return { data: map, isTableMissing: false, error: null };
  } catch (err: any) {
    if (isTableMissingError(err?.message)) {
      return { data: {}, isTableMissing: true, error: null };
    }
    console.warn('Failed to load duty assignments:', err?.message || err);
    return { data: null, isTableMissing: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Upserts a single specialist duty assignment to Supabase `duty_assignments`
 */
export async function upsertDutyAssignmentToSupabase(
  profileId: string,
  dutyKtx: string,
  updatedBy?: string | null,
  targetDate?: string
): Promise<{ success: boolean; isTableMissing: boolean; error: string | null }> {
  try {
    const supabase = createClient();
    const dateStr = targetDate || getTodayDateVietnam();
    const normalizedKtx = dutyKtx.trim() || 'Nghỉ';

    const payload: {
      duty_date: string;
      profile_id: string;
      duty_ktx: string;
      updated_by?: string | null;
      updated_at: string;
    } = {
      duty_date: dateStr,
      profile_id: profileId,
      duty_ktx: normalizedKtx,
      updated_at: new Date().toISOString(),
    };

    if (updatedBy) {
      payload.updated_by = updatedBy;
    }

    const { error } = await supabase
      .from('duty_assignments')
      .upsert(payload, { onConflict: 'duty_date,profile_id' });

    if (error) {
      if (isTableMissingError(error.message, error.code)) {
        return {
          success: false,
          isTableMissing: true,
          error: 'Bảng duty_assignments chưa được tạo trong Supabase SQL Editor. Vui lòng chạy đoạn SQL khởi tạo.',
        };
      }
      return { success: false, isTableMissing: false, error: error.message };
    }

    return { success: true, isTableMissing: false, error: null };
  } catch (err: any) {
    const isMissing = isTableMissingError(err?.message);
    return {
      success: false,
      isTableMissing: isMissing,
      error: isMissing
        ? 'Bảng duty_assignments chưa được tạo trong Supabase SQL Editor.'
        : (err?.message || 'Lỗi kết nối cơ sở dữ liệu'),
    };
  }
}

/**
 * Batch upserts duty assignments for multiple specialists to Supabase
 */
export async function batchUpsertDutyAssignmentsToSupabase(
  profileIds: string[],
  dutyKtx: string,
  updatedBy?: string | null,
  targetDate?: string
): Promise<{ success: boolean; isTableMissing: boolean; error: string | null }> {
  try {
    if (!profileIds || profileIds.length === 0) {
      return { success: true, isTableMissing: false, error: null };
    }

    const supabase = createClient();
    const dateStr = targetDate || getTodayDateVietnam();
    const normalizedKtx = dutyKtx.trim() || 'Nghỉ';
    const nowIso = new Date().toISOString();

    const payload = profileIds.map(pid => ({
      duty_date: dateStr,
      profile_id: pid,
      duty_ktx: normalizedKtx,
      updated_by: updatedBy || null,
      updated_at: nowIso,
    }));

    const { error } = await supabase
      .from('duty_assignments')
      .upsert(payload, { onConflict: 'duty_date,profile_id' });

    if (error) {
      if (isTableMissingError(error.message, error.code)) {
        return {
          success: false,
          isTableMissing: true,
          error: 'Bảng duty_assignments chưa được tạo trong Supabase SQL Editor. Vui lòng chạy đoạn SQL khởi tạo.',
        };
      }
      return { success: false, isTableMissing: false, error: error.message };
    }

    return { success: true, isTableMissing: false, error: null };
  } catch (err: any) {
    const isMissing = isTableMissingError(err?.message);
    return {
      success: false,
      isTableMissing: isMissing,
      error: isMissing
        ? 'Bảng duty_assignments chưa được tạo trong Supabase SQL Editor.'
        : (err?.message || 'Lỗi kết nối cơ sở dữ liệu'),
    };
  }
}
