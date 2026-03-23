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

// ===== UTIL =====
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ===== STATE =====
let currentMood = "idle";
let lastHead = 0;

let state = {
    head: 0,
    neck: 0,
    earL: 0,
    earR: 0,
    eyeX: 0,
    eyeY: 0,
    tail: 0,
    blink: 0,
    mouth: 0,
    depth: 0,
    x: 0
};

let target = { ...state };

// ===== MOODS =====
const moods = {
    idle: { head: 0, neck: 0, earL: 0, earR: 0, eyeX: 0, eyeY: 0, tail: 0, mouth: 0 },
    curious: { head: 10, neck: 4, earL: -10, earR: 8, eyeX: 5, eyeY: -2, tail: 20, mouth: 0.2 },
    happy: { head: 5, neck: 2, earL: -8, earR: -8, eyeX: 0, eyeY: 0, tail: 25, mouth: 1 },
    angry: { head: -5, neck: -2, earL: 15, earR: 15, eyeX: 0, eyeY: 0, tail: -20, mouth: -1 },
    sleepy: { head: 6, neck: 3, earL: -12, earR: -12, eyeX: 0, eyeY: 6, tail: 0, mouth: -0.2 }
};

function setMood(mood) {
    if (!moods[mood]) return;
    currentMood = mood;
}

// ===== APPLY FUNCTIONS =====
function applySpine() {
    const bodyAngle = state.head * 0.25;
    neck.style.transform = `rotate(${state.neck}deg)`;

    const bodyScale = 1 - state.depth * 0.08;
    body.setAttribute(
        "transform",
        `scale(${bodyScale}, ${bodyScale}) rotate(${bodyAngle}, 225, 300)`
    );
}

function applyDepth() {
    const d = clamp(state.depth, -1, 1);

    const scale = 1 + d * 0.25;
    const yShift = d * 20;

    head.style.transform = `
        translate(${state.x}px, ${yShift}px)
        scale(${scale})
        rotate(${state.head}deg)
    `;
}

function applyEars() {
    earL.style.transform = `rotate(${clamp(state.earL, -25, 25)}deg)`;
    earR.style.transform = `rotate(${clamp(state.earR, -25, 25)}deg)`;
}

function applyEyes() {
    const x = clamp(state.eyeX, -10, 10);
    const y = clamp(state.eyeY, -10, 10);

    pupilL.setAttribute("cx", 180 + x);
    pupilL.setAttribute("cy", 230 + y);

    pupilR.setAttribute("cx", 270 + x);
    pupilR.setAttribute("cy", 230 + y);
}

function applyMouth() {
    const y = 285;
    const curve = 25 + state.mouth * 25;

    mouth.setAttribute(
        "d",
        `M200 ${y} Q225 ${y + curve} 250 ${y}`
    );
}

function applyTail() {
    const c = clamp(state.tail, -30, 30);

    tail1.setAttribute("d", `M360 300 Q${400 + c} ${280 - c} 420 250`);
    tail2.setAttribute("d", `M420 250 Q${440 + c} ${220 - c} 445 190`);
    tail3.setAttribute("d", `M445 190 Q${450 + c} ${160 - c} 448 140`);
}

function applyBlink() {
    let baseOpen = 1;

    if (currentMood === "sleepy") baseOpen = 0.4;
    if (currentMood === "angry") baseOpen = 0.6;
    if (currentMood === "happy") baseOpen = 0.9;

    const openness = baseOpen * (1 - state.blink);
    const travel = (1 - openness) * 35;

    eyelidL.setAttribute("transform", `translate(0, ${travel})`);
    eyelidR.setAttribute("transform", `translate(0, ${travel})`);
}

function applyAll() {
    applySpine();
    applyDepth();
    applyEars();
    applyEyes();
    applyBlink();
    applyMouth();
    applyTail();
}

// ===== BLINK =====
function randomBlink() {
    target.blink = 1;
    setTimeout(() => target.blink = 0, 150);
}

setInterval(() => {
    if (Math.random() < 0.3) randomBlink();
}, 2000);

// ===== CONTROL INPUT =====
let control = { head: 0, x: 0, depth: 0 };

const ws = new WebSocket(`ws://${location.host}/ws`);

function moodFromNumber(n) {
    switch (n) {
        case 0: return "idle";
        case 1: return "curious";
        case 2: return "happy";
        case 4: return "sleepy";
        default: return "idle";
    }
}

ws.onmessage = (e) => {
    const data = JSON.parse(e.data);

    control.head = data.head;
    control.x = data.x;
    control.depth = data.depth;

    if (data.mood !== undefined) {
        setMood(moodFromNumber(data.mood));
    }
};

// ===== MAIN LOOP =====
function animate() {
    target.head = control.head;
    target.x = control.x;
    target.depth = control.depth;

    target.eyeX = control.head * 0.3;
    target.eyeY = -control.depth * 5;
    target.tail = control.head * 1.5 + (moods[currentMood]?.tail || 0);

    for (let k in state) {
        let base = target[k] ?? 0;
        let emotion = moods[currentMood]?.[k] ?? 0;
        state[k] = lerp(state[k], base + emotion * 0.1, 0.1);
    }

    // neck follow
    state.neck = lerp(state.neck, state.head * 0.4, 0.08);

    // overshoot
    let headVel = state.head - lastHead;
    lastHead = state.head;

    if (Math.abs(headVel) > 0.05) {
        state.head += headVel * 0.1;
    }

    // idle motion
    const t = Date.now();
    state.head += Math.sin(t * 0.0013) * 0.05;
    state.head += Math.sin(t * 0.0007 + Math.sin(t * 0.0002)) * 0.03;

    state.head *= 0.999;

    applyAll();
    requestAnimationFrame(animate);
}

animate();