/*global describe, it, console:true*/
var expect = require('unexpected').clone().use(require('unexpected-mitm'));
var hyperlink = require('../lib/');

var originalProcessExit = process.exit;
expect.addAssertion('to call process.exit [with]', function (expect, subject, value) {
    var flags = this.flags;
    var that = this;
    return expect.promise(function (run) {
        process.exit = run(function (exitCode) {
            process.exit = originalProcessExit;
            if (flags.with || typeof value !== 'undefined') {
                that.errorMode = 'nested';
                expect(exitCode, 'to equal', value);
                that.errorMode = 'default';
            }
        });
        subject();
    });
});

var originalConsole = console;
expect.addAssertion('with mock console', function (expect, subject, value) {
process.stdout.write('mocking\n');
    console = {};
    var argumentsByMethodName = {};
    ['info', 'log', 'warn', 'error'].forEach(function (methodName) {
        argumentsByMethodName[methodName] = [];
        console[methodName] = function () {
process.stdout.write(methodName + JSON.stringify([].slice.call(arguments)) + '\n');
            argumentsByMethodName[methodName].push(arguments);
        };
    });
    return expect.promise(function () {
        return this.shift(subject, 1);
    }).then(function () {
process.stdout.write('then\n');

        console = originalConsole;
        expect(argumentsByMethodName, 'to satisfy', value);
    }).caught(function (err) {
process.stdout.write('caught\n');
        console = originalConsole;
        expect.fail(err);
process.stdout.write('reinstating\n');
    });
});

describe('hyperlink', function () {
    it('should complain about insecure content warnings', function () {
        return expect(hyperlink.bind(hyperlink, {
            recursive: false,
            root: 'https://example.com/',
            inputUrls: [ 'https://example.com/' ]
        }), 'with http mocked out', [
            {
                request: 'GET https://example.com/',
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8'
                    },
                    body: '<html><head><script src="http://example.com/insecureScript.js"></script></head><body></body></html>'
                }
            },
            {
                request: 'GET http://example.com/insecureScript.js',
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/javascript'
                    },
                    body: 'alert("hello, insecure world");'
                }
            }
        ], 'with mock console', {
            log: [ 'vqewvqwe']
        }, 'to call process.exit with', 0);
    });
});
