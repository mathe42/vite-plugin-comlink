export function conditionalWorkerCreation(shouldCreateShared: boolean) {
  // Check if we're in a worker context or main thread
  const isMainThread = typeof window !== 'undefined';
  const hasSharedWorker = isMainThread && typeof SharedWorker !== 'undefined';
  
  if (shouldCreateShared && hasSharedWorker) {
    return { type: 'shared', supported: true, context: 'main', hasSharedWorker };
  } else {
    return { type: 'regular', supported: true, context: isMainThread ? 'main' : 'worker', hasSharedWorker };
  }
}

export async function testWorkerInFunction() {
  const worker = new ComlinkWorker<typeof import('./worker')>(
    new URL('./worker.ts', import.meta.url)
  );
  
  const result = await worker.add(10, 20);
  return result;
}

// Test multiple workers creation and management
let workers: Array<any> = [];

export async function createMultipleWorkers(count: number) {
  workers = [];
  for (let i = 0; i < count; i++) {
    const worker = new ComlinkWorker<typeof import('./worker')>(
      new URL('./worker.ts', import.meta.url)
    );
    workers.push(worker);
  }
  return workers.length;
}

export async function testAllWorkers() {
  const promises = workers.map((worker, index) => 
    worker.add(index, index + 1)
  );
  return Promise.all(promises);
}