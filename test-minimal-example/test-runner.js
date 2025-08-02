import { chromium, firefox, webkit } from '@playwright/test'
import { preview } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function runTestsInBrowser(browserType, browserName) {
  console.log(`\n🌐 Testing in ${browserName}...`)
  
  let browser
  let exitCode = 0

  try {
    // Launch browser
    browser = await browserType.launch({ headless: true })
    const page = await browser.newPage()

    // Collect console logs and errors
    const consoleLogs = []
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('TEST RESULTS:')) {
        consoleLogs.push(msg.text())
      }
    })

    page.on('pageerror', error => {
      console.error(`${browserName} page error:`, error)
    })

    // Navigate to the app
    await page.goto('http://localhost:4173')

    // Wait for tests to complete with longer timeout for complex tests
    await page.waitForSelector('[data-tests-complete="true"]', { timeout: 60000 })

    // Check if all tests passed
    const testsPassed = await page.getAttribute('body', 'data-tests-passed')
    
    // Get test results from page
    const results = await page.evaluate(() => {
      const resultsEl = document.getElementById('results')
      return resultsEl ? resultsEl.innerText : 'No results found'
    })

    console.log(`\n📊 ${browserName} Results:`)
    console.log(results)

    if (testsPassed !== 'true') {
      console.error(`\n❌ ${browserName}: Some tests failed!`)
      exitCode = 1
    } else {
      console.log(`\n✅ ${browserName}: All tests passed!`)
    }

  } catch (error) {
    console.error(`${browserName} test error:`, error)
    exitCode = 1
  } finally {
    if (browser) await browser.close()
  }
  
  return exitCode
}

async function runTests() {
  let server
  let overallExitCode = 0

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

    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Test in multiple browsers
    const browsers = [
      { type: chromium, name: 'Chromium' },
      { type: firefox, name: 'Firefox' },
      // Safari/WebKit only works on macOS
      ...(process.platform === 'darwin' ? [{ type: webkit, name: 'Safari' }] : [])
    ]

    console.log(`\n🚀 Running tests in ${browsers.length} browser(s)...`)

    for (const { type, name } of browsers) {
      try {
        const exitCode = await runTestsInBrowser(type, name)
        if (exitCode !== 0) overallExitCode = 1
      } catch (error) {
        console.error(`Failed to test in ${name}:`, error)
        overallExitCode = 1
      }
    }

    if (overallExitCode === 0) {
      console.log('\n🎉 All browser tests passed!')
    } else {
      console.error('\n💥 Some browser tests failed!')
    }

  } catch (error) {
    console.error('Test runner error:', error)
    overallExitCode = 1
  } finally {
    if (server) await server.close()
    process.exit(overallExitCode)
  }
}

runTests()