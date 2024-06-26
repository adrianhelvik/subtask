import { setTimeout as sleep } from 'node:timers/promises'
import { v4 as uuid } from 'uuid'
import clear from './clear.mjs'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'

/*
 * TODO: Refactor to use Ava.
 */

const src = path.resolve(new URL(import.meta.url).pathname, '..', '..', 'src')

process.env.NODE_ENV = 'test'

let erroredFiles = []
let successes = []
let completed = {}
let specs = []

global.it = function (name, fn) {
  specs.push({ name, fn })
}

void (async function main() {
  completed = {}
  if (process.argv.includes('--watch')) {
    await loop()
  } else {
    await runAllTests()
  }
})()

async function runAllTests() {
  console.log(chalk.cyan('Running all tests once...'))
  const specFiles = await getSpecFiles(src)
  await import('./testSetup.mjs?' + uuid()).then(module => {
    if (typeof module.default === 'function') return module.default()
  })
  for (const file of specFiles) {
    await testFile(file)
  }
  await import(`./testTeardown.mjs?${uuid()}`).then(module => {
    if (typeof module.default === 'function') return module.default()
  })
  if (erroredFiles.length) {
    console.error(
      `The following files had failing tests:\n${erroredFiles.map(
        _ => '- ' + _,
      )}`,
    )
    process.exit(1)
  }
  process.exit(0)
}

async function loop() {
  successes = []
  const specFiles = await getSpecFiles(src)
  const changed = []
  for (const file of specFiles) {
    if (await isChanged(file)) changed.push(file)
  }
  if (changed.length) {
    clear()
    await import('./testSetup.mjs?' + uuid()).then(module => {
      if (typeof module.default === 'function') return module.default()
    })
    changed.map(dirstr).forEach(x => console.log(x))
    for (const file of erroredFiles) await testFile(file)
    for (const file of changed) await testFile(file)
  }
  await sleep(100)
  await import(`./testTeardown.mjs?${uuid()}`).then(module => {
    if (typeof module.default === 'function') return module.default()
  })
  loop()
}

async function getSpecFiles(dir, files = []) {
  const dirFiles = await fs.promises.readdir(dir)
  for (const file of dirFiles) {
    const fpath = path.resolve(dir, file)
    const stat = await fs.promises.lstat(fpath)
    if (stat.isDirectory()) {
      await getSpecFiles(fpath, files)
    } else if (fpath.endsWith('.spec.mjs')) {
      files.push(fpath)
    }
  }
  return files
}

async function testFile(file) {
  console.log(chalk.gray(`Running "${dirstr(file)}"`))
  let errored = false
  try {
    specs = []
    await import(file + '?' + uuid())
    for (const { name, fn } of specs) {
      try {
        await fn()
        console.log(chalk.green(`Success: "${name}"`))
      } catch (e) {
        errored = true
        console.log(chalk.red(`Failure in ${name}!\n\n${estr(e)}`))
      }
    }
    if (!errored) console.log(chalk.green(`Success: "${dirstr(file)}"`))
    else console.log(chalk.red(`Failure in: "${dirstr(file)}"`))
  } catch (e) {
    console.log(chalk.red(`Failure!\n${estr(e)}`))
    errored = true
  }
  if (errored && !erroredFiles.includes(file)) erroredFiles.push(file)
  else erroredFiles = erroredFiles.filter(x => x !== file)
  return !errored
}

function estr(error) {
  const stack =
    '\n' +
    chalk.bold.red(error.message) +
    '\n\n' +
    error.stack
      .split('\n')
      .map(s => '  ' + s)
      .join('\n') +
    '\n'

  return chalk.red(stack)
}

async function isChanged(file) {
  let prev = completed[file]

  completed[file] = await fs.promises.readFile(file, 'utf8')

  return prev !== completed[file]
}

function dirstr(str) {
  if (str.startsWith(src)) return str.replace(src, '<src>')
  return str
}
