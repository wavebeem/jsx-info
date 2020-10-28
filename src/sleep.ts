export async function sleep(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
