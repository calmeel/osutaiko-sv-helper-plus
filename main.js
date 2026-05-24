const { app, shell, dialog, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const { __DEV__, __TEST__ } = require('./src/env');
const { BeatmapManipulater } = require('./src/beatmap');
const { parseIntSafely, parseFloatSafely, parseTimeSafely } = require('./src/type');
const { version: APP_VERSION } = require('./package.json');

const MANUAL_URLS = {
	en: 'https://calmeel.github.io/osutaiko-sv-helper-plus/',
	ja: 'https://calmeel.github.io/osutaiko-sv-helper-plus/ja.html'
};
const RELEASE_API_URL = 'https://api.github.com/repos/calmeel/osutaiko-sv-helper-plus/releases/latest';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
const UPDATE_CHECK_FILE = 'update-check.json';
const DEFAULT_LANGUAGE = 'en';
const MESSAGES = {
	en: {
		emptyInput: [ 'Empty input field found', 'You should enter the value to all input fields' ],
		invalidInput: [ 'Invalid value for input fields', 'You should enter the valid value to all input fields' ],
		failedRead: [ 'Failed to read beatmap file', 'Couldn\'t read your beatmap file' ],
		failedBackup: [ 'Failed to write backup file', 'Couldn\'t write your backup file' ],
		failedWrite: [ 'Failed to write beatmap file', 'Couldn\'t write your beatmap file' ],
		success: [ 'Successfully Applied', 'Don\'t forget to press CTRL + L in map editor to reload' ],
		emptyTime: [ 'Empty time field found', 'You should enter the value to time field at least' ],
		invalidTime: [ 'Invalid value for time fields', 'You should enter the valid value to time fields' ],
		updateAvailable: [ 'Update Available', 'A new version of osu!taiko SV Helper plus is available.' ]
	},
	ja: {
		emptyInput: [ '未入力の項目があります', 'すべての入力欄に値を入力してください' ],
		invalidInput: [ '入力値が正しくありません', '有効な値を入力してください' ],
		failedRead: [ '譜面ファイルの読み込みに失敗しました', '譜面ファイルを読み込めませんでした' ],
		failedBackup: [ 'バックアップの作成に失敗しました', 'バックアップファイルを書き込めませんでした' ],
		failedWrite: [ '譜面ファイルの書き込みに失敗しました', '譜面ファイルを書き込めませんでした' ],
		success: [ '適用しました', 'map editorでCTRL + Lを押して再読み込みしてください' ],
		emptyTime: [ '時刻が入力されていません', '少なくとも時刻欄には値を入力してください' ],
		invalidTime: [ '時刻の値が正しくありません', '有効な時刻を入力してください' ],
		updateAvailable: [ 'アップデートがあります', 'osu!taiko SV Helper plus の新しいバージョンがあります。' ]
	}
};

class Main {
	constructor() {
		this.language = DEFAULT_LANGUAGE;
		this.updateCheckStarted = false;

		this.win = new BrowserWindow({
			width: 404,
			height: 540,
			maximizable: false,
			fullscreenable: false,
			resizable: false,
			frame: false,
			icon: path.join(__dirname, '/icon.ico'),
			webPreferences: {
				contextIsolation: false,
				enableRemoteModule: true,
				nodeIntegration: true,
				nativeWindowOpen: true,
				preload: path.join(__dirname, '/preload.js')
			}
		});

		this.win.loadFile('index.html');
		
		ipcMain.on('main:file', this.onTriggerFileDialog.bind(this));
		ipcMain.on('main:overwrite', this.onClickOverwrite.bind(this));
		ipcMain.on('main:modify', this.onClickModify.bind(this));
		ipcMain.on('main:remove', this.onClickRemove.bind(this));
		ipcMain.on('main:backup', this.onClickBackup.bind(this));
		ipcMain.on('main:manual', this.onClickManual.bind(this));
		ipcMain.on('main:language', this.onLanguageChange.bind(this));
		ipcMain.on('main:basic', this.onBasicModeTrigger.bind(this));
		ipcMain.on('main:advanced', this.onAdvancedModeTrigger.bind(this));
		ipcMain.on('main:close', this.onClose.bind(this));
	}

	showMessageBox(type, heading, message) {
		dialog.showMessageBox({
			title: 'osu!taiko SV Helper',
			type: type,
			message: heading,
			detail: message
		});

		return type;
	}

	showTranslatedMessageBox(type, key, language) {
		const messages = MESSAGES[this.normalizeLanguage(language)][key];

		return this.showMessageBox(type, messages[0], messages[1]);
	}

	normalizeLanguage(language) {
		return MESSAGES[language] ? language : DEFAULT_LANGUAGE;
	}

	getUpdateCheckPath() {
		return path.join(app.getPath('userData'), UPDATE_CHECK_FILE);
	}

	readUpdateCheckState() {
		try {
			return JSON.parse(fs.readFileSync(this.getUpdateCheckPath()).toString());
		} catch(err) {
			return {};
		}
	}

	writeUpdateCheckState(state) {
		try {
			fs.writeFileSync(this.getUpdateCheckPath(), JSON.stringify(state));
		} catch(err) {}
	}

	shouldCheckForUpdates(now=Date.now()) {
		const state = this.readUpdateCheckState();

		return !state.lastCheckedAt || now - state.lastCheckedAt >= UPDATE_CHECK_INTERVAL;
	}

	checkForUpdatesThrottled() {
		if(__TEST__ || this.updateCheckStarted || !this.shouldCheckForUpdates())
			return;

		this.updateCheckStarted = true;
		this.writeUpdateCheckState({ lastCheckedAt: Date.now() });

		this.fetchLatestRelease()
			.then(release => {
				if(release && release.version && this.constructor.compareVersions(release.version, APP_VERSION) > 0)
					this.showUpdateAvailable(release);
			})
			.catch(() => {});
	}

	fetchLatestRelease() {
		return new Promise((resolve, reject) => {
			const req = https.get(RELEASE_API_URL, {
				headers: {
					'Accept': 'application/vnd.github+json',
					'User-Agent': 'osutaiko-sv-helper-plus'
				}
			}, res => {
				let raw = '';

				if(res.statusCode < 200 || res.statusCode >= 300) {
					res.resume();
					return reject(new Error('Unexpected status code'));
				}

				res.setEncoding('utf8');
				res.on('data', chunk => raw += chunk);
				res.on('end', () => {
					try {
						const release = JSON.parse(raw);

						resolve({
							version: this.constructor.normalizeVersion(release.tag_name || release.name),
							url: release.html_url
						});
					} catch(err) {
						reject(err);
					}
				});
			});

			req.on('error', reject);
			req.setTimeout(5000, () => {
				req.destroy(new Error('Request timed out'));
			});
		});
	}

	showUpdateAvailable(release) {
		const messages = MESSAGES[this.normalizeLanguage(this.language)].updateAvailable;
		const result = dialog.showMessageBox(this.win, {
			title: 'osu!taiko SV Helper',
			type: 'info',
			message: messages[0],
			detail: `${messages[1]}\n\n${APP_VERSION} -> ${release.version}`,
			buttons: this.language === 'ja' ? [ 'GitHubを開く', '後で' ] : [ 'Open GitHub', 'Later' ],
			defaultId: 0,
			cancelId: 1
		});

		if(result && typeof result.then === 'function') {
			result.then(({ response }) => {
				if(response === 0 && release.url)
					shell.openExternal(release.url);
			});
		}
	}

	static normalizeVersion(version) {
		return String(version || '').trim().replace(/^v/i, '');
	}

	static compareVersions(a, b) {
		const pa = this.normalizeVersion(a).split('.').map(v => parseInt(v) || 0);
		const pb = this.normalizeVersion(b).split('.').map(v => parseInt(v) || 0);
		const length = Math.max(pa.length, pb.length);

		for(let i = 0; i < length; i++) {
			if((pa[i] || 0) > (pb[i] || 0))
				return 1;

			if((pa[i] || 0) < (pb[i] || 0))
				return -1;
		}

		return 0;
	}

	validateVolumeRange(...volumes) {
		if(volumes.some(volume => volume < 5 || volume > 100))
			throw new RangeError;
	}

	onTriggerFileDialog(e) {
		const filePaths = dialog.showOpenDialogSync(this.win, {
			properties: [ 'openFile' ],
			filters: [
				{ name: 'osu! Beatmap', extensions: [ 'osu' ] }
			]
		});

		if(filePaths && filePaths.length > 0) {
			const filePath = filePaths[0];

			return e.returnValue = {
				path: filePath,
				name: path.basename(filePath)
			};
		}

		e.returnValue = null;
	}

	onClickOverwrite(e, datas) {
		let beatmapManipulater;

		let {
			beatmapPath,
			startPointTime,
			startPointVelocity,
			startPointVolume,
			startTimeInclude,
			endPointTime,
			endPointVelocity,
			endPointVolume,
			endTimeInclude,
			optionDense,
			optionDenseSnap,
			optionOffset,
			optionOffsetPrecise,
			optionExponential,
			optionFinisherOnly,
			svMode,
			optionIgnoreVelocity,
			optionIgnoreVolume,
			optionBackup,
			language
		} = datas;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| endPointTime === undefined || endPointTime === ''
		|| (optionIgnoreVelocity === false && (startPointVelocity === undefined || startPointVelocity === ''))
		|| (optionIgnoreVelocity === false && (endPointVelocity === undefined || endPointVelocity === ''))
		|| (optionIgnoreVolume === false && (startPointVolume === undefined || startPointVolume === ''))
		|| (optionIgnoreVolume === false && (endPointVolume === undefined || endPointVolume === ''))) {
			return this.showTranslatedMessageBox('error', 'emptyInput', language);
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			startPointVelocity = optionIgnoreVelocity ? parseFloat(startPointVelocity) : parseFloatSafely(startPointVelocity);
			startPointVolume = optionIgnoreVolume ? parseInt(startPointVolume) : parseIntSafely(startPointVolume);

			endPointTime = parseTimeSafely(endPointTime);
			endPointVelocity = optionIgnoreVelocity ? parseFloat(endPointVelocity) : parseFloatSafely(endPointVelocity);
			endPointVolume = optionIgnoreVolume ? parseInt(endPointVolume) : parseIntSafely(endPointVolume);

			if(!optionIgnoreVolume)
				this.validateVolumeRange(startPointVolume, endPointVolume);
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'invalidInput', language);
		}

		try {
			beatmapManipulater = new BeatmapManipulater(beatmapPath);
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'failedRead', language);
		}

		if(optionBackup) {
			try {
				beatmapManipulater.backup();
			} catch(err) {
				return this.showTranslatedMessageBox('error', 'failedBackup', language);
			}
		}

		try {
			beatmapManipulater.overwrite(startPointTime, endPointTime, {
				startVelocity: startPointVelocity,
				startVolume: startPointVolume,
				endVelocity: endPointVelocity,
				endVolume: endPointVolume,
				includingStartTime: startTimeInclude,
				includingEndTime: endTimeInclude,
				isDense: optionDense,
				denseSnap: optionDenseSnap,
				isOffset: optionOffset,
				isOffsetPrecise: optionOffsetPrecise,
				isFinisherOnly: optionFinisherOnly,
				svMode: svMode || (optionExponential ? 'cubicIn' : 'linear'),
				isIgnoreVelocity: optionIgnoreVelocity,
				isIgnoreVolume: optionIgnoreVolume,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'failedWrite', language);
		}

		this.showTranslatedMessageBox('info', 'success', language);
	}

	onClickModify(e, datas) {
		let beatmapManipulater;

		let {
			beatmapPath,
			startPointTime,
			startPointVelocity,
			startPointVolume,
			startTimeInclude,
			endPointTime,
			endPointVelocity,
			endPointVolume,
			endTimeInclude,
			optionOffset,
			optionOffsetPrecise,
			optionExponential,
			optionFinisherOnly,
			svMode,
			optionIgnoreVelocity,
			optionIgnoreVolume,
			optionBackup,
			language
		} = datas;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| endPointTime === undefined || endPointTime === ''
		|| (optionIgnoreVelocity === false && (startPointVelocity === undefined || startPointVelocity === ''))
		|| (optionIgnoreVelocity === false && (endPointVelocity === undefined || endPointVelocity === ''))
		|| (optionIgnoreVolume === false && (startPointVolume === undefined || startPointVolume === ''))
		|| (optionIgnoreVolume === false && (endPointVolume === undefined || endPointVolume === ''))) {
			return this.showTranslatedMessageBox('error', 'emptyInput', language);
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			startPointVelocity = optionIgnoreVelocity ? parseFloat(startPointVelocity) : parseFloatSafely(startPointVelocity);
			startPointVolume = optionIgnoreVolume ? parseInt(startPointVolume) : parseIntSafely(startPointVolume);

			endPointTime = parseTimeSafely(endPointTime);
			endPointVelocity = optionIgnoreVelocity ? parseFloat(endPointVelocity) : parseFloatSafely(endPointVelocity);
			endPointVolume = optionIgnoreVolume ? parseInt(endPointVolume) : parseIntSafely(endPointVolume);

			if(!optionIgnoreVolume)
				this.validateVolumeRange(startPointVolume, endPointVolume);
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'invalidInput', language);
		}

		try {
			beatmapManipulater = new BeatmapManipulater(beatmapPath);
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'failedRead', language);
		}

		if(optionBackup) {
			try {
				beatmapManipulater.backup();
			} catch(err) {
				return this.showTranslatedMessageBox('error', 'failedBackup', language);
			}
		}

		try {
			beatmapManipulater.modify(startPointTime, endPointTime, {
				startVelocity: startPointVelocity,
				startVolume: startPointVolume,
				endVelocity: endPointVelocity,
				endVolume: endPointVolume,
				includingStartTime: startTimeInclude,
				includingEndTime: endTimeInclude,
				isOffset: optionOffset,
				isOffsetPrecise: optionOffsetPrecise,
				isFinisherOnly: optionFinisherOnly,
				svMode: svMode || (optionExponential ? 'cubicIn' : 'linear'),
				isIgnoreVelocity: optionIgnoreVelocity,
				isIgnoreVolume: optionIgnoreVolume,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'failedWrite', language);
		}

		this.showTranslatedMessageBox('info', 'success', language);
	}

	onClickRemove(e, datas) {
		let beatmapManipulater;

		let {
			beatmapPath,
			startPointTime,
			startTimeInclude,
			endPointTime,
			endTimeInclude,
			optionOffset,
			optionOffsetPrecise,
			optionBackup,
			language
		} = datas;

		if(beatmapPath === undefined || beatmapPath === ''
		|| startPointTime === undefined || startPointTime === ''
		|| endPointTime === undefined || endPointTime === '') {
			return this.showTranslatedMessageBox('error', 'emptyTime', language);
		}

		try {
			startPointTime = parseTimeSafely(startPointTime);
			endPointTime = parseTimeSafely(endPointTime);
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'invalidTime', language);
		}

		try {
			beatmapManipulater = new BeatmapManipulater(beatmapPath);
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'failedRead', language);
		}

		if(optionBackup) {
			try {
				beatmapManipulater.backup();
			} catch(err) {
				return this.showTranslatedMessageBox('error', 'failedBackup', language);
			}
		}

		try {
			beatmapManipulater.remove(startPointTime, endPointTime, {
				includingStartTime: startTimeInclude,
				includingEndTime: endTimeInclude,
				isOffset: optionOffset,
				isOffsetPrecise: optionOffsetPrecise,
				isBackup: optionBackup
			});
		} catch(err) {
			return this.showTranslatedMessageBox('error', 'failedWrite', language);
		}

		this.showTranslatedMessageBox('info', 'success', language);
	}

	onClickBackup(e) {
		shell.openPath(BeatmapManipulater.getBackupPath());
	}

	onClickManual(e, language) {
		shell.openExternal(MANUAL_URLS[this.normalizeLanguage(language)]);
	}

	onLanguageChange(e, language) {
		this.language = this.normalizeLanguage(language);
		this.checkForUpdatesThrottled();
	}

	onBasicModeTrigger(e) {
		this.win.setBounds({ width: 404, height: 540 });
	}

	onAdvancedModeTrigger(e) {
		this.win.setBounds({ width: 404, height: 738 });
	}

	onClose(e) {
		this.win.close();
	}
}

let main;

app.on('ready', () => {
	main = new Main;
});

app.on('window-all-closed', () => {
	app.quit()
});

module.exports = {
	default: main
};
