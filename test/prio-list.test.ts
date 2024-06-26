import { beforeEach, describe, expect, test } from 'vitest'
import { ListElement, PrioList } from '../src/prio-list'

interface TestElement extends ListElement<TestElement> {
  value: number
  priority: number
}

describe.only('PrioList', () => {
  let prioList: PrioList<TestElement>

  beforeEach(() => {
    prioList = new PrioList<TestElement>((a) => a.priority)
  })

  const createTestElement = (value: number, priority: number): TestElement => ({
    value,
    priority,
    listNode: undefined,
  })

  test('should create an empty PrioList', () => {
    expect(prioList.isEmpty()).toBe(true)
  })

  test('should push and pop elements correctly', () => {
    const element1 = createTestElement(1, 1)
    const element2 = createTestElement(2, 2)
    const element3 = createTestElement(3, 3)

    prioList.push(element1)
    prioList.push(element2)
    prioList.push(element3)

    expect(prioList.isEmpty()).toBe(false)
    expect(prioList.pop()).toBe(element1)
    expect(prioList.pop()).toBe(element2)
    expect(prioList.pop()).toBe(element3)
    expect(prioList.isEmpty()).toBe(true)
  })

  test('should maintain priority order when pushing elements', () => {
    const element1 = createTestElement(1, 3)
    const element2 = createTestElement(2, 1)
    const element3 = createTestElement(3, 2)

    prioList.push(element1)
    prioList.push(element2)
    prioList.push(element3)

    expect(prioList.pop()).toBe(element2)
    expect(prioList.pop()).toBe(element3)
    expect(prioList.pop()).toBe(element1)
  })

  test('should handle elements with the same priority', () => {
    const element1 = createTestElement(1, 1)
    const element2 = createTestElement(2, 1)
    const element3 = createTestElement(3, 1)

    prioList.push(element1)
    prioList.push(element2)
    prioList.push(element3)

    expect(prioList.pop()).toBe(element1)
    expect(prioList.pop()).toBe(element2)
    expect(prioList.pop()).toBe(element3)
  })

  test('should refresh element priority correctly', () => {
    const element1 = createTestElement(1, 3)
    const element2 = createTestElement(2, 2)
    const element3 = createTestElement(3, 1)

    prioList.push(element1)
    prioList.push(element2)
    prioList.push(element3)

    element3.priority = 4
    prioList.refresh(element3, 1)

    expect(prioList.pop()).toBe(element2)
    expect(prioList.pop()).toBe(element1)
    expect(prioList.pop()).toBe(element3)
  })

  test('should throw error when refreshing element not in the list', () => {
    const element = createTestElement(1, 1)
    expect(() => prioList.refresh(element, 1)).toThrow(
      'Item is not in the list',
    )
  })

  test('should handle pushing and popping a large number of elements', () => {
    const numElements = 1000
    const elements = Array.from({ length: numElements }, (_, i) =>
      createTestElement(i, Math.random()),
    )

    elements.forEach((element) => prioList.push(element))

    const poppedElements = []
    while (!prioList.isEmpty()) {
      poppedElements.push(prioList.pop())
    }
    const sortedElements = [...elements].sort(
      (a, b) => a!.priority - b!.priority,
    )

    expect(poppedElements).toHaveLength(numElements)
    expect(poppedElements).toEqual(sortedElements)
  })

  test('should handle refreshing priorities of multiple elements', () => {
    const element1 = createTestElement(1, 3)
    const element2 = createTestElement(2, 2)
    const element3 = createTestElement(3, 1)

    prioList.push(element1)
    prioList.push(element2)
    prioList.push(element3)

    element1.priority = 4
    prioList.refresh(element1, 3)

    element2.priority = 5
    prioList.refresh(element2, 2)

    element3.priority = 6
    prioList.refresh(element3, 1)

    expect(prioList.pop()).toBe(element1)
    expect(prioList.pop()).toBe(element2)
    expect(prioList.pop()).toBe(element3)
  })

  test('should handle popping from an empty list', () => {
    expect(prioList.pop()).toBeUndefined()
  })
})
