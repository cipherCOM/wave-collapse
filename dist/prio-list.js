// src/prio-list.ts
var PrioList = class {
  constructor(prioAccess) {
    this.prioAccess = prioAccess;
  }
  head;
  prios = [];
  prioLookup = /* @__PURE__ */ new Map();
  push(item) {
    const node = new ListNode(item);
    item.listNode = node;
    this.insertNodeInPrios(node);
    if (!this.head || this.head.prev == node) {
      this.head = node;
    }
  }
  pop() {
    if (!this.head) {
      return void 0;
    }
    const node = this.head;
    this.removeNodeFromPrios(node, this.prioAccess(node.value));
    this.head = node.next;
    node.value.listNode = void 0;
    return node.value;
  }
  refresh(item, oldPriority) {
    if (!item.listNode) {
      throw new Error("Item is not in the list");
    }
    if (this.prioAccess(item) == oldPriority) {
      return;
    }
    this.removeNodeFromPrios(item.listNode, oldPriority);
    if (this.head == item.listNode) {
      this.head = item.listNode.next;
    }
    this.insertNodeInPrios(item.listNode);
    if (!this.head || this.head.prev == item.listNode) {
      this.head = item.listNode;
    }
  }
  isEmpty() {
    return !this.head;
  }
  insertNodeInPrios(node) {
    const prio = this.prioAccess(node.value);
    let other;
    if (other = this.prioLookup.get(prio)) {
      if (other.next) other.next.prev = node;
      node.next = other.next;
      node.prev = other;
      other.next = node;
      this.prioLookup.set(prio, node);
      return;
    }
    let foundIdx;
    for (let [idx, other2] of this.prios.entries()) {
      if (other2 > prio) {
        foundIdx = idx;
        break;
      }
    }
    if (foundIdx === void 0) {
      const last = this.prioLookup.get(this.prios[this.prios.length - 1]);
      if (last) {
        last.next = node;
        node.prev = last;
      }
      this.prios.push(prio);
      this.prioLookup.set(prio, node);
      return;
    }
    other = this.prioLookup.get(this.prios[foundIdx]);
    if (other.prev) other.prev.next = node;
    node.prev = other.prev;
    node.next = other;
    other.prev = node;
    this.prios.splice(foundIdx, 0, prio);
    this.prioLookup.set(prio, node);
  }
  removeNodeFromPrios(node, prio) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node !== this.prioLookup.get(prio)) {
      return;
    }
    if (!node.prev || this.prioAccess(node.prev.value) != prio) {
      this.prioLookup.delete(prio);
      this.prios.splice(this.prios.indexOf(prio), 1);
      return;
    }
    this.prioLookup.set(prio, node.prev);
  }
};
var ListNode = class {
  constructor(value, prev = void 0, next = void 0) {
    this.value = value;
    this.prev = prev;
    this.next = next;
  }
};
export {
  ListNode,
  PrioList
};
//# sourceMappingURL=prio-list.js.map