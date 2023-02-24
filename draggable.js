/*
 * From https://www.redblobgames.com/x/2251-draggable/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */

console.info("I'm happy to answer questions about the code; email me at redblobgames@gmail.com");

function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }


/** Convert from event coordinate space (on the page) to SVG coordinate
 * space (within the svg, honoring responsive resizing, width/height,
 * and viewBox) */
function convertPixelToSvgCoord(event, el=event.currentTarget) {
    const svg = el.ownerSVGElement;
    let p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    p = p.matrixTransform(svg.getScreenCTM().inverse());
    return p;
}


/** Make a draggable circle in the svg and keep some state for it */
function makePositionState(selector, options={changeText: true}) {
    const container = document.querySelector(selector);
    const svg = container.querySelector("svg");
    const el = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    el.setAttribute('class', options.class ?? "");
    const radius = options.radius ?? 30;
    el.innerHTML = `
      <circle stroke="black" stroke-width="0.5" r="${radius}" />
      <g font-size="14" text-anchor="middle" fill="white">
        <text dy="0.0em">${options.line1 ?? 'Drag'}</text>
        <text dy="1.0em">${options.line2 ?? 'me'}</text>
      </g>`;
    svg.appendChild(el);

    let dragging = null; // either null or value set by handler
    let pos = {x: options.x ?? 0, y: options.y ?? 0};
    function draw() {
        el.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        // NOTE: in a real project I usually put these on a class,
        // and then use el.classList.toggle('dragging', dragging)
        el.style.cursor =
            dragging? "grabbing" : "grab";
        if (options.changeText) {
            el.querySelector("text").textContent =
                dragging ? "Dragging" : "Drag";
        }
        el.querySelector("circle").style.fill =
            dragging? "hsl(200 50% 50%)" : "hsl(0 50% 50%)";
    }
    draw();

    let state = {
        eventToCoordinates(event) {
            return convertPixelToSvgCoord(event, el);
        },
        get dragging() {
            return dragging;
        },
        set dragging(d) {
            dragging = d;
            draw();
        },
        get pos() { return pos; },
        set pos({x, y}) {
            const [left, top, width, height] =
                  svg.getAttribute("viewBox").split(" ").map((s) => parseFloat(s));
            pos = {
                x: clamp(x, left + radius, left + width - radius),
                y: clamp(y, top + radius, top + height - radius),
            };
            draw();
        },
    };

    return {el, state};
}


function makeDraggableMouseLocal(state, el) {
    function mousedown(_event) {
        state.dragging = true;
    }
    function mouseup(_event) {
        state.dragging = null;
    }
    function mousemove(event) {
        if (!state.dragging) return;
        state.pos = state.eventToCoordinates(event);
    }
    
    el.addEventListener('mousedown', mousedown);
    el.addEventListener('mouseup', mouseup);
    el.addEventListener('mousemove', mousemove);
}


function makeDraggableMouseGlobal(state, el) {
    function globalMousemove(event) {
        state.pos = state.eventToCoordinates(event);
        state.dragging = true;
    }
    function globalMouseup(_event) {
        document.removeEventListener('mousemove', globalMousemove);
        document.removeEventListener('mouseup', globalMouseup);
        state.dragging = null;
    }
    
    function mousedown(event) {
        document.addEventListener('mousemove', globalMousemove);
        document.addEventListener('mouseup', globalMouseup);
    }
    
    el.addEventListener('mousedown', mousedown);
}


function makeDraggableTouch(state, el) {
    function start(event) {
        event.preventDefault(); // prevent scrolling
        state.dragging = true;
    }
    function end(_event) {
        state.dragging = false;
    }
    function move(event) {
        if (!state.dragging) return;
        state.pos = state.eventToCoordinates(event.changedTouches[0]);
    }
    
    el.addEventListener('touchstart', start);
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('touchmove', move);
}


function makeOptions() {
    return {
        x: 0,
        y: 0,
        changeText: true,
        capture: true,
        nopropagate: false,
        offset: true,
        left: true,
        noctrl: true,
        noselect: true,
        noscroll: true,
        nosystemdrag: true,
        nocontextmenu: false,
        pointerid: false,
        chords: false,
    };
}

function makeDraggable(state, el, options) {
    function start(event) {
        if (options.left) if (event.button !== 0) return; // left button only
        if (options.noctrl) if (event.ctrlKey) return; // ignore ctrl+click
        if (options.nopropagate) event.stopPropagation(); // for nested draggables
        let {x, y} = state.eventToCoordinates(event);
        if (options.offset) state.dragging = {dx: state.pos.x - x, dy: state.pos.y - y};
        if (!options.offset) state.dragging = true;
        if (options.pointerid) state.pointerId = event.pointerId; // keep track of finger
        if (options.capture) el.setPointerCapture(event.pointerId);
        if (options.noselect) el.style.userSelect = 'none'; // if there's text
    }

    function end(event) {
        if (options.offset) state.dragging = null;
        if (!options.offset) state.dragging = false;
        if (options.noselect) el.style.userSelect = ''; // if there's text
    }

    function move(event) {
        if (!state.dragging) return;
        if (options.pointerid) if (state.pointerId !== event.pointerId) return; // check finger id
        if (options.nopropagate) event.stopPropagation(); // for nested draggables
        if (options.chords) if (!(event.buttons & 1)) return end(event); // edge case: chords
        let {x, y} = state.eventToCoordinates(event);
        if (options.offset) state.pos = {x: x + state.dragging.dx, y: y + state.dragging.dy};
        if (!options.offset) state.pos = {x, y};
    }
        
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointermove', move)
    if (options.noscroll) el.addEventListener('touchstart', (e) => e.preventDefault());
    if (options.nosystemdrag) el.addEventListener('dragstart', (e) => e.preventDefault());
    if (options.nocontextmenu) el.addEventListener('contextmenu', (e) => e.preventDefault());
}

function diagram_mouse_events_local() {
    let {state, el} = makePositionState("#diagram-mouse-events-local");
    makeDraggableMouseLocal(state, el);
}

function diagram_mouse_events_document() {
    let {state, el} = makePositionState("#diagram-mouse-events-document");
    makeDraggableMouseGlobal(state, el);
}

function diagram_touch_events() {
    let {state, el} = makePositionState("#diagram-touch-events");
    makeDraggableTouch(state, el);
}

function diagram_pointer_events(selector, options) {
    let {state, el} = makePositionState(selector, options);
    return makeDraggable(state, el, options);
}


diagram_mouse_events_local();
diagram_mouse_events_document();
diagram_touch_events();
diagram_pointer_events("#diagram-introduction", makeOptions());

// This demo has the minimal fixes (capture, noscroll)
diagram_pointer_events("#diagram-pointer-events", {changeText: true, capture: true, noscroll: true, noselect: true});

// Show how to fix scrolling
diagram_pointer_events("#diagram-touch-action-all", {...makeOptions(), noscroll: false, changeText: false, line2: "1"});
diagram_pointer_events("#diagram-touch-action", {...makeOptions(), noscroll: false, line2: "2", x: -175});
diagram_pointer_events("#diagram-touch-action", {...makeOptions(), noscroll: false, line2: "3", x: 0, class: "touch-none"});
diagram_pointer_events("#diagram-touch-action", {...makeOptions(), noscroll: true, line2: "4", x: 175});

// Show how capture is important
diagram_pointer_events("#diagram-capture", {...makeOptions(), capture: false, line2: "1", x: -125});
diagram_pointer_events("#diagram-capture", {...makeOptions(), capture: true, line2: "2", x: 125});

// Show how it's better to track the offset
diagram_pointer_events("#diagram-offset", {...makeOptions(), offset: false, line2: "1", x: -125});
diagram_pointer_events("#diagram-offset", {...makeOptions(), offset: true, line2: "2", x: 125});

// Show how to handle the context menu
diagram_pointer_events("#diagram-contextmenu", {...makeOptions(), left: false, noctrl: false, line2: "1", x: -225});
diagram_pointer_events("#diagram-contextmenu", {...makeOptions(), left: false, noctrl: false, nocontextmenu: true, line2: "2", x: -75});
diagram_pointer_events("#diagram-contextmenu", {...makeOptions(), left: true, noctrl: false, line2: "3 (Mac)", x: 75});
diagram_pointer_events("#diagram-contextmenu", {...makeOptions(), left: true, noctrl: true, line2: "4", x: 225});

// Show how to fix text selection
diagram_pointer_events("#diagram-text-select", {...makeOptions(), changeText: false, noselect: false, line2: "1", x: -175});
diagram_pointer_events("#diagram-text-select", {...makeOptions(), changeText: false, noselect: false, line2: "2", x: 0, class: "select-none"});
diagram_pointer_events("#diagram-text-select", {...makeOptions(), changeText: false, noselect: true, line2: "3", x: 175});

// Show how to fix system drag
diagram_pointer_events("#diagram-systemdrag", {...makeOptions(), changeText: false, nosystemdrag: false, text: false, line1: "", line2: "1", x: -125});
diagram_pointer_events("#diagram-systemdrag", {...makeOptions(), changeText: false, nosystemdrag: true, text: true, line1: "", line2: "2", x: 125});

// Show how to fix the edge case of chords
diagram_pointer_events("#diagram-chords", {...makeOptions(), chords: false, line2: "1", x: -125});
diagram_pointer_events("#diagram-chords", {...makeOptions(), chords: true, line2: "2", x: 125});

// END of diagrams

// Generate and syntax highlight sample code
function generateSampleCode(pre) {
    // show= should be a list of flag names to show
    let show = pre.dataset.show ?? "";
    let options = {};
    for (let option of show.split(" ")) {
        options[option] = true;
    }
    // highlight= should be a list of flag names to highlight
    let highlight = {};
    for (let option of (pre.dataset.highlight ?? "").split(" ")) {
        options[option] = true;
        highlight[option] = true;
    }

    // code="mouseLocal|mouseGlobal|touch|pointer" to select which source code to show
    // note that only pointer has any options
    let code = {
        mouseLocal: makeDraggableMouseLocal,
        mouseGlobal: makeDraggableMouseGlobal,
        touch: makeDraggableTouch,
        pointer: makeDraggable,
    }[pre.dataset.code];

    let lines = [];
    let highlightedLines = new Set();
    for (let line of code.toString().split("\n")) {
        let m = line.match(/(.*?)if \((!?)options\.(\w+?)\) (.*)/);
        if (m) {
            let [_, indent, invert, option, restOfLine] = m;
            let keepLine = (!!options[option] === (invert === ""));
            if (!keepLine) continue;
            if (highlight[option]) highlightedLines.add(lines.length);
            line = `${indent}${restOfLine}`;
        }
        lines.push(line);
    }

    let html = Prism.highlight(lines.join("\n"),
                               Prism.languages.javascript,
                               'javascript');
    html = html.split("\n").map((line, lineNumber) => {
        if (highlightedLines.has(lineNumber)) {
            let m = line.match(/^(\s*)(\S.*)$/);
            line = `${m[1]}<span class="highlight">${m[2]}</span>`;
        }
        return line;
    }).join("\n");
    
    pre.innerHTML = html;
}

for (let codeOutput of document.querySelectorAll("pre[data-code]")) {
    generateSampleCode(codeOutput);
}

function regenerateFinalCode() {
    let pre = document.querySelector("pre#final-code");
    let show = "capture noscroll left offset";
    for (let checkbox of document.querySelectorAll("#final-code-options input")) {
        if (checkbox.checked) show += " " + checkbox.dataset.show;
    }
    pre.dataset.show = show;
    generateSampleCode(pre);
}

for (let checkbox of document.querySelectorAll("#final-code-options input")) {
    checkbox.addEventListener('click', regenerateFinalCode);
}

window.diagramSystemDragSetSelection = function() {
    const figure = document.querySelector("#diagram-systemdrag");
    const ttList = figure.querySelectorAll("tt");
    let range = document.createRange();
    range.setStart(ttList[0], 0);
    range.setEndAfter(ttList[1]);
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}
