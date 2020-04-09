module.exports = (report) => {
  if (
    report.operator === 'external-check' &&
    report.name.includes('linkedin.com')
  ) {
    return 'Linkedin.com always returns invalid HTTP 999 to block scrapers';
  }

  return false;
};
