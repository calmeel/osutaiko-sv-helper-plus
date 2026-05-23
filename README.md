<p align="center">
  <img src="img/interface.png">
</p>

# osu!taiko SV Helper plus
A fork of osu!taiko SV Helper with bug fixes and a few additional features.

This version is based on the original osu!taiko SV Helper and includes fixes for issues found in the original tool, as well as small improvements for osu!taiko mapping workflows.

## Changes from the original version

### Bug fixes

- Fixed an issue where using the `delete` or `modify` buttons could unintentionally modify uninherited timing points.

### Added features

- Added `1/8 dense mode` in addition to the existing `1/16 dense mode`.

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
