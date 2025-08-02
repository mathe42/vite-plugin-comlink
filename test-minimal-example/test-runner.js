import { chromium } from '@playwright/test'
import { preview } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function runTests() {
  let server
  let browser
  let exitCode = 0

  try {
    // Build is already done by npm script

    // Start preview server
    console.log('Starting preview server...')
    server = await preview({
      root: __dirname,
      preview: {
        port: 4173
      }
    })

    // Launch browser
    console.log('Launching browser...')
    browser = await chromium.launch()
    const page = await browser.newPage()

    // Collect console logs
    const consoleLogs = []
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('TEST RESULTS:')) {
        consoleLogs.push(msg.text())
      }
    })

    // Navigate to the app
    await page.goto('http://localhost:4173')

    // Wait for tests to complete
    await page.waitForSelector('[data-tests-complete="true"]', { timeout: 30000 })

    // Check if all tests passed
    const testsPassed = await page.getAttribute('body', 'data-tests-passed')
    
    // Get test results from page
    const results = await page.evaluate(() => {
      const resultsEl = document.getElementById('results')
      return resultsEl ? resultsEl.innerText : 'No results found'
    })

    console.log('\n' + results)

    if (testsPassed !== 'true') {
      console.error('\n❌ Some tests failed!')
      exitCode = 1
    } else {
      console.log('\n✅ All tests passed!')
    }

  } catch (error) {
    console.error('Test runner error:', error)
    exitCode = 1
  } finally {
    if (browser) await browser.close()
    if (server) await server.close()
    process.exit(exitCode)
  }
}

runTests()