import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClassInfo,
  listClassAssignments,
  listAssignmentChecklist,
  listAssignmentQuestions,
  deleteAssignment,
  copyAssignmentToClasses,
  listMyClasses,
  listClassMaterials,
  createClassMaterial,
  deleteClassMaterial,
  uploadClassMaterialFile,
  getClassMaterialFileUrl,
  listClassRoster,
  removeStudentFromClass,
  listClassAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  type TeacherClassRow,
  type AssignmentRow,
  type ChecklistRow,
  type ClassMaterialRow,
  type RosterRow,
  type AnnouncementRow,
} from '../services/academy';
import type { SharedQuiz } from '../types';

function isOverdue(dueDate: string): boolean {
  return dueDate < new Date().toISOString().split('T')[0];
}

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
  const [activeTab, setActiveTab] = useState<'status' | 'questions' | 'stats'>('status');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 공지사항
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [confirmDeleteAnnouncementId, setConfirmDeleteAnnouncementId] = useState<string | null>(null);

  // 다른 반에 복사
  const [otherClasses, setOtherClasses] = useState<TeacherClassRow[]>([]);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyTargetIds, setCopyTargetIds] = useState<Set<string>>(new Set());
  const [copySaving, setCopySaving] = useState(false);
  const [copyDone, setCopyDone] = useState<string | null>(null);

  // 수업 자료
  const [materials, setMaterials] = useState<ClassMaterialRow[]>([]);
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);
  const [confirmDeleteMaterialId, setConfirmDeleteMaterialId] = useState<string | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialContent, setMaterialContent] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [materialError, setMaterialError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 학생 명단
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [showRoster, setShowRoster] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true);
      const [info, list, materialList, rosterList, myClasses, announcementList] = await Promise.all([
        getClassInfo(classId),
        listClassAssignments(classId),
        listClassMaterials(classId),
        listClassRoster(classId),
        listMyClasses(),
        listClassAnnouncements(classId),
      ]);
      setClassInfo(info);
      setAssignments(list);
      setMaterials(materialList);
      setRoster(rosterList);
      setOtherClasses(myClasses.filter((c) => c.id !== classId));
      setAnnouncements(announcementList);
      setLoading(false);
    })();
  }, [classId]);

  const handleToggleCopyTarget = (id: string) => {
    setCopyTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyAssignment = async (assignmentId: string) => {
    setCopySaving(true);
    const result = await copyAssignmentToClasses(assignmentId, [...copyTargetIds]);
    setCopySaving(false);
    if (result.error) return;
    setCopyingId(null);
    setCopyTargetIds(new Set());
    setCopyDone(assignmentId);
    setTimeout(() => setCopyDone(null), 3000);
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!classId) return;
    const result = await removeStudentFromClass(classId, studentId);
    if (result.error) return;
    setRoster((prev) => prev.filter((r) => r.studentId !== studentId));
    setConfirmRemoveId(null);
  };

  const handleCreateAnnouncement = async () => {
    if (!classId || !announcementContent.trim()) return;
    setAnnouncementSaving(true);
    const result = await createAnnouncement(classId, announcementContent.trim());
    setAnnouncementSaving(false);
    if (result.error) return;
    setAnnouncementContent('');
    setShowAnnouncementForm(false);
    setAnnouncements(await listClassAnnouncements(classId));
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    const result = await deleteAnnouncement(announcementId);
    if (result.error) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    setConfirmDeleteAnnouncementId(null);
  };

  const handleCreateMaterial = async () => {
    if (!classId || !materialTitle.trim() || (!materialContent.trim() && !materialFile)) return;
    setMaterialSaving(true);
    setMaterialError('');

    let uploadedFile;
    if (materialFile) {
      const uploadResult = await uploadClassMaterialFile(classId, materialFile);
      if (uploadResult.error) {
        setMaterialError(uploadResult.error);
        setMaterialSaving(false);
        return;
      }
      uploadedFile = uploadResult.file;
    }

    const result = await createClassMaterial(classId, materialTitle.trim(), materialContent.trim(), uploadedFile);
    setMaterialSaving(false);
    if (result.error) {
      setMaterialError(result.error);
      return;
    }
    setMaterialTitle('');
    setMaterialContent('');
    setMaterialFile(null);
    setShowMaterialForm(false);
    setMaterials(await listClassMaterials(classId));
  };

  const handleDownload = async (materialId: string, filePath: string) => {
    setDownloadingId(materialId);
    const url = await getClassMaterialFileUrl(filePath);
    setDownloadingId(null);
    if (url) window.open(url, '_blank');
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

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">📢 공지사항</h2>
          <button
            onClick={() => setShowAnnouncementForm((prev) => !prev)}
            className="text-sm text-indigo-600 font-medium"
          >
            {showAnnouncementForm ? '취소' : '+ 공지 올리기'}
          </button>
        </div>

        {showAnnouncementForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 space-y-2">
            <textarea
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              placeholder="예: 내일 수업은 휴강이에요."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            />
            <button
              onClick={handleCreateAnnouncement}
              disabled={!announcementContent.trim() || announcementSaving}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
            >
              {announcementSaving ? '올리는 중…' : '공지 올리기'}
            </button>
          </div>
        )}

        {announcements.length > 0 && (
          <div className="space-y-2 mb-4">
            {announcements.map((a) => (
              <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.createdAt.split('T')[0]}</p>
                </div>
                {confirmDeleteAnnouncementId === a.id ? (
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setConfirmDeleteAnnouncementId(null)} className="text-xs text-gray-400">
                      취소
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-medium"
                    >
                      삭제 확인
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteAnnouncementId(a.id)}
                    aria-label="공지 삭제"
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 text-xs"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
                      <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className={isOverdue(a.dueDate) ? 'text-red-500 font-medium' : 'text-gray-400'}>
                          {isOverdue(a.dueDate) ? `마감 지남 (${a.dueDate})` : `마감 ${a.dueDate}`}
                        </span>
                        {typeof a.targetCount === 'number' && (
                          <span className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            👤 학생 {a.targetCount}명 대상
                          </span>
                        )}
                      </p>
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
                  {otherClasses.length > 0 && (
                    <button
                      onClick={() => {
                        setCopyingId((prev) => (prev === a.id ? null : a.id));
                        setCopyTargetIds(new Set());
                      }}
                      aria-label="다른 반에 복사"
                      className="flex-shrink-0 p-2 rounded-xl text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
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

                {copyingId === a.id && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-gray-500 mb-2">복사할 반을 선택하세요</p>
                    <div className="space-y-1.5 mb-3">
                      {otherClasses.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={copyTargetIds.has(c.id)}
                            onChange={() => handleToggleCopyTarget(c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCopyingId(null)}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleCopyAssignment(a.id)}
                        disabled={copyTargetIds.size === 0 || copySaving}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {copySaving ? '복사 중…' : `${copyTargetIds.size}개 반에 복사`}
                      </button>
                    </div>
                  </div>
                )}
                {copyDone === a.id && (
                  <p className="px-5 pb-3 text-xs text-green-600">✓ 복사했어요.</p>
                )}

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
                      <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${activeTab === 'stats' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
                      >
                        오답 통계
                      </button>
                    </div>

                    <div className="px-5 py-4">
                      {checklistLoading ? (
                        <p className="text-gray-400 text-sm">불러오는 중…</p>
                      ) : activeTab === 'stats' ? (
                        (() => {
                          const completed = checklist.filter((m) => m.completed);
                          if (completed.length === 0) {
                            return <p className="text-gray-400 text-sm">아직 제출한 학생이 없어요.</p>;
                          }
                          const stats = openQuestions
                            .map((q, i) => ({
                              index: i,
                              question: q.question,
                              wrongCount: completed.filter((m) => m.wrongIndexes.includes(i)).length,
                            }))
                            .filter((s) => s.wrongCount > 0)
                            .sort((a, b) => b.wrongCount - a.wrongCount);
                          if (stats.length === 0) {
                            return <p className="text-gray-400 text-sm">제출한 학생 모두 만점이에요. 🎉</p>;
                          }
                          return (
                            <ul className="space-y-2">
                              {stats.map((s) => (
                                <li key={s.index} className="text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-800 truncate">
                                      {s.index + 1}. {s.question}
                                    </span>
                                    <span className="flex-shrink-0 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium">
                                      {s.wrongCount}/{completed.length}명 오답
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          );
                        })()
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
              placeholder="학생들에게 전달할 내용을 입력하세요 (파일만 올릴 거면 비워둬도 돼요)"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                파일 첨부 <span className="text-gray-400 font-normal">(선택, 10MB 이하)</span>
              </label>
              <input
                type="file"
                onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 file:text-sm file:font-medium"
              />
              {materialFile && (
                <p className="text-xs text-gray-400 mt-1">
                  📎 {materialFile.name} ({(materialFile.size / 1024).toFixed(0)}KB)
                  <button onClick={() => setMaterialFile(null)} className="ml-2 text-red-400 underline">
                    제거
                  </button>
                </p>
              )}
            </div>
            {materialError && <p className="text-red-500 text-sm">{materialError}</p>}
            <button
              onClick={handleCreateMaterial}
              disabled={!materialTitle.trim() || (!materialContent.trim() && !materialFile) || materialSaving}
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
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.createdAt.split('T')[0]}
                        {m.fileName && <span className="text-indigo-500"> · 📎 {m.fileName}</span>}
                      </p>
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
    </div>
  );
}
