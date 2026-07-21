import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyAssignments } from '../services/academy';

// 학원 반에 참여한 학생에게만 뜨는 배너. 참여한 반이 없으면(대다수 개인 사용자)
// 조용히 빈 배열이 오고 아무것도 렌더링하지 않는다 — 기존 UX에 영향 없음.
export default function AssignmentBanner() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    listMyAssignments()
      .then((rows) => setPendingCount(rows.filter((r) => !r.completed).length))
      .catch(() => {});
  }, []);

  if (pendingCount === 0) return null;

  return (
    <button
      onClick={() => navigate('/assignments')}
      className="text-left mx-4 mb-4 p-4 bg-white rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3"
    >
      <span className="text-2xl flex-shrink-0">📋</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">선생님 숙제가 {pendingCount}개 남았어요</p>
        <p className="text-xs text-gray-400 mt-0.5">눌러서 확인하기</p>
      </div>
    </button>
  );
}
