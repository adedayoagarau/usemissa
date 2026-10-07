/**
 * Copying for the share kit. Each function says whether it worked, so the panel
 * can tell the person either way. The async Clipboard API is tried first; when a
 * browser or an embedded frame refuses it, an older route that still works in
 * a click handler is tried before giving up.
 */

/** Copies plain text. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection route.
  }
  return copySelection((holder) => {
    holder.textContent = text;
    holder.style.whiteSpace = "pre";
  });
}

/**
 * Copies formatted text: `html` for rich editors such as a mail app's
 * signature box, and `text` for anything that only takes plain text.
 */
export async function copyRich(html: string, text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {
    // Fall through to the selection route.
  }
  // `html` is the signature builder's own escaped output, never raw input.
  return copySelection((holder) => {
    holder.innerHTML = html;
  });
}

/** Puts content in an off-screen element, selects it and copies the selection. */
function copySelection(fill: (holder: HTMLElement) => void): boolean {
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.position = "fixed";
  holder.style.top = "0";
  holder.style.insetInlineStart = "-9999px";
  holder.style.userSelect = "text";
  fill(holder);
  document.body.appendChild(holder);
  const selection = window.getSelection();
  const previous = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
  try {
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    selection?.removeAllRanges();
    if (previous) selection?.addRange(previous);
    holder.remove();
  }
}
