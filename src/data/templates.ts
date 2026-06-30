export interface Template {
  id: string;
  icon: string;
  name: string;
  topic: string;
  recommendedDays: number;
  category: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'iip_practical',
    icon: '💻',
    name: '정보처리기사 실기',
    topic: '정보처리기사 실기 핵심 개념',
    recommendedDays: 60,
    category: 'IT 자격증',
  },
  {
    id: 'toeic_900',
    icon: '🌍',
    name: 'TOEIC 900',
    topic: 'TOEIC 900점 대비 어휘 및 문법',
    recommendedDays: 90,
    category: '어학',
  },
  {
    id: 'driving_written',
    icon: '🚗',
    name: '운전면허 필기',
    topic: '운전면허 1종 보통 필기시험 핵심 요약',
    recommendedDays: 14,
    category: '자격증',
  },
  {
    id: 'korean_history',
    icon: '🏛️',
    name: '한국사능력검정 1급',
    topic: '한국사능력검정시험 심화 1급 시대별 핵심',
    recommendedDays: 45,
    category: '역사',
  },
  {
    id: 'realtor',
    icon: '🏠',
    name: '공인중개사',
    topic: '공인중개사 1차 민법 및 민사특별법 핵심',
    recommendedDays: 90,
    category: '자격증',
  },
  {
    id: 'electrical',
    icon: '⚡',
    name: '전기기사',
    topic: '전기기사 필기 전기자기학 핵심 공식',
    recommendedDays: 60,
    category: 'IT 자격증',
  },
  {
    id: 'computer_app',
    icon: '📊',
    name: '컴활 1급',
    topic: '컴퓨터활용능력 1급 스프레드시트 함수 정리',
    recommendedDays: 30,
    category: 'IT 자격증',
  },
  {
    id: 'english_vocab',
    icon: '📝',
    name: '영어단어 매일',
    topic: '수능 영어 필수 어휘 1000개 완성',
    recommendedDays: 30,
    category: '어학',
  },
  {
    id: 'react_basics',
    icon: '⚛️',
    name: '리액트 입문',
    topic: 'React 핵심 개념 - 컴포넌트, 훅, 상태 관리',
    recommendedDays: 21,
    category: '개발',
  },
  {
    id: 'python_basics',
    icon: '🐍',
    name: '파이썬 기초',
    topic: 'Python 기초 문법 및 자료구조',
    recommendedDays: 21,
    category: '개발',
  },
];
