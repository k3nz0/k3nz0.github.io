public class OptimisticListBasedSet{
    final private Node head;
   	
    public OptimisticListBasedSet() {
        Node min = new Node(Integer.MIN_VALUE);
        Node max = new Node(Integer.MAX_VALUE);
        min.next  = max;
        head = min;
    }

    private boolean validate(Node pred, Node curr) {
    	Node node = head;
    	while (node.key <= pred.key) {
	        if (node == pred)
		        return pred.next == curr;
	        node = node.next;
	    }
	    return false;
    }
    
    public boolean addInt(int value) {
        while (true) {
            Node pred = head;
            Node curr = pred.next;
            while (curr.key < value) {
                pred = curr;
                curr = curr.next;
            }
            pred.lock(); curr.lock();
            try {
                if (validate(pred,curr)) {
                    if (curr.key == value) {
                        return false;
                    } else {
                        Node node = new Node(value, curr);
                        pred.next = node;
                        return true;
                    }
                }
            } finally {
                pred.unlock(); curr.unlock();
            }
        }
    }

    public boolean removeInt(int value) {
        while (true) {
            Node pred = head;
            Node curr = pred.next;
            while (curr.key < value) {
                pred = curr;
                curr = curr.next;
            }
            pred.lock(); curr.lock();
            try {
                if (validate(pred,curr)) {
                    if (curr.key == value) {
                        pred.next = curr.next;
                        return true;
                    } else {
                        return false;
                    }
                }
            } finally {
                pred.unlock(); curr.unlock();
            }
        }
    }
    public boolean containsInt(int value) {
        Node pred = head;
        Node curr = pred.next;
        while (curr.key < value) {
            pred = curr;
            curr = curr.next;
        }
	    return (curr.key == value);
    }

    /**
     * This method is not thread-safe.
     */
    public int size() {
        int n = 0;
        Node node = head;
        while (node.next.key < Integer.MAX_VALUE) {
            n++;
            node = node.next;
        }
        return n;
    }

    public void clear() {
        Node max = new Node(Integer.MAX_VALUE);
        head.next = max;
    }

    public class Node {
        final int key;
        volatile Node next;
	    final Lock lock;

        public Node(int key, Node next) {
            this.key = key;
            this.next = next;
            this.lock = new ReentrantLock();
	    }

        public Node(int key) {
            this(key, null);
        }
        
        public void lock() {
    	    this.lock.lock();
    	}
        
        public void unlock() {
	        this.lock.unlock();
	    }
    }    
}
