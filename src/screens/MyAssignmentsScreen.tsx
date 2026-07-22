import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listMyAssignments,
  listMyClassMaterials,
  listMyClassAnnouncements,
  getClassMaterialFileUrl,
  type StudentAssignmentRow,
  type StudentMaterialRow,
  type StudentAnnouncementRow,
} from '../services/academy';
import BottomNav from '../components/BottomNav';

function isOverdue(dueDate: string): boolean {
  return dueDate < new Date().toISOString().split('T')[0];
}

export default function MyAssignmentsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'assignments' | 'materials' | 'announcements'>('assignments');
  const [assignments, setAssignments] = useState<StudentAssignmentRow[]>([]);
  const [materials, setMaterials] = useState<StudentMaterialRow[]>([]);
  const [announcements, setAnnouncements] = useState<StudentAnnouncementRow[]>([]);
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleDownload = async (materialId: string, filePath: string) => {
    setDownloadingId(materialId);
    const url = await getClassMaterialFileUrl(filePath);
    setDownloadingId(null);
    if (url) window.open(url, '_blank');
  };

  useEffect(() => {
    Promise.all([listMyAssignments(), listMyClassMaterials(), listMyClassAnnouncements()]).then(([a, m, n]) => {
      setAssignments(a);
      setMaterials(m);
      setAnnouncements(n);
      setLoading(false);
    });
  }, []);

  const nothingAtAll = assignments.length === 0 && materials.length === 0 && announcements.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">🎓 학원</h1>
            <p className="text-gray-400 text-xs mt-0.5">선생님이 낸 숙제와 수업 자료를 확인해요</p>
          </div>
        </div>

        {!loading && !nothingAtAll && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab('assignments')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] ${tab === 'assignments' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              📋 숙제 {assignments.length > 0 ? `(${assignments.length})` : ''}
            </button>
            <button
              onClick={() => setTab('materials')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] ${tab === 'materials' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              📄 수업 자료 {materials.length > 0 ? `(${materials.length})` : ''}
            </button>
            <button
              onClick={() => setTab('announcements')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] ${tab === 'announcements' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              📢 공지 {announcements.length > 0 ? `(${announcements.length})` : ''}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">불러오는 중…</p>
        ) : nothingAtAll ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-4">아직 참여한 반이 없어요.</p>
            <button
              onClick={() => navigate('/join-class')}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px]"
            >
              반 참여하기
            </button>
          </div>
        ) : tab === 'assignments' ? (
          assignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">아직 받은 숙제가 없어요.</p>
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
                      <p className="text-xs text-gray-400">
                        {a.className} ·{' '}
                        <span className={!a.completed && isOverdue(a.dueDate) ? 'text-red-500 font-medium' : ''}>
                          {!a.completed && isOverdue(a.dueDate) ? `마감 지남 (${a.dueDate})` : `마감 ${a.dueDate}`}
                        </span>
                      </p>
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
          )
        ) : tab === 'announcements' ? (
          announcements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">아직 올라온 공지가 없어요.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">{a.className} · {a.createdAt.split('T')[0]}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.content}</p>
                </div>
              ))}
            </div>
          )
        ) : materials.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">아직 올라온 자료가 없어요.</p>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenMaterialId((prev) => (prev === m.id ? null : m.id))}
                  className="w-full text-left p-5 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">
                      {m.className} · {m.createdAt.split('T')[0]}
                      {m.fileName && <span className="text-indigo-500"> · 📎 {m.fileName}</span>}
                    </p>
                    <p className="font-semibold text-gray-900 truncate">{m.title}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${openMaterialId === m.id ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {openMaterialId === m.id && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {m.content && <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{m.content}</p>}
                    {m.filePath && (
                      <button
                        onClick={() => handleDownload(m.id, m.filePath!)}
                        disabled={downloadingId === m.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        📎 {downloadingId === m.id ? '여는 중…' : `${m.fileName} 열기`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
