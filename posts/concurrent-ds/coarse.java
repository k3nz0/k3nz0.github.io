public class CoarseGrainedListBasedSet {
    // sentinel nodes
    private Node head;
    private Node tail;
    private Lock lock = new ReentrantLock();

    public CoarseGrainedListBasedSet(){     
		head = new Node(Integer.MIN_VALUE);
		tail = new Node(Integer.MAX_VALUE);
        head.next = tail;
    }
    
    /*
     * Insert
     */
    public boolean addInt(int item){
		lock.lock(); 
		try {  
			Node pred = head;
			Node curr = head.next;
			while (curr.key < item){
				pred = curr;
				curr = pred.next;
			}
			if (curr.key == item) {
				return false;
			}
			else {
				Node node = new Node(item);
				node.next=curr;
				pred.next=node;
				return true;
			}
		}
		finally{
			lock.unlock();
		} 	 
    }
    
    /*
     * Remove
     */
    public boolean removeInt(int item){
		lock.lock(); 
		try {  
			Node pred = head;
			Node curr = head.next;
			while (curr.key < item) {
				pred = curr;
				curr = pred.next;
			}
			if (curr.key == item) {
				pred.next = curr.next;
				return true;
			} else {
				return false;
			}
		} finally{
			lock.unlock();
		} 
    }
    
    /*
     * Contains
     */
    public boolean containsInt(int item){
		lock.lock();
		try {
			Node pred = head;
			Node curr = head.next;
			while (curr.key < item) {
				pred = curr;
				curr = pred.next;
			}
			if (curr.key == item){
				return true;
			} else {
				return false;
			}
			} finally{
			lock.unlock();
		} 
    }
 
    private class Node {
		Node(int item) {
			key = item;
			next = null;
		}
		public int key;
		public Node next;
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
