const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const hyperlink = require('../lib/');
const httpception = require('httpception');
const TapRender = require('@munter/tap-render');
const sinon = require('sinon');

describe('default-skips', function() {
  it('should skip linkedin tests', async function() {
    httpception();

    const t = new TapRender();
    sinon.spy(t, 'push');
    await hyperlink(
      {
        recursive: false,
        root: 'https://example.com/',
        inputUrls: [
          {
            type: 'Html',
            text: '<a href="https://dk.linkedin.com/in/petermuller"></a>'
          }
        ]
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
        ok: true,
        skip: expect.it('to be a string'),
        operator: 'external-check',
        name: 'external-check https://dk.linkedin.com/in/petermuller'
      });
    });
  });
});
