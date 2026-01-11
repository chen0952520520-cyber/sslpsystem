
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { StudentRecord } from '../types';
import { Trophy, Calendar, ListChecks, Search, Loader2 } from 'lucide-react';

interface StudentPortalProps {
  studentId: string;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ studentId }) => {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Fetch records with joined course info
      const { data, error } = await supabase
        .from('student_records')
        .select('*, course:courses(*)')
        .eq('student_id', studentId)
        .order('imported_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = records.reduce((sum, r) => sum + (r.points || 0), 0);

  const filteredRecords = records.filter(r => 
    r.course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.course?.semester.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12">
            <Trophy size={160} />
          </div>
          <div className="relative z-10">
            <h3 className="text-indigo-100 font-medium mb-1">已核定總點數</h3>
            <p className="text-5xl font-bold tracking-tight">{totalPoints}</p>
          </div>
          <div className="mt-8 relative z-10">
            <div className="bg-white/20 rounded-full px-4 py-1 inline-flex items-center gap-2 text-sm font-medium">
              <ListChecks size={16} />
              <span>共修讀 {records.length} 門服務課程</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-slate-800 font-bold text-lg mb-4">學期概況</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Quick stats could go here */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">最近一筆</p>
              <p className="text-sm font-bold text-slate-800 truncate">
                {records[0]?.course?.semester || '無記錄'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">平均點數</p>
              <p className="text-sm font-bold text-slate-800">
                {records.length > 0 ? (totalPoints / records.length).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-800">修課清單</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜尋課程名稱或學期..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p>正在載入您的修課記錄...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-20 text-center text-slate-400 italic">
              目前尚無任何服務學習記錄。
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-8 py-4 border-b">學期</th>
                  <th className="px-8 py-4 border-b">課程名稱 / 授課教師</th>
                  <th className="px-8 py-4 border-b">點數</th>
                  <th className="px-8 py-4 border-b">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 text-sm font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        {record.course?.semester}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-slate-800">{record.course?.name}</div>
                      <div className="text-xs text-slate-500">{record.course?.teacher}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-sm px-3 py-1 rounded-full border border-indigo-100">
                        {record.points}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500">
                      {record.memo || <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
