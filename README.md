Twitch Starcraft Streamer
=========================================================

# Running Tests
A test directory has been included in the project that uses Mocha, with the Chai expectation syntax, to run a battery of units tests against the main JavaScript 
application files. Simply browse to [www.sipple.io/twitch-streamer/test](www.sipple.io/twitch-streamer/test) to spin
it up.

Alternatively, tests can be run from the command line by installing Mocha CLI through NPM:

```
npm install -g mocha 
```

From there, use the "mocha" command and point to the test/ directory.

```
mocha test/
```
