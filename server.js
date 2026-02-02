const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ExpressPeerServer } = require("peer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/peerjs",
});
app.use("/peerjs", peerServer);

let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-queue", (peerId) => {
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift();
      if (partner.peerId === peerId) {
        waitingUsers.push(partner);
        return;
      }
      console.log("Matched:", partner.peerId, "with", peerId);
      io.to(partner.socketId).emit("match-found", peerId);
      io.to(socket.id).emit("match-found", partner.peerId);
    } else {
      waitingUsers.push({ peerId, socketId: socket.id });
    }
  });

  socket.on("leave-queue", () => {
    waitingUsers = waitingUsers.filter((u) => u.socketId !== socket.id);
  });

  socket.on("next-partner", () => {});

  socket.on("disconnect", () => {
    waitingUsers = waitingUsers.filter((u) => u.socketId !== socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
