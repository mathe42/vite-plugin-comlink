let counter = 0

export function increment(): number {
  return ++counter
}

export function getCount(): number {
  return counter
}

export function reset(): void {
  counter = 0
}