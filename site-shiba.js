(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dog = document.createElement('div');
  dog.id = 'site-shiba';
  dog.setAttribute('aria-hidden', 'true');
  dog.innerHTML = '<div class="site-shiba-shadow"></div><div class="site-shiba-sprite"></div>';
  document.body.append(dog);

  const sprite = dog.querySelector('.site-shiba-sprite');
  const shadow = dog.querySelector('.site-shiba-shadow');
  const FRAMES = {
    stand: 0,
    blink: 1,
    wag: [2, 3],
    walk: [4, 5, 6, 7],
    jump: 8,
    happy: [9, 10],
    ball: 11,
    ballWalk: [12, 13, 14, 15],
    sit: 16,
    sitBlink: 17,
    sitWag: 18,
    sitHappy: 19
  };
  const SPRITE_WIDTH = 40;
  const SPRITE_HEIGHT = 32;
  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const ZEE = ['XXXXX', '...X.', '..X..', '.X...', 'XXXXX'];

  const pixelScale = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--shiba-px')) || 4;
  const size = () => ({ width: SPRITE_WIDTH * pixelScale(), height: SPRITE_HEIGHT * pixelScale() });
  const now = () => performance.now();
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const floorY = () => window.innerHeight - size().height - 18;

  let home;
  let position;
  let target;
  let ball = null;
  let ballFlightId = 0;
  let facing = -1;
  let state = 'idle';
  let stateStarted = 0;
  let lastFrameTime = performance.now();
  let currentFrame = -1;
  let hovering = false;
  let blinkAt = 0;
  let blinkUntil = 0;
  let wagUntil = 0;
  let nextIdleAction = 0;
  let sitUntil = 0;
  let sleepAt = 0;
  let zAt = 0;
  let hop = 0;

  function setFrame(index) {
    if (index === currentFrame) return;
    currentFrame = index;
    sprite.style.backgroundPosition = `${-index * SPRITE_WIDTH * pixelScale()}px 0`;
  }

  function setHome() {
    home = {
      x: window.innerWidth - size().width - 24,
      y: floorY()
    };
    if (!position || state === 'idle' || state === 'sit' || state === 'sleep') {
      position = { ...home };
      target = { ...home };
    }
  }

  function enter(nextState) {
    state = nextState;
    dog.dataset.state = nextState;
    stateStarted = now();
    if (nextState === 'idle') {
      nextIdleAction = stateStarted + random(4000, 9000);
      wagUntil = stateStarted + 900;
    }
  }

  function render() {
    dog.style.transform = `translate3d(${Math.round(position.x)}px, ${Math.round(position.y - hop)}px, 0)`;
    dog.classList.toggle('flip', facing === 1);
    const shadowScale = 1 - Math.min(1, hop / 40) * .35;
    shadow.style.transform = `translateY(${Math.round(hop)}px) scaleX(${shadowScale})`;
    shadow.style.opacity = 1 - Math.min(1, hop / 40) * .5;
  }

  function mouthPosition() {
    return {
      x: position.x + (facing === -1 ? 11 : SPRITE_WIDTH - 11) * pixelScale(),
      y: position.y + 17 * pixelScale()
    };
  }

  function pixelArt(pattern, unit, color) {
    return pattern.flatMap((row, y) => [...row].map((cell, x) => (
      cell === 'X' ? `${x * unit}px ${y * unit}px 0 0 ${color}` : null
    )).filter(Boolean)).join(',');
  }

  function spawnPixelArt(pattern, x, y, color, extraClass = '', unit = 3) {
    const element = document.createElement('div');
    element.className = `site-shiba-pixel ${extraClass}`;
    element.style.width = `${unit}px`;
    element.style.height = `${unit}px`;
    element.style.boxShadow = pixelArt(pattern, unit, color);
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    document.body.append(element);
    setTimeout(() => element.remove(), 1700);
  }

  function showHearts(count) {
    for (let i = 0; i < count; i += 1) {
      setTimeout(() => {
        spawnPixelArt(
          HEART,
          position.x + random(.25, .7) * size().width,
          position.y + random(-4, 14),
          i % 2 ? '#e85d75' : '#f28aa0'
        );
      }, i * 140);
    }
  }

  function showBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'site-shiba-bubble';
    bubble.textContent = text;
    bubble.style.left = `${position.x + (facing === -1 ? size().width * .55 : size().width * .1)}px`;
    bubble.style.top = `${position.y - 22}px`;
    document.body.append(bubble);
    setTimeout(() => bubble.remove(), 950);
  }

  function chase(landingPoint, flightId) {
    if (flightId !== ballFlightId || !ball) return;
    target = {
      x: clamp(landingPoint.x - size().width * .28 + 6, 4, window.innerWidth - size().width - 4),
      y: clamp(landingPoint.y - size().height * .72, 72, window.innerHeight - size().height - 6)
    };
    enter('chase');
  }

  function bounce(landingPoint, count, flightId) {
    if (flightId !== ballFlightId || !ball) return;
    if (count === 0) {
      chase(landingPoint, flightId);
      return;
    }
    const start = now();
    const duration = 180 * count / 2;
    const height = 22 * count / 2;
    const step = time => {
      if (flightId !== ballFlightId || !ball) return;
      const progress = Math.min(1, (time - start) / duration);
      ball.style.transform = `translate3d(${Math.round(landingPoint.x)}px, ${Math.round(landingPoint.y - Math.sin(Math.PI * progress) * height)}px, 0)`;
      if (progress < 1) requestAnimationFrame(step);
      else bounce(landingPoint, count - 1, flightId);
    };
    requestAnimationFrame(step);
  }

  function throwBall(x, y) {
    ballFlightId += 1;
    const flightId = ballFlightId;
    if (ball) ball.remove();
    ball = document.createElement('div');
    ball.className = 'site-shiba-ball';
    document.body.append(ball);

    const ballSize = 8 * pixelScale();
    const from = mouthPosition();
    const to = {
      x: clamp(x - ballSize / 2, 8, window.innerWidth - ballSize - 8),
      y: clamp(y - ballSize / 2, 54, window.innerHeight - ballSize - 12)
    };
    const start = now();
    const duration = 520 + Math.hypot(to.x - from.x, to.y - from.y) * .25;
    facing = to.x > position.x + size().width / 2 ? 1 : -1;
    enter('watch');

    const fly = time => {
      if (flightId !== ballFlightId || !ball) return;
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      const ballX = from.x + (to.x - from.x) * eased;
      const ballY = from.y + (to.y - from.y) * eased - Math.sin(Math.PI * progress) * 90;
      ball.style.transform = `translate3d(${Math.round(ballX)}px, ${Math.round(ballY)}px, 0)`;
      if (progress < 1) requestAnimationFrame(fly);
      else bounce(to, 2, flightId);
    };
    requestAnimationFrame(fly);
  }

  function decideIdleAction(time) {
    const choice = Math.random();
    if (choice < .5) {
      target = {
        x: clamp(random(window.innerWidth * .25, window.innerWidth - size().width - 16), 4, window.innerWidth - size().width - 4),
        y: clamp(floorY() + random(-28, 4), 54, floorY())
      };
      enter('wander');
    } else if (choice < .85) {
      sitUntil = time + random(6000, 14000);
      sleepAt = time + random(9000, 12000);
      enter('sit');
    } else {
      wagUntil = time + 1400;
      nextIdleAction = time + random(3000, 6000);
    }
  }

  function wake() {
    if (state === 'sit' || state === 'sleep') {
      enter('idle');
      wagUntil = now() + 1200;
    }
  }

  function tick(time) {
    const delta = Math.min(40, time - lastFrameTime) / 1000;
    lastFrameTime = time;
    let nextFrame = FRAMES.stand;

    if (time > blinkAt) {
      blinkUntil = time + 120;
      blinkAt = time + random(1800, 4800);
    }
    const blinking = time < blinkUntil;
    const moving = state === 'chase' || state === 'wander' || state === 'return';

    if (moving) {
      const dx = target.x - position.x;
      const dy = target.y - position.y;
      const distance = Math.hypot(dx, dy);
      const speed = state === 'chase' ? (distance > window.innerWidth * .3 ? 430 : 300) : state === 'return' ? 210 : 120;
      if (distance < 6) {
        position = { ...target };
        if (state === 'chase') enter('pounce');
        else if (state === 'return') enter('drop');
        else {
          facing = -1;
          enter('idle');
        }
      } else {
        position.x += dx / distance * speed * delta;
        position.y += dy / distance * speed * delta;
        facing = dx >= 0 ? 1 : -1;
      }
      const frameRate = state === 'chase' ? 70 : state === 'return' ? 100 : 150;
      nextFrame = (state === 'return' ? FRAMES.ballWalk : FRAMES.walk)[Math.floor(time / frameRate) % 4];
    } else if (state === 'watch') {
      nextFrame = blinking ? FRAMES.blink : FRAMES.stand;
    } else if (state === 'pounce') {
      const progress = Math.min(1, (time - stateStarted) / 380);
      hop = Math.sin(Math.PI * progress) * 34;
      nextFrame = FRAMES.jump;
      if (progress >= 1) {
        hop = 0;
        if (ball) ball.remove();
        ball = null;
        showHearts(3);
        enter('celebrate');
      }
    } else if (state === 'celebrate') {
      nextFrame = FRAMES.happy[Math.floor(time / 170) % 2];
      hop = Math.abs(Math.sin(time / 110)) * 6;
      if (time - stateStarted > 1200) {
        hop = 0;
        target = { ...home };
        facing = home.x > position.x ? 1 : -1;
        enter('return');
      }
    } else if (state === 'drop') {
      nextFrame = FRAMES.ball;
      if (time - stateStarted > 500) {
        facing = -1;
        enter('idle');
      }
    } else if (state === 'bark') {
      const progress = Math.min(1, (time - stateStarted) / 320);
      hop = Math.sin(Math.PI * progress) * 16;
      nextFrame = FRAMES.jump;
      if (progress >= 1) {
        hop = 0;
        enter('idle');
      }
    } else if (state === 'sit') {
      nextFrame = FRAMES.sit;
      if (time < wagUntil || hovering) nextFrame = FRAMES.sitWag;
      if (blinking) nextFrame = FRAMES.sitBlink;
      if (hovering) nextFrame = FRAMES.sitHappy;
      if (time > sleepAt && !hovering) {
        enter('sleep');
        zAt = time;
      } else if (time > sitUntil) enter('idle');
    } else if (state === 'sleep') {
      nextFrame = FRAMES.sitBlink;
      if (time > zAt) {
        spawnPixelArt(ZEE, position.x + size().width * (facing === -1 ? .58 : .3), position.y + 2, '#8e99ad', 'z', 4);
        zAt = time + 1300;
      }
      if (hovering) wake();
    } else {
      nextFrame = FRAMES.stand;
      if (time < wagUntil) nextFrame = FRAMES.wag[Math.floor(time / 130) % 2];
      if (blinking) nextFrame = FRAMES.blink;
      if (hovering) {
        nextFrame = FRAMES.happy[Math.floor(time / 170) % 2];
        nextIdleAction = time + 4000;
      } else if (time > nextIdleAction) decideIdleAction(time);
    }

    setFrame(nextFrame);
    render();
    requestAnimationFrame(tick);
  }

  function isInteractive(element) {
    return element.closest('a, button, input, select, textarea, label, summary, [role="button"], [contenteditable="true"]');
  }

  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (dog.contains(event.target)) {
      if (state === 'idle' || state === 'sit' || state === 'sleep' || state === 'watch') {
        wake();
        showBubble('멍!');
        showHearts(1);
        enter('bark');
      }
      return;
    }
    if (isInteractive(event.target)) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    if (state === 'pounce' || state === 'celebrate' || state === 'bark') return;
    wake();
    hop = 0;
    throwBall(event.clientX, event.clientY);
  });

  dog.addEventListener('pointerenter', () => {
    hovering = true;
    if (state === 'idle' || state === 'sit') showHearts(1);
  });
  dog.addEventListener('pointerleave', () => {
    hovering = false;
  });
  window.addEventListener('resize', setHome, { passive: true });

  const image = new Image();
  image.addEventListener('load', () => {
    setHome();
    enter('idle');
    render();
    dog.classList.add('ready');
    requestAnimationFrame(tick);
  });
  image.addEventListener('error', () => dog.remove());
  image.src = 'images/shiba-strip.png';
})();
