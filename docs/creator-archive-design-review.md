# Creator archive review

The public presentation uses a split cover, asymmetric work collection, and a single project viewer. The owner editor and persistence contract are unchanged. This is local review work, not a deployment.

## Component decisions

Composition follows `composition.creator-portfolio`. Selection and actions use installed `ui/button`; disclosure uses `ui/dialog`; media loading uses `ui/skeleton`. Styling uses Missa semantic tokens. The public composition lives in `apps/web/components/creator-portfolio-archive.tsx` and its CSS module; the existing Studio supplies content.

## States

- Work collection: all formats, selected format, no work, and no matching work.
- Images: loading skeleton, loaded, and failed image with project access retained.
- Project viewer: image, writing, combined media, available native audio, unavailable audio, and playback failure feedback.
- Controls: hover, keyboard focus, pressed filter, Escape dismissal and restored focus. Reduced-motion preferences suppress decorative transitions.
- Optional content: absent cover, book, publication, or contact details does not create an empty module. Fictional social links explain the sample boundary instead of pretending to navigate.

No asynchronous submission occurs in the new public presentation, so saving, disabled-submit and submission-success states remain the responsibility of the unchanged owner editor.

## Evidence boundary

Focused browser coverage includes project disclosure, format selection, keyboard focus restoration, failed images, sample links, responsive overflow at 1280/640/390/320 px, and automated main-content accessibility checks. TypeScript and the design-system policy are checked locally. Automated checks do not replace physical-device review; real audio delivery, real social destinations, 200% browser zoom and exceptionally long user content need additional validation.
