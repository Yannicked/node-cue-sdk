"use strict";

//node --harmony_destructuring --harmony_default_parameters

var ffi = require('ffi');
var ref = require('ref');
var StructType = require('ref-struct');
var Enum = require('enum');
var enums = require(__dirname+'/lib/enums.js');
var path = require('path');
var ArrayType = require('ref-array');

var CorsairLedId = ref.types.int;
var CorsairAccessMode = ref.types.int;
var CorsairError = ref.types.int;

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

var CorsairProtocolDetails = StructType({
	sdkVersion: ref.types.CString,
	serverVersion: ref.types.CString,
	sdkProtocolVersion: ref.types.int,
	serverProtocolVersion: ref.types.int,
	breakingChanges: ref.types.bool
});

function CueError(err) {
    this.name = "CueError";
    this.message = enums.CorsairError.get(Math.pow(2, err)).key+((err>3&&err!=5)?' -- this might be an error in the CueSDK wrapper, please contact the developer.':'');
	var error = new Error(this.message);
	error.name = this.name;
	this.stack = error.stack.split('\n')[0]+'\n'+error.stack.split('\n').splice(3, error.stack.split('\n').length).join('\n');
}

CueError.prototype = Error.prototype;

class CueSDK {
	constructor(clear = false) { // libLocation = Full path of DLL file, if clear is true, the current lights will be cleared
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
		
		if (clear) {
			this.clear();
		}
		
		return this;
	}
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
	setSync(a, ids = false) { // a = array of leds [key, r, g, b] (r, g, b should be [0..255])
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
	setAsync(a, callback, ids = false) { // a = array of leds [key, r, g, b] (r, g, b should be [0..255])
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
		let asyncFunc = ffi.Callback('void', ['pointer', 'bool', CorsairError], function(context, succes, error) {
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
	setIndividualAsync(key, r, g, b, callback, ids = false) {
		let l = this._getLedColor(ids?key:this._getLedIdForKeyName(key), r, g, b).ref();
		let asyncFunc = ffi.Callback('void', ['pointer', 'bool', CorsairError], function(context, succes, error) {
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
	clear() {
		let l = [];
		for (let i = 1; i<=154; i++) {
			l.push([i, 0, 0, 0]);
		}
		this.set(l, true);
	}
	getLeds() {
		let p = this.CueSDKLib.CorsairGetLedPositions().deref();
		let l = p['pLedPosition'];
		l.length = p['numberOfLeds'];
		return l;
	}
	close() {
		this.CueSDKLib._dl.close();
		this.CueSDKLib = {};
	}
	_getLedColor(ledId, r, g, b) {
		let keyColor = new CorsairLedColor({ledId, r, g, b});
		return keyColor;
	}
	_getLedIdForKeyName(key) {
		return enums.CorsairLedId.get('CLK_'+key).value;
	}
	_error() {
		this.lastError = this.CueSDKLib.CorsairGetLastError();
		if (this.lastError != 'CE_Success' && this.lastError != 0) {
			throw new CueError(this.lastError);
		}
	}
}
module.exports = {CueSDK};
