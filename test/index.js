/*global describe, it, console:true*/
const expect = require('unexpected').clone().use(require('unexpected-sinon'));
const hyperlink = require('../lib/');
const httpception = require('httpception');
const TapRender = require('tap-render');
const sinon = require('sinon');

describe('hyperlink', function () {
    it('should complain about insecure content warnings', async function () {
        httpception([
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
                request: 'HEAD http://example.com/insecureScript.js',
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/javascript'
                    },
                    body: 'alert("hello, insecure world");'
                }
            }
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink({
            recursive: false,
            root: 'https://example.com/',
            inputUrls: [ 'https://example.com/' ]
        }, t);

        expect(t.close(), 'to satisfy', {fail: 1});
        expect(t.push, 'to have a call satisfying', () => {
            t.push(null, { name: 'URI should be secure - http://example.com/insecureScript.js' });
        });
    });
});
