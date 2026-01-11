
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, BookOpen, RefreshCw, Terminal, Clipboard, Check } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface Stats {
  totalStudents: number;
  totalCourses: number;
  totalRecords: number;
  anomalies: number;
  loading: boolean;
}

const AdminPortal: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [logs, setLogs] = useState<{ type: 'info' | 'error' | 'success'; message: string; isRLS?: boolean; isIndexError?: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'stats'>('import');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalCourses: 0,
    totalRecords: 0,
    anomalies: 0,
    loading: true
  });

  const repairSql = `-- 執行以下 SQL 以修復資料庫結構與權限 (貼到 Supabase SQL Editor)

-- 1. 關閉 RLS 存取限制
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_records DISABLE ROW LEVEL SECURITY;

-- 2. 建立唯一索引
ALTER TABLE student_records ADD CONSTRAINT student_course_unique UNIQUE (student_id, course_code);`;

  const addLog = (type: 'info' | 'error' | 'success', message: string) => {
    const isRLS = message.toLowerCase().includes('row-level security') || message.includes('RLS');
    const isIndexError = message.toLowerCase().includes('unique') || message.includes('conflict');
    setLogs(prev => [{ type, message, isRLS, isIndexError }, ...prev].slice(0, 100));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(repairSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const { count: studentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT');

      const { count: courseCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      const { count: recordCount } = await supabase
        .from('student_records')
        .select('*', { count: 'exact', head: true });

      const { count: anomalyCount } = await supabase
        .from('student_records')
        .select('*', { count: 'exact', head: true })
        .lte('points', 0);

      setStats({
        totalStudents: studentCount || 0,
        totalCourses: courseCount || 0,
        totalRecords: recordCount || 0,
        anomalies: anomalyCount || 0,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImportProgress(0);
    setImportTotal(0);
    setLogs([]);
    addLog('info', `開始讀取檔案: ${file.name}`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // --- Metadata Extraction ---
        const semesterTitle = rawData[0]?.[0]?.toString() || '';
        const semesterMatch = semesterTitle.match(/(\d+學年度第\d+學期)/);
        const semester = semesterMatch ? semesterMatch[1] : semesterTitle.replace('服務學習點數登錄表', '').trim() || '未指定學期';
        const courseCode = rawData[2]?.[2]?.toString().trim() || '';
        const defaultPointsRaw = rawData[2]?.[5]?.toString().trim() || '0';
        const defaultPoints = parseInt(defaultPointsRaw.replace(/[^0-9]/g, '')) || 0;
        const department = rawData[3]?.[2]?.toString().trim() || '';
        const teacher = rawData[3]?.[5]?.toString().trim() || '';
        const courseName = rawData[4]?.[2]?.toString().trim() || '';

        if (!courseCode || !courseName) {
          throw new Error('Excel 解析失敗：找不到課程代碼 (C3) 或名稱 (C5)');
        }

        addLog('info', `連線中... 正在更新課程: ${courseName}`);

        // 1. Upsert Course
        const { error: courseError } = await supabase
          .from('courses')
          .upsert({
            course_code: courseCode,
            semester,
            name: courseName,
            department,
            teacher,
            default_points: defaultPoints
          }, { onConflict: 'course_code' });

        if (courseError) {
          throw new Error(`更新課程失敗: ${courseError.message} (請檢查 Supabase 專案是否正常)`);
        }

        // --- Student Records Parsing ---
        const allRows = rawData.slice(6);
        const validRows = allRows.filter(row => {
          const sid = row[2]?.toString().trim();
          return sid && sid !== '---以下空白---' && sid !== '學號' && !sid.includes('編號');
        });

        setImportTotal(validRows.length);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          const studentId = row[2]?.toString().trim();
          const studentName = row[3]?.toString().trim();
          const points = parseInt(row[4]) || 0;
          const memo = row[5]?.toString().trim() || null;

          try {
            // Check student user
            const { data: userExists } = await supabase
              .from('users')
              .select('username, name')
              .eq('username', studentId)
              .maybeSingle();

            if (!userExists) {
              const defaultHash = await bcrypt.hash(studentId, 10);
              await supabase.from('users').insert({
                username: studentId,
                password_hash: defaultHash,
                role: 'STUDENT',
                name: studentName,
                must_change_password: true,
                is_active: true
              });
            } else if (studentName && !userExists.name) {
              await supabase.from('users').update({ name: studentName }).eq('username', studentId);
            }

            // Upsert record
            const { error: recErr } = await supabase.from('student_records').upsert({
              student_id: studentId,
              course_code: courseCode,
              points,
              memo
            }, { onConflict: 'student_id,course_code' });

            if (recErr) throw recErr;
            successCount++;
          } catch (err: any) {
            addLog('error', `學號 ${studentId} 處理失敗: ${err.message}`);
            failCount++;
          }

          setImportProgress(i + 1);
        }

        addLog('success', `匯入完成！成功: ${successCount}, 失敗: ${failCount}`);
        fetchStats();

      } catch (err: any) {
        addLog('error', `解析中斷: ${err.message}`);
        if (err.message.includes('fetch')) {
          addLog('info', '提示: 這通常是網路問題或 Supabase 專案正在休眠，請嘗試重新整理頁面再上傳一次。');
        }
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const showRepairTool = logs.some(l => l.isRLS || l.isIndexError);
  const progressPercent = importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">管理後台</h2>
          <p className="text-slate-500">處理 Excel 成績單匯入作業</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 self-start">
          <button onClick={() => setActiveTab('import')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Excel 匯入</button>
          <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>數據概覽</button>
        </div>
      </div>

      {activeTab === 'import' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <FileSpreadsheet className="text-indigo-600" />
                上傳成績單
              </h3>
              
              <label className="block mb-6">
                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isUploading ? 'bg-slate-50 border-slate-300' : 'border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/30'}`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                      <div className="w-full space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">正在同步雲端...</span>
                          <span className="text-xs font-bold text-slate-700">{importProgress} / {importTotal}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-300" 
                            style={{ width: `${progressPercent}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-indigo-600" size={32} />
                      <span className="text-sm font-semibold text-slate-700">選擇 Excel 檔案</span>
                      <p className="text-[10px] text-slate-400">支援 .xlsx, .xls</p>
                    </>
                  )}
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </div>
              </label>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-[10px] text-blue-700 space-y-1">
                <p className="font-bold mb-1">欄位讀取規則：</p>
                <p>• C3: 課程代碼 | C5: 課程名稱</p>
                <p>• F3: 預設點數 | F4: 授課教師</p>
                <p>• C 欄: 學號 | D 欄: 姓名 | E 欄: 點數</p>
              </div>
            </div>

            {showRepairTool && (
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-indigo-500/30">
                <div className="flex items-center gap-2 text-indigo-400 mb-4 font-bold text-xs uppercase tracking-wider">
                  <Terminal size={18} />
                  資料庫修復工具
                </div>
                <div className="bg-black/50 p-3 rounded-lg border border-white/10 relative">
                  <pre className="text-[10px] font-mono text-indigo-300 overflow-x-auto">
                    {repairSql}
                  </pre>
                  <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-md">
                    {copied ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isUploading ? 'bg-indigo-500 animate-ping' : 'bg-green-500'}`} />
                  執行日誌 {isUploading && `(${progressPercent}%)`}
                </span>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 font-bold uppercase hover:text-indigo-600">清除</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[12px]">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30">
                    <FileSpreadsheet size={48} />
                    <p className="mt-2">等待上傳...</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${
                      log.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
                      log.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      <div className="flex items-start gap-3">
                        {log.type === 'error' ? <AlertCircle size={14} className="mt-0.5" /> : log.type === 'success' ? <CheckCircle2 size={14} className="mt-0.5" /> : <div className="w-3 h-3 rounded-full bg-slate-200 mt-1" />}
                        <p className="font-semibold">{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Users size={24}/>} title="註冊學生" value={stats.totalStudents.toLocaleString()} loading={stats.loading} color="indigo" />
          <StatCard icon={<BookOpen size={24}/>} title="累計開課" value={stats.totalCourses.toLocaleString()} loading={stats.loading} color="blue" />
          <StatCard icon={<CheckCircle2 size={24}/>} title="核定總筆數" value={stats.totalRecords.toLocaleString()} loading={stats.loading} color="green" />
          <StatCard icon={<AlertCircle size={24}/>} title="未取得點數" value={stats.anomalies.toLocaleString()} loading={stats.loading} color="amber" />
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string, color: string, loading?: boolean }> = ({ icon, title, value, color, loading }) => {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>{icon}</div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      {loading ? <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md mt-1" /> : <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>}
    </div>
  );
}

export default AdminPortal;
