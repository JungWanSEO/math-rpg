// 진행 기록을 이 기기의 브라우저에 저장합니다. 서버로 보내지 않습니다.
import { CONFIG } from './config.js';

function blank() {
  return {
    v: 1,                      // 저장 형식 버전
    lang: CONFIG.defaultLang,  // 고른 언어
    wins: 0,                   // 이긴 전투 수
    codex: {},                 // 유형별 기록: { 유형: { right, wrong } }
  };
}

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(CONFIG.saveKey) || 'null');
    if (data && data.v === 1) return { ...blank(), ...data };
  } catch (e) {
    // 저장소를 쓸 수 없는 환경에서는 새 기록으로 시작합니다.
  }
  return blank();
}

export function store(data) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  } catch (e) {
    // 저장에 실패해도 게임은 계속됩니다.
  }
}
