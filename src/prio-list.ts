export class PrioList<T extends ListElement<T>> {
  private head: ListNode<T> | undefined
  private prios: number[] = []
  private prioLookup: Map<number, ListNode<T>> = new Map()

  constructor(private prioAccess: (a: T) => number) {}

  push(item: T) {
    const node = new ListNode(item)
    item.listNode = node

    this.insertNodeInPrios(node)
    if (!this.head || this.head.prev == node) {
      this.head = node
    }
  }

  pop(): T | undefined {
    if (!this.head) {
      return undefined
    }
    const node = this.head
    this.removeNodeFromPrios(node, this.prioAccess(node.value))
    this.head = node.next

    node.value.listNode = undefined
    return node.value
  }

  refresh(item: T, oldPriority: number) {
    if (!item.listNode) {
      throw new Error('Item is not in the list')
    }
    if (this.prioAccess(item) == oldPriority) {
      return
    }

    this.removeNodeFromPrios(item.listNode, oldPriority)
    if (this.head == item.listNode) {
      this.head = item.listNode.next
    }
    this.insertNodeInPrios(item.listNode)
    if (!this.head || this.head.prev == item.listNode) {
      this.head = item.listNode
    }
  }

  isEmpty() {
    return !this.head
  }

  private insertNodeInPrios(node: ListNode<T>) {
    const prio = this.prioAccess(node.value)
    let other: ListNode<T> | undefined
    if ((other = this.prioLookup.get(prio))) {
      // found the same prio, insert after and update prioLookup
      if (other.next) other.next.prev = node
      node.next = other.next
      node.prev = other
      other.next = node
      this.prioLookup.set(prio, node)
      return
    }

    // find the prio to insert before
    let foundIdx: number | undefined
    for (let [idx, other] of this.prios.entries()) {
      if (other > prio) {
        foundIdx = idx
        break
      }
    }

    if (foundIdx === undefined) {
      // insert at the end
      const last = this.prioLookup.get(this.prios[this.prios.length - 1])
      if (last) {
        last.next = node
        node.prev = last
      }
      this.prios.push(prio)
      this.prioLookup.set(prio, node)
      return
    }

    // insert before the foundIdx
    other = this.prioLookup.get(this.prios[foundIdx])!
    if (other.prev) other.prev.next = node
    node.prev = other.prev
    node.next = other
    other.prev = node
    this.prios.splice(foundIdx, 0, prio)
    this.prioLookup.set(prio, node)
  }

  private removeNodeFromPrios(node: ListNode<T>, prio: number) {
    if (node.prev) node.prev.next = node.next
    if (node.next) node.next.prev = node.prev

    if (node !== this.prioLookup.get(prio)) {
      return
    }

    if (!node.prev || this.prioAccess(node.prev.value) != prio) {
      // last node with this prio
      this.prioLookup.delete(prio)
      this.prios.splice(this.prios.indexOf(prio), 1)
      return
    }

    this.prioLookup.set(prio, node.prev)
  }
}

export class ListNode<T extends ListElement<T>> {
  constructor(
    public value: T,
    public prev: ListNode<T> | undefined = undefined,
    public next: ListNode<T> | undefined = undefined,
  ) {}
}

export type ListElement<T> = {
  listNode: ListNode<any> | undefined
}
