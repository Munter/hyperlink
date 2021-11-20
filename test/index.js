const expect = require('unexpected')
  .clone()
  .use(require('unexpected-set'))
  .use(require('unexpected-sinon'));
const hyperlink = require('../lib/');
const httpception = require('httpception');
const TapRender = require('@munter/tap-render');
const sinon = require('sinon');
const pathModule = require('path');

function spyTapCalls(spy) {
  return spy
    .withArgs(null)
    .getCalls()
    .map((c) => c.args[1]);
}

describe('hyperlink', function () {
  it('should complain about insecure content warnings', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
          body: '<html><head><script src="http://example.com/insecureScript.js"></script></head><body></body></html>',
        },
      },
      {
        request: 'GET http://example.com/insecureScript.js',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/javascript',
          },
          body: 'alert("hello, insecure world");',
        },
      },
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: false,
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'mixed-content',
        name: 'mixed-content https://example.com/ --> http://example.com/insecureScript.js',
        at: 'https://example.com/ (1:26) <script src="http://example.com/insecureScript.js">...</script>',
        expected:
          'https://example.com/ --> https://example.com/insecureScript.js',
        actual: 'https://example.com/ --> http://example.com/insecureScript.js',
      });
    });
  });

  it('should not follow links to unsupported protocols', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
          body: `
            <a href="https://google.com">find something securely</a>
            <a href="http://google.com">find something insecurely</a>
            <a href="//google.com">find something in whatever way you're browsing now</a>

            <a href="mailto:recipient@hopefullynonexistingdomainname-whoreallyknows.tools">send me an email</a>
            <a href="tel:+4500000000">give me a call</a>
            <a href="fax:+4500000000">does anyone still use these?</a>
            <a href="gopher://gopher.yoyodyne.com/">this is just rediculous</a>
          `,
        },
      },
      {
        request: 'HEAD https://google.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        },
      },
      {
        request: 'HEAD http://google.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        },
      },
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
      },
      t
    );

    // expect(t.close(), 'to satisfy', { count: 1, pass: 1, fail: 0, skip: 0, todo: 0 });
    expect(t.push, 'to have calls satisfying', () => {
      t.push({ name: 'Crawling internal assets' });
      t.push(null, {
        name: 'load https://example.com/',
        ok: true,
      });
      t.push({ name: 'Crawling 2 outgoing urls' });
      t.push(null, {
        ok: true,
        name: 'external-check https://google.com',
      });
      t.push(null, {
        ok: true,
        name: 'external-check http://google.com',
      });
      t.push({
        name: 'Connecting to 0 hosts (checking <link rel="preconnect" href="...">',
      });
      t.push({
        name: 'Looking up 0 host names (checking <link rel="dns-prefetch" href="...">',
      });
    });
  });

  it('should complain if an asset loaded has an unexpected Content-Type', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
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
          `,
        },
      },
      {
        request: 'GET https://example.com/styles.css',
        response: {
          headers: {
            'Content-Type': 'image/png',
          },
          body: 'div { color: maroon; }',
        },
      },
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
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
        at: 'https://example.com/ (5:44) <link rel="stylesheet" href="styles.css">',
      });
    });
  });

  it('should complain if an asset being HEADed has an unexpected Content-Type', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `,
        },
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: {
          headers: {
            'Content-Type': 'text/plain',
          },
        },
      },
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'content-type-mismatch',
        name: 'content-type-mismatch https://example.com/hey.png',
        actual: 'Asset is used as both Image and Text',
        at: 'https://example.com/ (6:25) <img src="hey.png">',
      });
    });
  });

  it('should complain if an asset being HEADed has no Content-Type', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `,
        },
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: 200,
      },
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        operator: 'content-type-missing',
        name: 'content-type-missing https://example.com/hey.png',
        at: 'https://example.com/ (6:25) <img src="hey.png">',
      });
    });
  });

  it('should unload the assets as they are being processed', async function () {
    const server = require('http')
      .createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/css',
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
          inputUrls: [`${root}1.css`],
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

  it('should not throw when populating missing files', async function () {
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
            text: '<!doctype html><html><body><a href="broken.html">broken</a></body></html>',
          },
        ],
      },
      t
    );

    expect(t.close(), 'to satisfy', {
      count: 2,
      pass: 1,
      fail: 1,
      skip: 0,
      todo: 0,
    });
    expect(t.push, 'to have calls satisfying', () => {
      t.push({
        name: 'Crawling internal assets',
      });

      t.push(null, {
        ok: true,
        name: `load index.html`,
      });

      t.push(null, {
        ok: false,
        operator: 'load',
        name: `load broken.html`,
        actual: expect.it('to begin with', 'ENOENT: no such file or directory'),
      });

      t.push({
        name: 'Crawling 0 outgoing urls',
      });

      t.push({
        name: 'Connecting to 0 hosts (checking <link rel="preconnect" href="...">',
      });

      t.push({
        name: 'Looking up 0 host names (checking <link rel="dns-prefetch" href="...">',
      });
    });
  });

  describe('on a local file system', function () {
    it('should not execute tests on outgoing relations of other pages when recursion is disabled', async function () {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: pathModule.resolve(__dirname, '..', 'testdata', 'recursive'),
          inputUrls: ['index.html'],
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 8,
        pass: 8,
        fail: 0,
        skip: 0,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push({
          name: 'Crawling 0 outgoing urls',
        });
      });
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'fragment-check',
          name: 'fragment-check testdata/recursive/page.html --> index.html#brokenfragment',
        });
      });
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'external-check',
          name: 'external-check testdata/recursive/index.html --> hyperlink.gif',
        });
      });
    });

    it('should not execute tests on outgoing relations of other pages when recursion is enabled', async function () {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: pathModule.resolve(__dirname, '..', 'testdata', 'recursive'),
          inputUrls: ['index.html'],
        },
        t
      );

      expect(spyTapCalls(t.push), 'with set semantics to satisfy', [
        {
          operator: 'load',
          name: 'load testdata/recursive/index.html',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/style.css',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/favicon.ico',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/page.html',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/hyperlink.gif',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/bf176a25b4f8227fea804854c98dc5e2.png',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/1ebd0482aadade65f20ec178219fe012.woff2',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/recursive/314bbcd238d458622bbf32427346774f.woff',
          ok: true,
        },
        {
          operator: 'fragment-check',
          name: 'fragment-check testdata/recursive/page.html --> index.html#brokenfragment',
          expected: 'id="brokenfragment"',
          at: 'testdata/recursive/page.html:8:14 <a href="index.html#brokenfragment">...</a>',
          ok: false,
          actual: null,
        },
      ]);

      expect(t.close(), 'to satisfy', {
        count: 9,
        pass: 8,
        fail: 1,
        skip: 0,
        todo: 0,
      });

      expect(t.push, 'to have a call satisfying', () => {
        t.push({
          name: 'Crawling 0 outgoing urls',
        });
      });
    });
  });

  describe('with document fragments', function () {
    it('should not complain when a referenced fragment exists in the target HTML', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="foo.html#bar">Link</a></body></html>',
          },
        },
        {
          request: 'GET https://example.com/foo.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a id="bar">Welcome!</a></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> foo.html#bar',
        });
      });
    });

    it('should issue an error when a referenced fragment does not exist', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="foo.html#bar">Link</a></body></html>',
          },
        },
        {
          request: 'GET https://example.com/foo.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body>No fragments here</body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          operator: 'fragment-check',
          expected: 'id="bar"',
          name: 'fragment-check https://example.com/ --> foo.html#bar',
        });
      });
    });

    describe('with an implicit index.html in a subdir via FileRedirect', function () {
      it('should complain about a fragment when there is no trailing slash on the href, even though the fragment exists', async function () {
        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: false,
            root: pathModule.resolve(
              __dirname,
              '..',
              'testdata',
              'fragmentAndRedirectWithoutSlash'
            ),
            inputUrls: ['index.html'],
          },
          t
        );

        expect(t.push, 'to have a call exhaustively satisfying', () => {
          t.push(null, {
            operator: 'fragment-redirect',
            name: 'fragment-redirect testdata/fragmentAndRedirectWithoutSlash/index.html --> testdata/fragmentAndRedirectWithoutSlash/subdir#myFragment --> testdata/fragmentAndRedirectWithoutSlash/subdir/index.html',
            actual: '/subdir#myFragment',
            expected: '/subdir/#myFragment',
            at: 'testdata/fragmentAndRedirectWithoutSlash/index.html:5:12 <a href="/subdir#myFragment">...</a>',
            ok: false,
          });
        });
      });

      it('should not complain about a fragment when there is a trailing slash on the href', async function () {
        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: false,
            root: pathModule.resolve(
              __dirname,
              '..',
              'testdata',
              'fragmentAndRedirectWithSlash'
            ),
            inputUrls: ['index.html'],
          },
          t
        );

        expect(t.push, 'to have no calls satisfying', () => {
          t.push(null, {
            operator: 'fragment-redirect',
          });
        });
      });
    });

    describe('with an implicit index.html in a subdir via HttpRedirect', function () {
      it('should complain about a fragment href pointing to a page that is redirected, even though the fragment exists', async function () {
        httpception([
          {
            request: 'GET https://example.com/',
            response: {
              headers: {
                'Content-Type': 'text/html',
              },
              body: `<!DOCTYPE html><html><head></head><body><a href="/subdir#myFragment"></a></body></html>`,
            },
          },
          {
            request: 'GET https://example.com/subdir',
            response: {
              statusCode: 302,
              headers: {
                Location: 'https://example.com/subdir/',
              },
            },
          },
          {
            request: 'GET https://example.com/subdir/',
            response: {
              headers: {
                'Content-Type': 'text/html',
              },
              body: `<!DOCTYPE html><html><head></head><body><div id="myFragment"></div></body></html>`,
            },
          },
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: 'https://example.com/',
            inputUrls: ['https://example.com/'],
          },
          t
        );

        expect(t.push, 'to have a call exhaustively satisfying', () => {
          t.push(null, {
            operator: 'fragment-redirect',
            name: 'fragment-redirect https://example.com/ --> https://example.com/subdir#myFragment --> https://example.com/subdir/',
            expected: '/subdir/#myFragment',
            actual: '/subdir#myFragment',
            at: 'https://example.com/ (1:50) <a href="/subdir#myFragment">...</a>',
            ok: false,
          });
        });
      });

      it('should complain about a fragment href pointing to a page that is redirected, even though there is a trailing slash and the fragment exists', async function () {
        httpception([
          {
            request: 'GET https://example.com/',
            response: {
              headers: {
                'Content-Type': 'text/html',
              },
              body: `<!DOCTYPE html><html><head></head><body><a href="/subdir/#myFragment"></a></body></html>`,
            },
          },
          {
            request: 'GET https://example.com/subdir/',
            response: {
              statusCode: 302,
              headers: {
                Location: 'https://example.com/subdir2/',
              },
            },
          },
          {
            request: 'GET https://example.com/subdir2/',
            response: {
              headers: {
                'Content-Type': 'text/html',
              },
              body: `<!DOCTYPE html><html><head></head><body><div id="myFragment"></div></body></html>`,
            },
          },
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: 'https://example.com/',
            inputUrls: ['https://example.com/'],
          },
          t
        );

        expect(t.push, 'to have a call exhaustively satisfying', () => {
          t.push(null, {
            operator: 'fragment-redirect',
            name: 'fragment-redirect https://example.com/ --> https://example.com/subdir/#myFragment --> https://example.com/subdir2/',
            expected: '/subdir2/#myFragment',
            actual: '/subdir/#myFragment',
            at: 'https://example.com/ (1:50) <a href="/subdir/#myFragment">...</a>',
            ok: false,
          });
        });
      });
    });

    it('should not complain about an #iefix fragment in a CSS file', async function () {
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
          inputUrls: ['/'],
        },
        t
      );
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'fragment-check',
        });
      });
    });

    it('should issue an error when referencing another asset with an empty fragment', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="foo.html#">Link</a></body></html>',
          },
        },
        {
          request: 'GET https://example.com/foo.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body>No fragments here</body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
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
            'Fragment identifiers in links to different documents should not be empty',
        });
      });
    });

    it('should not issue an error when referencing an external asset with an existing fragment', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="https://example2.com/foo.html#frag">Link</a></body></html>',
          },
        },
        {
          request: 'GET https://example2.com/foo.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><link rel="stylesheet" href="dont-follow.css"></head><body><img src="dont-follow.png"><main id="frag">I exist</main></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> https://example2.com/foo.html#frag',
          expected: 'id="frag"',
        });
      });
    });

    it('should be fine when an asset references itself with an empty fragment', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="#">Link</a></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
      expect(t.push, 'to have no calls satisfying', () => {
        t.push(null, {
          operator: 'fragment-check',
        });
      });
    });

    // Regression test for https://github.com/Munter/hyperlink/issues/196#issue-1059125132
    it('should not break when an external link with a fragment hits a redirect', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="https://otherdoma.in/foo.html#foo">Link</a></body></html>',
          },
        },
        {
          request: 'GET https://otherdoma.in/foo.html',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://otherdoma.in/newfoo.html',
            },
          },
        },
        {
          request: 'GET https://otherdoma.in/newfoo.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a id="foo">Yo</a></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> https://otherdoma.in/foo.html#foo',
          expected: 'id="foo"',
          at: 'https://example.com/ (1:35) <a href="https://otherdoma.in/foo.html#foo">...</a>',
          ok: true,
          actual: 'id="foo"',
        });
      });
    });

    describe('on a local file system', function () {
      it('should report missing fragments through a FileRedirect', async function () {
        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: pathModule.resolve(
              __dirname,
              '..',
              'testdata',
              'fragmentIdentifier'
            ),
            inputUrls: ['index.html'],
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 5,
          pass: 4,
          fail: 1,
          skip: 0,
          todo: 0,
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            ok: false,
            operator: 'fragment-check',
            name: 'fragment-check testdata/fragmentIdentifier/index.html --> /subdir/#definitely-broken',
            expected: 'id="definitely-broken"',
          });
        }).and('to have no calls satisfying', () => {
          t.push(null, {
            name: expect.it('to contain', '#fine'),
            ok: false,
          });
        });
      });

      it('should report missing name-attributes through a FileRedirect', async function () {
        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: pathModule.resolve(
              __dirname,
              '..',
              'testdata',
              'nameIdentifier'
            ),
            inputUrls: ['index.html'],
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 5,
          pass: 4,
          fail: 1,
          skip: 0,
          todo: 0,
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            ok: false,
            operator: 'fragment-check',
            name: 'fragment-check testdata/nameIdentifier/index.html --> /subdir/#definitely-broken',
            expected: 'id="definitely-broken"',
          });
        }).and('to have no calls satisfying', () => {
          t.push(null, {
            name: expect.it('to contain', '#fine'),
            ok: false,
          });
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
                'Content-Type': 'text/css',
              },
              body: '@import "other.css";',
            },
          },
          {
            request: 'GET https://example.com/other.css',
            response: 404,
          },
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: 'https://example.com/',
            inputUrls: ['https://example.com/styles.css'],
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
            at: 'https://example.com/styles.css (1:10) ',
          });
        });
      });
    });

    describe('when the other asset is at a different origin', function () {
      // This should obviously be fixed:
      it('should issue an error', async function () {
        httpception([
          {
            request: 'GET https://example.com/styles.css',
            response: {
              statusCode: 200,
              headers: {
                'Content-Type': 'text/css',
              },
              body: '@import "https://somewhereelse.com/other.css";',
            },
          },
          {
            request: 'GET https://somewhereelse.com/other.css',
            response: 404,
          },
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            recursive: true,
            root: 'https://example.com/',
            inputUrls: ['https://example.com/styles.css'],
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
            at: 'https://example.com/styles.css (1:10) ',
          });
        });
      });
    });

    describe('when the missing asset is referenced from an asset at a different origin (not via an anchor or iframe)', function () {
      it('should issue an error', async function () {
        httpception([
          {
            request: 'GET https://example.com/',
            response: {
              headers: { 'Content-Type': 'text/html' },
              body: '<html><head><link rel="stylesheet" href="https://mycdn.com/styles.css"></head><body></body></html>',
            },
          },
          {
            request: 'GET https://mycdn.com/styles.css',
            response: {
              headers: { 'Content-Type': 'text/css' },
              body: '@font-face { font-family: Foo; src: url(404.eot) format("embedded-opentype"); font-weight: 400; }',
            },
          },
          {
            request: 'HEAD https://mycdn.com/404.eot',
            response: 404,
          },
          // retry
          {
            request: 'GET https://mycdn.com/404.eot',
            response: 404,
          },
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: 'https://example.com/',
            inputUrls: ['https://example.com/'],
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 1 });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            operator: 'external-check',
            name: 'external-check https://mycdn.com/404.eot',
            expected: '200 https://mycdn.com/404.eot',
            actual: '404 https://mycdn.com/404.eot',
          });
        });
      });
    });

    describe('when an iframe at a different origin is referenced', function () {
      it('should only HEAD the iframe asset and not try to follow links from it', async function () {
        httpception([
          {
            request: 'GET https://example.com/',
            response: {
              headers: { 'Content-Type': 'text/html' },
              body: '<html><head><iframe src="https://mycdn.com/frame.html"></iframe></head><body></body></html>',
            },
          },
          {
            request: 'HEAD https://mycdn.com/frame.html',
            response: {
              statusCode: 200,
              headers: {
                'Content-Type': 'text/html',
              },
            },
          },
        ]);

        const t = new TapRender();
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: 'https://example.com/',
            inputUrls: ['https://example.com/'],
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 0 });
      });
    });
  });

  describe('with HTTP redirects', function () {
    it('should emit an error when an HtmlAnchor points at an external page that has a permanent redirect', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="https://elsewhere.com/">Link</a></body></html>',
          },
        },
        {
          request: 'HEAD https://elsewhere.com/',
          response: {
            statusCode: 301,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget',
            },
          },
        },
        {
          request: 'HEAD https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          name: 'external-redirect https://elsewhere.com/',
        });
      });
    });

    it('should not emit an error when an HtmlAnchor points at an external page that has a temporary redirect', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="https://elsewhere.com/">Link</a></body></html>',
          },
        },
        {
          request: 'HEAD https://elsewhere.com/',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget',
            },
          },
        },
        {
          request: 'HEAD https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 3,
        pass: 3,
        fail: 0,
        skip: 0,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          name: 'external-redirect https://elsewhere.com/',
        });
      });
    });

    it('should emit an error when an HtmlAnchor points at an external page that has long redirect chain', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="https://elsewhere.com/">Link</a></body></html>',
          },
        },
        {
          request: 'HEAD https://elsewhere.com/',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget',
            },
          },
        },
        {
          request: 'HEAD https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/finalDestination',
            },
          },
        },
        {
          request: 'HEAD https://elsewhere.com/finalDestination',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 3,
        pass: 2,
        fail: 1,
        skip: 0,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          name: 'external-redirect https://elsewhere.com/',
          expected:
            '302 https://elsewhere.com/ --> 200 https://elsewhere.com/finalDestination',
          actual:
            '302 https://elsewhere.com/ --> 302 https://elsewhere.com/redirectTarget --> 200 https://elsewhere.com/finalDestination',
        });
      });
    });

    it('should emit an error when a sequence of redirects from a secure page includes an insecure url', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><script src="https://elsewhere.com/"></script></body></html>',
          },
        },
        {
          request: 'GET https://elsewhere.com/',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://elsewhere.com/redirectTarget',
            },
          },
        },
        {
          request: 'GET http://elsewhere.com/redirectTarget',
          response: {
            statusCode: 302,
            headers: {
              Location: 'https://elsewhere.com/redirectTarget',
            },
          },
        },
        {
          request: 'GET https://elsewhere.com/redirectTarget',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/javascript',
            },
            body: 'alert("foo");',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          operator: 'mixed-content',
          actual:
            'https://elsewhere.com/ --> http://elsewhere.com/redirectTarget',
          expected:
            'https://elsewhere.com/ --> https://elsewhere.com/redirectTarget',
        });
      });
    });
  });

  describe('with a preconnect link', function () {
    describe('pointing to a host that is up', function () {
      it('should report no errors and inform that 1 host was checked', async function () {
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
            inputUrls: ['index.html'],
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 2,
          pass: 2,
          fail: 0,
          skip: 0,
          todo: 0,
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push({
            name: 'Connecting to 1 hosts (checking <link rel="preconnect" href="...">',
          });
        });
      });
    });

    describe('pointing to a host that does not have a DNS entry', function () {
      it('should issue an error', async function () {
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
          },
          t
        );

        expect(t.close(), 'to satisfy', { fail: 1 });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            actual:
              'DNS missing: thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com',
            at: 'testdata/preconnect/nonexistent/index.html:3:34 <link rel="preconnect" href="https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">',
          });
        });
      });
    });
  });

  describe('with a dns-prefetch link', function () {
    describe('pointing to a host that is up', function () {
      it('should report no errors and inform that 1 host was checked', async function () {
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
            inputUrls: ['index.html'],
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 2,
          pass: 2,
          fail: 0,
          skip: 0,
          todo: 0,
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push({
            name: 'Looking up 1 host names (checking <link rel="dns-prefetch" href="...">',
          });
        });
      });
    });

    describe('pointing to a host that does not have a DNS entry', function () {
      it('should issue an error', async function () {
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
          },
          t
        );

        expect(t.close(), 'to satisfy', {
          count: 2,
          pass: 1,
          fail: 1,
          skip: 0,
          todo: 0,
        });
        expect(t.push, 'to have a call satisfying', () => {
          t.push(null, {
            actual:
              'DNS missing: thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com',
            at: 'testdata/dns-prefetch/nonexistent/index.html:3:36 <link rel="dns-prefetch" href="//thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">',
          });
        });
      });
    });
  });

  describe('with a skipFilter', function () {
    it('should not skip on non-match', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="script.js"></script></head><body></body></html>',
          },
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404,
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function (report) {
            if (report.name === 'load https://foo.com/script.js') {
              return true;
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1, skip: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          skip: undefined,
          operator: 'load',
          name: 'load https://example.com/script.js',
        });
      });
    });

    it('should skip an internal load', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="script.js"></script></head><body></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function (report) {
            if (report.name === 'load https://example.com/script.js') {
              return true;
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, skip: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          skip: true,
          operator: 'load',
          name: 'load https://example.com/script.js',
        });
      });
    });

    it('should skip an internal load with a message', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="script.js"></script></head><body></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function (report) {
            if (report.name === 'load https://example.com/script.js') {
              return 'Skip this one';
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, skip: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: true,
          skip: 'Skip this one',
          operator: 'load',
          name: 'load https://example.com/script.js',
        });
      });
    });

    it('should skip mixed-content warnings', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="http://example.com/insecureScript.js"></script></head><body></body></html>',
          },
        },
        {
          request: 'GET http://example.com/insecureScript.js',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/javascript',
            },
            body: 'alert("hello, insecure world");',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: (report) => report.name.includes('mixed-content'),
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 3,
        pass: 2,
        fail: 0,
        skip: 1,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'mixed-content',
          name: 'mixed-content https://example.com/ --> http://example.com/insecureScript.js',
          at: 'https://example.com/ (1:26) <script src="http://example.com/insecureScript.js">...</script>',
        });
      });
    });

    it('should skip a fragment-check', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="#missingId">Broken fragment link</a></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: function (report) {
            if (
              report.name ===
              'fragment-check https://example.com/ --> #missingId'
            ) {
              return true;
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'fragment-check',
          name: 'fragment-check https://example.com/ --> #missingId',
          expected: 'id="missingId"',
          at: 'https://example.com/ (1:35) <a href="#missingId">...</a>',
        });
      });
    });

    it('should skip an external-check', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head></head><body><a href="https://knownfailure.com" class="external-helper-class">url to skip</a></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          skipFilter: (report) => report.at.includes('external-helper-class'),
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'external-check',
          name: 'external-check https://knownfailure.com',
          at: 'https://example.com/ (1:35) <a href="https://knownfailure.com" class="external-helper-class">...</a>',
        });
      });
    });

    it('should skip a preconnect-check', async function () {
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
          skipFilter: (report) => report.operator === 'preconnect-check',
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'preconnect-check',
          name: 'preconnect-check https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/',
          at: 'testdata/preconnect/nonexistent/index.html:3:34 <link rel="preconnect" href="https://thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">',
        });
      });
    });

    it('should skip a dns-prefetch-check', async function () {
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
          skipFilter: (report) => report.operator === 'dns-prefetch-check',
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 2,
        pass: 1,
        fail: 0,
        skip: 1,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          skip: true,
          operator: 'dns-prefetch-check',
          name: 'dns-prefetch-check thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com',
          at: 'testdata/dns-prefetch/nonexistent/index.html:3:36 <link rel="dns-prefetch" href="//thisdomaindoesnotandshouldnotexistqhqwicqecqwe.com/">',
        });
      });
    });
  });

  describe('with a todoFilter', function () {
    it('should not mark as todo on non-match', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="script.js"></script></head><body></body></html>',
          },
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404,
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          todoFilter: function (report) {
            if (report.name === 'load https://foo.com/script.js') {
              return true;
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 1, todo: 0 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          todo: undefined,
          name: 'load https://example.com/script.js',
        });
      });
    });

    it('should mark as todo', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="script.js"></script></head><body></body></html>',
          },
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404,
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          todoFilter: function (report) {
            if (report.name === 'load https://example.com/script.js') {
              return true;
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, todo: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          todo: true,
          name: 'load https://example.com/script.js',
        });
      });
    });

    it('should mark as todo with a message', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: '<html><head><script src="script.js"></script></head><body></body></html>',
          },
        },
        {
          request: 'GET https://example.com/script.js',
          response: 404,
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          todoFilter: function (report) {
            if (report.name === 'load https://example.com/script.js') {
              return 'todo this one';
            }
          },
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0, todo: 1 });
      expect(t.push, 'to have a call satisfying', () => {
        t.push(null, {
          ok: false,
          todo: 'todo this one',
          name: 'load https://example.com/script.js',
        });
      });
    });
  });

  describe('with followSourceMaps:true', function () {
    it('should load the source map and HEAD the sources and file (if not already visited)', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: `
              <!DOCTYPE html>
              <html>
              <head>
                <link rel="stylesheet" href="styles.css">
              </head>
              <body></body>
              </html>
            `,
          },
        },
        {
          request: 'GET https://example.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: 'div { color: maroon; }/*#sourceMappingURL=css.map*/',
          },
        },
        {
          request: 'GET https://example.com/css.map',
          response: {
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              version: 3,
              sources: ['/a.less'],
              names: [],
              mappings:
                'AAAA;EACE,eAAe;EACf,sBAAsB;CACvB;AACD;EACE,+CAA+C;EAC/C,uCAAuC;CACxC',
              file: 'styles.css',
            },
          },
        },
        {
          request: 'HEAD https://example.com/a.less',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/less',
            },
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          followSourceMaps: true,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
    });
  });

  describe('with followSourceMaps:false', function () {
    it('should just HEAD the source map urls', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
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
            `,
          },
        },
        {
          request: 'HEAD https://example.com/css.map',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
        {
          request: 'HEAD https://example.com/js.map',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          followSourceMaps: false,
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
    });
  });

  it('should retry a failed HEAD as a GET', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `,
        },
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: 503,
      },
      {
        request: 'GET https://example.com/hey.png',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'image/png',
          },
          body: Buffer.from('\x89PNG...'),
        },
      },
    ]);

    const t = new TapRender();
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 0 });
  });

  it('should give up after one retry', async function () {
    httpception([
      {
        request: 'GET https://example.com/',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
              <img src="hey.png">
            </body>
            </html>
          `,
        },
      },
      {
        request: 'HEAD https://example.com/hey.png',
        response: 503,
      },
      {
        request: 'GET https://example.com/hey.png',
        response: 503,
      },
    ]);

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://example.com/',
        inputUrls: ['https://example.com/'],
      },
      t
    );

    expect(t.close(), 'to satisfy', { fail: 1 });
    expect(t.push, 'to have a call satisfying', () => {
      t.push(null, {
        ok: false,
        at: 'https://example.com/ (6:25) <img src="hey.png">',
        expected: '200 https://example.com/hey.png',
        actual: '503 https://example.com/hey.png',
      });
    });
  });

  it('should retry failed fragment links to Github urls with a prepended "user-content-"', async function () {
    httpception({
      request: 'GET https://github.com/assetgraph/assetgraph',
      response: {
        headers: {
          'content-type': 'text/html',
        },
        body: '<a id="user-content-tools-built-with-assetgraph" href="#tools-built-with-assetgraph"></a>',
      },
    });

    const t = new TapRender();
    // t.pipe(process.stderr);
    sinon.spy(t, 'push');
    await hyperlink(
      {
        root: 'https://github.com/assetgraph/assetgraph',
        inputUrls: ['https://github.com/assetgraph/assetgraph'],
      },
      t
    );

    expect(spyTapCalls(t.push), 'to satisfy', [
      {
        operator: 'load',
        name: 'load https://github.com/assetgraph/assetgraph',
        ok: true,
      },
      {
        operator: 'fragment-check',
        name: 'fragment-check https://github.com/assetgraph/assetgraph --> #tools-built-with-assetgraph',
        ok: true,
        expected: 'id="tools-built-with-assetgraph"',
        actual: 'id="user-content-tools-built-with-assetgraph"',
      },
    ]);
    expect(t.close(), 'to satisfy', { pass: 2, fail: 0 });
  });

  describe('with internalOnly true', () => {
    it('should not follow external links', async () => {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: `
              <!DOCTYPE html>
              <html>
              <head></head>
              <body>
                <a href="otherPage.html">Other Page</a>
                <a href="https://broken-link.mntr.dk/foo/bar/baz">Broken</a>
              </body>
              </html>
            `,
          },
        },
        {
          request: 'GET https://example.com/otherPage.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: `
              <!DOCTYPE html>
              <html>
              <head></head>
              <body>
                <a href="https://broken-link.mntr.dk/1/2/3#metameta">Broken</a>
              </body>
              </html>
            `,
          },
        },
      ]);

      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://example.com/',
          inputUrls: ['https://example.com/'],
          recursive: true,
          internalOnly: true,
        },
        t
      );

      expect(t.close(), 'to satisfy', { fail: 0 });
    });

    it('should follow fragment links within the same page', async () => {
      const t = new TapRender();
      // t.pipe(process.stdout);
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'internalfragment'
          ),
          inputUrls: ['singlepage.html'],
          recursive: true,
          internalOnly: true,
        },
        t
      );

      expect(spyTapCalls(t.push), 'to satisfy', [
        {
          operator: 'load',
          name: 'load testdata/internalfragment/singlepage.html',
          ok: true,
        },

        {
          operator: 'fragment-check',
          name: 'fragment-check testdata/internalfragment/singlepage.html --> #broken',
          expected: 'id="broken"',
          at: 'testdata/internalfragment/singlepage.html:1:10 <a href="#broken">...</a>',
          ok: false,
          actual: null,
        },
      ]);
      expect(t.close(), 'to satisfy', { fail: 1 });
    });

    it('should follow fragment links across pages', async () => {
      const t = new TapRender();
      // t.pipe(process.stdout);
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'internalfragment'
          ),
          inputUrls: ['multi-page1.html'],
          recursive: true,
          internalOnly: true,
        },
        t
      );

      expect(spyTapCalls(t.push), 'to satisfy', [
        {
          operator: 'load',
          name: 'load testdata/internalfragment/multi-page1.html',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/internalfragment/multi-page2.html',
          ok: true,
        },
        {
          operator: 'fragment-check',
          name: 'fragment-check testdata/internalfragment/multi-page2.html --> multi-page2.html#broken',
          expected: 'id="broken"',
          at: 'testdata/internalfragment/multi-page2.html:1:10 <a href="multi-page2.html#broken">...</a>',
          ok: false,
          actual: null,
        },
      ]);
      expect(t.close(), 'to satisfy', { fail: 1 });
    });

    it('should not follow fragment links to external pages', async () => {
      httpception([
        {
          request: 'GET https://test.com',
          response: {
            headers: {
              'content-type': 'text/html',
            },
            body: '<a href="https://nodejs.org/api/events.html#events_class_eventemitter"></a>',
          },
        },
      ]);

      const t = new TapRender();
      // t.pipe(process.stderr);
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: 'https://test.com',
          inputUrls: ['https://test.com'],
          internalOnly: true,
        },
        t
      );

      expect(spyTapCalls(t.push), 'to satisfy', [
        {
          operator: 'load',
          name: 'load https://test.com',
          ok: true,
        },
      ]);
      expect(t.close(), 'to satisfy', { pass: 1, fail: 0 });
    });
  });

  describe('with Html responses in non-navigation relations', function () {
    const videoHtml = `
      <!DOCTYPE html>
      <html>

      <body>
        <a href="#broken">broken</a>
        <img src="image.png" alt="">
      </body>

      </html>
    `;

    it('should not check outgoing relations from second Html asset on same origin', async function () {
      const t = new TapRender();
      // t.pipe(process.stdout);
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: pathModule.resolve(__dirname, '..', 'testdata', 'htmlInMeta'),
          inputUrls: ['index.html'],
          recursive: false,
          internalOnly: false,
        },
        t
      );

      expect(spyTapCalls(t.push), 'to satisfy', [
        {
          operator: 'load',
          name: 'load testdata/htmlInMeta/index.html',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load testdata/htmlInMeta/video.html',
          ok: true,
        },
      ]);
      expect(t.close(), 'to satisfy', { pass: 2, fail: 0 });
    });

    it('should not check outgoing relations from second Html asset on cross origin', async function () {
      httpception([
        {
          request: 'GET https://crossorigin.hyperlink.io/video.html',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
            },
            body: videoHtml,
          },
        },
      ]);

      const t = new TapRender();
      // t.pipe(process.stdout);
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: pathModule.resolve(__dirname, '..', 'testdata', 'htmlInMeta'),
          inputUrls: ['crossorigin.html'],
          recursive: false,
          internalOnly: false,
        },
        t
      );

      expect(spyTapCalls(t.push), 'to satisfy', [
        {
          operator: 'load',
          name: 'load testdata/htmlInMeta/crossorigin.html',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load https://crossorigin.hyperlink.io/video.html',
          ok: true,
        },
      ]);
      expect(t.close(), 'to satisfy', { pass: 2, fail: 0 });
    });

    describe('with --recursive', function () {
      it('should check outgoing relations from second Html asset on same origin', async function () {
        const t = new TapRender();
        // t.pipe(process.stdout);
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: pathModule.resolve(__dirname, '..', 'testdata', 'htmlInMeta'),
            inputUrls: ['index.html'],
            recursive: true,
            internalOnly: false,
          },
          t
        );

        expect(spyTapCalls(t.push), 'to satisfy', [
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/index.html',
            ok: true,
          },
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/video.html',
            ok: true,
          },
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/image.png',
            ok: true,
          },
          {
            operator: 'fragment-check',
            name: 'fragment-check testdata/htmlInMeta/video.html --> #broken',
            expected: 'id="broken"',
            ok: false,
          },
        ]);
        expect(t.close(), 'to satisfy', { count: 4, pass: 3, fail: 1 });
      });

      it('should not check outgoing relations from second Html asset on cross origin', async function () {
        httpception([
          {
            request: 'GET https://crossorigin.hyperlink.io/video.html',
            response: {
              statusCode: 200,
              headers: {
                'Content-Type': 'text/html; charset=UTF-8',
              },
              body: videoHtml,
            },
          },
        ]);

        const t = new TapRender();
        // t.pipe(process.stdout);
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: pathModule.resolve(__dirname, '..', 'testdata', 'htmlInMeta'),
            inputUrls: ['crossorigin.html'],
            recursive: false,
            internalOnly: false,
          },
          t
        );

        expect(spyTapCalls(t.push), 'to satisfy', [
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/crossorigin.html',
            ok: true,
          },
          {
            operator: 'load',
            name: 'load https://crossorigin.hyperlink.io/video.html',
            ok: true,
          },
        ]);
        expect(t.close(), 'to satisfy', { pass: 2, fail: 0 });
      });
    });

    describe('with --internal', function () {
      it('should not check outgoing relations from second Html asset on same origin', async function () {
        const t = new TapRender();
        // t.pipe(process.stdout);
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: pathModule.resolve(__dirname, '..', 'testdata', 'htmlInMeta'),
            inputUrls: ['index.html'],
            recursive: false,
            internalOnly: true,
          },
          t
        );

        expect(spyTapCalls(t.push), 'to satisfy', [
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/index.html',
            ok: true,
          },
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/video.html',
            ok: true,
          },
        ]);
        expect(t.close(), 'to satisfy', { pass: 2, fail: 0 });
      });

      it('should not check outgoing relations from second Html asset on cross origin', async function () {
        httpception([
          {
            request: 'GET https://crossorigin.hyperlink.io/video.html',
            response: {
              statusCode: 200,
              headers: {
                'Content-Type': 'text/html; charset=UTF-8',
              },
              body: videoHtml,
            },
          },
        ]);

        const t = new TapRender();
        // t.pipe(process.stdout);
        sinon.spy(t, 'push');
        await hyperlink(
          {
            root: pathModule.resolve(__dirname, '..', 'testdata', 'htmlInMeta'),
            inputUrls: ['crossorigin.html'],
            recursive: false,
            internalOnly: false,
          },
          t
        );

        expect(spyTapCalls(t.push), 'to satisfy', [
          {
            operator: 'load',
            name: 'load testdata/htmlInMeta/crossorigin.html',
            ok: true,
          },
          {
            operator: 'load',
            name: 'load https://crossorigin.hyperlink.io/video.html',
            ok: true,
          },
        ]);
        expect(t.close(), 'to satisfy', { pass: 2, fail: 0 });
      });
    });
  });

  describe('with HTTP response that is a redirect with HTML payload', () => {
    it('should follow the redirect', async () => {
      httpception([
        {
          request: 'GET https://webpack.js.org/concepts',
          response: {
            statusCode: 301,
            headers: {
              location: 'https://webpack.js.org/concepts/',
              'Content-Type': 'text/html',
            },
            body: `<html>
<head><title>301 Moved Permanently</title></head>
<body>
<center><h1>301 Moved Permanently</h1></center>
<hr><center>nginx</center>
</body>
</html>`,
          },
        },
        {
          request: 'GET https://webpack.js.org/concepts/',
          response: {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html',
            },
            body: '<html><head></head><body></body></html>',
          },
        },
      ]);

      const t = new TapRender();
      // t.pipe(process.stdout);
      sinon.spy(t, 'push');
      await hyperlink(
        {
          root: pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'htmlInRedirect'
          ),
          inputUrls: ['index.html'],
          recursive: false,
          internalOnly: false,
        },
        t
      );

      expect(spyTapCalls(t.push), 'to satisfy', [
        {
          operator: 'load',
          name: 'load testdata/htmlInRedirect/index.html',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load https://webpack.js.org/concepts',
          ok: true,
        },
        {
          operator: 'load',
          name: 'load https://webpack.js.org/concepts/',
          ok: true,
        },
        {
          operator: 'fragment-redirect',
          name: 'fragment-redirect testdata/htmlInRedirect/index.html --> https://webpack.js.org/concepts#foo --> https://webpack.js.org/concepts/',
          expected: 'https://webpack.js.org/concepts/#foo',
          actual: 'https://webpack.js.org/concepts#foo',
          at: 'testdata/htmlInRedirect/index.html:1:10 <a href="https://webpack.js.org/concepts#foo">...</a>',
          ok: false,
        },
        {
          operator: 'fragment-check',
          name: 'fragment-check testdata/htmlInRedirect/index.html --> https://webpack.js.org/concepts#foo',
          expected: 'id="foo"',
          at: 'testdata/htmlInRedirect/index.html:1:10 <a href="https://webpack.js.org/concepts#foo">...</a>',
          ok: false,
          actual: null,
        },
      ]);
      expect(t.close(), 'to satisfy', { pass: 3, fail: 2 });
    });
  });

  describe('pretty-url feature', () => {
    it('should resolve html files on disk from urls without .html extension', async function () {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: pathModule.resolve(__dirname, '..', 'testdata', 'pretty-url'),
          inputUrls: ['index.html'],
          pretty: true,
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 7,
        pass: 7,
        fail: 0,
        skip: 0,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push({
          name: 'Crawling 0 outgoing urls',
        });
      });
    });

    it('should fail to resolve html files on disk from urls without .html extension', async function () {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: pathModule.resolve(__dirname, '..', 'testdata', 'pretty-url'),
          inputUrls: ['index.html'],
          pretty: false,
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        count: 5,
        pass: 3,
        fail: 2,
        skip: 0,
        todo: 0,
      });
      expect(t.push, 'to have a call satisfying', () => {
        t.push({
          name: 'Crawling 0 outgoing urls',
        });
      });
    });

    // Regression test for https://github.com/Munter/hyperlink/issues/182
    it('should not break when discovering a second pretty link to a page that has already been processed', async function () {
      const t = new TapRender();
      sinon.spy(t, 'push');
      await hyperlink(
        {
          recursive: true,
          root: pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'prettyUrlIssue182'
          ),
          inputUrls: ['index.html'],
          pretty: true,
        },
        t
      );

      expect(t.close(), 'to satisfy', {
        fail: 0,
      });
    });
  });

  it('should resolve local srcset images as internal', async function () {
    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: false,
        root: pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'pictureSourceSrcsetWebp'
        ),
        inputUrls: ['index.html'],
      },
      t
    );

    expect(t.close(), 'to satisfy', {
      count: 3,
      pass: 3,
      fail: 0,
      skip: 0,
      todo: 0,
    });
  });

  it('should not follow JavaScriptFetch relations', async function () {
    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: false,
        root: pathModule.resolve(__dirname, '..', 'testdata', 'fetch'),
        inputUrls: ['index.html'],
      },
      t
    );

    expect(t.close(), 'to satisfy', {
      count: 1,
      pass: 1,
      fail: 0,
      skip: 0,
      todo: 0,
    });
  });

  it('should handle special characters in paths. Regression test https://github.com/Munter/hyperlink/issues/169', async () => {
    const t = new TapRender();
    // t.pipe(process.stdout);
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: false,
        root: pathModule.resolve(__dirname, '..', 'testdata', '@scopename'),
        inputUrls: ['index.html'],
      },
      t
    );

    expect(t.close(), 'to satisfy', {
      count: 2,
      pass: 2,
      fail: 0,
      skip: 0,
      todo: 0,
    });
  });
});
