<p align="center">
  <img src="img/interface.png">
</p>

# osu!taiko SV Helper plus
A fork of osu!taiko SV Helper with bug fixes and a few additional features.

This version is based on the original osu!taiko SV Helper and includes fixes for issues found in the original tool, as well as small improvements for osu!taiko mapping workflows.

## Download

- English: Download the latest `.exe` from [Latest Release](https://github.com/calmeel/osutaiko-sv-helper-plus/releases/latest).
- 日本語: 最新版の `.exe` は [最新リリース](https://github.com/calmeel/osutaiko-sv-helper-plus/releases/latest) からダウンロードできます。

## Manual

- [English manual](https://calmeel.github.io/osutaiko-sv-helper-plus/)
- [日本語説明書](https://calmeel.github.io/osutaiko-sv-helper-plus/ja.html)

## Changes from the original version

### Bug fixes

- Fixed an issue where using the `delete` or `modify` buttons could unintentionally modify uninherited timing points. These actions now only affect inherited timing points, also known as green lines.

### Added features

- Added `1/4` and `1/8` dense modes in addition to the existing `1/16` dense mode.
- Added automatic SV point creation on barlines when using normal overwrite mode. barline positions are calculated from uninherited timing points, using `beatLength * meter`, and the final timestamp is floored.
- Offset Mode now includes automatic `1/12` handling for triplet-style hit objects. Hit objects on or near `1/12` snap are offset by `-1/12 snap`; other hit objects and barlines use `-1/16 snap`.
- Overwrite now removes all inherited timing points within the selected range and then creates new inherited timing points. Uninherited timing points are preserved.
- Normal Overwrite skips generated inherited timing points that would not change SV, volume, or effects. Dense Mode still places timing points even when the values do not change.
- Added Finisher Only Mode. Overwrite and Modify can target only big-note/Finisher SV points. When Overwrite changes a Finisher, a restore point is added at the next non-Finisher hit object or barline in the selected range. Finisher Only Mode cannot be combined with Dense Mode.
- Removed the Kiai option. Overwrite inherits Kiai/effects from the start point, and Modify preserves each timing point's existing effects.
- Added an `SV Mode` selector. The old Exponential behavior is available as `Cubic In`, and fixed-control-point Bezier modes are also available.
- Generated SV values are automatically BPM-compensated when the selected range crosses BPM changes. This applies to all SV modes.
- Added small `Keep` checkboxes for velocity and volume. When enabled, the original inherited value is kept instead of using the input value.
- Volume input now accepts only values from `5` to `100`.
- Added an update notice. The app checks GitHub Releases at most once every 24 hours and opens the release page only if the user chooses to do so.

## Requirement
* Node.js 14.16.0 or later

## Build
#### Serve Application
```
> cd PROJECT_FOLDER
> npm install
> npm test
> npm start
```
#### Build Executable File
```
> cd PROJECT_FOLDER
> npm install
> npm test
> npm run build:win64  ---  64bit
> npm run build:win32  ---  32bit
```
