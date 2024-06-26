import { beforeAll, bench, expect } from 'vitest'
import { WaveCollapse } from '../src'

beforeAll(async () => {})

bench('can handle basic small grids', () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ['A', 'A', 'A', 'A'] }],
  })
  const size = 100
  const level = wfc.generate(size, size)
  if (!level) throw new Error('Level is null')
  expect(level.length).to.equal(size)
  expect(level[0].length).to.equal(size)
  level.forEach((row) => expect(row.every((tileIndex) => tileIndex === 0)).true)
})

bench('can handle basic middle grids', () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ['A', 'A', 'A', 'A'] }],
  })
  const size = 300
  const level = wfc.generate(size, size)
  if (!level) throw new Error('Level is null')
  expect(level.length).to.equal(size)
  expect(level[0].length).to.equal(size)
  level.forEach((row) => expect(row.every((tileIndex) => tileIndex === 0)).true)
})

bench('can handle basic large grids', () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ['A', 'A', 'A', 'A'] }],
  })
  const size = 1_000
  const level = wfc.generate(size, size)
  if (!level) throw new Error('Level is null')
  expect(level.length).to.equal(size)
  expect(level[0].length).to.equal(size)
  level.forEach((row) => expect(row.every((tileIndex) => tileIndex === 0)).true)
})

bench('can handle three-tiles small grids', () => {
  const wfc = new WaveCollapse({
    tiles: [
      { edges: ['A', 'A', 'A', 'A'] },
      { edges: ['B', 'B', 'B', 'B'] },
      { edges: ['C', 'C', 'C', 'C'] },
    ],
  })
  const size = 100
  const level = wfc.generate(size, size)
  if (!level) throw new Error('Level is null')
  expect(level.length).to.equal(size)
  expect(level[0].length).to.equal(size)
})

bench('performs reasonable well on more complex large grids', () => {
  const wfc = new WaveCollapse({
    tiles: [
      // edge types: A=outer, B=wall, C=floor
      { edges: ['AAA', 'ABC', 'ABC', 'AAA'] }, // 0: top-left corner
      { edges: ['AAA', 'AAA', 'CBA', 'ABC'] }, // 1: top-right corner
      { edges: ['ABC', 'CBA', 'AAA', 'AAA'] }, // 2: bottom-left corner
      { edges: ['CBA', 'AAA', 'AAA', 'CBA'] }, // 3: bottom-right corner
      { edges: ['AAA', 'ABC', 'CCC', 'ABC'] }, // 4: top wall
      { edges: ['CBA', 'AAA', 'CBA', 'CCC'] }, // 5: right wall
      { edges: ['CCC', 'CBA', 'AAA', 'CBA'] }, // 6: bottom wall
      { edges: ['ABC', 'CCC', 'ABC', 'AAA'] }, // 7: left wall
      {
        edges: ['CCC', 'CCC', 'CCC', 'CCC'],
        type: 'floor',
        exceptions: ['floor'],
      }, // 8: floor
    ],
  })
  wfc.generate(100, 100)
})
