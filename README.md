node-cue-sdk
========
***
### Node.js Corsair Cue SDK wrapper
`node-cue-sdk` is a Node.js addon for loading and and using the Cue SDK in
pure JavaScript.

Node.js has to be run with the command line flags ```--harmony_destructuring --harmony_default_parameters```

Example with synchonous functions
-------

``` js
var CueSDK = require('node-cue-sdk')

var cue = new CueSDK('/path/to/cuesdk.dll');

cue.setl('W', 255, 255, 255); // Set the W key to #FFFFFF aka white

// You can set multiple colors at the time!
cue.set([
    ['A', 255, 0, 0],
    ['S', 0 , 255, 0],
    ['D', 0, 0, 255]
]); // Set A to red, S to green, and D to blue

// Special keys/lights are also supported!
cue.set('Logo', 255, 255, 0); // Make the Corsair logo yellow

// To turn off all leds
cue.clear();

```
***
Example with asynchonous functions
-------

``` js
var CueSDK = require('node-cue-sdk')

var cue = new CueSDK('/path/to/cuesdk.dll');

// The CueSDK.set function can also work asynchonously, just add a function to the arguments and it'll be asynchonous
cue.set('A', 255, 255, 0, function() { // This is the function which get called after completion
    console.log('Lights set!')
});

cue.set([
    ['A', 255, 0, 0],
    ['S', 0 , 255, 0],
    ['D', 0, 0, 255]
], function() { // This is the function which get called after completion
    console.log('Three lights set!')
}); // Set A to red, S to green, and D to blue

```
Requirements
------------

 * Windows (Linux and Mac OSX are currently not supported by the CueSDK)
 * Node.js ```5.0.0``` or higher
 * The command line flags ```--harmony_destructuring --harmony_default_parameters``` for the ecmascript 6 features used

Installation
------------

Make sure you've installed all the [necessary build
tools](https://github.com/TooTallNate/node-gyp#installation),
then run this command in the source directory:

``` bash
$ npm install cue-sdk-node
```