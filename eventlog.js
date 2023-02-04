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
let showHoverEvents = document.querySelector("#show-hover");
let showMouseTouchEvents = document.querySelector("#show-mouse-touch");
let capturePointerDownEvents = document.querySelector("#capture-pointerdown");
let draggable = svg.querySelector("g");

let eventNames = `
click dblclick auxclick contextmenu
mousedown mouseup mouseenter mouseleave mouseover mouseout
pointerdown pointerup pointercancel pointerenter pointerleave pointerover pointerout
touchstart touchend touchcancel
gotpointercapture lostpointercapture
webkitmouseforcewillbegin webkitmouseforcedown webkitmouseforceup`.trim().split(/\s/);

let moveEventNames = `
mousemove
pointermove
touchmove
webkitmouseforcechanged`.trim().split(/\s/);

const listOfHoverEvents = `
pointerover mouseover pointerout mouseout
pointerenter mouseenter pointerleave mouseleave`.trim().split(/\s/);

// TODO: https://w3c.github.io/pointerevents/#dfn-coalesced-events and predicted events might be interesting but I don't know which browsers support that


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

function updateButtonState(event) {
    if (event.type !== 'pointermove' && event.type !== 'pointerup' && event.type !== 'pointerdown' && event.type !== 'pointercancel') return;
    let rects = document.querySelectorAll("#buttons > rect");
    console.log(Date.now() % 100000, event.type, event.buttons);
    for (let b = 0; b < rects.length; b++) {
        rects[b].style.fill = (event.buttons & (1 << b)) ? "hsl(150 50% 60%)" : "hsl(30 20% 50%)";
    }
}

// draggable = document;
for (let type of eventNames) {
    draggable.addEventListener(type, (event) => {
        updateButtonState(event);
        let output = event.type;
        // if (event.type === 'contextmenu') event.preventDefault();

        if (!showHoverEvents.checked && listOfHoverEvents.includes(event.type)) return;
        if (!showMouseTouchEvents.checked && (event.type.startsWith("mouse") || event.type.startsWith("touch"))) return;
        
        // if (event.pointerId !== undefined) output += "." + event.pointerId;
        if (event.button >= 0) output += "." + (['left', 'middle', 'right'][event.button] ?? event.button);
        output += `<${event.target.tagName}>`;
        if (!event.isPrimary) output += "[!primary]";
        outputQueue.push(output);
        if (capturePointerDownEvents.checked && type === 'pointerdown') draggable.setPointerCapture(event.pointerId);
    });
}

draggable.addEventListener('pointermove', updateButtonState);

function clearPre() {
    log.textContent = "";
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
