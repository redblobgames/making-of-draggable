/*!
 * From https://www.redblobgames.com/making-of/draggable/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 */

import {convertPixelToSvgCoord, makeDraggable, modifySampleCode} from "./event-handling.js";

const htmlEscape = (unescaped) => {
    return unescaped
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
}

function htmlUnEscape(escaped) {
    return escaped
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
}



/** Parse the example page into html+js+css sections,
 * like a Svelte/VueSFC file but slightly different syntax
 *
 * @param {string} page - the full example
 * @returns {{body, script, style}} - the three sections of the page
 */
function parsePage(page) {
    /*
      TODO: can we use the browser to parse the html properly?
      
    let fragment = new DocumentFragment();
    let template = document.createElement("template");
    template.innerHTML = page;
    fragment.append(template);
    let body = fragment.querySelector("body")?.innerHTML ?? "";
    let script = fragment.querySelector("script")?.innerText ?? "";
    let style = fragment.querySelector("style")?.innerText ?? "";
    */

    function extract(pattern) {
        let match = pattern.exec(page);
        if (!match) return "";
        return htmlUnEscape(page.slice(match.indices[1][0], match.indices[1][1]));
    }

    let body = extract(/<body>(.*)<\/body>/sd);
    let script = extract(/<script>(.*)<\/script>/sd);
    let style = extract(/<style>(.*)<\/style>/sd);
    
    return {body, script, style}
}


function modifyScript(script) {
    script = script.replace(/(?<=\n)(\s*)\/\/ event handlers: (.*)/,
                            (_match, indent, flags) => {
                                let {lines} = modifySampleCode(makeDraggable.toString(),
                                                               {show: flags, highlight: ""});
                                lines = lines.map((line) => indent + line);
                                return lines.join("\n");
                            });

    if (script.indexOf("convertPixelToSvgCoord") >= 0) {
        // We'll need this helper function
        script = convertPixelToSvgCoord.toString() + "\n" + script;
    }
    
    return script;
}


class ShowExampleElement extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setup();
    }
    
    async setup() {
        const name = this.getAttribute('name');
        let response = await fetch(`examples/${name}.html`);
        let page = await response.text();
        let {body, script, style} = parsePage(page);
        script = modifyScript(script);

        // Three parts to this component:
        // 0. title
        // 1. an iframe that shows the *running* version
        // TODO: 2. syntax-highlighted source code
        // 3. a jsfiddle button that lets you run it on jsfiddle

        const title = document.createElement('h3');
        title.textContent = name;
        this.append(title);
        
        // NOTE: not sure why the script contents shouldn't be html-escaped
        let iframeContents = `<!DOCTYPE html>
           <html>
           <body>
             ${body.trim()}
           
           <script>
             ${script}
           </script>
           ${!style ? "" : '<style>\n' + htmlEscape(style) + '\n</style>'}
           <style>
             /* for embedding the iframe properly onto the parent page */
             html, body { margin: 0; padding: 0; }
             svg { display: block; }
           </style>
           </body>
           </html>
           `;

        const iframe = document.createElement("iframe");
        this.append(iframe);
        iframe.setAttribute('scrolling', "no");
        iframe.addEventListener('load', () => {
            iframe.contentDocument.body.style.margin = "0";
            iframe.contentDocument.body.style.padding = "0";
            iframe.style.height = iframe.contentDocument.body.clientHeight + 'px';
        });
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(iframeContents);
        iframe.contentWindow.document.close();

        const preBody = document.createElement('pre');
        preBody.className = "body language-html";
        preBody.innerHTML = Prism.highlight(body, Prism.languages.html, 'html');
        
        const preScript = document.createElement('pre');
        preScript.className = "script language-javascript";
        preScript.innerHTML = Prism.highlight(script, Prism.languages.javascript, 'javascript');
        
        const preStyle = document.createElement('pre');
        preStyle.className = "style language-css";
        preStyle.innerHTML = Prism.highlight(style, Prism.languages.css, 'css');
        
        this.append(preBody, preScript, preStyle);
        
        // See https://docs.jsfiddle.net/api/display-a-fiddle-from-post
        const jsfiddle = document.createElement("div");
        jsfiddle.className = "jsfiddle";
        jsfiddle.innerHTML = `
           <form method="post" action="https://jsfiddle.net/api/post/library/pure/" target="_blank">
             <button type="submit">Open in jsfiddle</button>
             <textarea name="html" style="display:none">${htmlEscape(body)}</textarea>
             <textarea name="js" style="display:none">  ${htmlEscape(script)}</textarea>
             <textarea name="css" style="display:none">${htmlEscape(style)}</textarea>
           </form>`;
        this.append(jsfiddle);
    }
}
customElements.define('show-example', ShowExampleElement);
