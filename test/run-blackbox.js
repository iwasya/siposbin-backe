const blackboxSuite = require('./blackbox/server.blackbox.test');

const runSuite = async (suiteModule) => {
  const context = suiteModule.setup ? await suiteModule.setup() : {};

  try {
    for (const testCase of suiteModule) {
      await testCase.run(context);
      console.log(`PASS ${testCase.name}`);
    }
  } finally {
    if (suiteModule.teardown) {
      await suiteModule.teardown(context);
    }
  }
};

(async () => {
  try {
    await runSuite(blackboxSuite);
    console.log('Blackbox tests passed');
  } catch (error) {
    process.exitCode = 1;
    console.error(`FAIL ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
})();
