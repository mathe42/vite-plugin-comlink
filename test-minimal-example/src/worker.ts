export function add(a: number, b: number): number {
  return a + b
}

export function greet(name: string): string {
  return `Hello, ${name}!`
}

export async function asyncTask(): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 100))
  return 'Async task completed'
}