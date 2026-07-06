import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useSessionStore } from '../store';
import BottomNav from '../components/BottomNav';
import type { Goal } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { sessions } = useSessionStore();

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month } = cursor;
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  // 완료한 세션이 있는 날짜 집합(학습 기록 히트맵)
  const completedDates = new Set(
    sessions.filter((s) => s.status === 'completed').map((s) => s.date)
  );

  // 목표별 마감일(내신·수능처럼 examScoped인 경우 사실상 시험일)을 날짜별로 묶기
  const deadlineGoalsByDate = new Map<string, Goal[]>();
  goals.forEach((g) => {
    if (!g.deadline) return;
    const list = deadlineGoalsByDate.get(g.deadline) ?? [];
    list.push(g);
    deadlineGoalsByDate.set(g.deadline, list);
  });

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handlePrevMonth = () => {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
    setSelectedDate(null);
  };
  const handleNextMonth = () => {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
    setSelectedDate(null);
  };

  const selectedDeadlineGoals = selectedDate ? deadlineGoalsByDate.get(selectedDate) ?? [] : [];
  const selectedStudiedGoalIds = new Set(
    selectedDate ? sessions.filter((s) => s.date === selectedDate && s.status === 'completed').map((s) => s.goalId) : []
  );
  const selectedStudiedGoals = goals.filter((g) => selectedStudiedGoalIds.has(g.id));

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">학습 캘린더</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="font-semibold text-gray-900">{year}년 {month + 1}월</p>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const dateStr = toDateStr(year, month, day);
              const hasSession = completedDates.has(dateStr);
              const deadlineGoals = deadlineGoalsByDate.get(dateStr) ?? [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold'
                      : isToday
                        ? 'bg-indigo-50 text-indigo-600 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{day}</span>
                  <div className="flex items-center gap-0.5 h-2">
                    {hasSession && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                    )}
                    {deadlineGoals.length > 0 && (
                      <span className="text-[10px] leading-none">
                        {deadlineGoals.some((g) => g.examScoped) ? '🎯' : '🚩'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>학습 완료</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🎯</span>
              <span>시험일</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🚩</span>
              <span>마감일</span>
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <p className="font-semibold text-gray-900 mb-3">{selectedDate}</p>
            {selectedStudiedGoals.length === 0 && selectedDeadlineGoals.length === 0 ? (
              <p className="text-gray-400 text-sm">이 날은 기록이 없어요.</p>
            ) : (
              <div className="space-y-2">
                {selectedStudiedGoals.map((g) => (
                  <div key={`studied-${g.id}`} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span>{g.topic} — 학습 완료</span>
                  </div>
                ))}
                {selectedDeadlineGoals.map((g) => (
                  <div key={`deadline-${g.id}`} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0">{g.examScoped ? '🎯' : '🚩'}</span>
                    <span>{g.topic} — {g.examScoped ? '시험일' : '마감일'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
