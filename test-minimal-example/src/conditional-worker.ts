export function conditionalWorkerCreation(shouldCreateShared: boolean) {
  if (shouldCreateShared && typeof SharedWorker !== 'undefined') {
    return { type: 'shared', supported: true };
  } else {
    return { type: 'regular', supported: true };
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