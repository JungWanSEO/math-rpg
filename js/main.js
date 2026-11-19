// 시작점: 저장 기록 → 언어 → 단원과 몬스터 → 전투 순서로 불러옵니다.
import { CONFIG } from './config.js';
import { loadLang, applyStatic } from './i18n.js';
import { load, store } from './save.js';
import { loadUnit } from './questions.js';
import { createStage } from './stage.js';
import { createBattle } from './battle.js';

async function boot() {
  const data = load();
  if (!CONFIG.langs.includes(data.lang)) data.lang = CONFIG.defaultLang;

  await loadLang(data.lang);
  applyStatic();

  const [unit, monsters] = await Promise.all([
    loadUnit(CONFIG.unit),
    fetch('./data/monsters.json').then((res) => {
      if (!res.ok) throw new Error(`data/monsters.json ${res.status}`);
      return res.json();
    }),
  ]);

  const stage = createStage(document.getElementById('stage'));
  const battle = createBattle({ stage, data, unit, monsters });

  const select = document.getElementById('langSelect');
  select.value = data.lang;
  select.addEventListener('change', async () => {
    data.lang = select.value;
    store(data);
    await loadLang(data.lang);
    applyStatic();
    battle.refresh();
  });

  battle.start(0);
}

boot().catch((err) => {
  // 파일을 더블클릭해서 열면(file://) 데이터 파일을 읽지 못합니다. README 의 실행 방법을 보세요.
  const notice = document.getElementById('notice');
  if (notice) notice.textContent = `Load error: ${err.message}`;
  console.error(err);
});
