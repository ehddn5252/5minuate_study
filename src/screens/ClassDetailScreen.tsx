import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClassInfo,
  listClassAssignments,
  listAssignmentChecklist,
  listAssignmentQuestions,
  deleteAssignment,
  listClassMaterials,
  createClassMaterial,
  deleteClassMaterial,
  listClassRoster,
  removeStudentFromClass,
  type TeacherClassRow,
  type AssignmentRow,
  type ChecklistRow,
  type ClassMaterialRow,
  type RosterRow,
} from '../services/academy';
import type { SharedQuiz } from '../types';

export default function ClassDetailScreen() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<TeacherClassRow | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [openQuestions, setOpenQuestions] = useState<SharedQuiz[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'questions'>('status');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 수업 자료
  const [materials, setMaterials] = useState<ClassMaterialRow[]>([]);
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);
  const [confirmDeleteMaterialId, setConfirmDeleteMaterialId] = useState<string | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialContent, setMaterialContent] = useState('');
  const [materialSaving, setMaterialSaving] = useState(false);
  const [materialError, setMaterialError] = useState('');

  // 학생 명단
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [showRoster, setShowRoster] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true);
      const [info, list, materialList, rosterList] = await Promise.all([
        getClassInfo(classId),
        listClassAssignments(classId),
        listClassMaterials(classId),
        listClassRoster(classId),
      ]);
      setClassInfo(info);
      setAssignments(list);
      setMaterials(materialList);
      setRoster(rosterList);
      setLoading(false);
    })();
  }, [classId]);

  const handleRemoveStudent = async (studentId: string) => {
    if (!classId) return;
    const result = await removeStudentFromClass(classId, studentId);
    if (result.error) return;
    setRoster((prev) => prev.filter((r) => r.studentId !== studentId));
    setConfirmRemoveId(null);
  };

  const handleCreateMaterial = async () => {
    if (!classId || !materialTitle.trim() || !materialContent.trim()) return;
    setMaterialSaving(true);
    setMaterialError('');
    const result = await createClassMaterial(classId, materialTitle.trim(), materialContent.trim());
    setMaterialSaving(false);
    if (result.error) {
      setMaterialError(result.error);
      return;
    }
    setMaterialTitle('');
    setMaterialContent('');
    setShowMaterialForm(false);
    setMaterials(await listClassMaterials(classId));
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const result = await deleteClassMaterial(materialId);
    if (result.error) return;
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    setOpenMaterialId(null);
    setConfirmDeleteMaterialId(null);
  };

  const handleToggle = async (assignmentId: string) => {
    if (!classId) return;
    if (openId === assignmentId) {
      setOpenId(null);
      setExpandedStudentId(null);
      setActiveTab('status');
      return;
    }
    setOpenId(assignmentId);
    setExpandedStudentId(null);
    setActiveTab('status');
    setChecklistLoading(true);
    const [list, questions] = await Promise.all([
      listAssignmentChecklist(classId, assignmentId),
      listAssignmentQuestions(assignmentId),
    ]);
    setChecklist(list);
    setOpenQuestions(questions);
    setChecklistLoading(false);
  };

  const handleDelete = async (assignmentId: string) => {
    setDeleting(true);
    const result = await deleteAssignment(assignmentId);
    setDeleting(false);
    if (result.error) return;
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setOpenId(null);
    setConfirmDeleteId(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">불러오는 중…</div>;
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
        반을 찾을 수 없어요.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{classInfo.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">학생 참여 코드: {classInfo.inviteCode}</p>
          </div>
        </div>

        <button
          onClick={() => setShowRoster((prev) => !prev)}
          className="text-sm text-gray-500 underline mb-3"
        >
          🙋 학생 명단 {roster.length}명 {showRoster ? '접기' : '보기'}
        </button>

        {showRoster && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            {roster.length === 0 ? (
              <p className="text-gray-400 text-sm">아직 참여한 학생이 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {roster.map((r) => (
                  <li key={r.studentId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.studentName}</span>
                    {confirmRemoveId === r.studentId ? (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="text-xs text-gray-400"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleRemoveStudent(r.studentId)}
                          className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-medium"
                        >
                          내보내기 확인
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(r.studentId)}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        내보내기
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          onClick={() => navigate(`/teacher/classes/${classId}/new-assignment`)}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] my-4"
        >
          + 숙제 내기
        </button>

        {assignments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">아직 낸 숙제가 없어요.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-1 p-5">
                  <button onClick={() => handleToggle(a.id)} className="flex-1 flex items-center justify-between text-left min-w-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">마감 {a.dueDate}</p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${openId === a.id ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId((prev) => (prev === a.id ? null : a.id))}
                    aria-label="숙제 삭제"
                    className="flex-shrink-0 p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9.5 3h5l.5 4h-6l.5-4z" />
                    </svg>
                  </button>
                </div>

                {confirmDeleteId === a.id && (
                  <div className="px-5 pb-4 flex gap-2">
                    <p className="flex-1 text-xs text-red-500 self-center">삭제하면 문제·학생 제출기록도 함께 지워져요.</p>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      {deleting ? '삭제 중…' : '삭제 확인'}
                    </button>
                  </div>
                )}

                {openId === a.id && (
                  <div className="border-t border-gray-100">
                    <div className="flex px-5 pt-3">
                      <button
                        onClick={() => setActiveTab('status')}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${activeTab === 'status' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
                      >
                        학생 현황
                      </button>
                      <button
                        onClick={() => setActiveTab('questions')}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${activeTab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
                      >
                        문제 내용 ({openQuestions.length})
                      </button>
                    </div>

                    <div className="px-5 py-4">
                      {checklistLoading ? (
                        <p className="text-gray-400 text-sm">불러오는 중…</p>
                      ) : activeTab === 'questions' ? (
                        <ul className="space-y-2">
                          {openQuestions.map((q, i) => (
                            <li key={i} className="text-xs text-gray-600">
                              <p className="text-gray-800">
                                {i + 1}. [{q.type === 'multiple_choice' ? '객관식' : '단답형'}] {q.question}
                              </p>
                              {q.options && <p className="text-gray-400 mt-0.5">보기: {q.options.join(' / ')}</p>}
                              <p className="text-gray-500 mt-0.5">정답: {q.answer}</p>
                            </li>
                          ))}
                        </ul>
                      ) : checklist.length === 0 ? (
                        <p className="text-gray-400 text-sm">아직 참여한 학생이 없어요.</p>
                      ) : (
                        <ul className="space-y-2">
                          {checklist.map((m) => (
                            <li key={m.studentId}>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{m.studentName}</span>
                                {m.completed ? (
                                  <span className="text-green-600 font-medium">
                                    ✅ 완료{typeof m.score === 'number' ? ` (${m.score}/${m.total})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">❌ 미완료</span>
                                )}
                              </div>

                              {m.completed && m.wrongIndexes.length > 0 && (
                                <div className="mt-1">
                                  <button
                                    onClick={() =>
                                      setExpandedStudentId((prev) => (prev === m.studentId ? null : m.studentId))
                                    }
                                    className="text-xs text-amber-600 underline"
                                  >
                                    틀린 문제 {m.wrongIndexes.length}개 {expandedStudentId === m.studentId ? '접기' : '보기'}
                                  </button>
                                  {expandedStudentId === m.studentId && (
                                    <ul className="mt-1.5 space-y-1.5 pl-3 border-l-2 border-amber-100">
                                      {m.wrongIndexes.map((idx) => (
                                        <li key={idx} className="text-xs text-gray-500">
                                          <p className="text-gray-700">
                                            {idx + 1}. {openQuestions[idx]?.question ?? '(문제를 찾을 수 없음)'}
                                          </p>
                                          <p className="text-red-500">
                                            학생 답: {m.answers[idx]?.trim() ? m.answers[idx] : '(답 없음)'}
                                          </p>
                                          <p className="text-green-600">정답: {openQuestions[idx]?.answer ?? '?'}</p>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-8 mb-3">
          <h2 className="font-semibold text-gray-900">📄 수업 자료</h2>
          <button
            onClick={() => setShowMaterialForm((prev) => !prev)}
            className="text-sm text-indigo-600 font-medium"
          >
            {showMaterialForm ? '취소' : '+ 자료 올리기'}
          </button>
        </div>

        {showMaterialForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-3">
            <input
              type="text"
              value={materialTitle}
              onChange={(e) => setMaterialTitle(e.target.value)}
              placeholder="제목 (예: 3과 필기 정리)"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
            />
            <textarea
              value={materialContent}
              onChange={(e) => setMaterialContent(e.target.value)}
              placeholder="학생들에게 전달할 내용을 입력하세요"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            />
            {materialError && <p className="text-red-500 text-sm">{materialError}</p>}
            <button
              onClick={handleCreateMaterial}
              disabled={!materialTitle.trim() || !materialContent.trim() || materialSaving}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
            >
              {materialSaving ? '올리는 중…' : '자료 올리기'}
            </button>
          </div>
        )}

        {materials.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">아직 올린 자료가 없어요.</p>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-1 p-5">
                  <button
                    onClick={() => setOpenMaterialId((prev) => (prev === m.id ? null : m.id))}
                    className="flex-1 flex items-center justify-between text-left min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{m.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.createdAt.split('T')[0]}</p>
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
                  <button
                    onClick={() => setConfirmDeleteMaterialId((prev) => (prev === m.id ? null : m.id))}
                    aria-label="자료 삭제"
                    className="flex-shrink-0 p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9.5 3h5l.5 4h-6l.5-4z" />
                    </svg>
                  </button>
                </div>

                {confirmDeleteMaterialId === m.id && (
                  <div className="px-5 pb-4 flex gap-2">
                    <p className="flex-1 text-xs text-red-500 self-center">삭제하면 학생도 더 이상 볼 수 없어요.</p>
                    <button
                      onClick={() => setConfirmDeleteMaterialId(null)}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(m.id)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium"
                    >
                      삭제 확인
                    </button>
                  </div>
                )}

                {openMaterialId === m.id && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
