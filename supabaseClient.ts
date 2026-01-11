
import { createClient } from '@supabase/supabase-js';

/**
 * 使用環境變數（Vite）載入 Supabase 設定
 * - VITE_SUPABASE_URL: Supabase 專案 URL
 * - VITE_SUPABASE_ANON_KEY: Supabase anon/public key
 * 請勿將實際金鑰直接推上公開的程式碼庫。
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
