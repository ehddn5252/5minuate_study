import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyAssignments, type StudentAssignmentRow } from '../services/academy';
import BottomNav from '../components/BottomNav';

export default function MyAssignmentsScreen() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<StudentAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyAssignments().then((rows) => {
      setAssignments(rows);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">📋 오늘의 숙제</h1>
            <p className="text-gray-400 text-xs mt-0.5">선생님이 낸 숙제를 확인해요</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">불러오는 중…</p>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-4">아직 받은 숙제가 없어요.</p>
            <button
              onClick={() => navigate('/join-class')}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px]"
            >
              반 참여하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/assignments/${a.id}`)}
                className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{a.className} · 마감 {a.dueDate}</p>
                    <p className="font-semibold text-gray-900 truncate">{a.title}</p>
                  </div>
                  {a.completed ? (
                    <span className="text-green-600 text-sm font-medium flex-shrink-0 ml-3">
                      ✅ {typeof a.score === 'number' ? `${a.score}/${a.total}` : '완료'}
                    </span>
                  ) : (
                    <span className="text-amber-500 text-sm font-medium flex-shrink-0 ml-3">풀기</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
