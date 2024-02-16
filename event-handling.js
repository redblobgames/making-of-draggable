/*!
 * From https://www.redblobgames.com/making-of/draggable/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */


/** Convert from event coordinate space (on the page) to SVG coordinate
 * space (within the svg, honoring responsive resizing, width/height,
 * and viewBox) */
export function eventToSvgCoordinates(event, el=event.currentTarget) {
    const svg = el.ownerSVGElement;
    let p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    p = p.matrixTransform(svg.getScreenCTM().inverse());
    return p;
}


/** Default options for makeDraggable() */
export function makeDraggableOptions() {
    return {
        class: false,
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
        // TODO: change noctrl, noselect, nosystemdrag to false
    };
}



/** This is the core event handling code, with many options
 *
 * The code generator assumes any line starting with
 *    if (options.
 *    if (!options.
 * can be added/removed ; these should be a single line
 */
export function makeDraggable(state, el, options) {
    // from https://www.redblobgames.com/making-of/draggable/
    function start(event) {
        if (options.left) if (event.button !== 0) return; // left button only
        if (options.noctrl) if (event.ctrlKey) return; // ignore ctrl+click
        if (options.nopropagate) event.stopPropagation(); // for nested draggables
        let {x, y} = state.eventToCoordinates(event);
        if (options.offset) state.dragging = {dx: state.pos.x - x, dy: state.pos.y - y};
        if (!options.offset) state.dragging = true;
        if (options.class) el.classList.add('dragging');
        if (options.pointerid) state.pointerId = event.pointerId; // keep track of finger
        if (options.capture) el.setPointerCapture(event.pointerId);
        if (options.noselect) el.style.userSelect = 'none'; // if there's text
        if (options.noselect) el.style.webkitUserSelect = 'none'; // safari
    }

    function end(_event) {
        if (options.offset) state.dragging = null;
        if (!options.offset) state.dragging = false;
        if (options.class) el.classList.remove('dragging');
        if (options.noselect) el.style.userSelect = ''; // if there's text
        if (options.noselect) el.style.webkitUserSelect = ''; // safari
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


/**
 * Generate and syntax highlight sample code
 *
 * The code should be formatted like makeDraggable above,
 * where optional commands are on a single line each
 *
 * @param {string} code - the source code to alter
 * @param {{show?: string, highlight?: string}} flags - how to modify it
 * @returns {{lines: string[], highlightedLines: Set<number>}}
 */
export function modifySampleCode(code, flags) {
    // show= should be a list of flag names to show
    const show = flags.show ?? "";
    let options = {};
    for (let option of show.split(" ")) {
        options[option] = true;
    }
    // highlight= should be a list of flag names to highlight
    let highlight = {};
    for (let option of (flags.highlight ?? "").split(" ")) {
        options[option] = true;
        highlight[option] = true;
    }

    let lines = [];
    let highlightedLines = new Set();
    for (let line of code.toString().split("\n")) {
        let m;
        m = line.match(/(.*?), options(\).*)/);
        if (m) {
            // The 'options' parameter is part of the implementation, but removed
            // for the sample code.
            line = `${m[1]}${m[2]}`;
        }
        m = line.match(/(.*?)if \((!?)options\.(\w+?)\) (.*)/);
        if (m) {
            let [_, indent, invert, option, restOfLine] = m;
            let keepLine = (!!options[option] === (invert === ""));
            if (!keepLine) continue;
            if (highlight[option]) highlightedLines.add(lines.length);
            line = `${indent}${restOfLine}`;
        }
        lines.push(line);
    }

    return {lines, highlightedLines}
}
