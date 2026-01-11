
import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ 注意：如果出現 "Invalid API key" 錯誤
 * 1. 請登入 Supabase 後台 -> Project Settings -> API
 * 2. 複製 "anon" "public" 金鑰 (通常以 eyJ... 開頭)
 * 3. 將下方的 supabaseKey 替換為正確的長字串
 */
const supabaseUrl = '';

// 請確認此處是否為正確的 anon public key (通常長度很長)
const supabaseKey = '';

export const supabase = createClient(supabaseUrl, supabaseKey);
