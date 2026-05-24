const { ipcRenderer } = require('electron');

const { __VERSION__ } = require('./src/env');

const DEFAULT_LANGUAGE = 'en';
const I18N = {
	en: {
		manual: 'Manual',
		beatmap: 'Beatmap',
		filePlaceholder: 'Drag & drop beatmap file here (*.osu)',
		selectFile: 'Select',
		profile: 'Profile',
		profileNote: 'Save and reuse settings.',
		profileName: 'Profile Name',
		save: 'Save',
		load: 'Load',
		delete: 'Delete',
		startPoint: 'Start Point',
		endPoint: 'End Point',
		timePlaceholder: 'Time (00:12:345 - ...)',
		velocityPlaceholder: 'Slider Velocity (1.0...)',
		volumePlaceholder: 'Volume (5 ~ 100)',
		includeStart: 'Include Start Time',
		includeEnd: 'Include End Time',
		keep: 'Keep',
		options: 'Options',
		denseMode: 'Dense Mode',
		offsetMode: '-1/16 Offset Mode',
		svMode: 'SV Mode',
		svLinear: 'Linear',
		svRatio: 'Ratio',
		svCubicIn: 'Cubic In / Accelerate Curve',
		svCubicOut: 'Cubic Out / Decelerate Curve',
		svSineIn: 'Sine In / Accelerate Curve',
		svSineOut: 'Sine Out / Decelerate Curve',
		svBezierInOut: 'Bezier In-Out',
		svBezierOutIn: 'Bezier Out-In',
		backup: 'Backup',
		overwrite: 'Overwrite',
		modify: 'Modify',
		remove: 'Remove',
		openBackupFolder: 'Open Backup Folder',
		basicMode: 'Basic Mode...',
		advancedMode: 'Advanced Mode...'
	},
	ja: {
		manual: '説明書',
		beatmap: '譜面',
		filePlaceholder: '.osuファイルをドラッグ&ドロップ',
		selectFile: '選択',
		profile: 'プロファイル',
		profileNote: '設定を保存できます',
		profileName: 'プロファイル名',
		save: '保存',
		load: '読込',
		delete: '削除',
		startPoint: '開始地点',
		endPoint: '終了地点',
		timePlaceholder: '時刻 (00:12:345 - ...)',
		velocityPlaceholder: 'SV (1.0...)',
		volumePlaceholder: '音量 (5 ~ 100)',
		includeStart: '開始地点を含む',
		includeEnd: '終了地点を含む',
		keep: '維持',
		options: 'オプション',
		denseMode: 'Dense モード',
		offsetMode: '-1/16 Offset モード',
		svMode: 'SVモード',
		svLinear: 'Linear / 等差',
		svRatio: 'Ratio / 等比',
		svCubicIn: 'Cubic In / 加速カーブ',
		svCubicOut: 'Cubic Out / 減速カーブ',
		svSineIn: 'Sine In / 加速カーブ',
		svSineOut: 'Sine Out / 減速カーブ',
		svBezierInOut: 'Bezier In-Out',
		svBezierOutIn: 'Bezier Out-In',
		backup: 'バックアップ',
		overwrite: '上書き',
		modify: '修正',
		remove: '削除',
		openBackupFolder: 'バックアップを開く',
		basicMode: '基本モード...',
		advancedMode: '詳細モード...'
	}
};

class Storage {
	static instance;

	constructor() {
		if(this.constructor.instance)
			return this.constructor.instance;

		this._storage = {};

		if(localStorage[__VERSION__]) {
			this._storage = JSON.parse(localStorage[__VERSION__]);
		}

		this.constructor.instance = this;
	}

	save() {
		localStorage[__VERSION__] = JSON.stringify(this._storage);
	}

	clear() {
		localStorage.clear();
	}

	static getAccess(callback) {
		const storage = this.getInstance();
		const storageOriginal = JSON.stringify(storage._storage);

		const ret = callback(storage._storage);

		try {
			storage.save();

			return ret !== undefined ? JSON.parse(JSON.stringify(ret)) : ret;
		} catch(e) {
			storage._storage = JSON.parse(storageOriginal);

			localStorage[__VERSION__] = storageOriginal;

			throw e;
		}
	}

	static getInstance() {
		return new this;
	}
}

class FileUI {
	constructor(selector) {
		const self = this;

		this._value = undefined;

		this.$el = document.querySelector(selector);
		this.$label = this.$el.querySelector('.file-label');
		this.$button = this.$el.querySelector('.file-select');

		this.$el.addEventListener('drop', onDragDrop);
		this.$el.addEventListener('dragover', onDragOver);
		this.$button.addEventListener('click', onButtonClick);

		function onDragDrop(e) {
			e.preventDefault();
			e.stopPropagation();

			if(e.dataTransfer.files.length > 0) {
				const file = e.dataTransfer.files[0];

				if(file) setFile(file);
			}
		}

		function onDragOver(e) {
			e.preventDefault();
			e.stopPropagation();
		}

		function onButtonClick(e) {
			const file = ipcRenderer.sendSync('main:file');

			if(file) setFile(file);
		}

		function setFile(file) {
			self.$el.classList.add('active');
			self.$label.innerText = file.name;

			self._value = file.path;
		}
	}

	value() {
		return this._value;
	}
}

class ProfileUI {
	constructor(selector) {
		const self = this;

		this._profiles = Storage.getAccess((storage) => {
			if(storage.profiles === undefined)
				storage.profiles = {};

			return storage.profiles;
		});

		this.$el = document.querySelector(selector);
		this.$input = this.$el.querySelector('input');
		this.$select = this.$el.querySelector('select');
		this.$saveButton = this.$el.querySelector('.profile-btn-save');
		this.$loadButton = this.$el.querySelector('.profile-btn-load');
		this.$deleteButton = this.$el.querySelector('.profile-btn-delete');

		this.$select.addEventListener('change', onSelectChange);
		this.$saveButton.addEventListener('click', onSaveButtonClick);
		this.$loadButton.addEventListener('click', onLoadButtonClick);
		this.$deleteButton.addEventListener('click', onDeleteButtonClick);

		updateView();

		function onSelectChange(e) {
			self.$input.value = self.$select.value;
		}

		function onSaveButtonClick(e) {
			let profileName = self.$input.value;
			let profileDatas;

			if(profileName === undefined || profileName === '')
				return;

			if(self.onSave && typeof self.onSave === 'function')
				profileDatas = self.onSave(profileName);

			self.saveProfile(profileName, profileDatas);

			updateView();
		}

		function onLoadButtonClick(e) {
			let profileName = self.$input.value;
			let profileDatas;

			if(profileName === undefined || profileName === '')
				return;

			profileDatas = self.loadProfile(profileName);

			if(self.onLoad && typeof self.onLoad === 'function')
				self.onLoad(profileDatas);
		}

		function onDeleteButtonClick(e) {
			let profileName = self.$input.value;

			if(profileName === undefined || profileName === '')
				return;

			self.deleteProfile(profileName);

			updateView();
		}

		function updateView() {
			self.$select.innerHTML = '';

			for(let i in self._profiles) {
				const $option = document.createElement('option');

				$option.innerText = i;

				self.$select.append($option);
			}
		}
	}

	saveProfile(name, datas) {
		Storage.getAccess((storage) => storage.profiles[name] = datas);

		return this._profiles[name] = datas;
	}

	loadProfile(name) {
		return this._profiles[name];
	}

	deleteProfile(name) {
		Storage.getAccess((storage) => delete storage.profiles[name]);

		return delete this._profiles[name];
	}
}

window.addEventListener('DOMContentLoaded', () => {
	const fileUI = new FileUI('.file');
	const profileUI = new ProfileUI('.profile');

	const $wrap = document.querySelector('.wrap');

	const $closeButton = document.querySelector('.titlebar-close');
	const $manualButton = document.querySelector('.titlebar-manual');
	const $languageSelect = document.querySelector('.titlebar-language');

	const $startPointTime = document.getElementById('sp_time');
	const $startPointVelocity = document.getElementById('sp_velocity');
	const $startPointVolume = document.getElementById('sp_volume');
	const $startTimeInclude = document.getElementById('sp_include');

	const $endPointTime = document.getElementById('ep_time');
	const $endPointVelocity = document.getElementById('ep_velocity');
	const $endPointVolume = document.getElementById('ep_volume');
	const $endTimeInclude = document.getElementById('ep_include');

	const $optionDense = document.getElementById('op_dense');
	const $optionDenseSnap = document.getElementById('op_dense_snap');
	const $optionOffset = document.getElementById('op_offset');
	const $svMode = document.getElementById('op_sv_mode');
	const $optionIgnoreVelocity = document.getElementById('op_ignr_velocity');
	const $optionIgnoreVolume = document.getElementById('op_ignr_volume');
	const $optionBackup = document.getElementById('op_backup');

	const $overwriteButton = document.querySelector('.btn-overwrite');
	const $modifyButton = document.querySelector('.btn-modify');
	const $removeButton = document.querySelector('.btn-remove');
	const $backupButton = document.querySelector('.btn-backup');

	const $modeToggler = document.querySelector('.mode-toggler');

	const $swapTime = document.querySelector('.swap-time');
	const $swapVelocity = document.querySelector('.swap-velocity');
	const $swapVolume = document.querySelector('.swap-volume');

	$closeButton.addEventListener('click', onCloseClick);
	$manualButton.addEventListener('click', onManualClick);
	$languageSelect.addEventListener('change', onLanguageChange);

	$overwriteButton.addEventListener('click', onOverwriteClick);
	$modifyButton.addEventListener('click', onModifyClick);
	$removeButton.addEventListener('click', onRemoveClick);
	$backupButton.addEventListener('click', onBackupClick);

	$optionDense.addEventListener('change', onDenseChange);
	$optionDenseSnap.addEventListener('change', onDenseSnapChange);
	$optionIgnoreVelocity.addEventListener('change', onIgnoreVelocityChange);
	$optionIgnoreVolume.addEventListener('change', onIgnoreVolumeChange);

	$modeToggler.addEventListener('click', onModeTogglerClick);

	$swapTime.addEventListener('click', onSwapTimeButtonClick);
	$swapVelocity.addEventListener('click', onSwapVelocityButtonClick);
	$swapVolume.addEventListener('click', onSwapVolumeButtonClick);

	profileUI.onSave = getInputDatas;
	profileUI.onLoad = setInputDatas;

	let currentLanguage = Storage.getAccess((storage) => {
		if(!storage.language)
			storage.language = DEFAULT_LANGUAGE;

		return normalizeLanguage(storage.language);
	});

	applyLanguage(currentLanguage);

	Storage.getAccess((storage) => {
		if(storage.mode) {
			setMode(storage.mode);
		} else {
			setMode('basic');
		}
	});
	onDenseChange();

	function setMode(mode) {
		let _mode;

		if(mode === 'basic') {
			ipcRenderer.send('main:basic');

			$wrap.classList.remove('mode-advanced');
			$wrap.classList.add('mode-basic');

			_mode = 'basic';
		} else {
			ipcRenderer.send('main:advanced');

			$wrap.classList.remove('mode-basic');
			$wrap.classList.add('mode-advanced');

			_mode = 'advanced';
		}

		Storage.getAccess((storage) => {
			storage.mode = _mode;
		});

		updateModeTogglerLabel();
	}

	function onCloseClick() {
		ipcRenderer.send('main:close');
	}

	function onManualClick() {
		ipcRenderer.send('main:manual', currentLanguage);
	}

	function onLanguageChange() {
		applyLanguage($languageSelect.value);
	}

	function onOverwriteClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:overwrite', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startPointVelocity: d.startPointVelocity,
			startPointVolume: d.startPointVolume,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endPointVelocity: d.endPointVelocity,
			endPointVolume: d.endPointVolume,
			endTimeInclude: d.endTimeInclude,
			optionDense: d.optionDense,
			optionDenseSnap: d.optionDenseSnap,
			optionOffset: d.optionOffset,
			svMode: d.svMode,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume,
			optionBackup: d.optionBackup,
			language: currentLanguage
		});
	}

	function onModifyClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:modify', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startPointVelocity: d.startPointVelocity,
			startPointVolume: d.startPointVolume,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endPointVelocity: d.endPointVelocity,
			endPointVolume: d.endPointVolume,
			endTimeInclude: d.endTimeInclude,
			optionOffset: d.optionOffset,
			svMode: d.svMode,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume,
			optionBackup: d.optionBackup,
			language: currentLanguage
		});
	}

	function onRemoveClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:remove', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endTimeInclude: d.endTimeInclude,
			optionOffset: d.optionOffset,
			optionBackup: d.optionBackup,
			language: currentLanguage
		});
	}

	function onBackupClick() {
		ipcRenderer.send('main:backup');
	}

	function getInputDatas() {
		const beatmapPath = fileUI.value();

		const startPointTime = $startPointTime.value;
		const startPointVelocity = $startPointVelocity.value;
		const startPointVolume = $startPointVolume.value;
		const startTimeInclude = $startTimeInclude.checked;

		const endPointTime = $endPointTime.value;
		const endPointVelocity = $endPointVelocity.value;
		const endPointVolume = $endPointVolume.value;
		const endTimeInclude = $endTimeInclude.checked;

		const optionDense = $optionDense.checked;
		const optionDenseSnap = parseInt($optionDenseSnap.value);
		const optionOffset = $optionOffset.checked;
		const svMode = $svMode.value;
		const optionIgnoreVelocity = $optionIgnoreVelocity.checked;
		const optionIgnoreVolume = $optionIgnoreVolume.checked;
		const optionBackup = $optionBackup.checked;

		return {
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
			svMode,
			optionIgnoreVelocity,
			optionIgnoreVolume,
			optionBackup
		};
	}

	function setInputDatas(datas) {
		$startPointTime.value = datas.startPointTime;
		$startPointVelocity.value = datas.startPointVelocity;
		$startPointVolume.value = datas.startPointVolume;
		$startTimeInclude.checked = datas.startTimeInclude;

		$endPointTime.value = datas.endPointTime;
		$endPointVelocity.value = datas.endPointVelocity;
		$endPointVolume.value = datas.endPointVolume;
		$endTimeInclude.checked = datas.endTimeInclude;

		$optionDense.checked = datas.optionDense;
		$optionDenseSnap.value = normalizeDenseSnap(datas.optionDenseSnap);
		$optionOffset.checked = datas.optionOffset;
		$svMode.value = normalizeSvMode(datas.svMode || (datas.optionExponential ? 'cubicIn' : 'linear'));
		$optionIgnoreVelocity.checked = datas.optionIgnoreVelocity;
		$optionIgnoreVolume.checked = datas.optionIgnoreVolume;
		$optionBackup.checked = datas.optionBackup;

		onDenseChange();
		$optionIgnoreVelocity.dispatchEvent(new Event('change'));
		$optionIgnoreVolume.dispatchEvent(new Event('change'));
	}

	function onDenseChange() {
		$optionDenseSnap.disabled = !$optionDense.checked;
	}

	function onDenseSnapChange() {
		$optionDense.checked = true;
		$optionDenseSnap.disabled = false;
	}

	function onIgnoreVelocityChange() {
		$startPointVelocity.disabled = $optionIgnoreVelocity.checked;
		$endPointVelocity.disabled = $optionIgnoreVelocity.checked;

		if($optionIgnoreVelocity.checked) {
			$startPointVelocity.value = '';
			$endPointVelocity.value = '';
		}
	}

	function onIgnoreVolumeChange() {
		$startPointVolume.disabled = $optionIgnoreVolume.checked;
		$endPointVolume.disabled = $optionIgnoreVolume.checked;

		if($optionIgnoreVolume.checked) {
			$startPointVolume.value = '';
			$endPointVolume.value = '';
		}
	}

	function onModeTogglerClick() {
		const isBasic = $wrap.classList.contains('mode-basic');

		if(isBasic) {
			setMode('advanced');
		} else {
			setMode('basic');
		}
	}

	function applyLanguage(language) {
		currentLanguage = normalizeLanguage(language);
		$languageSelect.value = currentLanguage;

		const messages = I18N[currentLanguage];

		document.querySelectorAll('[data-i18n]').forEach($el => {
			const key = $el.dataset.i18n;

			if(messages[key])
				$el.innerText = messages[key];
		});

		document.querySelectorAll('[data-i18n-placeholder]').forEach($el => {
			const key = $el.dataset.i18nPlaceholder;

			if(messages[key])
				$el.placeholder = messages[key];
		});

		Storage.getAccess((storage) => {
			storage.language = currentLanguage;
		});

		ipcRenderer.send('main:language', currentLanguage);

		updateModeTogglerLabel();
	}

	function updateModeTogglerLabel() {
		const messages = I18N[currentLanguage];
		const isBasic = $wrap.classList.contains('mode-basic');

		$modeToggler.dataset.label = isBasic ? messages.advancedMode : messages.basicMode;
	}

	function normalizeLanguage(language) {
		return I18N[language] ? language : DEFAULT_LANGUAGE;
	}

	function onSwapTimeButtonClick() {
		[$startPointTime.value, $endPointTime.value] = [$endPointTime.value, $startPointTime.value];
	}

	function onSwapVelocityButtonClick() {
		[$startPointVelocity.value, $endPointVelocity.value] = [$endPointVelocity.value, $startPointVelocity.value];
	}

	function onSwapVolumeButtonClick() {
		[$startPointVolume.value, $endPointVolume.value] = [$endPointVolume.value, $startPointVolume.value];
	}

	function normalizeSvMode(svMode) {
		if(svMode === 'cubic' || svMode === 'curveIn')
			return 'cubicIn';

		if(svMode === 'curveOut')
			return 'cubicOut';

		return svMode;
	}

	function normalizeDenseSnap(snap) {
		if(parseInt(snap) === 4)
			return '4';

		return parseInt(snap) === 8 ? '8' : '16';
	}

});

module.exports = {
	Storage,
	FileUI,
	ProfileUI
};
