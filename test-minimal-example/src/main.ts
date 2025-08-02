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

  // Test 4: Nested Worker Creation (simulation test)
  try {
    const nestedWorker = new ComlinkWorker<typeof import('./nested-worker')>(
      new URL('./nested-worker.ts', import.meta.url)
    )
    
    // Test that the nested worker creates and uses another worker internally
    const complexResult = await nestedWorker.processComplexData({
      numbers: [1, 2, 3],
      multiplier: 3
    })
    
    const asyncResult = await nestedWorker.asyncChainOperation()
    
    testResults.push({
      name: 'Nested Worker Simulation',
      passed: complexResult === 18 && asyncResult === 20,
      message: `Nested simulation: complex=${complexResult}, async=${asyncResult}`
    })
  } catch (error) {
    testResults.push({
      name: 'Nested Worker Simulation',
      passed: false,
      message: `Error: ${error}`
    })
  }

  // Test 5: Complex Data Processing
  try {
    const nestedWorker = new ComlinkWorker<typeof import('./nested-worker')>(
      new URL('./nested-worker.ts', import.meta.url)
    )
    
    const complexResult = await nestedWorker.processComplexData({
      numbers: [1, 2, 3, 4, 5],
      multiplier: 2
    })
    
    const asyncChainResult = await nestedWorker.asyncChainOperation()
    
    testResults.push({
      name: 'Complex Data Processing',
      passed: complexResult === 30 && asyncChainResult === 20,
      message: `Complex: sum=${complexResult}, chain=${asyncChainResult}`
    })
  } catch (error) {
    testResults.push({
      name: 'Complex Data Processing',
      passed: false,
      message: `Error: ${error}`
    })
  }

  // Test 6: Worker in Function (moved up)
  try {
    const conditionalWorker = new ComlinkWorker<typeof import('./conditional-worker')>(
      new URL('./conditional-worker.ts', import.meta.url)
    )
    
    const functionResult = await conditionalWorker.testWorkerInFunction()
    
    testResults.push({
      name: 'Worker in Function',
      passed: functionResult === 30,
      message: `Function worker: add(10,20)=${functionResult}`
    })
  } catch (error) {
    testResults.push({
      name: 'Worker in Function',
      passed: false,
      message: `Error: ${error}`
    })
  }

  // Test 7: Multiple Workers Management
  try {
    const conditionalWorker = new ComlinkWorker<typeof import('./conditional-worker')>(
      new URL('./conditional-worker.ts', import.meta.url)
    )
    
    const workerCount = await conditionalWorker.createMultipleWorkers(3)
    const results = await conditionalWorker.testAllWorkers()
    
    const expectedResults = [1, 3, 5] // [0+1, 1+2, 2+3]
    const resultsMatch = results.length === 3 && 
      results[0] === expectedResults[0] && 
      results[1] === expectedResults[1] && 
      results[2] === expectedResults[2]
    
    testResults.push({
      name: 'Multiple Workers Management',
      passed: workerCount === 3 && resultsMatch,
      message: `Manager: created=${workerCount}, results=[${results.join(', ')}]`
    })
  } catch (error) {
    testResults.push({
      name: 'Multiple Workers Management',
      passed: false,
      message: `Error: ${error}`
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