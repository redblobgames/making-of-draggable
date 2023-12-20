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

const htmlEscapeAttribute = (unescaped) => {
    return unescaped
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
}

function htmlUnEscape(escaped) {
    return escaped
        .replaceAll('&apos;', "'")
        .replaceAll('&quot;', '"')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&');
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

    function extract(indent, pattern) {
        let match = pattern.exec(page);
        if (!match) return "";
        let text = htmlUnEscape(page.slice(match.indices[1][0], match.indices[1][1]));
        text = removeIndentation(text, indent);
        return text;
    }

    let body = extract(2, /<body>(.*)<\/body>/sd);
    let script = extract(2, /<script>(.*)<\/script>/sd);
    let style = extract(4, /<style>(.*)<\/style>/sd);

    return {body, script, style}
}


function modifyScript(script) {
    script = script.replace(/^\/\/ event handlers: (.*)$/m,
                            (_match, flags) => {
                                let {lines} = modifySampleCode(makeDraggable.toString(),
                                                               {show: flags, highlight: ""});
                                // lines = lines.map((line) => indent + line);
                                return lines.join("\n");
                            });

    if (script.indexOf("convertPixelToSvgCoord") >= 0) {
        // We'll need this helper function
        script = `${script}\n\n${convertPixelToSvgCoord.toString()}`;
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
        // 2. syntax-highlighted source code
        // 3. a jsfiddle button that lets you run it on jsfiddle
        // 4. a codepen button that lets you run it on codepen

        const title = document.createElement('h3');
        title.innerHTML = `<a href="#${name}">${name}</a>`;
        title.setAttribute('id', name);
        this.append(title);
        
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
        
        // jsfiddle: https://docs.jsfiddle.net/api/display-a-fiddle-from-post
        // codepen: https://blog.codepen.io/documentation/prefill
        const editors = document.createElement('div');
        const codepen = {html: body, css: style, js: script, tags: ['redblobgames', 'draggable'], layout: 'left'};
        editors.className = "editors";
        editors.innerHTML = `
           <form method="post" action="https://jsfiddle.net/api/post/library/pure/" target="_blank">
             <button type="submit">Open in jsfiddle</button>
             <textarea name="html" style="display:none">${htmlEscape(body)}</textarea>
             <textarea name="js" style="display:none">  ${htmlEscape(script)}</textarea>
             <textarea name="css" style="display:none">${htmlEscape(style)}</textarea>
           </form>
           <form method="post" action="https://codepen.io/pen/define" target="_blank">
             <button type="submit">Open in codepen</button>
             <input type="hidden" name="data" value="${htmlEscapeAttribute(JSON.stringify(codepen))}">
           </form>`;
        this.append(editors);
    }
}
customElements.define('show-example', ShowExampleElement);
