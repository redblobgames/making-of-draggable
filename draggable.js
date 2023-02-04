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
function makePositionState(selector, options={}) {
    const container = document.querySelector(selector);
    const svg = container.querySelector("svg");
    const el = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const radius = options.radius ?? 30;
    el.innerHTML = `
      <circle stroke="black" stroke-width="0.5" r="${radius}" />
      <g font-size="14" text-anchor="middle" fill="white">
        <text dy="0.0em">Drag</text>
        <text dy="1.0em">me</text>
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


function diagram_mouse_events_local() {
    let {state, el} = makePositionState("#diagram-mouse-events-local");

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


function diagram_mouse_events_document() {
    let {state, el} = makePositionState("#diagram-mouse-events-document");

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


function diagram_touch_events() {
    let {state, el} = makePositionState("#diagram-touch-events");

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
        left: true,
        ctrl: true,
        offset: true,
        capture: true,
        text: true,
        scroll: true,
        systemdrag: true,
        chord: true,
        capture: true,
    };
}

function diagram_pointer_events_fixed(selector, options) {
    let {state, el} = makePositionState(selector, options);

    function start(event) {
        console.log(event.type, event.button);
        if (options.left) if (event.button !== 0) return;
        if (options.ctrl) if (event.ctrlKey) return;
        let {x, y} = convertPixelToSvgCoord(event);
        if (options.offset) state.dragging = {dx: state.pos.x - x, dy: state.pos.y - y};
        if (!options.offset) state.dragging = true;
        if (options.capture) el.setPointerCapture(event.pointerId);
        if (options.text) el.style.userSelect = 'none';
    }

    function end(event) {
        console.log(event.type, event.button);
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

    if (options.capture) el.addEventListener('lostpointercapture', end);
    if (options.scroll) el.addEventListener('touchstart', (event) => event.preventDefault());
    if (options.systemdrag) el.addEventListener('dragstart', (event) => event.preventDefault());
}



diagram_mouse_events_local();
diagram_mouse_events_document();
diagram_touch_events();
diagram_pointer_events_fixed("#diagram-pointer-events", {});
diagram_pointer_events_fixed("#diagram-pointer-events-fixed", makeOptions());

// console.log(diagram_pointer_events_fixed.toString().split("\n"));
