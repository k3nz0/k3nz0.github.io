---
layout: post
title: "Revisiting concurrent data structures"
date: 2019-10-04T11:31:25+02:00
categories: jekyll update
---

# Introduction
Concurrent data structures if implemented carefully can lead to a huge increases in performance.

In this post, we'll try to show that with fancy plots!

We will implement and run benchmarks on different lock-based algorithms.
Our running example is a sorted linked list used to implement a Set abstraction where allowed operations are : 

* *<span style="color:#6b86fb">boolean </span>insert (<span style="color:#6b86fb">Object</span> item)* :
adds an item to the Set and returns <span style="color:green">true</span> if successfully added or <span style="color:red">false</span>  if the item already exists.
* *<span style="color:#6b86fb">boolean </span>remove (<span style="color:#6b86fb">Object</span> item)* : 
removes an item from the Set and returns <span style="color:green">true</span> if successfully removed or <span style="color:red">false</span>  if the item doesn't exist.
* *<span style="color:#6b86fb">boolean </span>contains (<span style="color:#6b86fb">Object</span> item)* :
returns <span style="color:green">true</span> if the item exists, <span style="color:red">false</span> otherwise.

**Note that all items should be comparable (i.e there is a [total order](https://en.wikipedia.org/wiki/Total_order) on the set of all items), otherwise sorting has no meaning.**


# System details 
All the benchmark tests were done in a machine with the following caracteristics. (Huge machine indeed!)
![System details](/assets/images/concurrent-ds/system_details.png)

# Algorithms overview

* **Coarse-grained** : each time a thread wants to do some operation on the Set it locks the entire list. (cf. [code](/assets/images/concurrent-ds/coarse.java))
* **Hand-Over-Hand** : Instead of locking the entire set, when a thread traverses the list, it locks each node when it first visits it, and sometime later releases the lock when leaving it. This algorithm ensures that multiple threads can access multiple nodes in the list at the same time. (cf. [code](/assets/images/concurrent-ds/hoh.java))
* **Optimistic List** : In order  to reduce synchronization costs,  the  optimistic  approach  suggests that  we  search  without  acquiring  locks.   When  the  nodes  are  found, we lock them, and then confirm that they are correct, through a validation process.
If a  synchronization  conflict  causes  the  wrong  nodes  to  be  locked,  we release the locks and restart over again. (cf. [code](optimistic.java))
* **Lazy Linked List** : The validation does not retraverse the entire list. Instead, it checks that the *pred* and the *curr* nodes are not marked as deleted and that the *pred* is still pointing to the *curr*. (cf. [code](/assets/images/concurrent-ds/lazy.java))



In order to test the efficiency of these algorithms, we run them through a serie of tests and depict the throughput as a function of the number of threads varying the update ratio.

For  the  next  analysis,  we’ll  run  the  4  algorithms  on  a  linked-list  with size= 1000 and check the results for update ratios 0%, 10% and 100%.  The duration of the benchmark is set to 2 seconds.

## Coarse-grained
We  notice  a  decreasing  curve.   As  we  increase  the  number  of  threads  the coarse-grained locking algorithms’ throughput decreases.
For all update ratios, we get the highest performance when there is one unique thread.

![coarse](/assets/images/concurrent-ds/coarse.png)

## Hand-Over-Hand
We  notice  that  when  the  number  of  threads  is  low,  the  Hand-Over-Hand locking algorithm behaves worse than the Coarse-grained algorithm. 
This is mainly  due  to  the  fact  that  locking  and  unlocking  each  node  in  a  ”Hand-Over-Hand” manner can be costly.
However, as we increase the number of threads its performance starts to get slightly better :

![H-O-H](/assets/images/concurrent-ds/hoh.png)

## Optimistic List 
As we increase the number of threads, we notice a huge increase of performance for the Optimistic List with wait-free traversal especially when there are no updates.
However, as we increase the update ratio, the optimistic algorithm’s performance starts to decrease.

![Optimistic](/assets/images/concurrent-ds/optimistic.png)

## Lazy List
To improve the performance of the optimistic algorithm, we add to each node a *Boolean* marked field indicating whether that node is in the set or not.
The validation does not retraverse the entire list. Instead, it checks that the *pred* and the *curr* nodes are not marked as deleted and that the *pred* is still pointing to the *curr*.
Avoiding  the  retraversal  for  validation leads to an improvement in performance as the following plot shows.

![Lazy](/assets/images/concurrent-ds/lazy.png)



# Performance comparison 
We  run  the  benchmark  test  on  a  list  with  size=10000 varying the update ratios.
![Comparison 0%](/assets/images/concurrent-ds/comparison1.png)
![Comparison 50%](/assets/images/concurrent-ds/comparison2.png)
![Comparison 100%](/assets/images/concurrent-ds/comparison3.png)

# Conclusion
In practice, the lazy lock-based algorithm outperforms all the 3 others.
This is basically due to the fact that the lazy approach does not require traversals to check up logically removed nodes.
Validation is done in O(1).

On the other hand, the lazy lock-based list does not guarantee progress in the face of arbitrary delays.
Its principal disadvantage is that its methods *add()* and *remove()* are blocking which is not the case for Lock-Free lists.

# Appendix
## Amdahl's law

Amdahl's law is often used in parallel computing to predict the theoretical speedup when using multiple processors.

For example, if a program needs 20 hours using a single processor core, and a particular part of the program which takes one hour to execute cannot be parallelized, while the remaining 19 hours of execution time can be parallelized, then regardless of how many processors are devoted to a parallelized execution of this program, the minimum execution time cannot be less than that critical one hour.
![Amdahl law](https://upload.wikimedia.org/wikipedia/commons/e/ea/AmdahlsLaw.svg)
In fact parallel computing with many processors is useful only for highly parallelizable programs.

For more information check out [Adamhl's law](https://en.wikipedia.org/wiki/Amdahl%27s_law).

# Reference 
* M. Herlihy, N. Shavit. The Art of Multiprocessor Programming. 2008.
