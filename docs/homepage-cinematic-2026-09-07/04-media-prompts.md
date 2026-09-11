# Complete media prompt pack

> **Superseded direction:** Read [the current production sequence](07-current-production-sequence.md) first. Empty-room composition, Writing-first pilot, fixed page structure and CSS-reveal fallback are not current creative decisions. Technical checks remain applicable; image-specific prompts need revision for the selected Midjourney master.

These are new Missa production prompts, not recovered historical prompts. Original reference prompts remain unchanged in `reference-text/`. Use the IDs in asset metadata and record revisions. No prompts in this document have been executed yet.

## Execution rules

Run I00 first. Choose one master, attach it to I01 and approve the Writing endpoint. Then run V01 and the R01 editing instruction. Do not make all destinations independently. Each numbered section is a reusable prompt; attach the specified assets rather than relying on a tool remembering a previous image.

Tool capability check is mandatory before generating: confirm supported image size, editing inputs, video first/last-frame conditioning, duration and delivery format. Desired output is a high-quality 16:9 master, ideally 1920×1080 or larger where supported. A written size is not an API setting. For unsupported output sizes, generate at the supported size and make a deliberate editorial crop. Desired final transition duration is 2–3 seconds; a longer raw model output can be trimmed/retimed only when motion remains credible.

Every accepted still gets an actual 390px layout review. Every accepted clip gets normal-speed, frame-step, reverse and seam review. The same prompt can fail on one take and succeed on another; wording is not proof. No text, logos or product UI should be generated into the media.

## I00 — Closed master composition

**Inputs:** None. This is an original fictional Missa editorial set.

**Prompt**

Create a photorealistic architectural editorial image for a contemporary creative-opportunity platform. Compose a straight-on, carefully levelled 16:9 view of a quiet studio threshold. Two broad, rigid, pale neutral sliding panels meet at the exact horizontal centre, hiding the room behind them. They are closed and opaque, with a narrow clean vertical seam. A discreet horizontal track above and consistent floor contact below make the sliding mechanism physically believable. The panels occupy most of the centre of the composition, with a restrained outer architectural frame and enough side clearance for them to slide outward in a later shot. The opening they cover is roughly half the image width. Its central portion must remain readable in a portrait crop.

Use smooth painted mineral surfaces with very low texture contrast, a near-white floor with a subtle matte finish, and soft daylight from the upper left. The light creates shallow believable shadows rather than dramatic beams. The palette feels clean, contemporary and human. Make the geometry confidently simple: straight verticals, coherent corners, plausible thickness, consistent floor plane and a level horizon. Camera is fixed at approximately eye level, with the natural perspective of a moderate architectural lens, without wide-angle stretching or miniature-model appearance.

The composition is an editorial set, not a property advertisement. No room name, sign, lettering, logo, interface, watermark, human figure or decorative object appears in front of the closed panels. Reserve clear visual space around the panels; website copy will be placed outside this image in HTML. Important panel edges and the central floor area must survive a central portrait crop retaining roughly 32 percent of master width. Do not draw crop marks.

No dark cinematic vignette, lens flare, fog, noisy grain, ornate mouldings, marble luxury styling, iridescent glass, chrome edging, magical portal, floating architecture, impossible perspective or beige page-like border. Natural optical detail and carefully built physical surfaces should supply the character.

**Deliver/accept:** Provide candidates separately; record actual dimensions. Reject converging frame lines, unworkable slide clearance, a luminous gap, or a composition that cannot reveal a credible room. Approve one base before any edits.

## I01 — Writing destination image

**Attach:** the approved I00 closed master. Edit this exact master; do not start a new composition. Output label: `writing-destination-master`.

**Prompt**

Edit the attached architectural image to show the same studio with its two existing sliding panels fully opened. The left panel has moved rigidly to the left and the right panel rigidly to the right along the existing track. Preserve the panels' size, thickness, material, perspective and floor relationship. Keep them partly visible at the outer edges so the open scene remains recognisably the same set. Do not add another doorway, new walls or a different camera position.

Inside the revealed room place a modest writing desk centred in the revealed opening, with an open unruled notebook angled slightly toward the light, three loose manuscript sheets showing only indistinct marks, a sharpened wooden pencil, four plain clothbound books and a comfortable chair with a dark Forest-green textile seat. The notebook and the relationship between desk and chair are the focal story. Make the desk feel used but cared for. Keep book spines plain. The room should feel possible for a working writer, not like a collector’s luxury library.

The revealed objects and rear wall already belong behind the closed panels; they do not emerge from the floor or transform from panel material. Use believable depth and object scale. Preserve the original camera, lens, outer frame, track, floor, daylight direction, exposure and colour balance. Adapt shadows only where the newly exposed interior physically requires them. The exterior frame and front floor should align with the attached master in an overlay comparison.

Compose the main practice-specific arrangement within the central portrait-safe region, approximately the middle 32 percent of the 16:9 image width. Secondary details may extend toward the sides, but the cropped phone image must still communicate writing clearly. Keep the room unoccupied, with calm signs of work in progress and no implied real organisation or location. Real objects, clean natural photography, plausible scale, restrained material colour. No readable text, logos, UI, watermark, camera movement, warped geometry, new exterior architecture, a giant library, floating pages, legible manuscript text, quills, a typewriter cliché, dust clouds or a person writing.

**Deliver/accept:** Save a full-quality endpoint, the actual centre crop and a base/endpoint alignment comparison. Inspect frame/track/floor registration, focal object recognition at phone size and panel clearance. Reject any composition that looks appealing only as a separate new camera shot.

## I02 — Visual art destination image

**Attach:** the approved I00 closed master. Edit this exact master; do not start a new composition. Output label: `visual-art-destination-master`.

**Prompt**

Edit the attached architectural image to show the same studio with its two existing sliding panels fully opened. The left panel has moved rigidly to the left and the right panel rigidly to the right along the existing track. Preserve the panels' size, thickness, material, perspective and floor relationship. Keep them partly visible at the outer edges so the open scene remains recognisably the same set. Do not add another doorway, new walls or a different camera position.

Inside the revealed room place a simple easel centred just behind the opening with an original restrained abstract painting, a small clay sculpture on a low worktable to its right, two pigment dishes and a folded cotton rag. The painting should use a few original gestural marks and quiet earthy colour without reproducing any known artist. The clay form must feel hand-shaped and structurally plausible. Leave enough clear floor that the space reads as a studio rather than a gallery shop.

The revealed objects and rear wall already belong behind the closed panels; they do not emerge from the floor or transform from panel material. Use believable depth and object scale. Preserve the original camera, lens, outer frame, track, floor, daylight direction, exposure and colour balance. Adapt shadows only where the newly exposed interior physically requires them. The exterior frame and front floor should align with the attached master in an overlay comparison.

Compose the main practice-specific arrangement within the central portrait-safe region, approximately the middle 32 percent of the 16:9 image width. Secondary details may extend toward the sides, but the cropped phone image must still communicate visual art clearly. Keep the room unoccupied, with calm signs of work in progress and no implied real organisation or location. Real objects, clean natural photography, plausible scale, restrained material colour. No readable text, logos, UI, watermark, camera movement, warped geometry, new exterior architecture, a famous painting, decorative rainbow paint explosions, hovering brushes, a crowded gallery wall, liquid movement or a person painting.

**Deliver/accept:** Save a full-quality endpoint, the actual centre crop and a base/endpoint alignment comparison. Inspect frame/track/floor registration, focal object recognition at phone size and panel clearance. Reject any composition that looks appealing only as a separate new camera shot.

## I03 — Film destination image

**Attach:** the approved I00 closed master. Edit this exact master; do not start a new composition. Output label: `film-destination-master`.

**Prompt**

Edit the attached architectural image to show the same studio with its two existing sliding panels fully opened. The left panel has moved rigidly to the left and the right panel rigidly to the right along the existing track. Preserve the panels' size, thickness, material, perspective and floor relationship. Keep them partly visible at the outer edges so the open scene remains recognisably the same set. Do not add another doorway, new walls or a different camera position.

Inside the revealed room place an unbranded compact cinema camera on a stable tripod slightly left of centre, pointed toward a simple small-scale set, with one rectangular soft light, a low stool, a neatly coiled cable and a plain closed clapperboard. Show a credible small production setup, with camera silhouette and tripod recognisable in the portrait crop. The set is a clean neutral wall with one dark green chair. The soft source has a steady plausible light contribution that is present behind the closed panels too.

The revealed objects and rear wall already belong behind the closed panels; they do not emerge from the floor or transform from panel material. Use believable depth and object scale. Preserve the original camera, lens, outer frame, track, floor, daylight direction, exposure and colour balance. Adapt shadows only where the newly exposed interior physically requires them. The exterior frame and front floor should align with the attached master in an overlay comparison.

Compose the main practice-specific arrangement within the central portrait-safe region, approximately the middle 32 percent of the 16:9 image width. Secondary details may extend toward the sides, but the cropped phone image must still communicate film clearly. Keep the room unoccupied, with calm signs of work in progress and no implied real organisation or location. Real objects, clean natural photography, plausible scale, restrained material colour. No readable text, logos, UI, watermark, camera movement, warped geometry, new exterior architecture, brand logos, readable camera interfaces, celebrity posters, lasers, theatrical fog, animated monitors, impossible lens assemblies or a person operating equipment.

**Deliver/accept:** Save a full-quality endpoint, the actual centre crop and a base/endpoint alignment comparison. Inspect frame/track/floor registration, focal object recognition at phone size and panel clearance. Reject any composition that looks appealing only as a separate new camera shot.

## I04 — Music destination image

**Attach:** the approved I00 closed master. Edit this exact master; do not start a new composition. Output label: `music-destination-master`.

**Prompt**

Edit the attached architectural image to show the same studio with its two existing sliding panels fully opened. The left panel has moved rigidly to the left and the right panel rigidly to the right along the existing track. Preserve the panels' size, thickness, material, perspective and floor relationship. Keep them partly visible at the outer edges so the open scene remains recognisably the same set. Do not add another doorway, new walls or a different camera position.

Inside the revealed room place a compact unbranded keyboard on a simple stand, an acoustic guitar safely supported on its stand, a microphone on a modest boom, and a music stand carrying one plain sheet. Arrange the keyboard and instrument as one balanced central cluster. Use a few neutral acoustic panels on the rear wall. Cable routing is tidy and physically plausible. Instruments feel real and usable, not ornate props. Keep the daylight and quiet material palette coherent.

The revealed objects and rear wall already belong behind the closed panels; they do not emerge from the floor or transform from panel material. Use believable depth and object scale. Preserve the original camera, lens, outer frame, track, floor, daylight direction, exposure and colour balance. Adapt shadows only where the newly exposed interior physically requires them. The exterior frame and front floor should align with the attached master in an overlay comparison.

Compose the main practice-specific arrangement within the central portrait-safe region, approximately the middle 32 percent of the 16:9 image width. Secondary details may extend toward the sides, but the cropped phone image must still communicate music clearly. Keep the room unoccupied, with calm signs of work in progress and no implied real organisation or location. Real objects, clean natural photography, plausible scale, restrained material colour. No readable text, logos, UI, watermark, camera movement, warped geometry, new exterior architecture, readable musical notation, floating instruments, animated waveforms, pulsing LEDs, a recording-console wall, luxury nightclub lights or a person performing.

**Deliver/accept:** Save a full-quality endpoint, the actual centre crop and a base/endpoint alignment comparison. Inspect frame/track/floor registration, focal object recognition at phone size and panel clearance. Reject any composition that looks appealing only as a separate new camera shot.

## I05 — Performance destination image

**Attach:** the approved I00 closed master. Edit this exact master; do not start a new composition. Output label: `performance-destination-master`.

**Prompt**

Edit the attached architectural image to show the same studio with its two existing sliding panels fully opened. The left panel has moved rigidly to the left and the right panel rigidly to the right along the existing track. Preserve the panels' size, thickness, material, perspective and floor relationship. Keep them partly visible at the outer edges so the open scene remains recognisably the same set. Do not add another doorway, new walls or a different camera position.

Inside the revealed room place an open rehearsal floor with a single low rectangular rehearsal block near the centre, a dark Forest-green curtain at the side, and a broad neutral back wall. The space should evoke theatre and movement through clear usable floor and measured proportions. The rehearsal block provides a focal scale reference within the portrait crop. Keep the curtain completely still and visibly supported. There is no performer, audience, backstage signage or institutional identity.

The revealed objects and rear wall already belong behind the closed panels; they do not emerge from the floor or transform from panel material. Use believable depth and object scale. Preserve the original camera, lens, outer frame, track, floor, daylight direction, exposure and colour balance. Adapt shadows only where the newly exposed interior physically requires them. The exterior frame and front floor should align with the attached master in an overlay comparison.

Compose the main practice-specific arrangement within the central portrait-safe region, approximately the middle 32 percent of the 16:9 image width. Secondary details may extend toward the sides, but the cropped phone image must still communicate performance clearly. Keep the room unoccupied, with calm signs of work in progress and no implied real organisation or location. Real objects, clean natural photography, plausible scale, restrained material colour. No readable text, logos, UI, watermark, camera movement, warped geometry, new exterior architecture, a stadium, velvet luxury theatre, spotlight sweep, floating stage, moving curtains, mirror reflections, theatrical fog or a dancer.

**Deliver/accept:** Save a full-quality endpoint, the actual centre crop and a base/endpoint alignment comparison. Inspect frame/track/floor registration, focal object recognition at phone size and panel clearance. Reject any composition that looks appealing only as a separate new camera shot.

## I06 — Design destination image

**Attach:** the approved I00 closed master. Edit this exact master; do not start a new composition. Output label: `design-destination-master`.

**Prompt**

Edit the attached architectural image to show the same studio with its two existing sliding panels fully opened. The left panel has moved rigidly to the left and the right panel rigidly to the right along the existing track. Preserve the panels' size, thickness, material, perspective and floor relationship. Keep them partly visible at the outer edges so the open scene remains recognisably the same set. Do not add another doorway, new walls or a different camera position.

Inside the revealed room place a practical design table with two folded-paper maquettes, a small geometric physical prototype, a compact fan of material swatches, a folded textile, an unbranded task lamp and a plain packaging mock-up. Make the objects specific enough to reward a closer look but large and simple enough to remain stable in motion. The maquettes have crisp plausible folds, the prototype sits firmly on the table and the swatches show a disciplined range of textures. The composition represents material thinking rather than software branding.

The revealed objects and rear wall already belong behind the closed panels; they do not emerge from the floor or transform from panel material. Use believable depth and object scale. Preserve the original camera, lens, outer frame, track, floor, daylight direction, exposure and colour balance. Adapt shadows only where the newly exposed interior physically requires them. The exterior frame and front floor should align with the attached master in an overlay comparison.

Compose the main practice-specific arrangement within the central portrait-safe region, approximately the middle 32 percent of the 16:9 image width. Secondary details may extend toward the sides, but the cropped phone image must still communicate design clearly. Keep the room unoccupied, with calm signs of work in progress and no implied real organisation or location. Real objects, clean natural photography, plausible scale, restrained material colour. No readable text, logos, UI, watermark, camera movement, warped geometry, new exterior architecture, readable packaging text, software screenshots, brand logos, floating interface panels, too many miniature objects, impossible paper folds or a person designing.

**Deliver/accept:** Save a full-quality endpoint, the actual centre crop and a base/endpoint alignment comparison. Inspect frame/track/floor registration, focal object recognition at phone size and panel clearance. Reject any composition that looks appealing only as a separate new camera shot.

## V01 — Open the writing studio

**Attach:** I00 approved closed base as first-frame reference and I01 approved Writing endpoint as destination reference, using an interface that actually supports both. If endpoint conditioning is unsupported, use the composited fallback P04 or record the limitation before attempting a take. Output label: `writing-forward-master`.

**Prompt**

One continuous locked-off architectural editorial shot. Begin exactly on the supplied closed-panel image and finish exactly on the supplied writing studio image. The only substantial motion is two existing rigid architectural panels sliding apart horizontally on their track: left panel to screen left, right panel to screen right. They preserve their dimensions, thickness, material, straight edges and perspective at every point. Both start together, move smoothly and symmetrically, and settle at the exact supplied end positions. Nothing bends, folds, rotates or becomes a curtain.

Choreography as a proportion of the available clip: first 10 percent hold the closed frame; next 15 percent begin the slide gently; middle 45 percent perform the clear reveal; next 15 percent decelerate to the exact endpoint; final 15 percent hold completely still. Aim for a finished 2–3-second transition after editing, without implausible acceleration. If the model requires a longer generation, preserve the same proportional choreography and endpoint holds.

The room behind the panels is stationary from the first frame, merely becoming visible. It contains a modest writing desk centred in the revealed opening, with an open unruled notebook angled slightly toward the light, three loose manuscript sheets showing only indistinct marks, a sharpened wooden pencil, four plain clothbound books and a comfortable chair with a dark Forest-green textile seat. The notebook and the relationship between desk and chair are the focal story. Make the desk feel used but cared for. Keep book spines plain. The room should feel possible for a working writer, not like a collector’s luxury library. No object appears through a dissolve, grows, moves independently or changes shape. The set remains unoccupied. Daylight direction and exposure remain constant. Preserve camera, focal length, horizon, crop, exterior architecture, floor and track. Panel shadows change only as a physically coherent result of their translation. Do not animate the objects to make the reveal more exciting.

No zoom, pan, tilt, roll, dolly, focus breathing, stabilisation warp, shake, parallax drift, camera cut, crossfade, flash, exposure jump, new panels, stretching, texture crawl, temporal grain, floating equipment, readable text, generated UI, watermark, audio, a giant library, floating pages, legible manuscript text, quills, a typewriter cliché, dust clouds or a person writing. Finish with a generous clean still hold that can be paired with a return clip.

**Deliver/accept:** Review at normal speed and frame by frame. Compare the opening with I00 and the terminal hold with I01. Inspect the fastest slide frames, panel contacts and every visible object's stability. Reject geometry or perspective drift; retiming may improve sound motion but cannot make structural mutation acceptable.

## V02 — Open the visual art studio

**Attach:** I00 approved closed base as first-frame reference and I02 approved Visual art endpoint as destination reference, using an interface that actually supports both. If endpoint conditioning is unsupported, use the composited fallback P04 or record the limitation before attempting a take. Output label: `visual-art-forward-master`.

**Prompt**

One continuous locked-off architectural editorial shot. Begin exactly on the supplied closed-panel image and finish exactly on the supplied visual art studio image. The only substantial motion is two existing rigid architectural panels sliding apart horizontally on their track: left panel to screen left, right panel to screen right. They preserve their dimensions, thickness, material, straight edges and perspective at every point. Both start together, move smoothly and symmetrically, and settle at the exact supplied end positions. Nothing bends, folds, rotates or becomes a curtain.

Choreography as a proportion of the available clip: first 10 percent hold the closed frame; next 15 percent begin the slide gently; middle 45 percent perform the clear reveal; next 15 percent decelerate to the exact endpoint; final 15 percent hold completely still. Aim for a finished 2–3-second transition after editing, without implausible acceleration. If the model requires a longer generation, preserve the same proportional choreography and endpoint holds.

The room behind the panels is stationary from the first frame, merely becoming visible. It contains a simple easel centred just behind the opening with an original restrained abstract painting, a small clay sculpture on a low worktable to its right, two pigment dishes and a folded cotton rag. The painting should use a few original gestural marks and quiet earthy colour without reproducing any known artist. The clay form must feel hand-shaped and structurally plausible. Leave enough clear floor that the space reads as a studio rather than a gallery shop. No object appears through a dissolve, grows, moves independently or changes shape. The set remains unoccupied. Daylight direction and exposure remain constant. Preserve camera, focal length, horizon, crop, exterior architecture, floor and track. Panel shadows change only as a physically coherent result of their translation. Do not animate the objects to make the reveal more exciting.

No zoom, pan, tilt, roll, dolly, focus breathing, stabilisation warp, shake, parallax drift, camera cut, crossfade, flash, exposure jump, new panels, stretching, texture crawl, temporal grain, floating equipment, readable text, generated UI, watermark, audio, a famous painting, decorative rainbow paint explosions, hovering brushes, a crowded gallery wall, liquid movement or a person painting. Finish with a generous clean still hold that can be paired with a return clip.

**Deliver/accept:** Review at normal speed and frame by frame. Compare the opening with I00 and the terminal hold with I02. Inspect the fastest slide frames, panel contacts and every visible object's stability. Reject geometry or perspective drift; retiming may improve sound motion but cannot make structural mutation acceptable.

## V03 — Open the film studio

**Attach:** I00 approved closed base as first-frame reference and I03 approved Film endpoint as destination reference, using an interface that actually supports both. If endpoint conditioning is unsupported, use the composited fallback P04 or record the limitation before attempting a take. Output label: `film-forward-master`.

**Prompt**

One continuous locked-off architectural editorial shot. Begin exactly on the supplied closed-panel image and finish exactly on the supplied film studio image. The only substantial motion is two existing rigid architectural panels sliding apart horizontally on their track: left panel to screen left, right panel to screen right. They preserve their dimensions, thickness, material, straight edges and perspective at every point. Both start together, move smoothly and symmetrically, and settle at the exact supplied end positions. Nothing bends, folds, rotates or becomes a curtain.

Choreography as a proportion of the available clip: first 10 percent hold the closed frame; next 15 percent begin the slide gently; middle 45 percent perform the clear reveal; next 15 percent decelerate to the exact endpoint; final 15 percent hold completely still. Aim for a finished 2–3-second transition after editing, without implausible acceleration. If the model requires a longer generation, preserve the same proportional choreography and endpoint holds.

The room behind the panels is stationary from the first frame, merely becoming visible. It contains an unbranded compact cinema camera on a stable tripod slightly left of centre, pointed toward a simple small-scale set, with one rectangular soft light, a low stool, a neatly coiled cable and a plain closed clapperboard. Show a credible small production setup, with camera silhouette and tripod recognisable in the portrait crop. The set is a clean neutral wall with one dark green chair. The soft source has a steady plausible light contribution that is present behind the closed panels too. No object appears through a dissolve, grows, moves independently or changes shape. The set remains unoccupied. Daylight direction and exposure remain constant. Preserve camera, focal length, horizon, crop, exterior architecture, floor and track. Panel shadows change only as a physically coherent result of their translation. Do not animate the objects to make the reveal more exciting.

No zoom, pan, tilt, roll, dolly, focus breathing, stabilisation warp, shake, parallax drift, camera cut, crossfade, flash, exposure jump, new panels, stretching, texture crawl, temporal grain, floating equipment, readable text, generated UI, watermark, audio, brand logos, readable camera interfaces, celebrity posters, lasers, theatrical fog, animated monitors, impossible lens assemblies or a person operating equipment. Finish with a generous clean still hold that can be paired with a return clip.

**Deliver/accept:** Review at normal speed and frame by frame. Compare the opening with I00 and the terminal hold with I03. Inspect the fastest slide frames, panel contacts and every visible object's stability. Reject geometry or perspective drift; retiming may improve sound motion but cannot make structural mutation acceptable.

## V04 — Open the music studio

**Attach:** I00 approved closed base as first-frame reference and I04 approved Music endpoint as destination reference, using an interface that actually supports both. If endpoint conditioning is unsupported, use the composited fallback P04 or record the limitation before attempting a take. Output label: `music-forward-master`.

**Prompt**

One continuous locked-off architectural editorial shot. Begin exactly on the supplied closed-panel image and finish exactly on the supplied music studio image. The only substantial motion is two existing rigid architectural panels sliding apart horizontally on their track: left panel to screen left, right panel to screen right. They preserve their dimensions, thickness, material, straight edges and perspective at every point. Both start together, move smoothly and symmetrically, and settle at the exact supplied end positions. Nothing bends, folds, rotates or becomes a curtain.

Choreography as a proportion of the available clip: first 10 percent hold the closed frame; next 15 percent begin the slide gently; middle 45 percent perform the clear reveal; next 15 percent decelerate to the exact endpoint; final 15 percent hold completely still. Aim for a finished 2–3-second transition after editing, without implausible acceleration. If the model requires a longer generation, preserve the same proportional choreography and endpoint holds.

The room behind the panels is stationary from the first frame, merely becoming visible. It contains a compact unbranded keyboard on a simple stand, an acoustic guitar safely supported on its stand, a microphone on a modest boom, and a music stand carrying one plain sheet. Arrange the keyboard and instrument as one balanced central cluster. Use a few neutral acoustic panels on the rear wall. Cable routing is tidy and physically plausible. Instruments feel real and usable, not ornate props. Keep the daylight and quiet material palette coherent. No object appears through a dissolve, grows, moves independently or changes shape. The set remains unoccupied. Daylight direction and exposure remain constant. Preserve camera, focal length, horizon, crop, exterior architecture, floor and track. Panel shadows change only as a physically coherent result of their translation. Do not animate the objects to make the reveal more exciting.

No zoom, pan, tilt, roll, dolly, focus breathing, stabilisation warp, shake, parallax drift, camera cut, crossfade, flash, exposure jump, new panels, stretching, texture crawl, temporal grain, floating equipment, readable text, generated UI, watermark, audio, readable musical notation, floating instruments, animated waveforms, pulsing LEDs, a recording-console wall, luxury nightclub lights or a person performing. Finish with a generous clean still hold that can be paired with a return clip.

**Deliver/accept:** Review at normal speed and frame by frame. Compare the opening with I00 and the terminal hold with I04. Inspect the fastest slide frames, panel contacts and every visible object's stability. Reject geometry or perspective drift; retiming may improve sound motion but cannot make structural mutation acceptable.

## V05 — Open the performance studio

**Attach:** I00 approved closed base as first-frame reference and I05 approved Performance endpoint as destination reference, using an interface that actually supports both. If endpoint conditioning is unsupported, use the composited fallback P04 or record the limitation before attempting a take. Output label: `performance-forward-master`.

**Prompt**

One continuous locked-off architectural editorial shot. Begin exactly on the supplied closed-panel image and finish exactly on the supplied performance studio image. The only substantial motion is two existing rigid architectural panels sliding apart horizontally on their track: left panel to screen left, right panel to screen right. They preserve their dimensions, thickness, material, straight edges and perspective at every point. Both start together, move smoothly and symmetrically, and settle at the exact supplied end positions. Nothing bends, folds, rotates or becomes a curtain.

Choreography as a proportion of the available clip: first 10 percent hold the closed frame; next 15 percent begin the slide gently; middle 45 percent perform the clear reveal; next 15 percent decelerate to the exact endpoint; final 15 percent hold completely still. Aim for a finished 2–3-second transition after editing, without implausible acceleration. If the model requires a longer generation, preserve the same proportional choreography and endpoint holds.

The room behind the panels is stationary from the first frame, merely becoming visible. It contains an open rehearsal floor with a single low rectangular rehearsal block near the centre, a dark Forest-green curtain at the side, and a broad neutral back wall. The space should evoke theatre and movement through clear usable floor and measured proportions. The rehearsal block provides a focal scale reference within the portrait crop. Keep the curtain completely still and visibly supported. There is no performer, audience, backstage signage or institutional identity. No object appears through a dissolve, grows, moves independently or changes shape. The set remains unoccupied. Daylight direction and exposure remain constant. Preserve camera, focal length, horizon, crop, exterior architecture, floor and track. Panel shadows change only as a physically coherent result of their translation. Do not animate the objects to make the reveal more exciting.

No zoom, pan, tilt, roll, dolly, focus breathing, stabilisation warp, shake, parallax drift, camera cut, crossfade, flash, exposure jump, new panels, stretching, texture crawl, temporal grain, floating equipment, readable text, generated UI, watermark, audio, a stadium, velvet luxury theatre, spotlight sweep, floating stage, moving curtains, mirror reflections, theatrical fog or a dancer. Finish with a generous clean still hold that can be paired with a return clip.

**Deliver/accept:** Review at normal speed and frame by frame. Compare the opening with I00 and the terminal hold with I05. Inspect the fastest slide frames, panel contacts and every visible object's stability. Reject geometry or perspective drift; retiming may improve sound motion but cannot make structural mutation acceptable.

## V06 — Open the design studio

**Attach:** I00 approved closed base as first-frame reference and I06 approved Design endpoint as destination reference, using an interface that actually supports both. If endpoint conditioning is unsupported, use the composited fallback P04 or record the limitation before attempting a take. Output label: `design-forward-master`.

**Prompt**

One continuous locked-off architectural editorial shot. Begin exactly on the supplied closed-panel image and finish exactly on the supplied design studio image. The only substantial motion is two existing rigid architectural panels sliding apart horizontally on their track: left panel to screen left, right panel to screen right. They preserve their dimensions, thickness, material, straight edges and perspective at every point. Both start together, move smoothly and symmetrically, and settle at the exact supplied end positions. Nothing bends, folds, rotates or becomes a curtain.

Choreography as a proportion of the available clip: first 10 percent hold the closed frame; next 15 percent begin the slide gently; middle 45 percent perform the clear reveal; next 15 percent decelerate to the exact endpoint; final 15 percent hold completely still. Aim for a finished 2–3-second transition after editing, without implausible acceleration. If the model requires a longer generation, preserve the same proportional choreography and endpoint holds.

The room behind the panels is stationary from the first frame, merely becoming visible. It contains a practical design table with two folded-paper maquettes, a small geometric physical prototype, a compact fan of material swatches, a folded textile, an unbranded task lamp and a plain packaging mock-up. Make the objects specific enough to reward a closer look but large and simple enough to remain stable in motion. The maquettes have crisp plausible folds, the prototype sits firmly on the table and the swatches show a disciplined range of textures. The composition represents material thinking rather than software branding. No object appears through a dissolve, grows, moves independently or changes shape. The set remains unoccupied. Daylight direction and exposure remain constant. Preserve camera, focal length, horizon, crop, exterior architecture, floor and track. Panel shadows change only as a physically coherent result of their translation. Do not animate the objects to make the reveal more exciting.

No zoom, pan, tilt, roll, dolly, focus breathing, stabilisation warp, shake, parallax drift, camera cut, crossfade, flash, exposure jump, new panels, stretching, texture crawl, temporal grain, floating equipment, readable text, generated UI, watermark, audio, readable packaging text, software screenshots, brand logos, floating interface panels, too many miniature objects, impossible paper folds or a person designing. Finish with a generous clean still hold that can be paired with a return clip.

**Deliver/accept:** Review at normal speed and frame by frame. Compare the opening with I00 and the terminal hold with I06. Inspect the fastest slide frames, panel contacts and every visible object's stability. Reject geometry or perspective drift; retiming may improve sound motion but cannot make structural mutation acceptable.

## R01 — Return from writing to the common base

**Inputs:** the accepted, edited V01 master; the exact approved forward terminal frame; the common closed master. This is an editing instruction, not a claim that an original reverse-generation prompt exists.

**Prompt / editing brief**

Create the return by reversing the accepted writing reveal in the editor. Start on the exact forward held frame, with matching crop, colour and exposure. The same two rigid panels slide toward each other along the same tracks, occluding the stationary writing studio. Finish on the identical shared closed-panel composition. Preserve all source frames' spatial relationships and avoid generating new interior or panel motion.

Trim redundant opening/end holds and retime the movement only if it remains physically credible. Target a concise roughly 1–1.5-second close where the source permits, so a later change to another world does not feel unnecessarily slow. This is a target, not permission for dropped-frame jitter or synthetic interpolation. Use the source cadence unless a tested export decision requires otherwise. Remove audio entirely.

Check forward hold → return first frame and return hold → common base at full size and phone size. Inspect the last several encoded frames for black tails and range shifts. Record duration, frame rate, dimensions and a validated terminal hold time independently from the forward clip. Export the return with compatible colour management and the same responsive crop family.

Do not assume matching filenames or identical durations prove a seam. If reversal exposes unstable objects or lighting, reject the source or use the composited fallback; do not conceal it with a flash, blur or crossfade. Deliver `writing-return-master`, its two seam comparisons and the selected hold timestamp.

## R02 — Return from visual art to the common base

**Inputs:** the accepted, edited V02 master; the exact approved forward terminal frame; the common closed master. This is an editing instruction, not a claim that an original reverse-generation prompt exists.

**Prompt / editing brief**

Create the return by reversing the accepted visual art reveal in the editor. Start on the exact forward held frame, with matching crop, colour and exposure. The same two rigid panels slide toward each other along the same tracks, occluding the stationary visual art studio. Finish on the identical shared closed-panel composition. Preserve all source frames' spatial relationships and avoid generating new interior or panel motion.

Trim redundant opening/end holds and retime the movement only if it remains physically credible. Target a concise roughly 1–1.5-second close where the source permits, so a later change to another world does not feel unnecessarily slow. This is a target, not permission for dropped-frame jitter or synthetic interpolation. Use the source cadence unless a tested export decision requires otherwise. Remove audio entirely.

Check forward hold → return first frame and return hold → common base at full size and phone size. Inspect the last several encoded frames for black tails and range shifts. Record duration, frame rate, dimensions and a validated terminal hold time independently from the forward clip. Export the return with compatible colour management and the same responsive crop family.

Do not assume matching filenames or identical durations prove a seam. If reversal exposes unstable objects or lighting, reject the source or use the composited fallback; do not conceal it with a flash, blur or crossfade. Deliver `visual-art-return-master`, its two seam comparisons and the selected hold timestamp.

## R03 — Return from film to the common base

**Inputs:** the accepted, edited V03 master; the exact approved forward terminal frame; the common closed master. This is an editing instruction, not a claim that an original reverse-generation prompt exists.

**Prompt / editing brief**

Create the return by reversing the accepted film reveal in the editor. Start on the exact forward held frame, with matching crop, colour and exposure. The same two rigid panels slide toward each other along the same tracks, occluding the stationary film studio. Finish on the identical shared closed-panel composition. Preserve all source frames' spatial relationships and avoid generating new interior or panel motion.

Trim redundant opening/end holds and retime the movement only if it remains physically credible. Target a concise roughly 1–1.5-second close where the source permits, so a later change to another world does not feel unnecessarily slow. This is a target, not permission for dropped-frame jitter or synthetic interpolation. Use the source cadence unless a tested export decision requires otherwise. Remove audio entirely.

Check forward hold → return first frame and return hold → common base at full size and phone size. Inspect the last several encoded frames for black tails and range shifts. Record duration, frame rate, dimensions and a validated terminal hold time independently from the forward clip. Export the return with compatible colour management and the same responsive crop family.

Do not assume matching filenames or identical durations prove a seam. If reversal exposes unstable objects or lighting, reject the source or use the composited fallback; do not conceal it with a flash, blur or crossfade. Deliver `film-return-master`, its two seam comparisons and the selected hold timestamp.

## R04 — Return from music to the common base

**Inputs:** the accepted, edited V04 master; the exact approved forward terminal frame; the common closed master. This is an editing instruction, not a claim that an original reverse-generation prompt exists.

**Prompt / editing brief**

Create the return by reversing the accepted music reveal in the editor. Start on the exact forward held frame, with matching crop, colour and exposure. The same two rigid panels slide toward each other along the same tracks, occluding the stationary music studio. Finish on the identical shared closed-panel composition. Preserve all source frames' spatial relationships and avoid generating new interior or panel motion.

Trim redundant opening/end holds and retime the movement only if it remains physically credible. Target a concise roughly 1–1.5-second close where the source permits, so a later change to another world does not feel unnecessarily slow. This is a target, not permission for dropped-frame jitter or synthetic interpolation. Use the source cadence unless a tested export decision requires otherwise. Remove audio entirely.

Check forward hold → return first frame and return hold → common base at full size and phone size. Inspect the last several encoded frames for black tails and range shifts. Record duration, frame rate, dimensions and a validated terminal hold time independently from the forward clip. Export the return with compatible colour management and the same responsive crop family.

Do not assume matching filenames or identical durations prove a seam. If reversal exposes unstable objects or lighting, reject the source or use the composited fallback; do not conceal it with a flash, blur or crossfade. Deliver `music-return-master`, its two seam comparisons and the selected hold timestamp.

## R05 — Return from performance to the common base

**Inputs:** the accepted, edited V05 master; the exact approved forward terminal frame; the common closed master. This is an editing instruction, not a claim that an original reverse-generation prompt exists.

**Prompt / editing brief**

Create the return by reversing the accepted performance reveal in the editor. Start on the exact forward held frame, with matching crop, colour and exposure. The same two rigid panels slide toward each other along the same tracks, occluding the stationary performance studio. Finish on the identical shared closed-panel composition. Preserve all source frames' spatial relationships and avoid generating new interior or panel motion.

Trim redundant opening/end holds and retime the movement only if it remains physically credible. Target a concise roughly 1–1.5-second close where the source permits, so a later change to another world does not feel unnecessarily slow. This is a target, not permission for dropped-frame jitter or synthetic interpolation. Use the source cadence unless a tested export decision requires otherwise. Remove audio entirely.

Check forward hold → return first frame and return hold → common base at full size and phone size. Inspect the last several encoded frames for black tails and range shifts. Record duration, frame rate, dimensions and a validated terminal hold time independently from the forward clip. Export the return with compatible colour management and the same responsive crop family.

Do not assume matching filenames or identical durations prove a seam. If reversal exposes unstable objects or lighting, reject the source or use the composited fallback; do not conceal it with a flash, blur or crossfade. Deliver `performance-return-master`, its two seam comparisons and the selected hold timestamp.

## R06 — Return from design to the common base

**Inputs:** the accepted, edited V06 master; the exact approved forward terminal frame; the common closed master. This is an editing instruction, not a claim that an original reverse-generation prompt exists.

**Prompt / editing brief**

Create the return by reversing the accepted design reveal in the editor. Start on the exact forward held frame, with matching crop, colour and exposure. The same two rigid panels slide toward each other along the same tracks, occluding the stationary design studio. Finish on the identical shared closed-panel composition. Preserve all source frames' spatial relationships and avoid generating new interior or panel motion.

Trim redundant opening/end holds and retime the movement only if it remains physically credible. Target a concise roughly 1–1.5-second close where the source permits, so a later change to another world does not feel unnecessarily slow. This is a target, not permission for dropped-frame jitter or synthetic interpolation. Use the source cadence unless a tested export decision requires otherwise. Remove audio entirely.

Check forward hold → return first frame and return hold → common base at full size and phone size. Inspect the last several encoded frames for black tails and range shifts. Record duration, frame rate, dimensions and a validated terminal hold time independently from the forward clip. Export the return with compatible colour management and the same responsive crop family.

Do not assume matching filenames or identical durations prove a seam. If reversal exposes unstable objects or lighting, reject the source or use the composited fallback; do not conceal it with a flash, blur or crossfade. Deliver `design-return-master`, its two seam comparisons and the selected hold timestamp.

## M01 — Portrait-safe art review and crop instruction

**Inputs:** I00 and all approved destination images; proposed desktop/mobile homepage layouts.

**Prompt**

Review this image family for a 390×844 homepage and a 320×568 stress case. The media occupies a bounded portrait area within a scrolling page; headline, primary action and scene controls remain HTML outside it. First test a centre 9:16 crop of every 16:9 master. At full retained height this keeps only approximately 31.64 percent of the original width. Report which focal tools, panel edges, floor contacts and practice cues survive. Do not assume that a centred subject alone proves mobile suitability.

Use one fixed crop transform for every member of a responsive family. Do not pan the crop separately for different worlds. Check that the Writing notebook, art easel, Film camera, Music instrument cluster, rehearsal block and Design maquettes remain recognisable. If any world fails, propose a single revised mobile base composition and explain how all endpoints will be derived from it. Avoid independently art-directing six unrelated phone images.

Return a comparison sheet with full master and actual phone crop for each world, pass/fail notes and a recommended common crop. State whether mobile can use cropped desktop motion or requires new matched production. Do not silently approve a crop that removes the moving panels entirely.

## M02 — Shared mobile master edit

**Attach:** I00 and the failed crop report from M01. Use only if crop-based mobile fails.

**Prompt**

Create a portrait 9:16 adaptation of the attached studio threshold. Preserve its architectural character, panel material, floor, track, light direction and photographic realism. Recompose the outer frame and opening width for a narrow image so both sliding panel boundaries and their travel can be understood. Keep a level straight-on camera and plausible panel clearance. Do not simply stretch the landscape image. The centre must have enough depth and width to contain a recognisable desk or a compact production setup at the destination.

The panels begin fully closed with the same quiet central seam. There are no people, lettering, logo, UI, decorative portal effects or props outside the closed room. Keep the composition calm and consistent with the approved desktop art. Deliver actual dimensions and identify intentional framing differences. This becomes the sole mobile master; derive all six mobile endpoints by applying their corresponding I01–I06 object instructions to this exact approved image. Rerun the corresponding V/R instructions for any mobile family that cannot be obtained by cropping. Do not splice mobile endpoints into desktop clips.

## M03 — Web exports and poster extraction

**Inputs:** accepted forward/return masters, seam review notes and responsive-family decision.

**Prompt / editing brief**

Prepare browser-ready outputs for all approved scenes. Keep high-quality masters separate from the public folder. Produce consistent desktop and mobile dimensions within each family, standard SDR colour handling, broadly compatible MP4 encodes and no audio stream. Preserve the actual accepted crop and motion cadence; do not add interpolation, grain, sharpening, colour effects or automatic stabilisation as a default export step. Enable an appropriate progressive web delivery layout when the encoder supports it.

Extract the base and scene posters from validated final video frames, rather than substituting a visually similar generation reference. Review the still/video seam in a browser after encoding. Target mobile posters at or below 250 KB, desktop at or below 450 KB, short mobile clips at or below 2 MB and desktop at or below 4 MB while maintaining acceptable image quality. If a target cannot be met, report the tradeoff and provide a smaller candidate for review; never silently degrade the only master.

Produce an asset manifest with stable ID, role, family, source prompt, hash, bytes, dimensions, duration, encoded FPS, codec, audio status, colour details and validated opening/hold times. Generate contact sheets for start/middle/end of each direction. Do not label the family accepted until all cross-world common-base seams have passed.

## P01 — Repair architectural drift

**Inputs:** failing clip, exact base/endpoint and marked frames showing the drift.

**Prompt**

Correct the continuity problem identified in the supplied frame comparisons. The fixed outer frame, horizontal track, floor junction and camera perspective must retain their coordinates. Only the two sliding panels translate horizontally. Simplify microtexture and remove incidental background motion. Preserve the approved studio layout and endpoint rather than inventing a visually similar room. No camera zoom or reframing is permitted to force a match. Regenerate a bounded candidate or recommend the composited method if the model cannot hold the structure. Return a difference comparison for the same marked features; do not judge success solely from playback at reduced size.

## P02 — Repair unstable tools and small detail

**Inputs:** failing destination/clip and approved world description.

**Prompt**

Simplify the unstable practice tools while retaining their identity and composition. Use fewer, larger, physically plausible objects. Remove readable text, small repeated marks, excessive cables, fine screen elements and intricate moving shadows. Keep the dominant object and its floor/table contact fixed. Preserve the approved camera, panel geometry and daylight. Do not substitute a generic decorative object that makes the creative practice unreadable. Provide a revised destination first, compare it to the master, then attempt motion only after the still is accepted. State which details were deliberately removed and why.

## P03 — Repair exposure or colour mismatch

**Inputs:** actual encoded forward/return files and poster, not screenshots alone.

**Prompt / editing brief**

Investigate the brightness or colour jump at the marked seam. Compare source frames, export range/colour metadata, encoding settings, poster conversion and browser rendering. First determine whether the discontinuity exists in the media, the poster or the visible-layer handoff. Keep all UI overlays constant during diagnosis. Re-export the affected pair consistently if the source is sound; fix the player if the wrong or unready frame is being exposed. Do not paint a dark overlay over the whole stage to hide the mismatch. Return the diagnosed cause, changed file, before/after seam evidence and new hash/hold data.

## P04 — Deterministic composited reveal fallback

**Inputs:** approved closed master and six destination stills; layered assets or manually reviewed masks.

**Prompt / production brief**

Build the studio reveal as a pre-rendered two-dimensional composition with perspective-consistent layers. Use the approved destination as the stationary interior and isolate the two rigid panels as foreground plates. Reconstruct any necessary hidden panel edges cleanly in production. Animate the left and right panels along straight horizontal tracks with one controlled ease and a final hold. Preserve the common outer frame, floor and camera. Create physically restrained shadow layers only where their movement is needed, checking them against the scene geometry.

This method is appropriate because the camera and room remain fixed; it does not need generative video to invent motion between frames. Validate that panel masks, contact shadows and occlusion stay credible throughout travel. Export the result as prepared forward/return videos and run the same seam/mobile/codec checks. Do not introduce a WebGL engine or per-frame canvas renderer into the webpage to deliver this effect. Record this as composited animation, not model-generated footage. This is the preferred fallback after repeated structural generation failures.
