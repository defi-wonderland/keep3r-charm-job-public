module.exports = {
  skipFiles: ['contracts/for-test', 'interfaces'],
  mocha: {
    forbidOnly: true,
    grep: '@skip-on-coverage',
    invert: true,
  },
};
