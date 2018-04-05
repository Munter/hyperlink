/*global describe, it, console:true*/
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const hyperlink = require('../lib/');
const httpception = require('httpception');
const TapRender = require('tap-render');
const sinon = require('sinon');
const pathModule = require('path');

describe('hyperlink', function() {
  it('should complain about insecure content warnings', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body:
            '<html><head><script src="http://example.com/insecureScript.js"></script></head><body></body></html>'
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
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: false,
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'mixed-content',
        name:
          'mixed-content https://example.com/ --> http://example.com/insecureScript.js',
        at:
          'https://example.com/ (1:26) <script src="http://example.com/insecureScript.js">...</script>',
        expected:
          'https://example.com/ --> https://example.com/insecureScript.js',
        actual: 'https://example.com/ --> http://example.com/insecureScript.js'
      });
    });
  });

  it('should not follow links to unsupported protocols', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <a href="https://google.com">find something securely</a>
            <a href="http://google.com">find something insecurely</a>
            <a href="//google.com">find something in whatever way you're browsing now</a>

            <a href="mailto:recipient@hopefullynonexistingdomainname-whoreallyknows.tools">send me an email</a>
            <a href="tel:+4500000000">give me a call</a>
            <a href="fax:+4500000000">does anyone still use these?</a>
            <a href="gopher://gopher.yoyodyne.com/">this is just rediculous</a>
          `
        }
      },
      {
        request: 'HEAD https://google.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html'
          }
        }
      },
      {
        request: 'HEAD http://google.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html'
          }
        }
      }
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    // expect(t.close(), 'to satisfy', { count: 1, pass: 1, fail: 0, skip: 0, todo: 0 });
    expect(t.push, 'to have calls satisfying', () => {
      t.push({ name: 'Crawling internal assets' });
      t.push(null, {
        name: 'load https://example.com/',
        ok: true
      });
      t.push(null, {
        ok: true,
        name: 'external-check https://google.com'
      });
      t.push(null, {
        ok: true,
        name: 'external-check http://google.com'
      });
      t.push({
        name:
          'Connecting to 0 hosts (checking <link rel="preconnect" href="...">'
      });
      t.push({
        name:
          'Looking up 0 host names (checking <link rel="dns-prefetch" href="...">'
      });
    });
  });

  it('should complain if an asset loaded has an unexpected Content-Type', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head>
              <link rel="stylesheet" href="styles.css">
            </head>
            <body>
            </body>
            </html>
          `
        }
      },
      {
        request: 'GET https://example.com/styles.css',
        response: {
          headers: {
            'Content-Type': 'image/png'
          },
          body: 'div { color: maroon; }'
        }
      }
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'content-type-mismatch',
        name: 'content-type-mismatch https://example.com/styles.css',
        actual: 'Asset is used as both Css and Png',
        at:
          'https://example.com/ (5:44) <link rel="stylesheet" href="styles.css">'
      });
    });
  });

  it('should complain if an asset being HEADed has an unexpected Content-Type', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `
        }
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: {
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      }
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 2 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'content-type-mismatch',
        name: 'content-type-mismatch https://example.com/hey.png',
        actual: 'Asset is used as both Png and Text',
        at: 'https://example.com/ (6:25) <img src="hey.png">'
      });
    });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'content-type-mismatch',
        name: 'content-type-mismatch https://example.com/hey.png',
        actual: 'Asset is used as both Image and Text',
        at: 'https://example.com/ (6:25) <img src="hey.png">'
      });
    });
  });

  it('should complain if an asset being HEADed has no Content-Type', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `
        }
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: 200
      }
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'content-type-missing',
        name: 'content-type-missing https://example.com/hey.png',
        actual: 'No Content-Type response header received',
        at: 'https://example.com/ (6:25) <img src="hey.png">'
      });
    });
  });

  it('should unload the assets as they are being processed', async function() {
    const server = require('http')
      .createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/css'
        });
        const id = parseInt(req.url.match(/(\d+)\.css/));
        if (id < 100) {
          res.end(`@import "${id + 1}.css";`);
        } else {
          res.end('body { color: maroon; }');
        }
      })
      .listen(0);
    const serverAddress = server.address();
    const root = `http://${
      serverAddress.address === '::' ? 'localhost' : serverAddress.address
    }:${serverAddress.port}/`;

    const t = new TapRender();
    try {
      const ag = await hyperlink(
        {
          root,
          inputUrls: [`${root}1.css`]
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, pass: 100 });
      expect(ag.findAssets({ isLoaded: false }), 'to have length', 100);
      expect(ag.findAssets({ isLoaded: true }), 'to have length', 0);
    } finally {
      server.close();
    }
  });

  it('should not throw when populating missing files', async function() {
    const root = `file://${process.cwd()}`;
    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: true,
        root,
        inputUrls: [
          {
            url: `${root}/index.html`,
            text:
              '<!doctype html><html><body><a href="broken.html">broken</a></body></html>'
          }
        ]
      },
      t
    );

    expect(t.close(), 'to satisfy', {
      count: 2,
      pass: 1,
      fail: 1,
      skip: 0,
      todo: 0
    });
    expect(t.push, 'to have calls satisfying', () => {
      t.push({
        name: 'Crawling internal assets'
      });

      t.push(null, {
        ok: true,
        name: `load index.html`
      });

      t.push(null, {
        ok: false,
        operator: 'load',
        name: `load broken.html`,
        actual: expect.it('to begin with', 'ENOENT: no such file or directory')
      });

      t.push({
        name:
          'Connecting to 0 hosts (checking <link rel="preconnect" href="...">'
      });

      t.push({
        name:
          'Looking up 0 host names (checking <link rel="dns-prefetch" href="...">'
      });
    });
  });

  describe('on a local file system', function() {
    it('should not execute tests on outgoing relations of other pages when recursion is disabled', async function() {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: pathModule.resolve(__dirname, '..', 'testdata', 'recursive'),
          inputUrls: ['index.html']
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 8,
        pass: 8,
        fail: 0,
        skip: 0,
        todo: 0
      });
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'fragment-check',
          name:
            'fragment-check testdata/recursive/page.html --> index.html#brokenfragment'
        });
      });
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'external-check',
          name: 'external-check testdata/recursive/index.html --> hyperlink.gif'
        });
      });
    });

    it('should not execute tests on outgoing relations of other pages when recursion is enabled', async function() {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: pathModule.resolve(__dirname, '..', 'testdata', 'recursive'),
          inputUrls: ['index.html']
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 9,
        pass: 8,
        fail: 1,
        skip: 0,
        todo: 0
      });
    });
  });

  describe('with document fragments', function() {
    it('should not complain when a referenced fragment exists in the target HTML', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="foo.html#bar">Link</a></body></html>'
          }
        },
        {
          request: 'GET https://example.com/foo.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a id="bar">Welcome!</a></body></html>'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> foo.html#bar'
        });
      });
    });

    it('should issue an error when a referenced fragment does not exist', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="foo.html#bar">Link</a></body></html>'
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
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          operator: 'fragment-check',
          expected: 'id="bar"',
          name: 'fragment-check https://example.com/ --> foo.html#bar'
        });
      });
    });

    it('should not complain about an #iefix fragment in a CSS file', async function() {
      const t = new TapRender();
      sinon.spy(t, 'push');
      const root = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'fontWithIefix'
      );
      await hyperlink(
        {
          root,
          inputUrls: ['/']
        },
        t
      );
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'fragment-check'
        });
      });
    });

    it('should issue an error when referencing another asset with an empty fragment', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="foo.html#">Link</a></body></html>'
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
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> foo.html#',
          expected:
            'Fragment identifiers in links to different documents should not be empty'
        });
      });
    });

    it('should be fine when an asset references itself with an empty fragment', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body: '<html><head></head><body><a href="#">Link</a></body></html>'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'fragment-check'
        });
      });
    });
  });

  describe('with a relation that points at an asset that returns 404', function() {
    describe('when the other asset within the same origin', function() {
      it('should issue a warning', async function() {
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
        await hyperlink(
          {
            recursive: true,
            root: 'https://example.com/',
            inputUrls: ['https://example.com/styles.css']
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 1 });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            ok: false,
            operator: 'load',
            name: 'load https://example.com/other.css',
            expected: '200 https://example.com/other.css',
            actual: 'HTTP 404 Not Found',
            at: 'https://example.com/styles.css (1:10) '
          });
        });
      });
    });

    describe('when the other asset is at a different origin', function() {
      // This should obviously be fixed:
      it('should issue an error', async function() {
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
            request: 'GET https://somewhereelse.com/other.css',
            response: 404
          }
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: 'https://example.com/',
            inputUrls: ['https://example.com/styles.css']
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 1 });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            ok: false,
            operator: 'load',
            name: 'load https://somewhereelse.com/other.css',
            expected: '200 https://somewhereelse.com/other.css',
            actual: 'HTTP 404 Not Found',
            at: 'https://example.com/styles.css (1:10) '
          });
        });
      });
    });

    describe('when the missing asset is referenced from an asset at a different origin (not via an anchor or iframe)', function() {
      it('should issue an error', async function() {
        httpception([
          {
            request: 'GET https://example.com/',
            response: {
              headers: { 'Content-Type': 'text/html' },
              body:
                '<html><head><link rel="stylesheet" href="https://mycdn.com/styles.css"></head><body></body></html>'
            }
          },
          {
            request: 'GET https://mycdn.com/styles.css',
            response: {
              headers: { 'Content-Type': 'text/css' },
              body:
                '@font-face { font-family: Foo; src: url(404.eot) format("embedded-opentype"); font-weight: 400; }'
            }
          },
          {
            request: 'HEAD https://mycdn.com/404.eot',
            response: 404
          },
          {
            request: 'GET https://mycdn.com/404.eot',
            response: 404
          }
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: 'https://example.com/',
            inputUrls: ['https://example.com/']
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 1 });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            operator: 'external-check',
            name: 'external-check https://mycdn.com/404.eot',
            expected: '200 https://mycdn.com/404.eot',
            actual: 'HTTP 404 Not Found'
          });
        });
      });
    });

    describe('when an iframe at a different origin is referenced', function() {
      it('should only HEAD the iframe asset and not try to follow links from it', async function() {
        httpception([
          {
            request: 'GET https://example.com/',
            response: {
              headers: { 'Content-Type': 'text/html' },
              body:
                '<html><head><iframe src="https://mycdn.com/frame.html"></iframe></head><body></body></html>'
            }
          },
          {
            request: 'HEAD https://mycdn.com/frame.html',
            response: {
              statusCode: 200,
              headers: {
                'Content-Type': 'text/html'
              }
            }
          }
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: 'https://example.com/',
            inputUrls: ['https://example.com/']
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 0 });
      });
    });
  });

  describe('with HTTP redirects', function() {
    it('should emit an error when an HtmlAnchor points at an external page that has a permanent redirect', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="https://elsewhere.com/">Link</a></body></html>'
          }
        },
        {
          request: 'HEAD https://elsewhere.com/',
          response: {
            statusCode: 301,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget'
            }
          }
        },
        {
          request: 'HEAD https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html'
            }
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          name: 'external-redirect https://elsewhere.com/'
        });
      });
    });

    it('should not emit an error when an HtmlAnchor points at an external page that has a temporary redirect', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="https://elsewhere.com/">Link</a></body></html>'
          }
        },
        {
          request: 'HEAD https://elsewhere.com/',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget'
            }
          }
        },
        {
          request: 'HEAD https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html'
            }
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );
      expect(t.close(), 'to satisfy', {
        count: 4,
        pass: 4,
        fail: 0,
        skip: 0,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          name: 'external-redirect https://elsewhere.com/'
        });
      });
    });

    it('should emit an error when an HtmlAnchor points at an external page that has long redirect chain', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="https://elsewhere.com/">Link</a></body></html>'
          }
        },
        {
          request: 'HEAD https://elsewhere.com/',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget'
            }
          }
        },
        {
          request: 'HEAD https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/finalDestination'
            }
          }
        },
        {
          request: 'HEAD https://elsewhere.com/finalDestination',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html'
            }
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 5,
        pass: 4,
        fail: 1,
        skip: 0,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          at:
            'https://example.com/ (1:35) <a href="https://elsewhere.com/">...</a>',
          name: 'external-redirect https://elsewhere.com/',
          expected:
            '302 https://elsewhere.com/ --> 200 https://elsewhere.com/finalDestination',
          actual:
            '302 https://elsewhere.com/ --> 302 https://elsewhere.com/redirectTarget --> 200 https://elsewhere.com/finalDestination'
        });
      });
    });

    it('should emit an error when a sequence of redirects from a secure page includes an insecure url', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><script src="https://elsewhere.com/"></script></body></html>'
          }
        },
        {
          request: 'GET https://elsewhere.com/',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://elsewhere.com/redirectTarget'
            }
          }
        },
        {
          request: 'GET http://elsewhere.com/redirectTarget',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget'
            }
          }
        },
        {
          request: 'GET https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/javascript'
            },
            body: 'alert("foo");'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 2 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          operator: 'mixed-content',
          actual:
            'https://elsewhere.com/ --> http://elsewhere.com/redirectTarget',
          expected:
            'https://elsewhere.com/ --> https://elsewhere.com/redirectTarget'
        });
      });
    });
  });

  describe('with a preconnect link', function() {
    describe('pointing to a host that is up', function() {
      it('should report no errors and inform that 1 host was checked', async function() {
        const t = new TapRender();
        sinon.spy(t, 'push');
        const root = pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'preconnect',
          'existing'
        );
        await hyperlink(
          {
            root,
            inputUrls: ['index.html']
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 2,
          pass: 2,
          fail: 0,
          skip: 0,
          todo: 0
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push({
            name:
              'Connecting to 1 hosts (checking <link rel="preconnect" href="...">'
          });
        });
      });
    });

    describe('pointing to a host that does not have a DNS entry', function() {
      it('should issue an error', async function() {
        const t = new TapRender();
        sinon.spy(t, 'push');
        const root = pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'preconnect',
          'nonexistent'
        );
        await hyperlink(
          {
            root,
            inputUrls: ['index.html']
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 1 });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            actual:
              'DNS missing: thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com',
            at:
              'testdata/preconnect/nonexistent/index.html:3:34 <link rel="preconnect" href="https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">'
          });
        });
      });
    });
  });

  describe('with a dns-prefetch link', function() {
    describe('pointing to a host that is up', function() {
      it('should report no errors and inform that 1 host was checked', async function() {
        const t = new TapRender();
        sinon.spy(t, 'push');
        const root = pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'dns-prefetch',
          'existing'
        );
        await hyperlink(
          {
            root,
            inputUrls: ['index.html']
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 2,
          pass: 2,
          fail: 0,
          skip: 0,
          todo: 0
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push({
            name:
              'Looking up 1 host names (checking <link rel="dns-prefetch" href="...">'
          });
        });
      });
    });

    describe('pointing to a host that does not have a DNS entry', function() {
      it('should issue an error', async function() {
        const t = new TapRender();
        sinon.spy(t, 'push');
        const root = pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'dns-prefetch',
          'nonexistent'
        );
        await hyperlink(
          {
            root,
            inputUrls: ['index.html']
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 2,
          pass: 1,
          fail: 1,
          skip: 0,
          todo: 0
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            actual:
              'DNS missing: thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com',
            at:
              'testdata/dns-prefetch/nonexistent/index.html:3:36 <link rel="dns-prefetch" href="//thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">'
          });
        });
      });
    });
  });

  describe('with a skipFilter', function() {
    it('should not skip on non-match', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="script.js"></script></head><body></body></html>'
          }
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function(report) {
            if (report.name === 'load https://foo.com/script.js') {
              return true;
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1, skip: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          skip: undefined,
          operator: 'load',
          name: 'load https://example.com/script.js'
        });
      });
    });

    it('should skip an internal load', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="script.js"></script></head><body></body></html>'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function(report) {
            if (report.name === 'load https://example.com/script.js') {
              return true;
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, skip: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          skip: true,
          operator: 'load',
          name: 'load https://example.com/script.js'
        });
      });
    });

    it('should skip an internal load with a message', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="script.js"></script></head><body></body></html>'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function(report) {
            if (report.name === 'load https://example.com/script.js') {
              return 'Skip this one';
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, skip: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          skip: 'Skip this one',
          operator: 'load',
          name: 'load https://example.com/script.js'
        });
      });
    });

    it('should skip mixed-content warnings', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="http://example.com/insecureScript.js"></script></head><body></body></html>'
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
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: report => report.name.includes('mixed-content')
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 3,
        pass: 2,
        fail: 0,
        skip: 1,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'mixed-content',
          name:
            'mixed-content https://example.com/ --> http://example.com/insecureScript.js',
          at:
            'https://example.com/ (1:26) <script src="http://example.com/insecureScript.js">...</script>'
        });
      });
    });

    it('should skip a fragment-check', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="#missingId">Broken fragment link</a></body></html>'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function(report) {
            if (
              report.name ===
              'fragment-check https://example.com/ --> #missingId'
            ) {
              return true;
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> #missingId',
          expected: 'id="missingId"',
          at: 'https://example.com/ (1:35) <a href="#missingId">...</a>'
        });
      });
    });

    it('should skip an external-check', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head></head><body><a href="https://knownfailure.com" class="external-helper-class">url to skip</a></body></html>'
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: report => report.at.includes('external-helper-class')
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'external-check',
          name: 'external-check https://knownfailure.com',
          at:
            'https://example.com/ (1:35) <a href="https://knownfailure.com" class="external-helper-class">...</a>'
        });
      });
    });

    it('should skip a preconnect-check', async function() {
      const t = new TapRender();
      sinon.spy(t, 'push');

      const root = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'preconnect',
        'nonexistent'
      );
      await hyperlink(
        {
          root,
          inputUrls: ['index.html'],
          skipFilter: report => report.operator === 'preconnect-check'
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'preconnect-check',
          name:
            'preconnect-check https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/',
          at:
            'testdata/preconnect/nonexistent/index.html:3:34 <link rel="preconnect" href="https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">'
        });
      });
    });

    it('should skip a dns-prefetch-check', async function() {
      const t = new TapRender();
      sinon.spy(t, 'push');

      const root = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'dns-prefetch',
        'nonexistent'
      );
      await hyperlink(
        {
          root,
          inputUrls: ['index.html'],
          skipFilter: report => report.operator === 'dns-prefetch-check'
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'dns-prefetch-check',
          name:
            'dns-prefetch-check thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com',
          at:
            'testdata/dns-prefetch/nonexistent/index.html:3:36 <link rel="dns-prefetch" href="//thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">'
        });
      });
    });
  });

  describe('with a todoFilter', function() {
    it('should not mark as todo on non-match', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="script.js"></script></head><body></body></html>'
          }
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          todoFilter: function(report) {
            if (report.name === 'load https://foo.com/script.js') {
              return true;
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1, todo: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          todo: undefined,
          name: 'load https://example.com/script.js'
        });
      });
    });

    it('should mark as todo', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="script.js"></script></head><body></body></html>'
          }
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          todoFilter: function(report) {
            if (report.name === 'load https://example.com/script.js') {
              return true;
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, todo: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          todo: true,
          name: 'load https://example.com/script.js'
        });
      });
    });

    it('should mark as todo with a message', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body:
              '<html><head><script src="script.js"></script></head><body></body></html>'
          }
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          todoFilter: function(report) {
            if (report.name === 'load https://example.com/script.js') {
              return 'todo this one';
            }
          }
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, todo: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          todo: 'todo this one',
          name: 'load https://example.com/script.js'
        });
      });
    });
  });

  describe('with followSourceMaps:true', function() {
    it('should load the source map and HEAD the sources and file (if not already visited)', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body: `
              <!DOCTYPE html>
              <html>
              <head>
                <link rel="stylesheet" href="styles.css">
              </head>
              <body></body>
              </html>
            `
          }
        },
        {
          request: 'GET https://example.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: 'div { color: maroon; }/*#sourceMappingURL=css.map*/'
          }
        },
        {
          request: 'GET https://example.com/css.map',
          response: {
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              version: 3,
              sources: ['/a.less'],
              names: [],
              mappings:
                'AAAA;EACE,eAAe;EACf,sBAAsB;CACvB;AACD;EACE,+CAA+C;EAC/C,uCAAuC;CACxC',
              file: 'styles.css'
            }
          }
        },
        {
          request: 'HEAD https://example.com/a.less',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/less'
            }
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          followSourceMaps: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
    });
  });

  describe('with followSourceMaps:false', function() {
    it('should just HEAD the source map urls', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            },
            body: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { color: maroon; }
                  /*#sourceMappingURL=css.map*/
                </style>
              </head>
              <body>
                <script>
                  alert("foo");
                  //#sourceMappingURL=js.map
                </script>
              </body>
              </html>
            `
          }
        },
        {
          request: 'HEAD https://example.com/css.map',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        },
        {
          request: 'HEAD https://example.com/js.map',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        }
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          followSourceMaps: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/']
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
    });
  });

  it('should retry a failed HEAD as a GET', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `
        }
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: 503
      },
      {
        request: 'GET https://example.com/hey.png',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'image/png'
          },
          body: Buffer.from('\x89PNG...')
        }
      }
    ]);

    const t = new TapRender();
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 0 });
  });

  it('should give up after one retry', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `
        }
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: 503
      },
      {
        request: 'GET https://example.com/hey.png',
        response: 503
      }
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        at: 'https://example.com/ (6:25) <img src="hey.png">',
        expected: '200 https://example.com/hey.png',
        actual: 'HTTP 503 Service Unavailable'
      });
    });
  });

  it('should GET an asset that was previously HEADed if new, "non-external" relations show up', async function() {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <a href="otherpage.html">
              <script src="script.js"></script>
            </body>
            </html>
          `
        }
      },
      {
        request: 'HEAD https://example.com/otherpage.html',
        response: {
          headers: {
            'Content-Type': 'text/html'
          }
        }
      },
      {
        request: 'GET https://example.com/script.js',
        response: {
          headers: {
            'Content-Type': 'application/javascript'
          },
          body: 'alert("Hello " + "/otherpage.html".toString("url"));'
        }
      },
      {
        request: 'GET https://example.com/otherpage.html',
        response: {
          headers: {
            'Content-Type': 'text/html'
          },
          body: '<h1>Hello, world!</h1>'
        }
      }
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/']
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 0 });
  });
});
