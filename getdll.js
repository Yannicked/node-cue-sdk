var request = require('request');
var fs = require('fs');
var unzip = require('unzip')
var rimraf = require('rimraf');

var uri = 'http://softwaredownloads.corsair.com/Files/Gaming-Keyboards/Corsair-SDK-Release-v1.10.73.zip';

function main () {
	fs.mkdirSync(__dirname+'/tmp/')

	console.log('Downloading and Extracting CUESDK');
	
	var s = request(uri)
	s.on('response', function (response) {
		s.pipe(unzip.Extract({ path: __dirname+'/tmp/' }));
		s.on('end', function () {
			console.log('Cleaning up CUESDK');
			fs.renameSync(__dirname+'/tmp/CUESDK/bin/', __dirname+'/bin/')
			fs.renameSync(__dirname+'/bin/x64/CUESDK.x64_2013.dll', __dirname+'/bin/x64/CUESDK_2013.dll')
			rimraf(__dirname+'/tmp/',  function(){});
		});
	});
	s.on('error', function(e) {
		console.log(e);
		throw new Error('Error while downloading CUESDK')
	})
}

rimraf(__dirname+'/tmp/', function() {
	rimraf(__dirname+'/bin/', main)
});