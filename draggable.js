/*
 * From https://www.redblobgames.com/x/2251-draggable/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */

import {makeDraggableOptions, convertPixelToSvgCoord, makeDraggable, modifySampleCode} from "./event-handling.js";

console.info("I'm happy to answer questions about the code; email me at redblobgames@gmail.com");

function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }



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


function makeDiagramOptions() {
    return {
        ...makeDraggableOptions(),
        x: 0,
        y: 0,
        changeText: true,
    };
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

function diagram_scrubbable_number() {
    let el = document.querySelector("#scrubbable-number");
    el.value = "123";
    let dragging = false;
    let state = {
        eventToCoordinates(event) { return {x: event.clientX, y: event.clientY}; },
        get dragging() { return dragging; },
        set dragging(d) { dragging = d; },
        get pos() { return { x: parseFloat(el.value), y: 0 }; },
        set pos(p) { el.value = clamp(Math.round(p.x), 0, 1000); },
    };
    return makeDraggable(state, el, makeDiagramOptions());
}

function diagram_pointer_events(selector, options) {
    let {state, el} = makePositionState(selector, options);
    return makeDraggable(state, el, options);
}

diagram_mouse_events_local();
diagram_mouse_events_document();
diagram_touch_events();
diagram_scrubbable_number();
diagram_pointer_events("#diagram-introduction", makeDiagramOptions());

// This demo has the minimal fixes (capture, noscroll)
diagram_pointer_events("#diagram-pointer-events", {changeText: true, capture: true, noscroll: true, noselect: true});

// Show how to fix scrolling
diagram_pointer_events("#diagram-touch-action-all", {...makeDiagramOptions(), noscroll: false, changeText: false, line2: "1"});
diagram_pointer_events("#diagram-touch-action", {...makeDiagramOptions(), noscroll: false, line2: "2", x: -175});
diagram_pointer_events("#diagram-touch-action", {...makeDiagramOptions(), noscroll: false, line2: "3", x: 0, class: "touch-none"});
diagram_pointer_events("#diagram-touch-action", {...makeDiagramOptions(), noscroll: true, line2: "4", x: 175});

// Show how capture is important
diagram_pointer_events("#diagram-capture", {...makeDiagramOptions(), capture: false, line2: "1", x: -125});
diagram_pointer_events("#diagram-capture", {...makeDiagramOptions(), capture: true, line2: "2", x: 125});

// Show how it's better to track the offset
diagram_pointer_events("#diagram-offset", {...makeDiagramOptions(), offset: false, line2: "1", x: -125});
diagram_pointer_events("#diagram-offset", {...makeDiagramOptions(), offset: true, line2: "2", x: 125});

// Show how to handle the context menu
diagram_pointer_events("#diagram-contextmenu", {...makeDiagramOptions(), left: false, noctrl: false, line2: "1", x: -225});
diagram_pointer_events("#diagram-contextmenu", {...makeDiagramOptions(), left: false, noctrl: false, nocontextmenu: true, line2: "2", x: -75});
diagram_pointer_events("#diagram-contextmenu", {...makeDiagramOptions(), left: true, noctrl: false, line2: "3 (Mac)", x: 75});
diagram_pointer_events("#diagram-contextmenu", {...makeDiagramOptions(), left: true, noctrl: true, line2: "4", x: 225});

// Show how to fix text selection
diagram_pointer_events("#diagram-text-select", {...makeDiagramOptions(), changeText: false, noselect: false, line2: "text 1", x: -175});
diagram_pointer_events("#diagram-text-select", {...makeDiagramOptions(), changeText: false, noselect: false, line2: "text 2", x: 0, class: "select-none"});
diagram_pointer_events("#diagram-text-select", {...makeDiagramOptions(), changeText: false, noselect: true, line2: "text 3", x: 175});

// Show how to fix system drag
diagram_pointer_events("#diagram-systemdrag", {...makeDiagramOptions(), changeText: false, nosystemdrag: false, text: false, line1: "", line2: "1", x: -125});
diagram_pointer_events("#diagram-systemdrag", {...makeDiagramOptions(), changeText: false, nosystemdrag: true, text: true, line1: "", line2: "2", x: 125});

// Show how to fix the edge case of chords
diagram_pointer_events("#diagram-chords", {...makeDiagramOptions(), chords: false, line2: "1", x: -125});
diagram_pointer_events("#diagram-chords", {...makeDiagramOptions(), chords: true, line2: "2", x: 125});

// END of diagrams

function formatCodeInPre(el) {
    // code="mouseLocal|mouseGlobal|touch|pointer" to select which source code to show
    // note that only pointer has any options
    const code = {
        mouseLocal: makeDraggableMouseLocal,
        mouseGlobal: makeDraggableMouseGlobal,
        touch: makeDraggableTouch,
        pointer: makeDraggable,
    }[el.dataset.code];

    const {lines, highlightedLines} = modifySampleCode(code, el.dataset);
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
    
    el.innerHTML = html;
}

for (let codeOutput of document.querySelectorAll("pre[data-code]")) {
    codeOutput.classList.add('language-javascript');
    formatCodeInPre(codeOutput);
}

function regenerateFinalCode() {
    let pre = document.querySelector("pre#final-code");
    let show = "capture noscroll left offset";
    for (let checkbox of document.querySelectorAll("#final-code-options input")) {
        if (checkbox.checked) show += " " + checkbox.dataset.show;
    }
    pre.dataset.show = show;
    pre.dataset.highlight = (this?.checked && this?.dataset?.show) ?? "";
    formatCodeInPre(pre);
}

for (let checkbox of document.querySelectorAll("#final-code-options input")) {
    checkbox.addEventListener('click', regenerateFinalCode);
}
regenerateFinalCode(); // in case the page was reloaded, and has some checkboxes set

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
