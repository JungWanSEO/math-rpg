// 화면 크기에 맞추기. 스마트폰마다 화면 높이가 다르고, 브라우저의 주소 줄 때문에 실제로 보이는 높이는 더 작습니다.
// 전투 화면에서 "지금 눌러야 하는 것"이 스크롤 없이 보이도록, 덜 중요한 것부터 차례로 줄입니다.
//   1) 캐릭터가 나오는 그림판의 높이  2) 여백(tight)  3) 문제 그림의 크기(모자란 만큼만)  4) 글자 크기(tighter)
import { $ } from './ui.js';

const viewHeight = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);

export function fitBattle() {
  const screen = $('screenBattle');
  const canvas = $('stage');
  if (!screen || screen.hidden) return;
  const figure = document.querySelector('#qFigure svg');
  canvas.style.height = '';
  if (figure) figure.style.maxWidth = '';
  screen.classList.remove('tight', 'tighter');

  const answering = screen.classList.contains('answering');
  // 지금 꼭 보여야 하는 마지막 요소: 틀린 문제 확인 중이면 "다음" 버튼, 문제를 푸는 중이면 답 버튼, 아니면 필살기 버튼
  const target = !$('nextBtn').hidden ? $('nextBtn') : answering ? $('answers') : $('ultBtn');
  const over = () => Math.ceil(target.getBoundingClientRect().bottom + window.scrollY + 10 - viewHeight());

  let extra = over();
  if (extra <= 0) return;
  const natural = canvas.getBoundingClientRect().height;
  const least = answering ? 0 : 96; // 행동을 고를 때는 캐릭터가 보여야 합니다.
  const cut = Math.min(extra, Math.max(0, natural - least));
  // 너무 얇게 남으면 보기 흉하므로 아예 접습니다.
  const left = natural - cut < 48 && answering ? 0 : natural - cut;
  canvas.style.height = `${Math.round(left)}px`;
  extra = over();
  if (extra <= 0) return;
  screen.classList.add('tight');
  extra = over();
  if (extra <= 0) return;
  // 그림은 모자란 만큼만 줄입니다. (너무 작아지지 않게 아래 한계를 둡니다)
  if (figure) {
    const box = figure.getBoundingClientRect();
    const height = Math.max(Math.min(box.height, 104), box.height - extra);
    figure.style.maxWidth = `${Math.floor((box.width * height) / box.height)}px`;
    if (over() <= 0) return;
  }
  screen.classList.add('tighter');
}

// 화면이 돌아가거나 주소 줄이 접히고 펴질 때 다시 맞춥니다.
export function watchFit() {
  let timer = 0;
  const again = () => {
    clearTimeout(timer);
    timer = setTimeout(fitBattle, 60);
  };
  window.addEventListener('resize', again);
  window.addEventListener('orientationchange', again);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', again);
}
