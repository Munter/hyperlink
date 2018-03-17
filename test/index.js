/*global describe, it, console:true*/
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'));
const hyperlink = require('../lib/');
const httpception = require('httpception');
const TapRender = require('tap-render');
const sinon = require('sinon');
const pathModule = require('path');

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

    describe('with a relation that points at an asset that returns 404', function () {
        describe('when the other asset within the same origin', function () {
            it('should issue a warning', async function () {
                httpception([
                    {
                        request: 'GET https://example.com/styles.css',
                        response: {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: '@import "other.css";'
                        }
                    },
                    {
                        request: 'GET https://example.com/other.css',
                        response: 404
                    }
                ]);

                const t = new TapRender();
                sinon.spy(t, 'push');
                await hyperlink({
                    recursive: true,
                    root: 'https://example.com/',
                    inputUrls: [ 'https://example.com/styles.css' ]
                }, t);

                expect(t.close(), 'to satisfy', {fail: 1});
                expect(t.push, 'to have a call satisfying', () => {
                    t.push(null, {
                        ok: false,
                        operator: 'error',
                        name: 'Failed loading https://example.com/other.css',
                        actual: 'https://example.com/other.css: HTTP 404 Not Found',
                        at: 'https://example.com/styles.css (1:10) '
                    });
                });
            });
        });

        describe('when the other asset is at a different origin', function () {
            // This should obviously be fixed:
            it.skip('should issue a warning', async function () {
                httpception([
                    {
                        request: 'GET https://example.com/styles.css',
                        response: {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: '@import "https://somewhereelse.com/other.css";'
                        }
                    },
                    {
                        request: 'HEAD https://somewhereelse.com/other.css',
                        response: 404
                    }
                ]);

                const t = new TapRender();
                sinon.spy(t, 'push');
                await hyperlink({
                    recursive: true,
                    root: 'https://example.com/',
                    inputUrls: [ 'https://example.com/styles.css' ]
                }, t);

                expect(t.close(), 'to satisfy', {fail: 1});
                expect(t.push, 'to have a call satisfying', () => {
                    t.push(null, {
                        ok: false,
                        operator: 'error',
                        name: 'Failed loading https://somewhereelse.com/other.css',
                        actual: 'https://somewhereelse.com/other.css: HTTP 404 Not Found',
                        at: 'https://example.com/styles.css (1:10) '
                    });
                });
            });
        });
    });

    describe('with a preconnect link', function () {
        describe('pointing to a host that is up', function () {
            it('should report no errors and inform that 1 host was checked', async function () {
                const t = new TapRender();
                sinon.spy(t, 'push');
                const root = pathModule.resolve(__dirname, '..', 'testdata', 'preconnect', 'existing');
                await hyperlink({
                    root,
                    inputUrls: [ '/' ]
                }, t);

                expect(t.close(), 'to satisfy', {fail: 0, pass: 2});
                expect(t.push, 'to have a call satisfying', () => {
                    t.push({
                        name: 'Connecting to 1 hosts (checking <link rel="preconnect" href="...">'
                    });
                });
            });
        });

        describe('pointing to a host that does not have a DNS entry', function () {
            it('should issue an error', async function () {
                const t = new TapRender();
                sinon.spy(t, 'push');
                const root = pathModule.resolve(__dirname, '..', 'testdata', 'preconnect', 'nonexistent');
                await hyperlink({
                    root,
                    inputUrls: [ '/' ]
                }, t);

                expect(t.close(), 'to satisfy', {fail: 1});
                expect(t.push, 'to have a call satisfying', () => {
                    t.push(null, {
                        actual: 'DNS Missing https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/',
                        at: '' // FIXME: Include referencing asset(s)
                    });
                });
            });
        });
    });
});
