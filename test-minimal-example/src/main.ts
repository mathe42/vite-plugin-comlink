/// <reference types="vite-plugin-comlink/client" />

import { endpointSymbol } from 'vite-plugin-comlink/symbol'

const results = document.getElementById('results')!

async function runTests() {
  const testResults: { name: string; passed: boolean; message: string }[] = []

  // Test 1: Basic ComlinkWorker
  try {
    const worker = new ComlinkWorker<typeof import('./worker')>(
      new URL('./worker.ts', import.meta.url)
    )
    
    const sum = await worker.add(2, 3)
    const greeting = await worker.greet('World')
    const asyncResult = await worker.asyncTask()
    
    testResults.push({
      name: 'ComlinkWorker Basic',
      passed: sum === 5 && greeting === 'Hello, World!' && asyncResult === 'Async task completed',
      message: `add(2,3)=${sum}, greet('World')="${greeting}", asyncTask()="${asyncResult}"`
    })
  } catch (error) {
    testResults.push({
      name: 'ComlinkWorker Basic',
      passed: false,
      message: `Error: ${error}`
    })
  }

  // Test 2: Endpoint access
  try {
    const worker = new ComlinkWorker<typeof import('./worker')>(
      new URL('./worker.ts', import.meta.url)
    )
    
    const endpoint = worker[endpointSymbol]
    const isWorker = endpoint instanceof Worker
    
    testResults.push({
      name: 'Endpoint Access',
      passed: isWorker,
      message: `endpoint is Worker: ${isWorker}`
    })
  } catch (error) {
    testResults.push({
      name: 'Endpoint Access',
      passed: false,
      message: `Error: ${error}`
    })
  }

  // Test 3: ComlinkSharedWorker (if supported)
  if (typeof SharedWorker !== 'undefined') {
    try {
      const sharedWorker1 = new ComlinkSharedWorker<typeof import('./shared-worker')>(
        new URL('./shared-worker.ts', import.meta.url)
      )
      
      const sharedWorker2 = new ComlinkSharedWorker<typeof import('./shared-worker')>(
        new URL('./shared-worker.ts', import.meta.url)
      )
      
      await sharedWorker1.reset()
      const count1 = await sharedWorker1.increment()
      const count2 = await sharedWorker2.increment()
      const finalCount = await sharedWorker1.getCount()
      
      testResults.push({
        name: 'ComlinkSharedWorker',
        passed: count1 === 1 && count2 === 2 && finalCount === 2,
        message: `Shared state works: count1=${count1}, count2=${count2}, final=${finalCount}`
      })
    } catch (error) {
      testResults.push({
        name: 'ComlinkSharedWorker',
        passed: false,
        message: `Error: ${error}`
      })
    }
  } else {
    testResults.push({
      name: 'ComlinkSharedWorker',
      passed: false,
      message: 'SharedWorker not supported'
    })
  }

  // Display results
  const allPassed = testResults.every(r => r.passed)
  
  results.innerHTML = `
    <h2>Test Results: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}</h2>
    ${testResults.map(r => `
      <div style="padding: 10px; margin: 5px; background: ${r.passed ? '#d4edda' : '#f8d7da'}; border-radius: 4px;">
        <strong>${r.passed ? '✅' : '❌'} ${r.name}</strong><br>
        ${r.message}
      </div>
    `).join('')}
  `

  // Set data attribute for automated testing
  document.body.setAttribute('data-tests-complete', 'true')
  document.body.setAttribute('data-tests-passed', allPassed.toString())
  
  // Also log to console for CI
  console.log('TEST RESULTS:', JSON.stringify(testResults, null, 2))
  
  return allPassed
}

// Run tests when page loads
window.addEventListener('load', runTests)