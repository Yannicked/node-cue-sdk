var request = require('request');
var fs = require('fs');
var unzip = require('unzip')
var rimraf = require('rimraf');

var uri = 'http://softwaredownloads.corsair.com/Files/Gaming-Keyboards/Corsair-SDK-Release-v1.10.73.zip';
fs.mkdirSync(__dirname+'/tmp/')
var s = request(uri).pipe(unzip.Extract({ path: __dirname+'/tmp/' }));
s.on('finish', function () {
	fs.renameSync(__dirname+'/tmp/CUESDK/bin/', __dirname+'/bin/')
	fs.renameSync(__dirname+'/bin/x64/CUESDK.x64_2013.dll', __dirname+'/bin/x64/CUESDK_2013.dll')
	rimraf(__dirname+'/tmp/', function(){});
});
