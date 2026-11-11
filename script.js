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
const audio = new Audio('cat.wav');

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

// Tuning: how far the cat moves at the screen edge
const MAX_HEAD = 30;   // degrees of head tilt (before the 1.1 gain)
const MAX_X = 40;      // horizontal head shift (SVG units)
const MAX_DEPTH = 1;   // -1..1

function meow() {
    audio.currentTime = 0;
    audio.play().catch(() => {});
    // little happy blink
    randomBlink();
}

function moodFromNumber(n) {
    switch (n) {
        case 0: return "idle";
        case 1: return "curious";
        case 2: return "happy";
        case 3: return "angry";
        case 4: return "sleepy";
        default: return "idle";
    }
}

// ----- Pointer (mouse + touch + pen) -----
const svgEl = document.querySelector(".cat-svg");
const dragOnly = { value: false }; // set true if you want touch to only react while pressed

// Stop the browser from scrolling/zooming while dragging on the cat
document.body.style.touchAction = "none";
document.body.style.overflow = "hidden";
// Make the SVG fit on small screens
svgEl.style.maxWidth = "100vw";
svgEl.style.maxHeight = "100vh";

function setControlFromPointer(clientX, clientY) {
    const r = svgEl.getBoundingClientRect();
    // Normalise against the visible cat area: -1 (left/top) .. 1 (right/bottom)
    const nx = clamp(((clientX - (r.left + r.width / 2)) / (r.width / 2)), -1, 1);
    const ny = clamp(((clientY - (r.top + r.height * 0.3)) / (r.height * 0.5)), -1, 1);

    control.head = nx * MAX_HEAD * 1.1;
    control.x = nx * MAX_X;
    control.depth = clamp(ny * MAX_DEPTH, -1, 1); // pointer down = lean in
}

function resetControl() {
    control.head = 0;
    control.x = 0;
    control.depth = 0;
}

let pointerDown = false;

window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || pointerDown || !dragOnly.value) {
        setControlFromPointer(e.clientX, e.clientY);
    }
});

window.addEventListener("pointerdown", (e) => {
    pointerDown = true;
    setControlFromPointer(e.clientX, e.clientY);
});

window.addEventListener("pointerup", (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    // Tap/click = meow
    meow();
    // On touch there's no hover, so recentre when the finger lifts
    if (e.pointerType !== "mouse") resetControl();
});

window.addEventListener("pointercancel", () => {
    pointerDown = false;
    resetControl();
});

// Mouse leaves the window -> recentre
document.addEventListener("mouseleave", resetControl);

// ----- Keyboard (0-4 = force a mood, space = meow) -----
window.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "4") setMood(moodFromNumber(Number(e.key)));
    if (e.code === "Space") { e.preventDefault(); meow(); }
});

// ----- Random mood every 3 seconds -----
const MOOD_INTERVAL = 3000;

function pickRandomMood() {
    const names = Object.keys(moods).filter((m) => m !== currentMood); // always change
    setMood(names[Math.floor(Math.random() * names.length)]);
}

setInterval(pickRandomMood, MOOD_INTERVAL);

// ----- Optional: ESP32 joystick still works if reachable -----
// Set to true to re-enable the websocket joystick alongside mouse/touch.
const USE_WEBSOCKET = false;

if (USE_WEBSOCKET) {
    const ws = new WebSocket(`ws://192.168.1.184/ws`);

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        control.head = data.head * 1.1;
        control.x = data.x * 4;
        control.depth = data.depth;

        if (data.mood !== undefined) setMood(moodFromNumber(data.mood));
        if (data.meow) meow();
    };
}

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
