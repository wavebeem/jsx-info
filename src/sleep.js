async function sleep() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

exports.sleep = sleep;
