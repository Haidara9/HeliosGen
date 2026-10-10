# Zameel referral production workspace

The referral reel now lives alongside HeliosGen, with a native application workflow for preparing one B-roll shot and an isolated Hyperframes/FFmpeg finish. The app's AI backend remains Kie.ai; its `gemini-omni-video` ID is not the direct Google API ID. Provider availability and billing have not been tested. No generation was submitted.

## Use HeliosGen

1. Open **Workflows → Import** and select `zameel-helios-workflow.zip` from this folder.
2. The 6-second reference restores into local media storage. It is deliberately disconnected from the generator: presenter likeness and dialogue are not being regenerated.
3. Review the prompt → video connection. It is configured for one 6-second portrait B-roll clip at 720p, with no dialogue or text. The generator starts idle.
4. Configure your own Kie.ai key in the app's Settings. Check provider credit requirements before selecting **Generate** on that one node. Importing the workflow does not submit a generation.
5. Download and inspect any generated clip before editing it into the reel. The shipped `review.mp4` contains the graphics redesign only; no generated B-roll is in it.

The manifest `workflow.json` is editable. To rebuild and verify the import package, run:

```bash
npm ci --prefix creative/zameel-referral
node creative/zameel-referral/build-workflow.mjs
node creative/zameel-referral/verify-import.mjs
```

The ZIP uses the application's `lib/makeZip.ts`; verification calls its actual `importWorkflowZip` implementation with the upload endpoint mocked. It checks media restoration, generator idle state and disconnection of presenter footage. This check is not provider E2E. A separate browser check also imported this ZIP in the real app, decoded its video reference and verified SQLite persistence without invoking generation.

## Edit and render

Requirements: Node 22+, FFmpeg/FFprobe and the Hyperframes browser. Install the isolated dependencies as above; the root app dependency graph is unchanged. If the browser is missing, from this folder run `node node_modules/hyperframes/bin/hyperframes.mjs browser ensure`.

Place the original uploaded reel in `.media/source.mp4` (ignored by Git), or pass its absolute path. `source-contract.json` checks its hash so that this timeline is not silently applied to different footage.

From the repository root:

```bash
npm run video:zameel -- --source /absolute/path/svuai-referral-reel_v3_share.mp4
npm run video:zameel -- --check-only
```

The renderer uses separate process arguments with no shell and works with paths containing spaces. On Windows, use an absolute Windows source path and put FFmpeg/FFprobe on PATH. Windows execution has not been tested.

Edit `index.html` for layout/timing and `DESIGN.md` for the authored palette. `edit-plan.json` is the original planning reference, not a runtime input; HTML is authoritative. The script checks layout/contrast, renders the header, composites it over the supplied original, decodes the entire output and compares the AAC packet hashes. It writes the MP4 and validation JSON to ignored `renders/`.

The final video remains 1080×1920 at 60fps. Header motion is captured at 30fps. The original source already contains subtitles and flashes; this workspace replaces its upper graphics panel through 44.3s and preserves the rest of the footage and original audio. Prices and referral terms come from the source video and have not been checked against current product entitlements.

`review.mp4` is the checked compact export (1080p60, CRF 28 capped at 1.6 Mbps, original AAC preserved). The render command produces the higher bitrate master. `.media/`, temporary renders, browser snapshots, application data, keys and local settings are excluded from Git.

## Validation recorded on 11 October 2026

- Hyperframes layout/runtime/contrast passed, with 11 nonblocking structural lint suggestions to use sub-compositions.
- Native ZIP imported through the app implementation: 4 nodes, 1 media asset restored; mocked upload, no provider calls.
- Chromium imported the ZIP via the actual Workflows file input; 4 canvas nodes rendered, the 6-second reference decoded, and the workflow persisted through the real SQLite API. Generation requests observed: 0.
- Repository render command completed; whole output decoded successfully; original AAC packets matched.
- AI generation: not run. No paid provider calls made.

## Existing SVUAI credentials

The owner authorized using an existing compatible project key without exposing it. The accessible private SVU AI Studio source references runtime Gemini configuration; its checkpoint identifies Cloud Run/Secret Manager as the credential location. No compatible Kie.ai or Google Gemini secret was available in this workspace or through the enabled secret-store access. No credential was copied, committed or sent to another provider. A Google Gemini key cannot be pasted into HeliosGen's Kie.ai setting.
