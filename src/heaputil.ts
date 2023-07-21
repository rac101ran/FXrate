class CurrencyPairNode {
    timestamp: number | null;
    currencyPair: string | null;
    exchangeRate: string | null;
    parent: CurrencyPairNode | null;
    left: CurrencyPairNode | null;
    right: CurrencyPairNode | null;
  
    constructor(timestamp: number, currencyPair: string) {
      this.timestamp = timestamp;
      this.currencyPair = currencyPair;
      this.parent = null;
      this.left = null;
      this.right = null;
    }
  }
  
  class MinHeap {
    private root: CurrencyPairNode | null;
  
    constructor() {
      this.root = null;
    }
  
    private swapCurrencyPairs(a: CurrencyPairNode, b: CurrencyPairNode) {
      const tempTimestamp = a.timestamp;
      const tempCurrencyPair = a.currencyPair;
      const exchangeRate = a.exchangeRate;
  
      a.timestamp = b.timestamp;
      a.currencyPair = b.currencyPair;
      a.exchangeRate = b.exchangeRate;
  
      b.timestamp = tempTimestamp;
      b.currencyPair = tempCurrencyPair;
      b.exchangeRate = exchangeRate;
    }
  
    private goUp(node: CurrencyPairNode) {
      if (!node.parent) return;
  
      // Traverse up the tree while the current node's timestamp is smaller than its parent's timestamp
      while (node.parent !== null && node.timestamp < node.parent.timestamp) {
        this.swapCurrencyPairs(node, node.parent);
        node = node.parent;
      }
    }
  
    private goDown(node: CurrencyPairNode) {
      // Traverse down the tree while the current node has at least one child
      while (node.left !== null || node.right !== null) {
        let smallest = node;
  
        // Find the smallest child (if it exists)
        if (node.left !== null && node.left.timestamp < smallest.timestamp) {
          smallest = node.left;
        }
  
        if (node.right !== null && node.right.timestamp < smallest.timestamp) {
          smallest = node.right;
        }
  
        // Swap with the smallest child if necessary, and continue traversal
        if (smallest !== node) {
          this.swapCurrencyPairs(node, smallest);
          node = smallest;
        } else {
          break;
        }
      }
    }
  
    insert(timestamp: number, currencyPair: string) {
      const newNode = new CurrencyPairNode(timestamp, currencyPair);
  
      if (this.root === null) {
        this.root = newNode;
      } else {
        let currentNode = this.root;
        while (true) {
          if (timestamp < currentNode.timestamp) {
            if (currentNode.left === null) {
              currentNode.left = newNode;
              newNode.parent = currentNode;
              break;
            }
            currentNode = currentNode.left;
          } else {
            if (currentNode.right === null) {
              currentNode.right = newNode;
              newNode.parent = currentNode;
              break;
            }
            currentNode = currentNode.right;
          }
        }
      }
  
      // Perform goUp to move the newly inserted node to its correct position in the heap
      this.goUp(newNode);
    }
  
    private getMinChild(node: CurrencyPairNode): CurrencyPairNode | null {
      // Return the smallest child of the given node (if it exists)
      if (node.left === null && node.right === null) return null;
      if (node.left === null) return node.right;
      if (node.right === null) return node.left;
      return node.left.timestamp < node.right.timestamp ? node.left : node.right;
    }
  
    removeTop(): CurrencyPairNode | null {
      if (this.root === null) return null;
  
      const top = this.root;
  
      if (this.root.left === null && this.root.right === null) {
        this.root = null;
      } else {
        let currentNode = this.root;
        while (currentNode.left !== null || currentNode.right !== null) {
          const smallestChild = this.getMinChild(currentNode);
          if (smallestChild === null) break;
          this.swapCurrencyPairs(currentNode, smallestChild);
          currentNode = smallestChild;
        }
  
        // After moving the smallest node to the root, we need to go down the tree to its correct position
        this.goDown(currentNode);
      }
  
      return top;
    }
  
    peek(): CurrencyPairNode | null {
      // Return the root node (top) of the heap
      return this.root;
    }
  }
  