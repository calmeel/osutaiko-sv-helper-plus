const path = require('path');
const fs = require('fs');

const { Beatmap, BeatmapManipulater, TimingPoint, HitObject } = require('../src/beatmap');

describe('Beatmap Module Unit Test', () => {
	jest.setTimeout(10000);

	test('Timing Point', () => {
		const mockTimingPointRaw = '1,307.692307692308,4,1,0,70,1,0';
		const mockTimingPoint = TimingPoint.fromArray(mockTimingPointRaw.split(','));

		expect(mockTimingPoint.time).toBe(1);
		expect(mockTimingPoint.beatLength).toBe(307.692307692308);
		expect(mockTimingPoint.meter).toBe(4);
		expect(mockTimingPoint.sampleSet).toBe(1);
		expect(mockTimingPoint.sampleIndex).toBe(0);
		expect(mockTimingPoint.volume).toBe(70);
		expect(mockTimingPoint.uninherited).toBe(1);
		expect(mockTimingPoint.effects).toBe(0);
		expect(mockTimingPoint.toString()).toBe(mockTimingPointRaw);
	});

	test('Hit Object', () => {
		const hitObjectTypes = {
			note: [ 0, 1, 5 ],
			slider: [ 2, 6 ],
			spinner: [ 8, 12 ]
		};

		const hitObjectSounds = {
			kat: [ 2, 6, 8, 12 ],
			don: [ 0, 4 ],
			big: [ 4, 6, 12 ]
		};

		const mockHitObjectRaw = '256,192,1,1,8,0:0:0:0:';
		const mockHitObject = HitObject.fromArray(mockHitObjectRaw.split(','));

		expect(mockHitObject.x).toBe(256);
		expect(mockHitObject.y).toBe(192);
		expect(mockHitObject.time).toBe(1);
		expect(mockHitObject.type).toBe(1);
		expect(mockHitObject.hitSound).toBe(8);
		expect(mockHitObject.extra).toBe('0:0:0:0:');
		expect(mockHitObject.toString()).toBe(mockHitObjectRaw);

		for(let i in hitObjectTypes) {
			for(let j in hitObjectTypes[i]) {
				mockHitObject.type = hitObjectTypes[i][j];

				if(i === 'note') expect(mockHitObject.isNote()).toBe(true);
				else if(i === 'slider') expect(mockHitObject.isSlider()).toBe(true);
				else if(i === 'spinner') expect(mockHitObject.isSpinner()).toBe(true);
			}
		}

		for(let i in hitObjectSounds) {
			for(let j in hitObjectSounds[i]) {
				mockHitObject.hitSound = hitObjectSounds[i][j];

				if(i === 'kat') expect(mockHitObject.isKat()).toBe(true);
				else if(i === 'don') expect(mockHitObject.isDon()).toBe(true);
				else if(i === 'big') expect(mockHitObject.isBigNote()).toBe(true);
			}
		}
	});

	describe('Beatmap', () => {
		let mockBeatmapPath = path.join(__dirname, './beatmap.test.osu');
		let mockBeatmap;

		let templateBeatmapPath = path.join(__dirname, './beatmap.template.osu');
		let templateBeatmapRawString;

		let totalTimingPoint;
		let firstTimingPoint;
		let lastTimingPoint;

		let totalHitObject;
		let firstHitObject;
		let lastHitObject;

		beforeAll(() => {
			templateBeatmapRawString = fs.readFileSync(templateBeatmapPath).toString();
		});

		beforeEach(() => {
			fs.writeFileSync(mockBeatmapPath, templateBeatmapRawString);

			mockBeatmap = new Beatmap(mockBeatmapPath);

			totalTimingPoint = mockBeatmap.timingPoints.length;
			firstTimingPoint = mockBeatmap.timingPoints[0];
			lastTimingPoint = mockBeatmap.timingPoints.slice(-1)[0];

			totalHitObject = mockBeatmap.hitObjects.length;
			firstHitObject = mockBeatmap.hitObjects[0];
			lastHitObject = mockBeatmap.hitObjects.slice(-1)[0];
		});

		afterAll(() => {
			fs.rmSync(mockBeatmapPath);
		});

		test('Parse', () => {
			expect(mockBeatmap.path).toBe(mockBeatmapPath);
			expect(mockBeatmap.rawString).toBe(templateBeatmapRawString);

			expect(mockBeatmap.timingPoints.length).toBeGreaterThan(0);
			expect(mockBeatmap.timingPointStartIndex).toBeGreaterThan(0);
			expect(mockBeatmap.timingPointEndIndex).toBeGreaterThan(0);

			expect(mockBeatmap.hitObjects.length).toBeGreaterThan(0);
			expect(mockBeatmap.hitObjectStartIndex).toBeGreaterThan(0);
			expect(mockBeatmap.hitObjectEndIndex).toBeGreaterThan(0);

			expect(mockBeatmap.timingPointStartIndex < mockBeatmap.timingPointEndIndex).toBe(true);
			expect(mockBeatmap.hitObjectStartIndex < mockBeatmap.hitObjectEndIndex).toBe(true);
		});

		test('Write', () => {
			let savedRawString;

			mockBeatmap.rawString = '';
			mockBeatmap.write();

			savedRawString = fs.readFileSync(mockBeatmapPath).toString();

			expect(savedRawString).not.toBe(templateBeatmapRawString);
			expect(savedRawString).toBe(mockBeatmap.rawString);
		});

		test('Range Filtering', () => {
			range((includingStartTime, includingEndTime) => {
				const timingPoints = mockBeatmap.getTimingPointsInRange(firstTimingPoint.time, lastTimingPoint.time, includingStartTime, includingEndTime);

				if((includingStartTime === undefined && includingEndTime === undefined)
				|| (includingStartTime && includingEndTime)) expect(timingPoints.length).toBe(totalTimingPoint);
				else if(includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(totalTimingPoint - 1);
				else if(!includingStartTime && includingEndTime) expect(timingPoints.length).toBe(totalTimingPoint - 1);
				else if(!includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(totalTimingPoint - 2);
			});

			range((includingStartTime, includingEndTime) => {
				const timingPoints = mockBeatmap.getTimingPointsOutRange(firstTimingPoint.time, lastTimingPoint.time, includingStartTime, includingEndTime);

				if((includingStartTime === undefined && includingEndTime === undefined)
				|| (includingStartTime && includingEndTime)) expect(timingPoints.length).toBe(0);
				else if(includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(1);
				else if(!includingStartTime && includingEndTime) expect(timingPoints.length).toBe(1);
				else if(!includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(2);
			});

			range((includingStartTime, includingEndTime) => {
				const hitObjects = mockBeatmap.getHitObjectsInRange(firstHitObject.time, lastHitObject.time, includingStartTime, includingEndTime);

				if((includingStartTime === undefined && includingEndTime === undefined)
				|| (includingStartTime && includingEndTime)) expect(hitObjects.length).toBe(totalHitObject);
				else if(includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(totalHitObject - 1);
				else if(!includingStartTime && includingEndTime) expect(hitObjects.length).toBe(totalHitObject - 1);
				else if(!includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(totalHitObject - 2);
			});

			range((includingStartTime, includingEndTime) => {
				const hitObjects = mockBeatmap.getHitObjectsOutRange(firstHitObject.time, lastHitObject.time, includingStartTime, includingEndTime);

				if((includingStartTime === undefined && includingEndTime === undefined)
				|| (includingStartTime && includingEndTime)) expect(hitObjects.length).toBe(0);
				else if(includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(1);
				else if(!includingStartTime && includingEndTime) expect(hitObjects.length).toBe(1);
				else if(!includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(2);
			});
		});

		test('Add Single Timing Point', () => {
			const newTimingPoint = new TimingPoint(lastTimingPoint.time + 1);

			mockBeatmap.appendTimingPoint(newTimingPoint);

			expect(mockBeatmap.timingPoints.length).toBe(totalTimingPoint + 1);
			expect(mockBeatmap.timingPoints.slice(-1)[0].toString()).toBe(newTimingPoint.toString());
		});

		test('Add Multiple Timing Point', () => {
			const newTimingPoints = Array.from({ length: 5 }, (v, i) => new TimingPoint(lastTimingPoint.time + i));

			mockBeatmap.appendTimingPoints(newTimingPoints);

			expect(mockBeatmap.timingPoints.length).toBe(totalTimingPoint + 5);
		});

		test('Replace Timing Point Section', () => {
			const newTimingPoints = Array.from({ length: 5 }, (v, i) => new TimingPoint(i + 1));

			mockBeatmap.replaceTimingPoints(newTimingPoints);

			expect(mockBeatmap.timingPoints.length).toBe(5);
		});
	});
	
	describe('Beatmap Manipulater', () => {
		const basePath = path.join(__dirname, '..');
		const backupPath = path.join(basePath, 'Backup');

		let mockBeatmapPath = path.join(__dirname, './beatmap.test.osu');
		let mockBeatmap;
		let mockBeatmapManipulater;

		let templateBeatmapPath = path.join(__dirname, './beatmap.template.osu');
		let templateBeatmapRawString;

		beforeAll(() => {
			templateBeatmapRawString = fs.readFileSync(templateBeatmapPath).toString();
		});

		beforeEach(() => {
			fs.writeFileSync(mockBeatmapPath, templateBeatmapRawString);

			mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
			mockBeatmap = mockBeatmapManipulater.beatmap;
		});

		afterAll(() => {
			fs.rmdirSync(backupPath, { recursive: true });

			fs.rmSync(mockBeatmapPath);
		});

		test('Allocate Backup Path', () => {
			const mkdirSync = jest.spyOn(fs, 'mkdirSync');

			expect(BeatmapManipulater.getBackupPath()).toBe(backupPath);
			expect(BeatmapManipulater.getBackupPath('Test #1')).toBe(path.join(backupPath, 'Test #1'));
			expect(BeatmapManipulater.getBackupPath('Test #1')).toBe(path.join(backupPath, 'Test #1'));
			expect(BeatmapManipulater.getBackupPath('Test #2')).toBe(path.join(backupPath, 'Test #2'));
			expect(mkdirSync).toHaveBeenCalledTimes(3);
		});

		test('Backup', () => {
			const testPath = path.join(backupPath, path.parse(mockBeatmapPath).name);

			mockBeatmapManipulater.backup();

			expect(fs.existsSync(backupPath)).toBe(true);
			expect(fs.existsSync(testPath)).toBe(true);

			const backupFiles = fs.readdirSync(testPath);

			expect(backupFiles.length).toBe(1);

			const backupFilePath = path.join(testPath, backupFiles.pop());

			expect(fs.existsSync(backupFilePath)).toBe(true);
			expect(fs.readFileSync(backupFilePath).toString()).toBe(mockBeatmap.rawString);
		});

		test('Get Time Interpolated & Mapped Value', () => {
			for(let i = 0; i <= 100; i++) {
				expect(BeatmapManipulater.getTimeInterpolatedValue(i, 0, 100, 1, 2)).toBe(1 + i / 100);
				expect(BeatmapManipulater.getTimeInterpolatedValue(i, 0, 100, 1, 2, false)).toBe(1 + i / 100);
				expect(BeatmapManipulater.getTimeInterpolatedValue(i, 0, 100, 1, 2, true)).toBe(1 + Math.pow(i / 100, 3));
			}
		});

		test('Next & Previous Navigating', () => {
			let i;

			for(i = 0; i < mockBeatmap.timingPoints.length; i++) {
				const timingPoint = mockBeatmap.timingPoints[i];

				const prevTimingPoint = mockBeatmap.timingPoints[i - 1];
				const nextTimingPoint = mockBeatmap.timingPoints[i + 1];

				expect(mockBeatmapManipulater.findPreviousTimingPoint(timingPoint.time)).toBe(prevTimingPoint === undefined ? null : prevTimingPoint);
				expect(mockBeatmapManipulater.findNextTimingPoint(timingPoint.time)).toBe(nextTimingPoint === undefined ? null : nextTimingPoint);
			}

			for(i = 0; i < mockBeatmap.hitObjects.length; i++) {
				const hitObject = mockBeatmap.hitObjects[i];

				const prevHitObject = mockBeatmap.hitObjects[i - 1];
				const nextHitObject = mockBeatmap.hitObjects[i + 1];

				expect(mockBeatmapManipulater.findPreviousHitObject(hitObject.time)).toBe(prevHitObject === undefined ? null : prevHitObject);
				expect(mockBeatmapManipulater.findNextHitObject(hitObject.time)).toBe(nextHitObject === undefined ? null : nextHitObject);
			}

			for(i = 0; i < mockBeatmap.timingPoints.length; i++) {
				const timingPoint = mockBeatmap.timingPoints[i];

				expect(mockBeatmapManipulater.findPreviousTimingPoint(timingPoint.time + 1, timingPoint.uninherited)).toBe(timingPoint);
				expect(mockBeatmapManipulater.findPreviousTimingPoint(timingPoint.time + 1, timingPoint.uninherited, false)).toBe(timingPoint);
				expect(mockBeatmapManipulater.findPreviousTimingPoint(timingPoint.time, timingPoint.uninherited, true)).toBe(timingPoint);
				expect(mockBeatmapManipulater.findPreviousTimingPoint(timingPoint.time, 2, true)).toBe(null);

				expect(mockBeatmapManipulater.findNextTimingPoint(timingPoint.time - 1, timingPoint.uninherited)).toBe(timingPoint);
				expect(mockBeatmapManipulater.findNextTimingPoint(timingPoint.time - 1, timingPoint.uninherited, false)).toBe(timingPoint);
				expect(mockBeatmapManipulater.findNextTimingPoint(timingPoint.time, timingPoint.uninherited, true)).toBe(timingPoint);
				expect(mockBeatmapManipulater.findNextTimingPoint(timingPoint.time, 2, true)).toBe(null);
			}
		});

		test('Get Percise Timing Data', () => {
			const firstTimingPoint = mockBeatmap.timingPoints[0];
			const firstHitObject = mockBeatmap.hitObjects[0];

			const invalidTimingData = mockBeatmapManipulater.getDecimalTimingData(firstTimingPoint.time - 1)
			const artificialTimingData = mockBeatmapManipulater.getDecimalTimingData(firstHitObject.time + 1);

			expect(invalidTimingData).toBeNaN();
			expect(artificialTimingData).not.toBeNaN();
			expect(artificialTimingData.snap).toBe(16);
			expect(artificialTimingData.time).toBeTruthy();
			expect(artificialTimingData.beatLength.toNumber()).toBe(firstTimingPoint.beatLength);

			for(let i in mockBeatmap.hitObjects) {
				const hitObject = mockBeatmap.hitObjects[i];

				const timingData = mockBeatmapManipulater.getDecimalTimingData(hitObject.time);

				expect(timingData.snap === 12 || timingData.snap === 16).toBe(true);
				expect(timingData.time.floor().toNumber()).toBe(hitObject.time);
				expect(timingData.beatLength.toNumber()).toBe(firstTimingPoint.beatLength);
			}
		});

		test('Get Snap Based Offset Time', () => {
			let basisHitObject;
			let targetHitObject;

			for(let i in mockBeatmap.hitObjects) {
				const hitObject = mockBeatmap.hitObjects[i];

				const timingData = mockBeatmapManipulater.getDecimalTimingData(hitObject.time);

				const nextHitObjectTime = timingData.time.add(timingData.beatLength).floor().toNumber();
				const nextHitObject = mockBeatmap.getHitObjectsInRange(nextHitObjectTime, nextHitObjectTime);

				if(nextHitObject.length > 0) {
					basisHitObject = hitObject;
					targetHitObject = nextHitObject.pop();
					break;
				}
			}

			expect(mockBeatmapManipulater.getSnapBasedOffsetTime(basisHitObject.time, 1)).toBe(targetHitObject.time);
		});

		test('Get Inheritable Properties', () => {
			const timingPoints = mockBeatmap.timingPoints.slice(1);

			for(let i = 0; i < timingPoints.length; i++) {
				const timingPoint = timingPoints[i];

				const nextTimingPoint = timingPoints[i + 1];

				const hitObjects = mockBeatmap.getHitObjectsInRange(timingPoint.time, nextTimingPoint ? nextTimingPoint.time : Infinity, true, false);

				for(let j in hitObjects) {
					const hitObject = hitObjects[j];

					expect(mockBeatmapManipulater.getInheritableBeatLength(hitObject.time)).toBe(timingPoint.beatLength);
					expect(mockBeatmapManipulater.getInheritableVolume(hitObject.time)).toBe(timingPoint.volume);
				}
			}

			expect(mockBeatmapManipulater.getInheritableBeatLength(timingPoints[0].time - 1)).toBe(-100);
			expect(mockBeatmapManipulater.getInheritableVolume(timingPoints[0].time - 1)).toBe(100);
		});

		test('Overwrite', () => {
			const startTime = mockBeatmap.hitObjects[0].time;
			const endTime = mockBeatmap.hitObjects.slice(-1)[0].time;

			matrix((p) => {
				fs.writeFileSync(mockBeatmapPath, templateBeatmapRawString);

				mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
				mockBeatmap = mockBeatmapManipulater.beatmap;

				mockBeatmapManipulater.overwrite(startTime, endTime, p);

				// TODO. Reduce complexity of overwrite function
			});
		});

		test('Overwrite (Dense)', () => {
			const startTime = mockBeatmap.hitObjects[0].time;
			const endTime = mockBeatmap.hitObjects[1].time;

			matrix((p) => {
				fs.writeFileSync(mockBeatmapPath, templateBeatmapRawString);

				mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
				mockBeatmap = mockBeatmapManipulater.beatmap;

				p.isDense = true;

				mockBeatmapManipulater.overwrite(startTime, endTime, p);

				// TODO. Reduce complexity of overwrite function
			});
		});

		test('Overwrite (Dense 1/8 Snap)', () => {
			const startTime = mockBeatmap.hitObjects[0].time;
			const endTime = mockBeatmap.hitObjects[1].time;
			const options = {
				startVelocity: 1.0,
				startVolume: 100,
				endVelocity: 1.0,
				endVolume: 100,
				includingStartTime: true,
				includingEndTime: true,
				isDense: true,
				denseSnap: 8,
				isOffset: false,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			};
			const expectedTimingPointTimes = [];

			for(let i = startTime; i <= endTime; i = mockBeatmapManipulater.getSnapBasedOffsetTime(i, 8)) {
				expectedTimingPointTimes.push(i);
			}

			mockBeatmapManipulater.overwrite(startTime, endTime, options);

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const addedTimingPoints = modifiedBeatmap.getTimingPointsInRange(startTime, endTime);

			expect(addedTimingPoints.map(timingPoint => timingPoint.time)).toEqual(expectedTimingPointTimes);
		});

		test('Overwrite Adds Barline Timing Points', () => {
			const startTime = mockBeatmap.timingPoints[0].time;
			const endTime = mockBeatmap.timingPoints.slice(-1)[0].time;
			const options = {
				startVelocity: 1.0,
				startVolume: 100,
				endVelocity: 1.0,
				endVolume: 100,
				includingStartTime: true,
				includingEndTime: true,
				isDense: false,
				isOffset: false,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			};
			const barlineTimes = mockBeatmapManipulater.getBarlineTimesInRange(startTime, endTime);

			expect(barlineTimes).toEqual([ 565, 1608, 2651, 3695 ]);

			mockBeatmapManipulater.overwrite(startTime, endTime, options);

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const inheritedTimingPointTimes = modifiedBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 0)
				.map(timingPoint => timingPoint.time);

			barlineTimes.forEach(time => expect(inheritedTimingPointTimes).toContain(time));
			expect(inheritedTimingPointTimes.filter(time => time === 1608).length).toBe(1);
		});

		test('Overwrite Inherits Effects From Start Time', () => {
			const startTime = mockBeatmap.timingPoints[0].time;
			const endTime = mockBeatmap.hitObjects[4].time;

			mockBeatmap.timingPoints[0].effects = 1;
			mockBeatmap.replaceTimingPoints(mockBeatmap.timingPoints);
			mockBeatmap.write();

			mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
			const targetTimes = mockBeatmapManipulater.getOverwriteTargetsInRange(startTime, endTime, {
				includingStartTime: true,
				includingEndTime: false,
				isOffset: false,
				isOffsetPrecise: false
			}).map(target => target.time);

			mockBeatmapManipulater.overwrite(startTime, endTime, {
				startVelocity: 1.0,
				startVolume: 100,
				endVelocity: 1.0,
				endVolume: 100,
				includingStartTime: true,
				includingEndTime: false,
				isDense: false,
				isOffset: false,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			});

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const inheritedTimingPoints = modifiedBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 0 && targetTimes.includes(timingPoint.time));

			expect(inheritedTimingPoints.length).toBeGreaterThan(0);
			inheritedTimingPoints.forEach(timingPoint => expect(timingPoint.effects).toBe(1));
		});

		test('Overwrite Replaces Inherited Timing Points Within One Millisecond', () => {
			const startTime = mockBeatmap.hitObjects[0].time;
			const endTime = mockBeatmap.hitObjects[1].time;
			const existingTimingPoint = new TimingPoint(startTime + 1, -50, 4, 2, 0, 75, 0, 0);

			mockBeatmap.replaceTimingPoints(mockBeatmap.timingPoints.concat([ existingTimingPoint ]).sort((a, b) => a.time - b.time));

			mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
			mockBeatmapManipulater.overwrite(startTime, endTime, {
				startVelocity: 1.0,
				startVolume: 100,
				endVelocity: 1.0,
				endVolume: 100,
				includingStartTime: true,
				includingEndTime: false,
				isDense: false,
				isOffset: false,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			});

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const inheritedTimingPointTimes = modifiedBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 0)
				.map(timingPoint => timingPoint.time);

			expect(inheritedTimingPointTimes).toContain(startTime);
			expect(inheritedTimingPointTimes).not.toContain(startTime + 1);
		});

		test('Overwrite Offsets Barline Timing Points', () => {
			const startTime = mockBeatmap.timingPoints[0].time;
			const endTime = mockBeatmap.hitObjects[4].time;
			const expectedOffsetTime = mockBeatmapManipulater.getSnapBasedOffsetTime(startTime, -16);

			mockBeatmapManipulater.overwrite(startTime, endTime, {
				startVelocity: 1.0,
				startVolume: 100,
				endVelocity: 1.0,
				endVolume: 100,
				includingStartTime: true,
				includingEndTime: false,
				isDense: false,
				isOffset: true,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			});

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const inheritedTimingPointTimes = modifiedBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 0)
				.map(timingPoint => timingPoint.time);

			expect(inheritedTimingPointTimes).toContain(expectedOffsetTime);
			expect(inheritedTimingPointTimes).not.toContain(startTime);
		});

		test('Modify', () => {
			const startTime = mockBeatmap.timingPoints[1].time;
			const endTime = mockBeatmap.timingPoints.slice(-1)[0].time;

			matrix((p) => {
				fs.writeFileSync(mockBeatmapPath, templateBeatmapRawString);

				mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
				mockBeatmap = mockBeatmapManipulater.beatmap;

				mockBeatmapManipulater.modify(startTime, endTime, p);

				// TODO. Do the comparison
			});
		});

		test('Modify Inherited Timing Points Only', () => {
			const startTime = mockBeatmap.timingPoints[0].time;
			const endTime = mockBeatmap.timingPoints.slice(-1)[0].time;
			const uninheritedTimingPoints = mockBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 1)
				.map(timingPoint => timingPoint.toString());

			mockBeatmapManipulater.modify(startTime, endTime, {
				startVelocity: 2.0,
				startVolume: 25,
				endVelocity: 2.0,
				endVolume: 25,
				includingStartTime: true,
				includingEndTime: true,
				isOffset: false,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			});

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const modifiedUninheritedTimingPoints = modifiedBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 1)
				.map(timingPoint => timingPoint.toString());

			expect(modifiedUninheritedTimingPoints).toEqual(uninheritedTimingPoints);
		});

		test('Modify Preserves Inherited Timing Point Effects', () => {
			const startTime = mockBeatmap.timingPoints[1].time;
			const endTime = mockBeatmap.timingPoints[2].time;

			mockBeatmap.timingPoints[1].effects = 1;
			mockBeatmap.replaceTimingPoints(mockBeatmap.timingPoints);
			mockBeatmap.write();

			mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
			mockBeatmapManipulater.modify(startTime, endTime, {
				startVelocity: 2.0,
				startVolume: 25,
				endVelocity: 2.0,
				endVolume: 25,
				includingStartTime: true,
				includingEndTime: false,
				isOffset: false,
				isOffsetPrecise: false,
				isExponential: false,
				isIgnoreVelocity: false,
				isIgnoreVolume: false,
				isBackup: false
			});

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);
			const modifiedTimingPoint = modifiedBeatmap.timingPoints.find(timingPoint => timingPoint.time === startTime);

			expect(modifiedTimingPoint.effects).toBe(1);
		});

		test('Remove', () => {
			const startTime = mockBeatmap.timingPoints[1].time;
			const endTime = mockBeatmap.timingPoints.slice(-1)[0].time;

			matrix((p) => {
				fs.writeFileSync(mockBeatmapPath, templateBeatmapRawString);

				mockBeatmapManipulater = new BeatmapManipulater(mockBeatmapPath);
				mockBeatmap = mockBeatmapManipulater.beatmap;

				mockBeatmapManipulater.remove(startTime, endTime, p);

				// TODO. Do the comparison
			});
		});

		test('Remove Inherited Timing Points Only', () => {
			const startTime = mockBeatmap.timingPoints[0].time;
			const endTime = mockBeatmap.timingPoints.slice(-1)[0].time;
			const uninheritedTimingPoints = mockBeatmap.timingPoints
				.filter(timingPoint => timingPoint.uninherited === 1)
				.map(timingPoint => timingPoint.toString());

			mockBeatmapManipulater.remove(startTime, endTime, {
				includingStartTime: true,
				includingEndTime: true,
				isOffset: false,
				isOffsetPrecise: false,
				isBackup: false
			});

			const modifiedBeatmap = new Beatmap(mockBeatmapPath);

			expect(modifiedBeatmap.timingPoints.map(timingPoint => timingPoint.toString())).toEqual(uninheritedTimingPoints);
		});
	});
});

function range(cb) {
	const cases = [
		{  },
		{ includingStartTime: true, includingEndTime: true },
		{ includingStartTime: true, includingEndTime: false },
		{ includingStartTime: false, includingEndTime: true },
		{ includingStartTime: false, includingEndTime: false }
	];

	for(let i in cases) {
		cb(cases[i].includingStartTime, cases[i].includingEndTime);
	}
}

function matrix(cb) {
	const cases = {
		startVelocity: [ 1.0, 2.0 ],
		startVolume: [ 100, 5 ],
		endVelocity: [ 2.0, 1.0 ],
		endVolume: [ 5, 100 ],
		includingStartTime: [ true, false ],
		includingEndTime: [ true, false ],
		isOffset: [ false, true ],
		isOffsetPrecise: [ false, true ],
		isExponential: [ false, true ],
		isIgnoreVelocity: [ false, true ],
		isIgnoreVolume: [ false, true ],
		isBackup: [ false, true ]
	};

	const caseKeys = Object.keys(cases);
	const caseLength = caseKeys.length;

	const reducer = (index) => (acc, key) => {
		acc[key] = cases[key][index];

		return acc;
	};

	for(let i = 0; i < caseLength; i++) {
		const parameter = caseKeys.reduce(reducer(0), {});

		if(i === 0) {
			cb(parameter);
		}

		for(let j = 0; j < caseLength; j++) {
			if(i === j)
				continue;

			parameter[caseKeys[j]] = cases[caseKeys[j]][1];

			cb(parameter);
		}

		if(i === caseLength - 1) {
			cb(caseKeys.reduce(reducer(1), {}));
		}
	}
}
