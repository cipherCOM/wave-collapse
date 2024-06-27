declare class PrioList<T extends ListElement<T>> {
    private prioAccess;
    private head;
    private prios;
    private prioLookup;
    constructor(prioAccess: (a: T) => number);
    push(item: T): void;
    pop(): T | undefined;
    refresh(item: T, oldPriority: number): void;
    isEmpty(): boolean;
    private insertNodeInPrios;
    private removeNodeFromPrios;
}
declare class ListNode<T extends ListElement<T>> {
    value: T;
    prev: ListNode<T> | undefined;
    next: ListNode<T> | undefined;
    constructor(value: T, prev?: ListNode<T> | undefined, next?: ListNode<T> | undefined);
}
type ListElement<T> = {
    listNode: ListNode<any> | undefined;
};

export { type ListElement, ListNode, PrioList };
