const io = require("socket.io-client");

async function testNotepadSync() {
  console.log("Testing instantaneous Notepad sync for /anil6...");

  const client1 = io("http://localhost:3000", { transports: ["websocket"] });
  const client2 = io("http://localhost:3000", { transports: ["websocket"] });

  await new Promise((resolve, reject) => {
    client1.on("connect", () => {
      console.log("Client 1 (Anil) joined /anil6");
      client1.emit("join-room", { roomId: "anil6", user: { id: "user_anil" } });
    });

    client2.on("connect", () => {
      console.log("Client 2 (Friend) joined /anil6");
      client2.emit("join-room", { roomId: "anil6", user: { id: "user_friend" } });
    });

    client2.on("code-update", (data) => {
      console.log("⚡ Friend instantly received typed message in /anil6:", JSON.stringify(data.code));
      if (data.code === "Welcome to Anil's live notepad!") {
        console.log("✅ Real-time instant sync for /anil6 verified 100%!");
        client1.disconnect();
        client2.disconnect();
        resolve();
      }
    });

    setTimeout(() => {
      console.log("Client 1 typing: 'Welcome to Anil\\'s live notepad!'");
      client1.emit("code-change", {
        roomId: "anil6",
        code: "Welcome to Anil's live notepad!",
      });
    }, 400);

    setTimeout(() => {
      client1.disconnect();
      client2.disconnect();
      reject(new Error("Timeout waiting for code sync"));
    }, 3000);
  });
}

testNotepadSync().catch(console.error);
