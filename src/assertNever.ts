export function assertNever(value: never): never {
  throw new Error(`assertNever: ${value}`);
}
