// Test nested worker creation (simulated)
export async function createNestedWorker() {
  // Create a worker to simulate nested worker operations
  const nestedWorker = new ComlinkWorker<typeof import('./worker')>(
    new URL('./worker.ts', import.meta.url)
  );
  
  // Test the worker and return results instead of the worker itself
  const addResult = await nestedWorker.add(5, 7);
  const greetResult = await nestedWorker.greet('Nested');
  
  return {
    addViaNestedWorker: async () => addResult,
    greetViaNestedWorker: async () => greetResult,
  };
}

export function processComplexData(data: { numbers: number[]; multiplier: number }) {
  return data.numbers.map(n => n * data.multiplier).reduce((sum, n) => sum + n, 0);
}

export async function asyncChainOperation() {
  const step1 = await new Promise<number>(resolve => setTimeout(() => resolve(5), 50));
  const step2 = await new Promise<number>(resolve => setTimeout(() => resolve(step1 * 2), 50));
  const step3 = await new Promise<number>(resolve => setTimeout(() => resolve(step2 + 10), 50));
  return step3;
}