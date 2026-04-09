const suites = [
  require('./controllers/pemeriksaanController.test'),
  require('./smoke/app.smoke.test')
];

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
  let failures = 0;

  for (const suite of suites) {
    try {
      await runSuite(suite);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('All tests passed');
})();
