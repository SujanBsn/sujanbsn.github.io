const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const previews = [...document.querySelectorAll('video[data-preview]')];
const motionButton = document.querySelector('#motion-control');
const visiblePreviews = new Set();
const pausedPreviews = new Set();
let previewsEnabled = !reducedMotion.matches;
function updatePreviewLabels() {
  document.body.classList.toggle('motion-paused', !previewsEnabled);
  motionButton.setAttribute('aria-label', `${previewsEnabled ? 'Pause' : 'Play'} all game previews`);
  document.querySelector('#motion-icon').textContent = previewsEnabled ? 'Ⅱ' : '▷';
  document.querySelector('#motion-label').textContent = previewsEnabled ? 'Pause all previews' : 'Play all previews';
  document.querySelectorAll('[data-preview-toggle]').forEach(button => {
    const video = document.getElementById(button.dataset.previewToggle);
    const paused = pausedPreviews.has(video) || !previewsEnabled;
    button.textContent = paused ? 'Play preview' : 'Pause preview';
    button.setAttribute('aria-pressed', String(paused));
    const name = video.id === 'word-preview' ? 'Avana Word' : video.id === 'ballin-preview' ? 'Ballin' : 'Pumpkin';
    button.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} ${name} preview`);
  });
}
function syncPreviews() {
  const dialogOpen = [...document.querySelectorAll('dialog')].some(dialog => dialog.open);
  previews.forEach(video => {
    const shouldPlay = previewsEnabled && visiblePreviews.has(video) && !pausedPreviews.has(video) && !document.hidden && !dialogOpen;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  });
  updatePreviewLabels();
}
const previewObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.15) visiblePreviews.add(entry.target);
    else visiblePreviews.delete(entry.target);
  });
  syncPreviews();
}, { threshold: [0, 0.15] });
previews.forEach(video => { video.muted = true; previewObserver.observe(video); });
syncPreviews();
motionButton.addEventListener('click', () => {
  previewsEnabled = !previewsEnabled;
  if (previewsEnabled) pausedPreviews.clear();
  syncPreviews();
});
document.querySelectorAll('[data-preview-toggle]').forEach(button => button.addEventListener('click', () => {
  const video = document.getElementById(button.dataset.previewToggle);
  if (!previewsEnabled) { previewsEnabled = true; pausedPreviews.delete(video); }
  else if (pausedPreviews.has(video)) pausedPreviews.delete(video);
  else pausedPreviews.add(video);
  syncPreviews();
}));
reducedMotion.addEventListener('change', () => { previewsEnabled = !reducedMotion.matches; syncPreviews(); });
document.addEventListener('visibilitychange', syncPreviews);

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
});
navigation.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
document.addEventListener('click', e => { if (!e.target.closest('.header')) closeMenu(); });

function activateTab(tab) {
  tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]').forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
}
document.querySelectorAll('[role="tablist"]').forEach(group => {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { e.preventDefault(); activateTab(tabs[next]); tabs[next].focus(); }
    });
  });
});

const dialogOpeners = new Map();
function switchClip(button, autoplay = true) {
  const player = document.getElementById(button.dataset.player || 'full-video');
  player.src = button.dataset.src;
  if (button.dataset.poster) player.poster = button.dataset.poster;
  player.load();
  if (autoplay) player.play().catch(() => {});
  button.closest('.clip-buttons').querySelectorAll('.clip').forEach(clip => {
    const active = clip === button;
    clip.classList.toggle('active', active);
    clip.setAttribute('aria-pressed', String(active));
  });
}
function openDialog(id, opener, clipSource) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  dialogOpeners.set(dialog, opener);
  if (opener?.dataset.tab) activateTab(document.getElementById(opener.dataset.tab));
  const clips = [...dialog.querySelectorAll('.clip')];
  const initialClip = clips.find(clip => clip.dataset.src === clipSource) || clips[0];
  if (initialClip) switchClip(initialClip, false);
  dialog.showModal();
  syncPreviews();
  dialog.querySelector('video')?.play().catch(() => {});
}
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.open, button, button.dataset.clip)));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('video').forEach(video => video.pause());
    syncPreviews();
    dialogOpeners.get(dialog)?.focus();
  });
});
document.querySelectorAll('.clip').forEach(button => button.addEventListener('click', () => switchClip(button)));
document.querySelectorAll('[data-transfer]').forEach(button => button.addEventListener('click', () => {
  const currentDialog = button.closest('dialog');
  const originalOpener = dialogOpeners.get(currentDialog);
  currentDialog.addEventListener('close', () => openDialog(button.dataset.transfer, originalOpener, button.dataset.clip), { once: true });
  currentDialog.close();
}));
let captureGroup = [];
let captureIndex = 0;
function showCapture(index) {
  if (!captureGroup.length) return;
  captureIndex = (index + captureGroup.length) % captureGroup.length;
  const capture = captureGroup[captureIndex];
  const image = document.querySelector('#ui-lightbox-image');
  image.src = capture.dataset.uiCapture;
  image.alt = capture.dataset.alt;
  document.querySelector('#ui-lightbox-project').textContent = `${capture.dataset.project.toUpperCase()} / INTERFACE CAPTURE`;
  document.querySelector('#ui-lightbox-title').textContent = capture.dataset.caption;
  document.querySelector('#ui-counter').textContent = `${captureIndex + 1} / ${captureGroup.length}`;
}
document.querySelectorAll('[data-ui-capture]').forEach(button => button.addEventListener('click', () => {
  captureGroup = [...button.closest('[data-ui-gallery]').querySelectorAll('[data-ui-capture]')];
  showCapture(captureGroup.indexOf(button));
  openDialog('ui-lightbox', button);
}));
document.querySelector('#ui-previous').addEventListener('click', () => showCapture(captureIndex - 1));
document.querySelector('#ui-next').addEventListener('click', () => showCapture(captureIndex + 1));
document.querySelector('#ui-lightbox').addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showCapture(captureIndex - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showCapture(captureIndex + 1); }
});
