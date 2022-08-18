

class Queue {
  elements: any;
  head: number;
  tail: number;
  constructor() {
    this.elements = {};
    this.head = 0;
    this.tail = 0;
  }

  enqueue(element: number) {
    this.elements[this.tail] = element;
    this.tail++;
  }

  dequeue() {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }

  peek() {
    return this.elements[this.head];
  }

  get length() {
    return this.tail - this.head;
  }

  get isEmpty() {
    return this.length === 0;
  }
}

class Graph {
  // defining vertex array and
  // adjacent list

  noOfVertices: number;
  AdjList: Map<any, any>;
  constructor(noOfVertices: number) {
    this.noOfVertices = noOfVertices;
    this.AdjList = new Map();
  }

  // functions to be implemented

  addVertex(v: any) {
    // initialize the adjacent list with a
    // null array
    this.AdjList.set(v, []);
  }

  addEdge(v: any, w: any) {
    // get the list for vertex v and put the
    // vertex w denoting edge between v and w
    this.AdjList.get(v).push(w);

    // Since graph is undirected,
    // add an edge from w to v also
    this.AdjList.get(w).push(v);
  }

  // Prints the vertex and adjacency list
  printGraph() {
    // get all the vertices
    const getKeys = this.AdjList.keys();

    // iterate over the vertices
    for (const i of getKeys) {
      // great the corresponding adjacency list
      // for the vertex
      const getValues = this.AdjList.get(i);
      let conc = "";

      // iterate over the adjacency list
      // concatenate the values into a string
      for (const j of getValues) conc += j + " ";

      // print the vertex and its adjacency list
      console.log(i + " -> " + conc);
    }
  }

  bfs(startingNode: any) {
    // create a visited object
    const visited: any = {};

    // Create an object for queue
    const q = new Queue();

    // add the starting node to the queue
    visited[startingNode] = true;
    q.enqueue(startingNode);

    // loop until queue is empty
    while (!q.isEmpty) {
      // get the element from the queue
      const getQueueElement = q.dequeue();

      // passing the current vertex to callback function
      console.log(getQueueElement);

      // get the adjacent list for current vertex
      const getList = this.AdjList.get(getQueueElement);

      // loop through the list and add the element to the
      // queue if it is not processed yet
      for (const i in getList) {
        const neigh = getList[i];

        if (!visited[neigh]) {
          visited[neigh] = true;
          q.enqueue(neigh);
        }
      }
    }
  }
  // dfs(v)
}

function main() {
  // Using the above implemented graph class
  const g = new Graph(6);
  const vertices = ["A", "B", "C", "D", "E", "F"];

  // adding vertices
  for (let i = 0; i < vertices.length; i++) {
    g.addVertex(vertices[i]);
  }

  // adding edges
  g.addEdge("A", "B");
  g.addEdge("A", "D");
  g.addEdge("A", "E");
  g.addEdge("B", "C");
  g.addEdge("D", "E");
  g.addEdge("E", "F");
  g.addEdge("E", "C");
  g.addEdge("C", "F");

  // prints all vertex and
  // its adjacency list
  // A -> B D E
  // B -> A C
  // C -> B E F
  // D -> A E
  // E -> A D F C
  // F -> E C
  g.printGraph();

  console.log("BFS");
  g.bfs("A");
}

main();
