public class HandOverHandListBasedSet {
    // sentinel nodes
    private Node head;
    private Node tail;

    public HandOverHandListBasedSet() {
        Node min = new Node(Integer.MIN_VALUE);
        Node max = new Node(Integer.MAX_VALUE);
        min.next = max;
        head = min;
    }
    
    public boolean addInt(int item) {
        head.lock();
        Node pred = head;
        try {
            Node curr = pred.next;
            curr.lock();
            try {
                while(curr.key < item) {
                    pred.unlock();
                    pred = curr;
                    curr = curr.next;
                    curr.lock();
                }
                if (curr.key == item) {
                    return false;
                }        
                Node newNode = new Node(item, curr);
                pred.next = newNode;
                return true;
            }
            finally {
                curr.unlock();
            }
        }
        finally {
            pred.unlock();
        }
    }

    public boolean removeInt(int item) {
        Node pred = null;
        Node curr = null;
        head.lock();
        try {
            pred = head;
            curr = pred.next;
            curr.lock();
            try {
                while (curr.key < item) {
                    pred.unlock();
                    pred = curr; 
                    curr = curr.next;
                    curr.lock();
                }
                if (curr.key == item) {
                    pred.next = curr.next;
                    return true;
                }
                return false;
            } finally {
                curr.unlock();
            }
        } finally {
          pred.unlock();
        }
    }


    public boolean containsInt(int item) {
        Node pred = head;
        head.lock();
        try {
            Node curr = pred.next;
            curr.lock();
            try {
                while(curr.key < item) {
                    pred.unlock();
                    pred = curr;
                    curr = curr.next;
                    curr.lock();
                }
                if (curr.key == item) {
                    return true;
                } else return false;
            } finally {
                curr.unlock();
            }
        } finally {
            pred.unlock();
        }
    }
    
    public class Node {
        final int key;
        Node next;
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

    public void clear() {
       head = new Node(Integer.MIN_VALUE);
       head.next = new Node(Integer.MAX_VALUE);
    }
    
    /**
     * Non atomic and thread-unsafe
     */
    public int size() {
        int count = 0;
        Node curr = head.next;
        while (curr.key != Integer.MAX_VALUE) {
            curr = curr.next;
            count++;
        }
        return count;
    }
}