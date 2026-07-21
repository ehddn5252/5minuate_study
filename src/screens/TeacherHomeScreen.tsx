import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyClasses, createClass, type TeacherClassRow } from '../services/academy';
import { signOut } from '../services/supabase';
import BottomNav from '../components/BottomNav';

export default function TeacherHomeScreen() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<TeacherClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setClasses(await listMyClasses());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError('');
    const result = await createClass(newName.trim());
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewName('');
    setCreating(false);
    refresh();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🏫 선생님 홈</h1>
            <p className="text-gray-400 text-xs mt-0.5">반을 만들고 학생 숙제를 확인해요</p>
          </div>
          <button onClick={handleSignOut} className="text-gray-400 text-sm hover:text-gray-600">
            로그아웃
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">불러오는 중…</p>
        ) : classes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">아직 만든 반이 없어요.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/teacher/classes/${c.id}`)}
                className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-indigo-200 transition-colors"
              >
                <p className="font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400 mt-1">참여 코드: {c.inviteCode}</p>
              </button>
            ))}
          </div>
        )}

        {creating ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="text-sm font-medium text-gray-700 mb-2 block">반 이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="예: 중2 영문법반"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base mb-3"
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setCreating(false); setError(''); }}
                className="flex-1 py-3 rounded-xl text-gray-500 text-sm font-medium min-h-[44px]"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
              >
                만들기
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium text-sm min-h-[44px] hover:border-indigo-300 hover:text-indigo-400 transition-colors"
          >
            + 반 만들기
          </button>
        )}
      </div>
      <BottomNav variant="teacher" />
    </div>
  );
}
