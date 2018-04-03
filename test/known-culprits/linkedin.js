const expect = require('unexpected');
const linkedin = require('../../lib/known-culprits/linkedin');

describe('linkedin', function() {
  it('should match reports for external-check for linkedin.com', function() {
    expect(
      linkedin({
        operator: 'external-check',
        name: 'external-check https://dk.linkedin.com/foo'
      }),
      'to be',
      'Linkedin.com always returns invalid HTTP 999 to block scrapers'
    );
  });

  it('should not match reports for all external-check', function() {
    expect(
      linkedin({
        operator: 'external-check',
        name: 'external-check https://linkedout.com'
      }),
      'to be false'
    );
  });

  it('should not match reports for linkedin.com with an operator different from external-check', function() {
    expect(
      linkedin({
        operator: 'load',
        name: 'external-check https://dk.linkedin.com/foo'
      }),
      'to be false'
    );
  });
});
