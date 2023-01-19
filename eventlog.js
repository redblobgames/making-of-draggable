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



let log = document.querySelector("#log");
let svg = document.querySelector("main figure svg");
let draggable = svg.querySelector("g");

let eventNames = `
click dblclick auxclick contextmenu
mousedown mouseup mouseenter mouseleave mouseover mouseout
pointerdown pointerup pointercancel pointerenter pointerleave pointerover pointerout
touchstart touchend touchcancel
webkitmouseforcewillbegin webkitmouseforcedown webkitmouseforceup`.trim().split(/\s/);

let moveEventNames = `
mousemove
pointermove
touchmove
webkitmouseforcechanged`.trim().split(/\s/);

// First test on the page shows the event log except for move events
let outputQueue = [];
function showEvents() {
    if (outputQueue.length > 0) {
        log.textContent = `${log.textContent}\n${new Date().toLocaleTimeString()} ${outputQueue.join(' ')}`;
        outputQueue = [];
    }
    requestAnimationFrame(showEvents);
}
showEvents();

for (let type of eventNames) {
    draggable.addEventListener(type, (event) => {
        let output = event.type;
        if (event.pointerId !== undefined) output += "." + event.pointerId;
        if (event.target.tagName === 'text') output += ".T";
        if (event.target.tagName === 'circle') output += ".C";
        outputQueue.push(output);
    });
}

// draggable.addEventListener('pointermove', (event) => {
//     let p = convertPixelToSvgCoord(event);
//     draggable.style.transform = `translate(${p.x}px, ${p.y}px)`;
// });

function clearPre() {
    pre.textContent = "";
}


// Second test on the page shows the current pointerdata only
let testBox = document.querySelector("#testbox");
let pointerData = document.querySelector("#pointerdata");
let touchData = document.querySelector("#touchdata");
let forceData = document.querySelector("#forcedata");

for (let type of moveEventNames.concat(eventNames)) {
    testBox.addEventListener(type, (event) => {
        if (event.pointerType)
            pointerData.textContent = `PointerEvent
event:              ${event.type}
pointerType:        ${event.pointerType}
isPrimary:          ${event.isPrimary}
pointerId:          ${event.pointerId}
width:              ${event.width}
height:             ${event.height}
pressure:           ${event.pressure}
webkitForce:        ${event.webkitForce}
tangentialPressure: ${event.tangentialPressure}
tiltX:              ${event.tiltX}
tiltY:              ${event.tiltY}
twist:              ${event.twist}`;

        if (event.webkitForce)
            forceData.textContent = `${event.type}  .webkitForce: ${event.webkitForce}`;
        
        if (event.changedTouches) {
            let touch = event.changedTouches[0];
            touchData.textContent = `TouchEvent.Touch
identifier:         ${touch.identifier}
touchType:          ${touch.touchType}
radiusX:            ${touch.radiusX}
radiusY:            ${touch.radiusY}
rotationAngle:      ${touch.rotationAngle}
altitudeAngle:      ${touch.altitudeAngle}
azimuthAngle:       ${touch.azimuthAngle}
force:              ${touch.force}`;
        }

        // There's also event.webkitForce on MouseEvent
    });
}

