/*!
 * From https://www.redblobgames.com/making-of/draggable/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */

import {eventToSvgCoordinates, eventToCanvasCoordinates, makeDraggableOptions, makeDraggable, modifySampleCode} from "./event-handling.js";

/* Highlight Vue attributes as containing javascript values */
Prism.languages.markup.tag.addAttribute(
    /(?:v-|:|@)[-.a-zA-Z0-9]+/.source,
    'javascript'
);
/* Highlight Vue template inside js; based on prism-js-templates.js */
Prism.languages.javascript['template-string'].inside.string = {
    pattern: /[\s\S]+/,
    inside: Prism.languages.html
};


const htmlEscape = (unescaped) => {
    return unescaped
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
}

const htmlEscapeAttribute = (unescaped) => {
    return unescaped
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
}


/** Parse the example page into html+js+css sections,
 * surrounded by <template> <script> <script class=events> <style>,
 * like a Svelte/VueSFC file but slightly different syntax
 *
 * @param {string} page - the full example
 * @returns {{body, stateHandler, eventHandler, style}} - the four sections of the page
 */
function parsePage(page) {
    function removeIndentation(text, indent) {
        let lines = text.split("\n");
        lines = lines.map((line) => {
            if (!line) return line;
            let prefix = line.slice(0, indent);
            let suffix = line.slice(indent);
            if (!/^ +$/.test(prefix)) throw `Non-indented line found ${JSON.stringify(line)}`;
            return suffix;
        });
        return lines.join("\n").trim();
    }

    function extract(indent, tag) {
        let node = document.querySelector(tag);
        if (!node) return "";

        let text = node.innerHTML;
        text = removeIndentation(text, indent);
        return text;
    }

    let document = new DOMParser().parseFromString(page, 'text/html');
    let body = extract(2, 'template');
    let stateHandler = extract(2, 'script:not([class])');
    let eventHandler = extract(2, 'script[class="events"]');
    let style = extract(4, 'style');

    return {body, stateHandler, eventHandler, style}
}


function modifyScripts({stateHandler, eventHandler}) {
    stateHandler = stateHandler.replace(
        /^\/\/ event handlers:\s*(.*)$/m,
        (_match, flags) => {
            const defaultOptions = makeDraggableOptions();
            defaultOptions.noselect = false;
            defaultOptions.noctrl = false;
            defaultOptions.nosystemdrag = false;
            const defaultFlags = Object.entries(defaultOptions)
                                       .filter(([_key, value]) => value)
                                       .map(([key, _value]) => key)
                                       .join(" ");
            let {lines} = modifySampleCode(makeDraggable.toString(),
                                           {show: defaultFlags + " " + flags, highlight: ""});
            eventHandler = (eventHandler + "\n\n" + lines.join("\n")).trim();
            return "";
        });

    // Scan for the use of these helper functions
    if (stateHandler.indexOf("eventToSvgCoordinates") >= 0) {
        eventHandler += "\n\n" + eventToSvgCoordinates.toString();
    }
    if (stateHandler.indexOf("eventToCanvasCoordinates") >= 0) {
        eventHandler += "\n\n" + eventToCanvasCoordinates.toString();
    }

    return {stateHandler, eventHandler};
}


/**
 * syntax and line highlight code
 *
 * @param {string} text - original plain text
 * @param {'html' | 'javascript' | 'css'} language
 * @param {string | undefined} highlightPattern - pattern at end of line
 */
function highlightCode(text, language, highlightPattern=undefined) {
    // Figure out which *lines* to highlight *before* syntax
    // highlighting is applied. Remove the marker so it doesn't
    // get syntax highlighted
    let linesToHighlight = new Set();
    if (highlightPattern) {
        text = text.split("\n").map((line, lineNumber) => {
            if (line.endsWith(highlightPattern)) {
                line = line.slice(0, line.length - highlightPattern.length);
                linesToHighlight.add(lineNumber);
            }
            return line;
        }).join("\n");
    }

    // Apply *syntax* highlighting
    let html = Prism.highlight(text, Prism.languages[language], language);

    // Apply *line* highlighting
    html = html.split("\n").map((line, lineNumber) => {
        if (linesToHighlight.has(lineNumber)) {
            let m = line.match(/^(\s*)(\S.*)$/);
            line = `${m[1]}<span class="highlight">${m[2]}</span>`;
        }
        return line;
    }).join("\n");

    return html;
}

class ShowExampleElement extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setup();
    }

    async setup() {
        const childContent = this.innerHTML;
        this.innerHTML = "";

        const name = this.getAttribute('name');
        let response = await fetch(`examples/${name}.html`);
        let page = await response.text();
        let {body, stateHandler, eventHandler, style} = parsePage(page);
        ({stateHandler, eventHandler} = modifyScripts({stateHandler, eventHandler}));
        const script = stateHandler + eventHandler;

        // Assemble the component output

        const title = document.createElement('h3');
        title.innerHTML = `<a href="#${name}">${name}</a>`;
        title.setAttribute('id', name);

        // NOTE: HTML5 says the <script> contents are *not* html-escaped
        // and that you can't use <!-- or <script or </script . I'm not
        // handling these, but I test for them
        if (/<!--|<\/?script/.test(script)) throw "script cannot contain certain tags";
        // <style> contents are not to be html-escaped either
        let iframeContents = `<!DOCTYPE html>
           <html>
           <body>
           ${body}

           <script>
             ${script}
           </script>
           ${!style ? "" : '<style>\n' + style + '\n</style>'}
           <style>
             /* for embedding the iframe properly onto the parent page */
             html, body { margin: 0; padding: 0; }
             svg, canvas { display: block; }
           </style>
           </body>
           </html>
           `;

        const iframe = document.createElement("iframe");
        iframe.setAttribute('scrolling', "no");
        iframe.addEventListener('load', () => {
            iframe.contentDocument.body.style.margin = "0";
            iframe.contentDocument.body.style.padding = "0";
            iframe.style.height = iframe.contentDocument.body.clientHeight + 'px';
        });

        const codeContainer = document.createElement('details');
        const codeInvitation = document.createElement('summary');
        codeInvitation.innerHTML = `<b>See code</b>:`;
        const codeLayout = document.createElement('div');
        codeContainer.className = "code";
        codeContainer.append(codeInvitation, codeLayout);
        
        const preBody = document.createElement('pre');
        preBody.className = "body language-html";
        preBody.innerHTML = highlightCode(body, 'html');

        const stateScript = document.createElement('pre');
        stateScript.className = "state language-javascript";
        stateScript.innerHTML = highlightCode(stateHandler, 'javascript', "//*");

        const eventScript = document.createElement('pre');
        eventScript.className = "event language-javascript";
        eventScript.innerHTML = highlightCode(eventHandler, 'javascript', "//*");

        const preStyle = document.createElement('pre');
        preStyle.className = "style language-css";
        preStyle.innerHTML = highlightCode(style, 'css');

        codeLayout.append(stateScript, preBody, preStyle, eventScript);

        // Original content inside the <show-example> tag
        const childDiv = document.createElement('div');
        childDiv.setAttribute('class', "explanation");
        childDiv.innerHTML = childContent;

        // jsfiddle: https://docs.jsfiddle.net/api/display-a-fiddle-from-post
        // codepen: https://blog.codepen.io/documentation/prefill
        const editors = document.createElement('div');
        const codepen = {html: body, css: style, js: script, tags: ['redblobgames', 'draggable'], layout: 'left'};
        editors.className = "editors";
        editors.innerHTML = `
           <form method="post" action="https://jsfiddle.net/api/post/library/pure/" target="_blank">
             <button type="submit">Open in jsfiddle</button>
             <textarea name="html" style="display:none">${htmlEscape(body)}</textarea>
             <textarea name="js" style="display:none">${htmlEscape(script)}</textarea>
             <textarea name="css" style="display:none">${htmlEscape(style)}</textarea>
           </form>
           <form method="post" action="https://codepen.io/pen/define" target="_blank">
             <button type="submit">Open in codepen</button>
             <input type="hidden" name="data" value="${htmlEscapeAttribute(JSON.stringify(codepen))}">
           </form>`;

        // Top level contents
        this.append(title, editors, childDiv, iframe, codeContainer);
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(iframeContents);
        iframe.contentWindow.document.close();
    }
}
customElements.define('show-example', ShowExampleElement);



// Highlight the Vue sample code, which is inside <pre>
for (let el of document.querySelectorAll("pre.src.src-vue")) {
    let source = el.innerText;
    // My site build system puts in the longhand v-bind v-on
    // but I want these to be the shorthand in the example code
    source = source.replace(/v-bind:/g, ":");
    source = source.replace(/v-on:/g, "@");
    el.innerHTML = Prism.highlight(source, Prism.languages.markup, 'markup');
}
