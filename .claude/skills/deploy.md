---
name: deploy
description: Bump version, commit, push, and package extension zip
user_invocable: true
---

# Deploy

Deploy the extension by bumping the version, committing, pushing, and packaging a zip.

## Arguments

- First argument (optional): bump type — `patch` (default), `minor`, or `major`

## Steps

1. **Read** `manifest.json` and extract the current `"version"` value (semver: MAJOR.MINOR.PATCH).

2. **Bump** the version according to the argument:
   - `patch` (default): increment PATCH (e.g. 1.2.0 → 1.2.1)
   - `minor`: increment MINOR, reset PATCH (e.g. 1.2.1 → 1.3.0)
   - `major`: increment MAJOR, reset MINOR and PATCH (e.g. 1.2.1 → 2.0.0)

3. **Update** `manifest.json` with the new version string using the Edit tool.

4. **Commit** with message `Bump version to X.Y.Z` (stage only `manifest.json`).

5. **Push** to the remote.

6. **Package** the extension into a zip at `C:/Users/jorg3/Desktop/autoswipe-extension.zip`:
   - Before zipping, temporarily apply these edits to `manifest.json` using the Edit tool:
     - Replace `"name": "AutoSwipe (Dev)"` with `"name": "AutoSwipe"`
     - Replace all `icons-dev/` with `icons/` (use `replace_all: true`)
   - Zip these paths: `manifest.json`, `background/`, `content/`, `icons/`, `popup/`
   - Use: `powershell -Command "Compress-Archive -Path manifest.json, background, content, icons, popup -DestinationPath 'C:/Users/jorg3/Desktop/autoswipe-extension.zip' -Force"`
   - After zipping, revert manifest.json using the Edit tool:
     - Replace `"name": "AutoSwipe"` with `"name": "AutoSwipe (Dev)"`
     - Replace all `icons/` with `icons-dev/` (use `replace_all: true`)

7. Report the new version and confirm the zip location.
