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
        state.pos = convertPixelToSvgCoord(event, el);
    }
    
    el.addEventListener('mousedown', mousedown);
    el.addEventListener('mouseup', mouseup);
    el.addEventListener('mousemove', mousemove);
}


function makeDraggableMouseGlobal(state, el) {
    function globalMousemove(event) {
        state.pos = convertPixelToSvgCoord(event, el);
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
    function start(_event) {
        state.dragging = true;
    }
    function end(_event) {
        state.dragging = false;
    }
    function move(event) {
        if (!state.dragging) return;
        let {x, y} = convertPixelToSvgCoord(event.changedTouches[0], el);
        state.pos = {x, y};
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
        left: true,
        ctrl: true,
        offset: true,
        text: true,
        scroll: true,
        systemdrag: true,
        chord: true,
    };
}

function makeDraggable(state, el, options) {
    function start(event) {
        if (options.left) if (event.button !== 0) return;
        if (options.ctrl) if (event.ctrlKey) return;
        let {x, y} = convertPixelToSvgCoord(event);
        if (options.offset) state.dragging = {dx: state.pos.x - x, dy: state.pos.y - y};
        if (!options.offset) state.dragging = true;
        if (options.capture) el.setPointerCapture(event.pointerId);
        if (options.text) el.style.userSelect = 'none';
    }

    function end(event) {
        if (options.offset) state.dragging = null;
        if (!options.offset) state.dragging = false;
        if (options.text) el.style.userSelect = '';
    }

    function move(event) {
        if (!state.dragging) return;
        if (options.chords) if (!(event.buttons & 1)) return end(event);
        let {x, y} = convertPixelToSvgCoord(event);
        if (options.offset) state.pos = {x: x + state.dragging.dx, y: y + state.dragging.dy};
        if (!options.offset) state.pos = {x, y};
    }
        
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointermove', move)
    if (options.capture) el.addEventListener('lostpointercapture', end); // optional
    if (options.scroll) el.addEventListener('touchstart', (e) => e.preventDefault());
    if (options.systemdrag) el.addEventListener('dragstart', (e) => e.preventDefault());
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
diagram_pointer_events("#diagram-pointer-events", {changeText: true, capture: true});
diagram_pointer_events("#diagram-pointer-events-fixed", makeOptions());

// These diagrams are presented in order, each one building upon the last
let options = {changeText: true};

diagram_pointer_events("#diagram-touch-action-all", {...options, changeText: false, line2: "1"});
diagram_pointer_events("#diagram-touch-action", {...options, scroll: false, line2: "2", x: -150});
diagram_pointer_events("#diagram-touch-action", {...options, scroll: false, line2: "3", x: 0, class: "touch-none"});
diagram_pointer_events("#diagram-touch-action", {...options, scroll: true, line2: "4", x: 150});
options = {...options, scroll: true};

diagram_pointer_events("#diagram-capture", {...options, capture: false, line2: "1", x: -175});
diagram_pointer_events("#diagram-capture", {...options, capture: true, line2: "2", x: 175});
options = {...options, capture: true};

diagram_pointer_events("#diagram-text-select", {...options, changeText: false, text: false, line2: "1", x: -150});
diagram_pointer_events("#diagram-text-select", {...options, changeText: false, text: false, line2: "2", x: 0, class: "select-none"});
diagram_pointer_events("#diagram-text-select", {...options, changeText: false, text: true, line2: "3", x: 150});
options = {...options, text: true};


// Generate and syntax highlight sample code
for (let codeOutput of document.querySelectorAll("pre[data-code]")) {
    // show="*" selects all; otherwise list the flag names space separated
    let show = codeOutput.dataset.show ?? "";
    let options = show === '*'? makeOptions() : {};
    for (let option of show.split(" ")) {
        options[option] = true;
    }
    // highlight= should be a list of flag names to highlight
    let highlight = {};
    for (let option of (codeOutput.dataset.highlight ?? "").split(" ")) {
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
    }[codeOutput.dataset.code];

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
    
    codeOutput.innerHTML = html;
}
