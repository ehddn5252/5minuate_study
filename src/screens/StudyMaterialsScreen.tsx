import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useSessionStore } from '../store';
import { saveGoal } from '../utils/storage';
import { getCurriculum, getCurriculumDay } from '../data/curriculum';
import type { Session } from '../types';

type Tab = 'curriculum' | 'notes' | 'memo';

// 커리큘럼 탭
function CurriculumTab({
  curriculumId,
  completedSessions,
}: {
  curriculumId: string;
  completedSessions: number;
}) {
  const curriculum = getCurriculum(curriculumId);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  if (!curriculum) return <p className="text-gray-400 text-center py-10">커리큘럼을 불러올 수 없습니다.</p>;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">
        전체 {curriculum.totalDays}일 커리큘럼 · 완료 {completedSessions}일
      </p>
      <div className="space-y-2">
        {curriculum.days.map((day) => {
          const done = day.day <= completedSessions;
          const isOpen = expandedDay === day.day;

          return (
            <div
              key={day.day}
              className={`rounded-xl border overflow-hidden transition-all ${
                done ? 'border-[var(--accent-200)] bg-[var(--accent-50)]' : 'border-gray-200 bg-white'
              }`}
            >
              <button
                onClick={() => setExpandedDay(isOpen ? null : day.day)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    done
                      ? 'bg-[var(--accent-500)] text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {done ? '✓' : day.day}
                </span>
                <span className={`flex-1 text-sm font-medium leading-snug ${done ? 'text-[var(--accent-800)]' : 'text-gray-800'}`}>
                  {day.topic}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                  {day.content
                    .split('\n')
                    .filter((l) => l.trim())
                    .map((line, i) => {
                      const isHeader = !line.startsWith('•') && !line.startsWith('-');
                      if (isHeader && i === 0) {
                        return (
                          <p key={i} className="text-xs font-semibold text-[var(--accent-600)] mb-2">
                            {line}
                          </p>
                        );
                      }
                      const text = line.replace(/^[•·\-*]\s*/, '').trim();
                      if (!text) return null;
                      return (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent-400)]" />
                          <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 학습 노트 탭
function NotesTab({
  goalId,
  sessions,
  curriculumId,
}: {
  goalId: string;
  sessions: Session[];
  curriculumId?: string;
}) {
  const completedSessions = sessions
    .filter((s) => s.goalId === goalId && s.status === 'completed' && s.summaryContent)
    .sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date));

  if (completedSessions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📝</p>
        <p className="text-gray-500 text-sm">아직 완료된 학습이 없어요.</p>
        <p className="text-gray-400 text-xs mt-1">학습을 완료하면 요약 노트가 쌓여요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedSessions.map((session, idx) => {
        const dayNum = completedSessions.length - idx;
        const curricDay = curriculumId
          ? getCurriculumDay(curriculumId, completedSessions.length - idx)
          : undefined;
        const bullets = (session.summaryContent ?? '').split('\n').filter((l) => l.trim());
        const dateStr = new Date(session.date).toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });

        return (
          <div key={session.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[var(--accent-100)] text-[var(--accent-600)] text-xs font-semibold px-2.5 py-1 rounded-full">
                Day {dayNum}
              </span>
              <span className="text-xs text-gray-400">{dateStr}</span>
              {curricDay && (
                <span className="text-xs text-[var(--accent-500)] font-medium ml-1">{curricDay.topic}</span>
              )}
            </div>
            <ul className="space-y-2">
              {bullets.map((line, i) => {
                const text = line.replace(/^[•·\-*]\s*/, '').trim();
                if (!text) return null;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent-400)]" />
                    <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// 내 메모 탭
function MemoTab({
  initialMemo,
  onSave,
}: {
  initialMemo: string;
  onSave: (memo: string) => void;
}) {
  const [memo, setMemo] = useState(initialMemo);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(memo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        학습 자료, 참고 링크, 핵심 내용을 자유롭게 메모하세요.
      </p>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder={`예시:\n• systemd는 Linux의 init 시스템\n• systemctl start/stop/enable 명령어\n• 유닛 파일: /etc/systemd/system/`}
        rows={16}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] text-sm leading-relaxed resize-none"
      />
      <button
        onClick={handleSave}
        disabled={memo === initialMemo}
        className="mt-3 w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
      >
        {saved ? '저장됨!' : '저장'}
      </button>
    </div>
  );
}

export default function StudyMaterialsScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, updateGoal } = useGoalStore();
  const { sessions } = useSessionStore();

  const goal = goals.find((g) => g.id === goalId);

  const defaultTab: Tab = goal?.curriculumId ? 'curriculum' : 'notes';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    if (goal?.curriculumId) setActiveTab('curriculum');
    else setActiveTab('notes');
  }, [goal?.id]);

  const handleSaveMemo = (notes: string) => {
    if (!goal) return;
    const updated = { ...goal, notes };
    updateGoal(updated);
    saveGoal(updated);
  };

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">목표를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    ...(goal.curriculumId ? [{ id: 'curriculum' as Tab, label: '커리큘럼' }] : []),
    { id: 'notes' as Tab, label: '학습 노트' },
    { id: 'memo' as Tab, label: '내 메모' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">📚 학습 자료</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{goal.topic}</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--accent-600)] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'curriculum' && goal.curriculumId && (
          <CurriculumTab
            curriculumId={goal.curriculumId}
            completedSessions={goal.completedSessions}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            goalId={goal.id}
            sessions={sessions}
            curriculumId={goal.curriculumId}
          />
        )}
        {activeTab === 'memo' && (
          <MemoTab
            initialMemo={goal.notes ?? ''}
            onSave={handleSaveMemo}
          />
        )}
      </div>
    </div>
  );
}
