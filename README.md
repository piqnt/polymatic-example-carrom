# Carrom - Polymatic Example

This is a demo implementation of Carrom using:
- [Polymatic](https://github.com/piqnt/polymatic) framework
- [Planck/Box2D](https://github.com/piqnt/planck) physics engine
- [Preact](https://preactjs.com/) and [Preact Signals](https://github.com/preactjs/signals)
- [Socket.io](https://socket.io/)

Play the computer, a friend on the same screen, or a friend online. Sink all nine of your coins before the other side, and cover the queen on the way.

To play online, choose the globe and create a room, and give the room id to the other player to join with. The first two in the room get a side each at random, and anyone joining after them watches. Online the server runs the physics and the rules (`src/room-server`), with the same middlewares as the offline game, and each browser draws what it sends (`src/runtime/RoomClient.ts`).

[Play Live Demo](https://piqnt.github.io/polymatic-example-carrom/)

### How to run the code

To run or build the source code in this repository you need to have node.js/npm installed.

Install this project dependencies:

```sh
npm install
```

To run the game server and the client locally:

```sh
npm run dev
```

This will print out the url where you can open the project. Two browser tabs can play each other in a room.

To build the client, which also works as a static site without the server (with no online play):

```sh
npm run build
```

In production first build the client, then start the server:

```sh
npm run build
npm start
```
