let peer = null;
let myStream = null;
let currentCall = null;
let currentDataConnection = null;
let socket = null;
let isSearching = false;
let isConnected = false;

async function init() {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = myStream;
  } catch (err) {
    alert("Allow camera access to start.");
    return;
  }

  socket = io();

  peer = new Peer(undefined, {
    host: location.hostname,
    port: location.port || 443, // Render uses HTTPS (port 443)
    path: "/peerjs",
  });

  peer.on("open", (id) => {
    console.log("My Peer ID:", id);
    document.getElementById("status").innerText = "Online";
    findMatch();
  });

  peer.on("call", (call) => {
    if (isConnected) return;
    call.answer(myStream);
    handleCall(call);
  });

  peer.on("connection", (conn) => {
    if (isConnected) return;
    handleConnection(conn);
  });
}

function findMatch() {
  if (isSearching || isConnected) return;
  isSearching = true;
  document.getElementById("searchOverlay").classList.add("active");
  logSys("Searching...");
  if (socket && socket.id) socket.emit("join-queue", peer.id);
}

socket.on("match-found", (partnerPeerId) => {
  console.log("Matched:", partnerPeerId);
  isSearching = false;
  document.getElementById("searchOverlay").classList.remove("active");
  connectToPartner(partnerPeerId);
});

function connectToPartner(id) {
  const call = peer.call(id, myStream);
  handleCall(call);
  const conn = peer.connect(id);
  handleConnection(conn);
}

function handleCall(call) {
  currentCall = call;
  isConnected = true;
  const remoteVid = document.getElementById("remoteVideo");
  call.on("stream", (remoteStream) => { remoteVid.srcObject = remoteStream; });
  call.on("close", () => { endSession(); });
  call.on("error", (err) => { console.error(err); });
}

function handleConnection(conn) {
  currentDataConnection = conn;
  conn.on("open", () => { logSys("Connected!"); });
  conn.on("data", (data) => {
    const div = document.createElement("div"); div.className = "msg stranger"; div.textContent = data;
    document.getElementById("chatLog").appendChild(div); scrollToBottom();
  });
  conn.on("close", () => { endSession(); });
}

function sendMsg() {
  const input = document.getElementById("msgInput");
  const txt = input.value.trim();
  if (!txt || !currentDataConnection) return;
  const div = document.createElement("div"); div.className = "msg you"; div.textContent = txt;
  document.getElementById("chatLog").appendChild(div); scrollToBottom();
  currentDataConnection.send(txt); input.value = "";
}

function nextChat() {
  if (currentCall) currentCall.close();
  if (currentDataConnection) currentDataConnection.close();
  endSession(); findMatch();
}

function stopChat() {
  if (currentCall) currentCall.close();
  if (currentDataConnection) currentDataConnection.close();
  endSession(); logSys("Stopped.");
}

function endSession() {
  isConnected = false;
  currentCall = null; currentDataConnection = null;
  document.getElementById("remoteVideo").srcObject = null;
  if (!isSearching) logSys("Stranger left.");
}

function logSys(msg) {
  const div = document.createElement("div"); div.className = "sys"; div.textContent = msg;
  document.getElementById("chatLog").appendChild(div); scrollToBottom();
}

function scrollToBottom() { document.getElementById("chatLog").scrollTop = document.getElementById("chatLog").scrollHeight; }
init();
