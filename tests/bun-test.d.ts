declare module "bun:test" {
  type AsyncExpectation = {
    toEqual(expected: unknown): Promise<void>;
  };

  type Expectation = {
    toBe(expected: unknown): void;
    toBeNull(): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toMatchObject(expected: object): void;
    readonly resolves: AsyncExpectation;
    readonly rejects: AsyncExpectation;
  };

  export function describe(name: string, body: () => void): void;
  export function expect(value: unknown): Expectation;
  export function test(name: string, body: () => void | Promise<void>): void;
}
