export const generateImage = async (id = "invitacion", filename = "invitacion.jpeg", scale = 2) => {
    const svgOriginal = document.getElementById(id);
    if (!svgOriginal || !(svgOriginal instanceof SVGElement)) throw new Error(`No se encontró SVG con id "${id}"`);
    if (document.fonts?.ready) {
        try {
            await document.fonts.ready;
        } catch(error) {
            console.log(error);
        }
    }

    const svgClon = svgOriginal.cloneNode(true);
    svgClon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClon.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    let width = 1280;
    let height = 1600;
    const vb = svgClon.getAttribute("viewBox");
    if (vb) {
        const p = vb.trim().split(/\s+/).map(Number);
        width = p[2];
        height = p[3];
    } else {
        width = +svgClon.getAttribute("width") || 1280;
        height = +svgClon.getAttribute("height") || 1600;
        svgClon.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    const camelToKebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    const STYLE_PROPS = [ "font", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textAlign", "color", "opacity", "display", "position", "top", "right", "bottom", "left", "inset", "insetBlockStart", "insetBlockEnd", "insetInlineStart", "insetInlineEnd", "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft", "background", "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat", "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius", "boxShadow", "overflow", "whiteSpace", "wordBreak", "textOverflow", "objectFit", "objectPosition", "transform", "transformOrigin", "filter", "gap", "rowGap", "columnGap", ];

    const walkerOrig = document.createTreeWalker(svgOriginal, NodeFilter.SHOW_ELEMENT);
    const walkerClon = document.createTreeWalker(svgClon, NodeFilter.SHOW_ELEMENT);

    let nodeOrig = svgOriginal;
    let nodeClon = svgClon;

    while (nodeOrig && nodeClon) {
        const cs = getComputedStyle(nodeOrig);
        if (cs) {
            let cssText = "";
            for (const prop of STYLE_PROPS) {
                const val = cs[prop] ?? cs.getPropertyValue?.(prop);
                if (val && val !== "auto" && val !== "normal" && val !== "none") {
                    cssText += `${camelToKebab(prop)}:${val};`;
                }
            }

            const existing = nodeClon.getAttribute("style") || "";
            nodeClon.setAttribute("style", existing + cssText);

            const tag = nodeOrig.tagName.toLowerCase();
            if (tag === "p" || tag === "text") {
                const lh = cs.lineHeight;
                const mt = cs.marginTop;
                const mb = cs.marginBottom;
                if (lh) nodeClon.style.lineHeight = lh;
                if (mt) nodeClon.style.marginTop = mt;
                if (mb) nodeClon.style.marginBottom = mb;
                nodeClon.style.verticalAlign = "middle";
                nodeClon.style.display = "block";
                if (cs.textAlign) nodeClon.style.textAlign = cs.textAlign;
                const clamp = cs["-webkit-line-clamp"] || cs.lineClamp;
                if (clamp && clamp !== "none") {
                    nodeClon.style.height = cs.height;
                    nodeClon.style.overflow = "hidden";
                    nodeClon.style.display = "-webkit-box";
                    nodeClon.style["-webkit-box-orient"] = "vertical";
                    nodeClon.style["-webkit-line-clamp"] = clamp;
                }
            }

            if (nodeClon.hasAttribute("class")) nodeClon.removeAttribute("class");
        }

        nodeOrig = walkerOrig.nextNode();
        nodeClon = walkerClon.nextNode();
    }

    const toDataURL = async (url) => {
        if (!url || /^data:/.test(url)) return url || null;
        try {
            const res = await fetch(url, { mode: "cors" });
            const blob = await res.blob();
            return await new Promise((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    };

    const imgs = svgClon.querySelectorAll("image, img");

    for (const n of imgs) {
        const href = n.getAttribute("href") || n.getAttributeNS("http://www.w3.org/1999/xlink", "href") || n.getAttribute("src");
        const data = await toDataURL(href);
        if (data) {
            if (n.tagName.toLowerCase() === "image") {
                n.setAttributeNS("http://www.w3.org/1999/xlink", "href", data);
                n.setAttribute("href", data);
            } else {
                n.setAttribute("src", data);
            }
            n.removeAttribute("crossorigin");
        }
    }

    const svgString = new XMLSerializer().serializeToString(svgClon);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

    await new Promise((ok, err) => {
        img.onload = ok;
        img.onerror = err;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg"));
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
