async function sleep() {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
}

module.exports = sleep;
