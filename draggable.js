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


function makePositionState(el) {
    const bounds = {left: -300, right: 300, top: -20, bottom: 20};
    let pos = {x: 0, y: 0};
    function draw() {
        el.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    }

    draw();
    return {
        el,
        dragging: null, // either null or value set by handler
        get pos() { return pos; },
        set pos({x, y}) {
            pos = {
                x: clamp(x, bounds.left, bounds.right),
                y: clamp(y, bounds.top, bounds.bottom)
            };
            draw();
        },
    };
}

function diagram_mouse_events_local() {
    const el = document.querySelector("#mouse-events-local .draggable");
    let state = makePositionState(el);

    let dragging = false;

    el.addEventListener('mousedown', (_event) => {
        el.classList.add('dragging');
        dragging = true;
    });
    el.addEventListener('mouseup', (_event) => {
        el.classList.remove('dragging');
        dragging = false;
    });
    el.addEventListener('mousemove', (event) => {
        if (!dragging) return;
        state.pos = convertPixelToSvgCoord(event, el);
    });
}


function diagram_mouse_events_document() {
    const el = document.querySelector("#mouse-events-document .draggable");
    let state = makePositionState(el);

    el.addEventListener('mousedown', (event) => {
        function mousemove(event) {
            state.pos = convertPixelToSvgCoord(event, el);
        }
        function mouseup(event) {
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
            el.classList.remove('dragging');
        }
            
        el.classList.add('dragging');
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    });
}


function diagram_touch_events() {
    const el = document.querySelector("#touch-events .draggable");
    let state = makePositionState(el);

    el.addEventListener('touchstart', (event) => {
        state.dragging = true;
        // TODO: demonstrate event.preventDefault();
        el.classList.add('dragging');
    });
    el.addEventListener('touchend', (event) => {
        state.dragging = false;
        el.classList.remove('dragging');
    });
    el.addEventListener('touchcancel', (event) => {
        state.dragging = false;
        el.classList.remove('dragging');
    });
    el.addEventListener('touchmove', (event) => {
        if (!state.dragging) return;
        let {x, y} = convertPixelToSvgCoord(event.changedTouches[0], el);
        state.pos = {x, y};
    });
}

function diagram_pointer_events() {
    const el = document.querySelector("#pointer-events .draggable");
    let state = makePositionState(el);

    el.addEventListener('pointerdown', (event) => {
        state.dragging = true;
        el.classList.add('dragging');
        // TODO: make pointer capture optional
        el.setPointerCapture(event.pointerId);
    });
    el.addEventListener('pointerup', (event) => {
        state.dragging = false;
        el.classList.remove('dragging');
    });
    el.addEventListener('pointercancel', (event) => {
        state.dragging = false;
        el.classList.remove('dragging');
    });
    el.addEventListener('pointermove', (event) => {
        if (!state.dragging) return;
        let {x, y} = convertPixelToSvgCoord(event);
        state.pos = {x, y};
    });

    // TODO: show these visually, maybe in a separate diagram
    // NOTE: if the pointer event was a touch, it automatically captures
    el.addEventListener('gotpointercapture', () => {
        console.log('gotpointercapture');
    });
    el.addEventListener('lostpointercapture', () => {
        console.log('lostpointercapture');
    });
}


function diagram_pointer_events_fixed() {
    const el = document.querySelector("#pointer-events .draggable");
    let state = makePositionState(el);

    el.addEventListener('pointerdown', (event) => {
        let {x, y} = convertPixelToSvgCoord(event);
        // TODO: make the offset optional
        state.dragging = {dx: state.pos.x - x, dy: state.pos.y - y};
        el.classList.add('dragging');
        // TODO: make pointer capture optional
        el.setPointerCapture(event.pointerId);
    });
    el.addEventListener('pointerup', (event) => {
        state.dragging = false;
        el.classList.remove('dragging');
    });
    el.addEventListener('pointercancel', (event) => {
        state.dragging = false;
        el.classList.remove('dragging');
    });
    el.addEventListener('pointermove', (event) => {
        if (!state.dragging) return;
        let {x, y} = convertPixelToSvgCoord(event);
        state.pos = {x: x + state.dragging.dx, y: y + state.dragging.dy};
    });

    // TODO: show these visually, maybe in a separate diagram
    // NOTE: if the pointer event was a touch, it automatically captures
    el.addEventListener('gotpointercapture', () => {
        console.log('gotpointercapture');
    });
    el.addEventListener('lostpointercapture', () => {
        console.log('lostpointercapture');
    });

    // TODO: touchstart.preventDefault, optional
    // TODO: user-select:none, optional
    // TODO: cursor + background color + shadow + rotation feedback, optional?
}



diagram_mouse_events_local();
diagram_mouse_events_document();
diagram_touch_events();
diagram_pointer_events();
// diagram_pointer_events_fixed();
