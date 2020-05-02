const expect = require('unexpected');
const getModifiedHref = require('../lib/getModifiedHref');

const root = 'file:///local/filesystem/path/';

describe('getModifiedHref', () => {
  it('should handle absolute urls', () => {
    expect(
      getModifiedHref(
        'https://hyperlink/to',
        `${root}/from`,
        'https://hyperlink/to',
        root
      ),
      'to be',
      'https://hyperlink/to'
    );
  });

  it('should handle protocol relative urls', () => {
    expect(
      getModifiedHref('//hyperlink/to', `${root}/from`, '//hyperlink/to', root),
      'to be',
      '//hyperlink/to'
    );
  });

  it('should handle root relative urls', () => {
    expect(
      getModifiedHref('/to', `${root}/from`, `${root}/to`, root),
      'to be',
      '/to'
    );
  });

  it('should handle relative urls', () => {
    expect(
      getModifiedHref('to', `${root}/from`, `${root}/to`, root),
      'to be',
      'to'
    );
  });
});
