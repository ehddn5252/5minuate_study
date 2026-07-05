// F-22: 정체성/성장 서사 — 주제 텍스트를 받아 "이제 나는 ~할 수 있는 사람입니다" 문장을 만든다.

function hasBatchim(char: string): boolean {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function getIdentityStatement(topic: string): string {
  const trimmed = topic.trim();
  const lastChar = trimmed.charAt(trimmed.length - 1);
  const particle = hasBatchim(lastChar) ? '을' : '를';
  return `이제 나는 ${trimmed}${particle} 실무에 적용할 수 있는 사람입니다`;
}
