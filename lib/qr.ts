export function qrSvgDataUrl(value: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrCoreSvg(value))}`;
}

function qrCoreSvg(value: string) {
  const safe = escapeXml(value);
  return `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><rect width='240' height='240' fill='#fff8df'/><rect x='12' y='12' width='64' height='64' fill='#08070a'/><rect x='164' y='12' width='64' height='64' fill='#08070a'/><rect x='12' y='164' width='64' height='64' fill='#08070a'/><rect x='28' y='28' width='32' height='32' fill='#ffd400'/><rect x='180' y='28' width='32' height='32' fill='#ff2d2d'/><rect x='28' y='180' width='32' height='32' fill='#7c2cff'/><path d='M96 28h18v18H96zm36 0h18v18h-18zm-18 18h18v18h-18zm54 54h18v18h-18zm-36 0h18v18h-18zM96 132h18v18H96zm36 18h18v18h-18zm54-18h18v18h-18zm-90 54h18v18H96zm54 0h18v18h-18zm36 18h18v18h-18z' fill='#08070a'/><text x='120' y='121' text-anchor='middle' font-family='Arial' font-weight='900' font-size='18' fill='#08070a'>POTTY</text><text x='120' y='142' text-anchor='middle' font-family='Arial' font-weight='900' font-size='18' fill='#ff2d2d'>FAVOR</text><text x='120' y='232' text-anchor='middle' font-family='Arial' font-size='8' fill='#08070a'>${safe}</text></svg>`;
}

export function qrStickerSvg({ value, venueName, shortUrl, callToAction, template }: { value: string; venueName: string; shortUrl: string; callToAction: string; template: string }) {
  const dimensions = template === "TABLE_TENT" ? { w: 720, h: 480 } : template === "WINDOW_STICKER" ? { w: 500, h: 500 } : { w: 420, h: 640 };
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${dimensions.w}' height='${dimensions.h}' viewBox='0 0 ${dimensions.w} ${dimensions.h}'><rect width='100%' height='100%' rx='28' fill='#fff8df'/><rect x='18' y='18' width='${dimensions.w - 36}' height='${dimensions.h - 36}' rx='22' fill='none' stroke='#08070a' stroke-width='10'/><text x='50%' y='82' text-anchor='middle' font-family='Arial Black, Arial' font-size='44' fill='#ff2d2d'>POTTY FAVOR</text><text x='50%' y='130' text-anchor='middle' font-family='Arial' font-size='24' font-weight='900' fill='#08070a'>${escapeXml(venueName)}</text><g transform='translate(${(dimensions.w - 240) / 2} 165)'>${qrCoreSvg(value).replace("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>", "").replace("</svg>", "")}</g><text x='50%' y='455' text-anchor='middle' font-family='Arial Black, Arial' font-size='30' fill='#08070a'>${escapeXml(callToAction)}</text><text x='50%' y='500' text-anchor='middle' font-family='Arial' font-size='22' font-weight='900' fill='#7c2cff'>${escapeXml(shortUrl)}</text><text x='50%' y='560' text-anchor='middle' font-family='Arial' font-size='18' fill='#08070a'>${escapeXml(template.replaceAll("_", " "))}</text></svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char] || char));
}
