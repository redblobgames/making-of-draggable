/*
 * From https://www.redblobgames.com/x/2251-draggable/
 * Copyright 2022 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */
'use strict';

console.info("I'm happy to answer questions about the code; email me at redblobgames@gmail.com");


function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

/** Convert from event coordinate space (on the page) to SVG coordinate
 * space (within the svg, honoring responsive resizing, width/height,
 * and viewBox) */
function eventToSvgCoordinates(event, relativeTo=event.currentTarget.ownerSVGElement) {
    // if relativeTo is the <svg> then its ownerSVGElement is null, so we want to point back to the <svg>
    // but otherwise we assume it's a child of <svg> and we want to find the <svg>
    let p = (relativeTo.ownerSVGElement ?? relativeTo).createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(relativeTo.getScreenCTM().inverse());
}

/** Convert from event coordinate space (on the page) to Canvas coordinate
 * space (assuming there are no transforms on the canvas) */
function eventToCanvasCoordinates(event) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
        x: (event.x - bounds.left) / bounds.width * canvas.width,
        y: (event.y - bounds.top) / bounds.height * canvas.height,
    };
}


// config object should have el:String, draw:()=>(), and event handlers
function Diagram(figure, config) {
    let pos = {x: 0, y: 0};
    let state = {
        ...config,
        figure,
        el: figure.querySelector(config.el),
        get pos() { return pos; },
        set pos({x, y}) {
            pos.x = clamp(x, this.left, this.right);
            pos.y = clamp(y, this.top, this.bottom);
            config.draw.call(state);
        },
        dragging: null, // either null or value set by handler
    };
    
    for (let prop of Object.keys(config)) {
        if (prop.startsWith("on")) state.el[prop] = (event) => state[prop](event);
    }

    // Add tracking of the pointer capture state; this is mostly to
    // test on different devices to make sure capture works.
    state.el.addEventListener('gotpointercapture', () => {
        state.el.classList.add('captured');
    });
    state.el.addEventListener('lostpointercapture', () => {
        state.el.classList.remove('captured');
    });

    function reset() { state.pos = {x: 0, y: 0}; }
    let button = figure.querySelector("button");
    if (button) button.addEventListener('click', reset);
    reset();
}


const svgDragHandlersCommon = {
    left: -300, right: 300, top: -20, bottom: 20,
    eventToSvgCoordinates(event) {
        return eventToSvgCoordinates(event);
    },
    onpointerdown(event) {
        if (event.button !== 0 || event.ctrlKey) return;
        let initialPos = this.eventToSvgCoordinates(event);
        this.dragging = {dx: this.pos.x - initialPos.x, dy: this.pos.y - initialPos.y};
        this.el.classList.add("dragging");
        // if you use event.target, the text will get the event and it
        // will bubble up, but the text can get selected when dragging
        event.currentTarget.setPointerCapture(event.pointerId);
        // and we want to disable text selection only while dragging
        // so the .dragging class will set CSS user-select:none
    },
    onpointerup(event) {
        this.dragging = null;
        this.el.classList.remove("dragging");
    },
    onpointercancel(event) {
        this.onpointerup(event);
    },
    onpointermove(event) {
        if (!this.dragging) return;
        if (!(event.buttons & 1)) return this.onpointerup(event); // NOTE: chords
        let {x, y} = this.eventToSvgCoordinates(event);
        this.pos = {x: x + this.dragging.dx, y: y + this.dragging.dy};
    },
    ondragstart(event) {
        // Prevent dragging text/images
        event.preventDefault();
    },
    ontouchstart(event) {
        event.preventDefault();
    },
};

const divDragHandlersCommon = {
    left: 0, top: 0, right: 1000, bottom: 75,
    onpointerdown(event) {
        if (event.button !== 0 || event.ctrlKey) return;
        this.dragging = {dx: this.pos.x - event.clientX, dy: this.pos.y - event.clientY};
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.classList.add("dragging");
    },
    onpointerup(event) {
        this.dragging = null;
        event.currentTarget.classList.remove("dragging");
    },
    onpointercancel(event) {
        this.onpointerup(event);
    },
    onpointermove(event) {
        if (!this.dragging) return;
        if (!(event.buttons & 1)) return this.onpointerup(event); // NOTE: chords
        // HACK: adjust the right/bottom bounds based on the current size, especially needed when resizing the browser/font
        let outer = this.el.parentElement.getBoundingClientRect();
        let inner = this.el.getBoundingClientRect();
        this.right = outer.width - inner.width;
        this.bottom = outer.height - inner.height;
        // Now we can set the position, and the Diagram will use the updated bounds
        this.pos = {x: event.clientX + this.dragging.dx, y: event.clientY + this.dragging.dy};
    },
    ondragstart(event) {
        // Prevent dragging text/images
        event.preventDefault();
    },
    ontouchstart(event) {
        // Prevent scrolling on mobile
        event.preventDefault();
    },
};

const diagrams = [
    // div with a link inside, but want the drag to override the link
    {
        ...divDragHandlersCommon,
        el: "div.draggable",
        draw() {
            this.el.style.left = this.pos.x + 'px';
            this.el.style.top = this.pos.y + 'px';
        },
    },
    // div with a link inside, but want the link to override the drag
    {
        ...divDragHandlersCommon,
        el: "div.draggable",
        onpointerdown(event) {
            divDragHandlersCommon.onpointerdown.call(this, event);
            event.currentTarget.releasePointerCapture(event.pointerId); // undo divDragHandlersCommon
            this.moved = false; // wait until first pointermove to capture
        },
        onpointermove(event) {
            if (!this.moved) {
                event.currentTarget.setPointerCapture(event.pointerId);
                this.moved = true;
            }
            divDragHandlersCommon.onpointermove.call(this, event);
        },
        onclick(event) {
            // If we've moved the mouse then it's a drag and don't
            // let the click go through.
            if (this.moved) event.preventDefault();
        },
        draw() {
            this.el.style.left = this.pos.x + 'px';
            this.el.style.top = this.pos.y + 'px';
        },
    },
    // Click events
    {
        ...svgDragHandlersCommon,
        el: "svg g",
        draw() {
            this.el.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
        },
        setStatus(msg) {
            this.figure.querySelector("figcaption").innerText = msg;
        },
        onpointerdown(event) {
            svgDragHandlersCommon.onpointerdown.call(this, event);
            this.moved = false;
            this.setStatus("Click or drag?");
        },
        onpointermove(event) {
            this.moved = true;
            this.setStatus("Dragging");
            svgDragHandlersCommon.onpointermove.call(this, event);
        },
        onclick(event) {
            // If we've moved the mouse then it's a drag and don't
            // let the click go through.
            if (this.moved) {
                this.setStatus("Click ignored because we were dragging");
                return;
            }
            this.setStatus("Click processed because we weren't dragging");
        },
        ondblclick(event) {
            this.setStatus("dblclick received");
        },
    },
    // Transform on the parent element; do we get the right coordinates?
    // by default we don't, but we can pass in the parent <g> element to
    // eventToSvgCoordinates
    {
        ...svgDragHandlersCommon,
        left: -10000, right: 10000, top: -10000, bottom: 10000,
        el: "svg g rect.draggable",
        eventToSvgCoordinates(event) {
            return eventToSvgCoordinates(event, this.el.parentElement);
        },
        draw() {
            this.el.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
        },
    },
];

diagrams.forEach((diagram, index) => {
    let figure = document.querySelectorAll("figure")[index];
    Diagram(figure, diagram);
});
