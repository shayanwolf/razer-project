document.addEventListener('DOMContentLoaded', function(){

  const track = document.getElementById('rzSliderTrack');
  const dotsEl = document.getElementById('rzSliderDots');
  if(!track || !dotsEl) return; // slider markup isn't on this page

  const realSlides = Array.from(track.children);
  const n = realSlides.length;
  if(n === 0) return;

  // clone the first slide and append it so the loop from last -> first is seamless
  const clone = realSlides[0].cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);

  dotsEl.innerHTML = realSlides
    .map((_, i) => `<button class="dot" data-i="${i}" aria-label="Go to slide ${i + 1}"></button>`)
    .join('');

  let pos = 0;
  let timer = null;
  let playing = true;
  let wrapping = false;

  function moveTo(p, withTransition){
    track.style.transition = withTransition ? '' : 'none';
    track.style.transform = `translateX(-${track.children[p].offsetLeft}px)`;
    if(!withTransition) track.offsetHeight; // force reflow before re-enabling the transition
  }

  function setActive(realIndex){
    [...track.children].forEach((el, i) => el.classList.toggle('active', i === realIndex || i === realIndex + n));
    [...dotsEl.children].forEach((el, i) => el.classList.toggle('active', i === realIndex));
  }

  function next(){
    if(wrapping) return;
    pos++;
    moveTo(pos, true);
    setActive(pos % n);
    if(pos === n){
      wrapping = true;
      track.addEventListener('transitionend', function onEnd(){
        track.removeEventListener('transitionend', onEnd);
        pos = 0;
        moveTo(pos, false);
        wrapping = false;
      }, { once: true });
    }
  }

  function prev(){
    if(wrapping) return;
    if(pos === 0){
      wrapping = true;
      pos = n;
      moveTo(pos, false);
      pos--;
      moveTo(pos, true);
      wrapping = false;
    } else {
      pos--;
      moveTo(pos, true);
    }
    setActive(((pos % n) + n) % n);
  }

  function goToDot(i){
    pos = i;
    moveTo(pos, true);
    setActive(i);
  }

  function startTimer(){
    clearInterval(timer);
    timer = setInterval(next, 4200);
  }

  function setPlaying(state){
    playing = state;
    const btn = document.getElementById('rzSliderPlay');
    btn.textContent = playing ? '❚❚' : '▶';
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if(playing){ startTimer(); } else { clearInterval(timer); }
  }

  setActive(0);
  moveTo(0, false);
  startTimer();

  window.addEventListener('resize', () => moveTo(pos, false));

  document.getElementById('rzSliderNext').addEventListener('click', () => { next(); if(playing) startTimer(); });
  document.getElementById('rzSliderPrev').addEventListener('click', () => { prev(); if(playing) startTimer(); });
  document.getElementById('rzSliderPlay').addEventListener('click', () => setPlaying(!playing));
  dotsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.dot');
    if(!btn) return;
    goToDot(+btn.dataset.i);
    if(playing) startTimer();
  });

});


/* Cards slider (.rzc) — paging, dots, arrows.
   Everything is looked up by class inside each .rzc, so it does not touch
   (or depend on) the hero slider or any ids on the page. */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.rzc').forEach(initCardsSlider);
});

function initCardsSlider(root) {
  const track = root.querySelector('.rzc-track');
  const dotsEl = root.querySelector('.rzc-dots');
  const prevBtn = root.querySelector('.rzc-prev');
  const nextBtn = root.querySelector('.rzc-next');
  const cards = track ? Array.from(track.children) : [];
  if (!cards.length || !dotsEl || !prevBtn || !nextBtn) return;

  let pageSize = 1; // cards per page = whole cards visible (1.12 -> 1)
  let pages = 1;
  let queued = false;

  const maxScroll = () => track.scrollWidth - track.clientWidth;
  const pageLeft = (p) =>
    cards[Math.min(p * pageSize, cards.length - 1)].offsetLeft - cards[0].offsetLeft;

  function currentPage() {
    if (maxScroll() <= 2) return 0;
    if (track.scrollLeft >= maxScroll() - 2) return pages - 1;
    let best = 0;
    let bestDist = Infinity;
    for (let p = 0; p < pages; p++) {
      const dist = Math.abs(track.scrollLeft - pageLeft(p));
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return best;
  }

  function update() {
    queued = false;
    const page = currentPage();
    Array.from(dotsEl.children).forEach((dot, i) => dot.classList.toggle('is-active', i === page));
    prevBtn.disabled = track.scrollLeft <= 2;
    nextBtn.disabled = track.scrollLeft >= maxScroll() - 2;
  }

  function build() {
    const perView = parseFloat(getComputedStyle(root).getPropertyValue('--rzc-per-view')) || 1;
    pageSize = Math.max(1, Math.floor(perView));
    pages = maxScroll() <= 2 ? 1 : Math.max(1, Math.ceil(cards.length / pageSize));

    if (dotsEl.children.length !== pages) {
      dotsEl.innerHTML = Array.from(
        { length: pages },
        (_, i) => `<button class="rzc-dot" type="button" aria-label="Go to page ${i + 1}"></button>`
      ).join('');
    }

    root.classList.toggle('rzc-single', pages === 1);
    update();
  }

  function goTo(page) {
    const p = Math.max(0, Math.min(pages - 1, page));
    track.scrollTo({ left: pageLeft(p), behavior: 'smooth' });
  }

  track.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  });

  prevBtn.addEventListener('click', () => goTo(currentPage() - 1));
  nextBtn.addEventListener('click', () => goTo(currentPage() + 1));

  dotsEl.addEventListener('click', (e) => {
    const dot = e.target.closest('.rzc-dot');
    if (dot) goTo(Array.from(dotsEl.children).indexOf(dot));
  });

  new ResizeObserver(build).observe(root);
  build();
}

/* Media slider (.rzm) — paging, dots, arrows.
   Everything is looked up by class inside each .rzm, so it does not touch
   (or depend on) the other sliders or any ids on the page. */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.rzm').forEach(initMediaSlider);
});

function initMediaSlider(root) {
  const track = root.querySelector('.rzm-track');
  const dotsEl = root.querySelector('.rzm-dots');
  const prevBtn = root.querySelector('.rzm-prev');
  const nextBtn = root.querySelector('.rzm-next');
  const cards = track ? Array.from(track.children) : [];
  if (!cards.length || !dotsEl || !prevBtn || !nextBtn) return;

  let pageSize = 1; // cards per page = whole cards visible (3.15 -> 3)
  let pages = 1;
  let queued = false;

  const maxScroll = () => track.scrollWidth - track.clientWidth;
  const pageLeft = (p) =>
    cards[Math.min(p * pageSize, cards.length - 1)].offsetLeft - cards[0].offsetLeft;

  function currentPage() {
    if (maxScroll() <= 2) return 0;
    if (track.scrollLeft >= maxScroll() - 2) return pages - 1;
    let best = 0;
    let bestDist = Infinity;
    for (let p = 0; p < pages; p++) {
      const dist = Math.abs(track.scrollLeft - pageLeft(p));
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return best;
  }

  function update() {
    queued = false;
    const page = currentPage();
    Array.from(dotsEl.children).forEach((dot, i) => dot.classList.toggle('is-active', i === page));
    prevBtn.disabled = track.scrollLeft <= 2;
    nextBtn.disabled = track.scrollLeft >= maxScroll() - 2;
  }

  function build() {
    const perView = parseFloat(getComputedStyle(root).getPropertyValue('--rzm-per-view')) || 1;
    pageSize = Math.max(1, Math.floor(perView));
    pages = maxScroll() <= 2 ? 1 : Math.max(1, Math.ceil(cards.length / pageSize));

    if (dotsEl.children.length !== pages) {
      dotsEl.innerHTML = Array.from(
        { length: pages },
        (_, i) => `<button class="rzm-dot" type="button" aria-label="Go to page ${i + 1}"></button>`
      ).join('');
    }

    root.classList.toggle('rzm-single', pages === 1);
    update();
  }

  function goTo(page) {
    const p = Math.max(0, Math.min(pages - 1, page));
    track.scrollTo({ left: pageLeft(p), behavior: 'smooth' });
  }

  track.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  });

  prevBtn.addEventListener('click', () => goTo(currentPage() - 1));
  nextBtn.addEventListener('click', () => goTo(currentPage() + 1));

  dotsEl.addEventListener('click', (e) => {
    const dot = e.target.closest('.rzm-dot');
    if (dot) goTo(Array.from(dotsEl.children).indexOf(dot));
  });

  new ResizeObserver(build).observe(root);
  build();
}


let icon = document.querySelector(".hamburger-icon");
let overlay = document.querySelector(".hamburger-overlay");
let close = document.querySelector(".hamburger-close");

icon.addEventListener("click", () => {
    document.body.classList.add("hamburger-open");
});

close.addEventListener("click", () => {
    document.body.classList.remove("hamburger-open");
});

overlay.addEventListener("click", () => {
    document.body.classList.remove("hamburger-open");
});