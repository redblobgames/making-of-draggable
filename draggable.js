/*
 * From https://www.redblobgames.com/x/2251-draggable/
 * Copyright 2022 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */
'use strict';

console.info("I'm happy to answer questions about the code; email me at redblobgames@gmail.com");

/** Convert from event coordinate space (on the page) to SVG coordinate
 * space (within the svg, honoring responsive resizing, width/height,
 * and viewBox */
function convertPixelToSvgCoord(event) {
    const svg = event.currentTarget.ownerSVGElement;
    let p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    p = p.matrixTransform(svg.getScreenCTM().inverse());
    return p;
}



let pre = document.querySelector("main pre");
let svg = document.querySelector("main figure svg");
let draggable = svg.querySelector("g");

let dragging = null;
let pos = [0, 0];

let handlers = {
    click(event) {},
    dblclick(event) {
        // Prevent the context menu on Android
        event.preventDefault();
    },
    auxclick(event) {},
    contextmenu(event) {},
    mousedown(event) {},
    mouseup(event) {},
    mouseenter(event) {},
    mouseleave(event) {},
    mouseover(event) {},
    mouseout(event) {},
    pointerdown(event) {
        dragging = {startPos: [...pos], startPointer: convertPixelToSvgCoord(event)};
        // if you use event.target, the text will get the event and it
        // will bubble up, but the text can get selected when dragging
        event.currentTarget.setPointerCapture(event.pointerId);
        // and we want to disable text selection only while dragging
        event.currentTarget.style.userSelect = 'none';
        event.currentTarget.style.cursor = 'grabbing';
        this.pointermove(event);
    },
    pointerup(event) {
        dragging = false;
        event.currentTarget.style.userSelect = '';
        event.currentTarget.style.cursor = 'grab';
    },
    pointercancel(event) {
        this.pointerup(event);
    },
    pointermove(event) {
        if (!dragging) return;
        let {x, y} = convertPixelToSvgCoord(event);
        // TODO: need to test whether the offset tracking gets messed up by screen rotation or diagram resizing (e.g. size set in vh/vw)
        pos = [x - dragging.startPointer.x + dragging.startPos[0],
               y - dragging.startPointer.y + dragging.startPos[1]];
        draw();
    },
    pointerrawupdate(event) {
        // This is Chrome only. It fires with lower latency than pointermove because
        // pointermove can coalesce events together (TODO: understand tradeoffs)
        this.pointermove(event);
    },
    pointerenter(event) {},
    pointerleave(event) {},
    pointerover(event) {},
    pointerout(event) {},
    touchstart(event) {
        event.preventDefault();
    },
    touchend(event) {},
};

function draw() {
    draggable.setAttribute('transform', `translate(${pos})`);
}
draw();

let outputQueue = [];
function showEvents() {
    if (outputQueue.length > 0) {
        pre.textContent = `${pre.textContent}\n${new Date().toLocaleTimeString()} ${outputQueue.join(' ')}`;
        outputQueue = [];
    }
    requestAnimationFrame(showEvents);
}
showEvents();

for (let type of Object.keys(handlers)) {
    draggable.addEventListener(type, (event) => handlers[type](event));
}

function reset() {
    pre.textContent = "";
    pos = [0, 0];
    draw();
}
