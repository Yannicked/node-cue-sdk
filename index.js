"use strict";

//node --harmony_destructuring --harmony_default_parameters

var ffi = require('ffi')
var ref = require('ref')
var StructType = require('ref-struct');
var Enum = require('enum');
var enums = require('./enums.js')

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

var CorsairLedPositionPtr = ref.refType(CorsairLedPosition)

var CorsairLedPositions = StructType({
	numberOfLeds: ref.types.int,
	pLedPosition: CorsairLedPositionPtr
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
	return new Error("CueError: "+enums.CorsairError.get(Math.pow(2, err)).key+err>3?' this is an error in the CueSDK wrapper, please contact the developer.':'');
}

class CueSDK {
	constructor(libLocation, clear = false) { // libLocation = Full path of DLL file, if clear is true, the current lights will be cleared
		this.CueSDKLib = ffi.Library(libLocation, {
			'CorsairSetLedsColors': ['bool', ['int', 'pointer']],
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
	set(a, ids = false) { // a = array of leds [key, r, g, b] (r, g, b should be [0..255])
		let l = [];
		if (ids) {
			for (let i = 0; i<a.length; i++) {
				l[i] = this._getLedColor(...a[i]).ref();
			}
		} else {
			for (let i = 0; i<a.length; i++) {
				var [key, r, g, b] = a[i];
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
	setIndividual(key, r, g, b, ids = false) {
		let l = this._getLedColor(ids?key:this._getLedIdForKeyName(key), r, g, b).ref();
		r = this.CueSDKLib.CorsairSetLedsColors(1, l);
		if (r) {
			return this;
		} else {
			this._error();
			return this;
		}
	}
	setAsync(a, callback) { // a = array of leds [key, r, g, b] (r, g, b should be [0..255])
		let l = [];
		if (ids) {
			for (let i = 0; i<a.length; i++) {
				l[i] = this._getLedColor(...a[i]).ref();
			}
		} else {
			for (let i = 0; i<a.length; i++) {
				var [key, r, g, b] = a[i];
				l[i] = this._getLedColor(this._getLedIdForKeyName(key), r, g, b).ref();
			}
		}
	}
	setIndividualAsync(key, r, g, b, callback) {
		let l = this._getLedColor(ids?key:this._getLedIdForKeyName(key), r, g, b).ref();
	}
	clear() {
		let l = [];
		for (let i = 1; i<=154; i++) {
			l.push([i, 0, 0, 0]);
		};
		this.set(l, true);
	}
	_getLedColor(ledId, r, g, b) {
		let keyColor = new CorsairLedColor({ledId, r, g, b});
		return keyColor
	}
	_getLedIdForKeyName(key) {
		return enums.CorsairLedId.get('CLK_'+key).value;
	}
	_error() {
		this.lastError = this.CueSDKLib.CorsairGetLastError()
		if (this.lastError != 'CE_Success' && this.lastError != 0) {
			throw new CueError(this.lastError);
		}
	}
}
module.exports = {CueSDK}
