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

let handlers = {
    click(event) {},
    dblclick(event) {},
    auxclick(event) {},
    contextmenu(event) {},
    mousedown(event) {},
    mouseup(event) {},
    mouseenter(event) {},
    mouseleave(event) {},
    mouseover(event) {},
    mouseout(event) {},
    pointerdown(event) {},
    pointerup(event) {},
    pointercancel(event) {},
    pointerenter(event) {},
    pointerleave(event) {},
    pointerover(event) {},
    pointerout(event) {},
    //pointermove(event) {},
    //pointerrawupdate(event) {},
    touchstart(event) {},
    touchend(event) {},
};

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
    draggable.addEventListener(type, (event) => {
        let output = event.type;
        if (event.pointerId !== undefined) output += "." + event.pointerId;
        if (event.target.tagName === 'text') output += ".T";
        if (event.target.tagName === 'circle') output += ".C";
        outputQueue.push(output);
        handlers[type](event);
    });
}
// draggable.addEventListener('pointermove', (event) => {
//     let p = convertPixelToSvgCoord(event);
//     draggable.style.transform = `translate(${p.x}px, ${p.y}px)`;
// });

function clearPre() {
    pre.textContent = "";
}
