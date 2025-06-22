/**
 * The code follows the lazy list-based set of Ch.9 of Herlihy and Shavit's book:
 * "The Art of Multiprocessor Programming".
 */
public class LazyListBasedSet {

    final public Node head;
    final public Node tail;

    public LazyListBasedSet() {
        head = new Node(Integer.MIN_VALUE);
        tail = new Node(Integer.MAX_VALUE);
        head.next = tail;
        tail.next = null;
    }

    private boolean validate(Node pred, Node curr) {
        return !pred.marked && pred.next == curr;
    }

    public boolean addInt(int v) {
        while (true) {
            Node pred = head;
            Node curr = head.next;
            while (curr.value < v) {
                pred = curr;
                curr = curr.next;
            }
            pred.lock();
            curr.lock();
            try {
                if (validate(pred, curr)) {
                    if (curr.value == v) {
                        return false;
                    } else {
                        Node node = new Node(v);
                        node.next = curr;
                        pred.next = node;
                        return true;
                    }
                }
            } finally {
                curr.unlock();
                pred.unlock();
            }
        }
    }

    public boolean removeInt(int v) {
        while (true) {
            Node pred = head;
            Node curr = head.next;
            while (curr.value < v) {
                pred = curr;
                curr = curr.next;
            }
            pred.lock();
            try {
                curr.lock();
                try {
                    if (validate(pred, curr)) {
                        if (curr.value != v) {
                            return false;
                        } else {
                            curr.marked = true;
                            pred.next = curr.next;
                            return true;
                        }
                    }
                } finally {
                    curr.unlock();
                }
            } finally {
                pred.unlock();
            }
        }
    }

    public boolean containsInt(int v) {
        Node curr = head;
        while (curr.value < v) {
            curr = curr.next;
        }
        return curr.value == v && !curr.marked;
    }

    public int size() {
        int cpt = 0;
        Node curr = head;
        while (curr.value < Integer.MAX_VALUE)
            curr = curr.next;
        if (!curr.marked)
            cpt++;
        return cpt;
    }

    public void clear() {
        head.next = tail;
    }
}
