/*global describe, it, console:true*/
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'));
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

    it('should unload the assets as they are being processed', async function () {
        const server = require('http').createServer(
            (req, res) => {
                res.writeHead(200, {
                    'Content-Type': 'text/css'
                });
                const id = parseInt(req.url.match(/(\d+)\.css/));
                if (id < 100) {
                    res.end(`@import "${id + 1}.css";`);
                } else {
                    res.end('body { color: maroon; }');
                }
            }
        ).listen(0);
        const serverAddress = server.address();
        const root = `http://${serverAddress.address === '::' ? 'localhost' : serverAddress.address}:${serverAddress.port}/`;

        const t = new TapRender();
        try {
            const ag = await hyperlink({
                root,
                inputUrls: [ `${root}1.css` ]
            }, t);

            expect(t.close(), 'to satisfy', {fail: 0, pass: 100});
            expect(ag.findAssets({isLoaded: false}), 'to have length', 100);
            expect(ag.findAssets({isLoaded: true}), 'to have length', 0);
        } finally {
            server.close();
        }
    });

    describe('with document fragments', function () {
        it('should not complain when a referenced fragment exists in the target HTML', async function () {
            httpception([
                {
                    request: 'GET https://example.com/',
                    response: {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'text/html; charset=UTF-8'
                        },
                        body: '<html><head></head><body><a href="foo.html#bar">Link</a></body></html>'
                    }
                },
                {
                    request: 'GET https://example.com/foo.html',
                    response: {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'text/html; charset=UTF-8'
                        },
                        body: '<html><head></head><body><a id="bar">Welcome!</a></body></html>'
                    }
                }
            ]);

            const t = new TapRender();
            sinon.spy(t, 'push');
            await hyperlink({
                recursive: true,
                root: 'https://example.com/',
                inputUrls: [ 'https://example.com/' ]
            }, t);

            expect(t.close(), 'to satisfy', {fail: 0});
            expect(t.push, 'to have a call satisfying', () => {
                t.push(null, {
                    ok: true,
                    operator: 'missing-fragment',
                    name: 'Fragment check: https://example.com/ --> foo.html#bar'
                });
            });
        });

        it('should issue a warning when a referenced fragment does not exist', async function () {
            httpception([
                {
                    request: 'GET https://example.com/',
                    response: {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'text/html; charset=UTF-8'
                        },
                        body: '<html><head></head><body><a href="foo.html#bar">Link</a></body></html>'
                    }
                },
                {
                    request: 'GET https://example.com/foo.html',
                    response: {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'text/html; charset=UTF-8'
                        },
                        body: '<html><head></head><body>No fragments here</body></html>'
                    }
                }
            ]);

            const t = new TapRender();
            sinon.spy(t, 'push');
            await hyperlink({
                recursive: true,
                root: 'https://example.com/',
                inputUrls: [ 'https://example.com/' ]
            }, t);

            expect(t.close(), 'to satisfy', {fail: 1});
            expect(t.push, 'to have a call satisfying', () => {
                t.push(null, {
                    ok: false,
                    operator: 'missing-fragment',
                    expected: 'id="bar"',
                    name: 'Fragment check: https://example.com/ --> foo.html#bar'
                });
            });
        });
    });
});
