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
    el.classList.add('draggable');
    el.innerHTML = `
      <circle stroke="black" stroke-width="0.5" r="30" />
      <g font-size="14" text-anchor="middle" fill="white">
        <text dy="0.0em">Drag</text>
        <text dy="1.0em">me</text>
      </g>`;
    svg.appendChild(el);

    const bounds = {left: -300, right: 300, top: -20, bottom: 20};
    let dragging = null; // either null or value set by handler
    let pos = {x: options.x ?? 0, y: options.y ?? 0};
    function draw() {
        el.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        // NOTE: in a real project I usually put these on a class,
        // and then use el.classList.toggle('dragging', dragging)
        el.style.cursor =
            dragging? "grabbing" : "grab";
        el.querySelector("text").textContent =
            dragging ? "Dragging" : "Drag";
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
            pos = {
                x: clamp(x, bounds.left, bounds.right),
                y: clamp(y, bounds.top, bounds.bottom)
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


function diagram_pointer_events() {
    let {state, el} = makePositionState("#diagram-pointer-events");

    function start(event) {
        state.dragging = true;
        el.setPointerCapture(event.pointerId);
    }
    function end(_event) {
        state.dragging = false;
    }
    function move(event) {
        if (!state.dragging) return;
        let {x, y} = convertPixelToSvgCoord(event.changedTouches[0], el);
        state.pos = {x, y};
    }
    
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointermove', move);
}


function diagram_pointer_events_fixed(options) {
    let {state, el} = makePositionState("#diagram-pointer-events-fixed");

    function start(event) {
        console.log(event.type, event.button);
        // TODO: make the button check optional
        if (event.button !== 0) return;
        // TODO: ctrl+click filtering on mac/chrome
        if (event.ctrlKey) return;
        let {x, y} = convertPixelToSvgCoord(event);
        // TODO: make the offset optional
        state.dragging = {dx: state.pos.x - x, dy: state.pos.y - y};
        // TODO: make pointer capture optional
        el.setPointerCapture(event.pointerId);
        // TODO: user-select:none, optional
        el.style.userSelect = 'none';
    }

    function end(_event) {
        console.log(_event.type, event.button);
        state.dragging = null;
        // TODO: user-select:none, optional
        el.style.userSelect = '';
    }

    function move(event) {
        if (!state.dragging) return;
        // TODO: make button status optional
        if (!(event.buttons & 1)) return end(event);
        let {x, y} = convertPixelToSvgCoord(event);
        // TODO: make offset optional
        state.pos = {x: x + state.dragging.dx, y: y + state.dragging.dy};
    }
        
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointermove', move)

    el.addEventListener('gotpointercapture', (e) => console.log(e.type, e.button));
    el.addEventListener('lostpointercapture', (e) => console.log(e.type, e.button));
    
    // TODO: optional
    // el.addEventListener('lostpointercapture', end);
    // TODO: optional
    el.addEventListener('touchstart', (event) => event.preventDefault());
    // TODO: optional
    el.addEventListener('dragstart', (event) => event.preventDefault());
}



diagram_mouse_events_local();
diagram_mouse_events_document();
diagram_touch_events();
diagram_pointer_events();
diagram_pointer_events_fixed();

// console.log(diagram_pointer_events_fixed.toString().split("\n"));
