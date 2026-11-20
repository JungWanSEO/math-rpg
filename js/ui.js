// 화면 전환에 쓰는 작은 도구.
export const $ = (id) => document.getElementById(id);

const SCREENS = ['screenTitle', 'screenScope', 'screenMap', 'screenBattle', 'screenEvent', 'screenCodex'];

// 화면 하나만 보이게 합니다.
export function show(id) {
  for (const name of SCREENS) {
    const el = $(name);
    if (el) el.hidden = name !== id;
  }
}

// 글이 두 줄인 버튼을 만듭니다. (큰 글 + 작은 설명)
export function twoLineButton(title, sub) {
  const btn = document.createElement('button');
  btn.type = 'button';
  const b = document.createElement('b');
  b.textContent = title;
  btn.appendChild(b);
  if (sub) {
    const small = document.createElement('small');
    small.textContent = sub;
    btn.appendChild(small);
  }
  return btn;
}
