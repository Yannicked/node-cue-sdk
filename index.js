"use strict";

var ffi = require('ffi');
var ref = require('ref');
var StructType = require('ref-struct');
var Enum = require('enum');
var enums = require(__dirname+'/lib/enums.js');
var utils = require(__dirname+'/lib/utils.js')
var path = require('path');
var ArrayType = require('ref-array');

/**
	* The id of a led on the keyboard
	* @typedef CorsairLedId
	* @type {number}
*/
var CorsairLedId = ref.types.int;
/**
	* The access mode to be reported to the SDK.
	* @typedef CorsairAccessMode
	* @type {number}
*/
var CorsairAccessMode = ref.types.int;
/**
	* A error code as reported by the SDK.
	* @typedef CorsairError
	* @type {number}
*/
var CorsairError = ref.types.int;

/**
	* A rgb color
	* @typedef color
	* @type {Array}
	* @property {number} 0 - Red intensity value 0..255
	* @property {number} 1 - Green intensity value 0..255
	* @property {number} 2 - Blue intensity value 0..255
*/

/**
	* A rgb color with CorsairLedId included
	* @typedef CorsairLedColor
	* @type {Array}
	* @property {number|string} 0 - Key id or name.
	* @property {number} 1 - Red intensity value 0..255
	* @property {number} 2 - Green intensity value 0..255
	* @property {number} 3 - Blue intensity value 0..255
*/
var CorsairLedColor = StructType({
	ledId: CorsairLedId,
	r: ref.types.int,
	g: ref.types.int,
	b: ref.types.int
});

var CorsairPhysicalLayout = ref.types.int;
var CorsairLogicalLayout = ref.types.int;

var CorsairDeviceInfo = StructType({
	type: ref.types.int,
	model: ref.types.CString,
	physicalLayout: CorsairPhysicalLayout,
	logicalLayout: CorsairLogicalLayout,
	capsMask: ref.types.int
});

var CorsairDeviceInfoPtr = ref.refType(CorsairDeviceInfo);

/**
	* @typedef CorsairLedPosition
	* @property {CorsairLedId} ledId - The id of the led.
	* @property {number} top - The key's distance from the top of the keyboard.
	* @property {number} left - The key's distance from the left of the keyboard.
	* @property {number} height - The key's height.
	* @property {number} width - The key's width.
*/

var CorsairLedPosition = StructType({
	ledId: CorsairLedId,
	top: ref.types.double,
	left: ref.types.double,
	height: ref.types.double,
	width: ref.types.double
});

var CorsairLedPositionArr = ArrayType(CorsairLedPosition);

var CorsairLedPositions = StructType({
	numberOfLeds: ref.types.int,
	pLedPosition: CorsairLedPositionArr
});

var CorsairLedPositionsPtr = ref.refType(CorsairLedPositions);

/**
	* The protocol details as reported by the SDK.
	* @typedef CorsairProtocolDetails
	* @type {Object}
	* @property {string} sdkVersion - The version number of the SDK.
	* @property {string} serverVersion - The version number of the server.
	* @property {number} sdkProtocolVersion - The protocol version number.
	* @property {number} serverProtocolVersion - The server's protocol version number.
	* @property {boolean} breakingChanges - True if this update contained breaking changes.
*/
var CorsairProtocolDetails = StructType({
	sdkVersion: ref.types.CString,
	serverVersion: ref.types.CString,
	sdkProtocolVersion: ref.types.int,
	serverProtocolVersion: ref.types.int,
	breakingChanges: ref.types.bool
});

/**
	* A error with the CUE sdk.
	* @private
*/
function CueError(err) {
    this.name = "CueError";
    this.message = enums.CorsairError.get(Math.pow(2, err)).key+((err>3&&err!=5)?' -- this might be an error in the CueSDK wrapper, please contact the developer.':'');
	let error = new Error(this.message);
	error.name = this.name;
	this.stack = error.stack.split('\n')[0]+'\n'+error.stack.split('\n').splice(3, error.stack.split('\n').length).join('\n');
}

CueError.prototype = Error.prototype;

/**
	* The main CueSDK class.
	@property {CorsairProtocolDetails} this.details - The protocol details as reported by the SDK.
	@property {CorsairError} this.lastError - The last error as reported by the SDK.
	@property {number} this.fps - The frames-per-second for fading.
	@property {string} this.fadeType - The type of fading to be used.
*/
class CueSDK {
	/**
		* Create a Cue SDK object and do a handshake with the sdk.
		* @param {boolean} [clear=false] - If true, clear the all the leds.
		* @param {boolean} [exclusive=false] - If true, enable exclusive mode.
	*/
	constructor(clear = false, exclusive = false) {
		this.CueSDKLib = ffi.Library(path.join(__dirname, 'bin', process.arch, 'CUESDK_2013.dll'), {
			'CorsairSetLedsColors': ['bool', ['int', 'pointer']],
			'CorsairSetLedsColorsAsync': ['bool', ['int', 'pointer', 'pointer', 'pointer']],
			'CorsairGetDeviceCount': ['int', []],
			'CorsairGetDeviceInfo': [CorsairDeviceInfoPtr, ['int']],
			'CorsairGetLedPositions': [CorsairLedPositionsPtr, []],
			'CorsairGetLedIdForKeyName': [CorsairLedId, ['char']],
			'CorsairRequestControl': ['bool', [CorsairAccessMode]],
			'CorsairPerformProtocolHandshake': [CorsairProtocolDetails, []],
			'CorsairGetLastError': [CorsairError, []]
		});

		this.details = this.CueSDKLib.CorsairPerformProtocolHandshake().toObject();
		this.lastError = 0;
		this._error();

		// Request exclusive access to keyboard LEDs
		if(exclusive) this.CueSDKLib.CorsairRequestControl(enums.CorsairAccessMode.CAM_ExclusiveLightingControl);

		this.fps = 30;
		this.fade_helper = new utils.fade();
		this.fadeType = 'Wheel';

		if (clear) {
			this.clear();
		}

		return this;
	}

	/**
		* This callback runs after the leds have been set asynchronously.
		*
		* @callback setCallback
	*/

	/**
		* Set the led colors.
		* @param {(CorsairLedColor[]|...number|...string)} led - The key id with rgb values as an array.
		* @param {setCallback} [callback] - The callback ran after completing the asynchonous request.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	set() {
		if (arguments[0] instanceof Array) {
			if (typeof(arguments[1]) === 'function') {
				return this.setAsync(...arguments);
			} else {
				return this.setSync(...arguments);
			}
		} else {
			if (typeof(arguments[4]) === 'function') {
				return this.setIndividualAsync(...arguments);
			} else {
				return this.setIndividualSync(...arguments);
			}
		}
	}
	/**
		* Set multiple led colors synchronously.
		* @param {CorsairLedColor[]} a - The key ids or names with rgb values as an array.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	setSync(a, ids = false) {
		let l = [];
		if (ids) {
			for (let i = 0; i<a.length; i++) {
				l[i] = this._getLedColor(...a[i]).ref();
			}
		} else {
			for (let i = 0; i<a.length; i++) {
				let [key, r, g, b] = a[i];
				l[i] = this._getLedColor(this._getLedIdForKeyName(key), r, g, b).ref();
			}
		}
		let r = this.CueSDKLib.CorsairSetLedsColors(l.length, Buffer.concat(l));
		if (r) {
			return this;
		} else {
			this._error();
			return this;
		}
	}
	/**
		* Set an individual led colors synchronously.
		* @param {(number|string)} key - The key id or name.
		* @param {number} r - Red intensity value 0..255
		* @param {number} g - Green intensity value 0..255
		* @param {number} b - Blue intensity value 0..255
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	setIndividualSync(key, r, g, b, ids = false) {
		let l = this._getLedColor(ids?key:this._getLedIdForKeyName(key), r, g, b).ref();
		let re = this.CueSDKLib.CorsairSetLedsColors(1, l);
		if (re) {
			return this;
		} else {
			this._error();
			return this;
		}
	}
	/**
		* Set multiple led colors synchronously.
		* @param {CorsairLedColor[]} a - The key id with rgb values as an array.
		* @param {setCallback} callback - The callback ran after completing the asynchonous request.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	setAsync(a, callback, ids = false) {
		let l = [];
		if (ids) {
			for (let i = 0; i<a.length; i++) {
				l[i] = this._getLedColor(...a[i]).ref();
			}
		} else {
			for (let i = 0; i<a.length; i++) {
				let [key, r, g, b] = a[i];
				l[i] = this._getLedColor(this._getLedIdForKeyName(key), r, g, b).ref();
			}
		}
		let asyncFunc = ffi.Callback('void', ['pointer', 'bool', CorsairError], (context, succes, error) => {
			if (succes) {
				callback();
			} else {
				this._error();
			}
		});
		let re = this.CueSDKLib.CorsairSetLedsColorsAsync(l.length, Buffer.concat(l), asyncFunc, ref.NULL);
		if (re) {
			return asyncFunc;
		} else {
			this._error();
			return asyncFunc;
		}
	}
	/**
		* Set an individual led colors synchronously.
		* @param {(number|string)} key - The key id or name.
		* @param {number} r - Red intensity value 0..255
		* @param {number} g - Green intensity value 0..255
		* @param {number} b - Blue intensity value 0..255
		* @param {setCallback} callback - The callback ran after completing the asynchonous request.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	setIndividualAsync(key, r, g, b, callback, ids = false) {
		let l = this._getLedColor(ids?key:this._getLedIdForKeyName(key), r, g, b).ref();
		let asyncFunc = ffi.Callback('void', ['pointer', 'bool', CorsairError], (context, succes, error) => {
			if (succes) {
				callback();
			} else {
				this._error();
			}
		});
		let re = this.CueSDKLib.CorsairSetLedsColorsAsync(1, l, asyncFunc, ref.NULL);
		if (re) {
			return asyncFunc;
		} else {
			this._error();
			return asyncFunc;
		}
	}
	/**
		* This callback runs after the leds have been faded asynchronously.
		*
		* @callback fadeCallback
	*/

	/**
		* Fade multiple or individual leds.
		* @param {(number|number[])} k - Key or arrray of keys to be faded.
		* @param {color} f - The starting color.
		* @param {color} t - The color to fade to.
		* @param {number} l - Time to fade in miliseconds
		* @param {fadeCallback} cb - The callback ran after completing the asynchonous request.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	fade() {
		if (arguments[0] instanceof Array) {
			return this.fadeAsync(...arguments);
		} else {
			return this.fadeIndividualAsync(...arguments);
		}
	}
	/**
		* Fade multiple or individual leds.
		* @param {number[]} k - Key or arrray of keys to be faded.
		* @param {color} f - The starting color.
		* @param {color} t - The color to fade to.
		* @param {number} l - Time to fade in miliseconds
		* @param {fadeCallback} cb - The callback ran after completing the asynchonous request.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	fadeAsync(k, f, t, l, cb = () => {}, ids = false) {
		this.fade_helper[this.fadeType](f, t, l, this.fps, (r, g, b) => {
			let a = [];
			for (let i = 0; i<k.length; i++) {
				a.push([k[i], r, g, b]);
			}
			this.setAsync(a, cb, ids);
		});
	}
	/**
		* Fade multiple or individual leds.
		* @param {number} k - Key or arrray of keys to be faded.
		* @param {color} f - The starting color.
		* @param {color} t - The color to fade to.
		* @param {number} l - Time to fade in miliseconds
		* @param {fadeCallback} cb - The callback ran after completing the asynchonous request.
		* @param {boolean} [ids=false] - If true, use the key ids as-is.
	*/
	fadeIndividualAsync(k, f, t, l, cb = () => {}, ids = false) { // k = array of leds, f = from color, t = to color [r, g, b], l = time in ms
		this.fade_helper[this.fadeType](f, t, l, this.fps, (r, g, b) => {
			this.setIndividualAsync(k, r, g, b, (r == t[0] && g == t[1] && b == t[2])?cb:(() => {}), ids);
		});
	}
	/**
		* Set all leds to black.
	*/
	clear() {
		let l = [];
		for (let i = 1; i<=154; i++) {
			l.push([i, 0, 0, 0]);
		}
		this.set(l, true);
	}
	/**
		* Get the leds as reported by the CueSDK
		* @return {CorsairLedPosition[]} l - An array containing the led's positions as reported by the sdk.
	*/
	getLeds() {
		let p = this.CueSDKLib.CorsairGetLedPositions().deref();
		let l = p['pLedPosition'];
		l.length = p['numberOfLeds'];
		return l;
	}
	/**
		* Close the connection with the SDK and release all keys.
	*/
	close() {
		this.CueSDKLib._dl.close();
		this.CueSDKLib = {};
	}
	/**
		* Create a CorsairLedColor.
		* @private
	*/
	_getLedColor(ledId, r, g, b) {
		let keyColor = new CorsairLedColor({ledId, r, g, b});
		return keyColor;
	}
	/**
		* Try to get a ledId for a key's name.
		* @private
	*/
	_getLedIdForKeyName(key) {
		return enums.CorsairLedId.get('CLK_'+key).value;
	}
	/**
		* Check if the SDK returned a error.
		* @private
	*/
	_error() {
		this.lastError = this.CueSDKLib.CorsairGetLastError();
		if (this.lastError != 'CE_Success' && this.lastError != 0) {
			throw new CueError(this.lastError);
		}
	}
}
module.exports = {CueSDK};
