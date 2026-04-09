const smokeSuite = require('./smoke/app.smoke.test');

(async () => {
  let context;

  try {
    context = smokeSuite.setup ? await smokeSuite.setup() : {};

    for (const testCase of smokeSuite) {
      await testCase.run(context);
      console.log(`PASS ${testCase.name}`);
    }

    console.log('Smoke tests passed');
  } catch (error) {
    process.exitCode = 1;
    console.error(`FAIL ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    if (smokeSuite.teardown) {
      await smokeSuite.teardown(context);
    }
  }
})();
