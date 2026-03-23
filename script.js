// ===== ELEMENTS =====
const head = document.getElementById("head");
const neck = document.getElementById("neck");
const body = document.getElementById("body");

const earL = document.getElementById("earL");
const earR = document.getElementById("earR");

const pupilL = document.getElementById("pupilL");
const pupilR = document.getElementById("pupilR");

const eyelidL = document.getElementById("eyelidL");
const eyelidR = document.getElementById("eyelidR");

const mouth = document.getElementById("mouth");

const tail1 = document.getElementById("tail1");
const tail2 = document.getElementById("tail2");
const tail3 = document.getElementById("tail3");
let currentMood = "idle";
// ===== UTIL =====
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ===== STATE =====
let state = {
    head: 0,
    neck: 0,
    earL: 0,
    earR: 0,
    eyeX: 0,
    eyeY: 0,
    tail: 0,
    blink: 0,
    mouth: 0 // -1 sad, 0 neutral, 1 happy
};

let target = { ...state };

// ===== SPINE SYSTEM =====
function applySpine() {
    // head leads, body follows with delay
    const bodyAngle = state.head * 0.25;

    //head.style.transform = `rotate(${state.head}deg)`;
    neck.style.transform = `rotate(${state.neck}deg)`;

    body.setAttribute(
        "transform",
        `rotate(${bodyAngle}, 225, 300)`
    );
    const bodyScale = 1 - state.depth * 0.08;

    body.setAttribute(
        "transform",
        `scale(${bodyScale}, ${bodyScale}) rotate(${state.head * 0.25}, 225, 300)`
    );
}
function applyDepth() {
    const d = clamp(state.depth, -1, 1);

    // scale range
    const scale = 1 + d * 0.25;   // near = bigger, far = smaller

    // slight vertical shift for perspective illusion
    const yShift = d * 20;

    // combine with rotation (IMPORTANT)
    const rotate = state.head;

    head.style.transform = `
    translateY(${yShift}px)
    scale(${scale})
    rotate(${rotate}deg)
  `;
}

// ===== EARS =====
function applyEars() {
    earL.style.transform = `rotate(${clamp(state.earL, -25, 25)}deg)`;
    earR.style.transform = `rotate(${clamp(state.earR, -25, 25)}deg)`;
}

// ===== EYES =====
function applyEyes() {
    const x = clamp(state.eyeX, -10, 10);
    const y = clamp(state.eyeY, -10, 10);

    pupilL.setAttribute("cx", 180 + x);
    pupilL.setAttribute("cy", 230 + y);

    pupilR.setAttribute("cx", 270 + x);
    pupilR.setAttribute("cy", 230 + y);
}

// ===== BLINK =====
function applyBlink() {
    const blinkAmount = state.blink; // 0 → open, 1 → closed

    const yOffset = 230 - blinkAmount * 20;

    eyelidL.setAttribute(
        "d",
        `M150 ${yOffset} Q180 ${200 - blinkAmount * 30} 210 ${yOffset}`
    );

    eyelidR.setAttribute(
        "d",
        `M210 ${yOffset} Q240 ${200 - blinkAmount * 30} 270 ${yOffset}`
    );
}

// ===== MOUTH =====
function applyMouth() {
    const t = state.mouth; // -1 to 1

    const y = 285;
    const curve = 25 + t * 25;

    mouth.setAttribute(
        "d",
        `M200 ${y} Q225 ${y + curve} 250 ${y}`
    );
}

// ===== TAIL =====
function applyTail() {
    const c = clamp(state.tail, -30, 30);

    tail1.setAttribute(
        "d",
        `M360 300 Q${400 + c} ${280 - c} 420 250`
    );

    tail2.setAttribute(
        "d",
        `M420 250 Q${440 + c} ${220 - c} 445 190`
    );

    tail3.setAttribute(
        "d",
        `M445 190 Q${450 + c} ${160 - c} 448 140`
    );
}

// ===== APPLY ALL =====
function applyAll() {
    applySpine();
    applyDepth();
    applyEars();
    applyEyes();
    applyBlink();
    applyMouth();
    applyTail();
}

// ===== EMOTION PRESETS =====
const moods = {
    idle: { head: 0, neck: 0, earL: 0, earR: 0, eyeX: 0, eyeY: 0, tail: 0, mouth: 0 },
    curious: { head: 10, neck: 4, earL: -10, earR: 8, eyeX: 5, eyeY: -2, tail: 20, mouth: 0.2 },
    happy: { head: 5, neck: 2, earL: -8, earR: -8, eyeX: 0, eyeY: 0, tail: 25, mouth: 1 },
    angry: { head: -5, neck: -2, earL: 15, earR: 15, eyeX: 0, eyeY: 0, tail: -20, mouth: -1 },
    sleepy: { head: 6, neck: 3, earL: -12, earR: -12, eyeX: 0, eyeY: 6, tail: 0, mouth: -0.2 }
};

// ===== EMOTION BLENDING =====
function setMood(mood) {
    const m = moods[mood];
    if (!m) return;

    currentMood = mood;

    for (let k in m) {
        target[k] = m[k];
    }
}

// ===== BLINK SYSTEM =====
function randomBlink() {
    target.blink = 1;

    setTimeout(() => {
        target.blink = 0;
    }, 120);
}

// random + natural spacing
function blinkLoop() {
    randomBlink();

    const next = 2000 + Math.random() * 3000;
    setTimeout(blinkLoop, next);
}

blinkLoop();
setInterval(() => {
    if (Math.random() < 0.3) randomBlink();
}, 2000);

// ===== MAIN LOOP (SMOOTHING) =====
function animate() {
    // smooth interpolation
    for (let k in state) {
        state[k] = lerp(state[k], target[k], 0.1);
    }

    // subtle idle noise
    state.head += Math.sin(Date.now() / 800) * 0.02;

    applyAll();

    requestAnimationFrame(animate);
}

animate();

// ===== DEMO =====
const moodList = ["idle", "curious", "happy", "angry", "sleepy"];
let i = 0;

setInterval(() => {
    setMood(moodList[i % moodList.length]);
    i++;
}, 4000);

function applyBlink() {
    // base openness from emotion (0 = closed, 1 = fully open)
    let baseOpen = 1;

    switch (currentMood) {
        case "sleepy": baseOpen = 0.4; break;
        case "angry": baseOpen = 0.6; break;
        case "happy": baseOpen = 0.9; break;
        case "curious": baseOpen = 1.0; break;
        case "idle": baseOpen = 1.0; break;
    }

    // blink overrides (blink = 1 → fully closed)
    const blinkClose = state.blink;

    // combine them
    const openness = baseOpen * (1 - blinkClose);

    // convert to how far lid travels
    const travel = (1 - openness) * 35;

    eyelidL.setAttribute(
        "transform",
        `translate(0, ${travel})`
    );

    eyelidR.setAttribute(
        "transform",
        `translate(0, ${travel})`
    );
}
function randomBlink() {

    setTimeout(() => {

        target.blink = 1;
    }, 120);

    setTimeout(() => {

        target.blink = 0;
    }, 240);
}

// ===== ESP32 READY =====
/*
const ws = new WebSocket("ws://192.168.4.1:81");

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);

  if (data.mood) setMood(data.mood);

  for (let k in data) {
    if (target[k] !== undefined) {
      target[k] = data[k];
    }
  }
};
*/