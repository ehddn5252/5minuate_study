// F-45: 문제별 음성 답변 녹음. 지금은 기기 로컬(IndexedDB)에만 저장하지만, 나중에 사용자끼리
// 녹음을 공유하는 기능을 얹기 쉽도록 저장 방식을 이 모듈 뒤에 완전히 숨겨둔다 — 화면 쪽에서는
// save/get/delete 함수만 호출하므로, 나중에 내부를 "Supabase Storage에 업로드하고 URL 반환"
// 방식으로 바꿔도 호출부는 그대로 둘 수 있다.
// 공유 기능을 실제로 만들 때 주의할 점: quizId는 기기(사용자)마다 다르게 생성되는 로컬 id라
// 그대로는 "같은 문제"를 가리키는 공유 키가 될 수 없다 — templateId+dayNum+문항 순서처럼
// 사용자 간에 안정적인 키로 다시 매핑하는 작업이 필요하다.

export interface VoiceRecording {
  id: string;
  quizId: string;
  mimeType: string;
  createdAt: string;
  blob: Blob;
}

const DB_NAME = 'fiveMinStudyVoice';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('quizId', 'quizId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    typeof indexedDB !== 'undefined'
  );
}

export function pickRecordingMimeType(): string {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// 문제당 녹음은 하나만 유지한다(재녹음 시 덮어쓰기) — 여러 개를 남기고 싶어지면 나중에 확장
export async function saveRecording(quizId: string, blob: Blob, mimeType: string): Promise<VoiceRecording> {
  const existing = await getRecordingByQuiz(quizId);
  const record: VoiceRecording = {
    id: existing?.id ?? `${quizId}-${Date.now()}`,
    quizId,
    mimeType,
    createdAt: new Date().toISOString(),
    blob,
  };
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecordingByQuiz(quizId: string): Promise<VoiceRecording | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('quizId');
    const req = index.getAll(quizId);
    req.onsuccess = () => resolve((req.result as VoiceRecording[])[0]);
    req.onerror = () => reject(req.error);
  });
}

// F-46: 목표(챕터) 단위로 녹음을 모아보는 화면에서 사용
export async function getAllRecordings(): Promise<VoiceRecording[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as VoiceRecording[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
