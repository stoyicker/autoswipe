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

6. **Package** the extension into a zip at `C:/Users/jorg3/Desktop/autoswipe-extension.zip` containing only these paths:
   - `manifest.json`
   - `background/`
   - `content/`
   - `icons/`
   - `popup/`

   Use: `powershell -Command "Compress-Archive -Path manifest.json, background, content, icons, popup -DestinationPath 'C:/Users/jorg3/Desktop/autoswipe-extension.zip' -Force"`

7. Report the new version and confirm the zip location.
