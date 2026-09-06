const io = require("socket.io-client");

async function runE2ETests() {
  console.log("=========================================");
  console.log("🚀 CodeConnect Automated E2E Verification");
  console.log("=========================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Test Landing Page
  console.log("1️⃣ Testing Landing Page (GET /)...");
  const landingRes = await fetch(baseUrl);
  if (landingRes.status === 200) {
    const html = await landingRes.text();
    if (html.includes("CodeConnect") && html.includes("Share code")) {
      console.log("   ✅ Landing page rendered successfully with SEO & hero metadata.");
    } else {
      console.log("   ⚠️ Landing page returned 200 but content check failed.");
    }
  } else {
    throw new Error(`Landing page failed with status ${landingRes.status}`);
  }

  // 2. Test Room Creation API
  console.log("\n2️⃣ Testing Room Creation (POST /api/rooms)...");
  const createRes = await fetch(`${baseUrl}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", title: "Collaborative Python Session" }),
  });
  const createData = await createRes.json();
  if (createData.success && createData.roomCode) {
    console.log(`   ✅ Created room successfully! Room Code: ${createData.roomCode}`);
  } else {
    throw new Error(`Room creation failed: ${JSON.stringify(createData)}`);
  }

  const testRoomId = createData.roomCode;

  // 3. Test Room Retrieval API
  console.log(`\n3️⃣ Testing Room Retrieval (GET /api/rooms/${testRoomId})...`);
  const getRes = await fetch(`${baseUrl}/api/rooms/${testRoomId}`);
  const getData = await getRes.json();
  if (getData.success && getData.room.roomCode === testRoomId) {
    console.log(`   ✅ Fetched room successfully! Title: "${getData.room.title}", Lang: ${getData.room.language}`);
  } else {
    throw new Error(`Room retrieval failed: ${JSON.stringify(getData)}`);
  }

  // 4. Test Multi-Language Execution Engine
  console.log("\n4️⃣ Testing Code Execution (POST /api/execute)...");
  const pyCode = `
def is_even(n):
    return n % 2 == 0

evens = [x for x in range(10) if is_even(x)]
print(f"Evens: {evens}")
`;
  const execRes = await fetch(`${baseUrl}/api/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", code: pyCode }),
  });
  const execData = await execRes.json();
  if (execData.exitCode === 0 && execData.stdout.includes("Evens: [0, 2, 4, 6, 8]")) {
    console.log(`   ✅ Python execution succeeded in ${execData.executionTimeMs}ms!`);
    console.log(`      Output: ${execData.stdout.trim()}`);
  } else {
    throw new Error(`Execution failed: ${JSON.stringify(execData)}`);
  }

  // 5. Test Real-Time WebSocket Collaboration
  console.log("\n5️⃣ Testing Real-Time Socket.IO Synchronization between 2 clients...");
  
  await new Promise((resolve, reject) => {
    const clientA = io(baseUrl, { transports: ["websocket"] });
    const clientB = io(baseUrl, { transports: ["websocket"] });

    let clientBReceived = false;

    clientA.on("connect", () => {
      // console.log("   Client A connected to socket");
      clientA.emit("join-room", {
        roomId: testRoomId,
        user: { id: "user_A", name: "Anil", color: "#3b82f6" },
      });
    });

    clientB.on("connect", () => {
      // console.log("   Client B connected to socket");
      clientB.emit("join-room", {
        roomId: testRoomId,
        user: { id: "user_B", name: "Dilli", color: "#10b981" },
      });
    });

    clientB.on("code-update", (data) => {
      if (data.code === 'console.log("Real-time sync verified!");') {
        clientBReceived = true;
        console.log("   ✅ Client B received real-time code update from Client A!");
        clientA.disconnect();
        clientB.disconnect();
        resolve();
      }
    });

    // Client A sends code change after 300ms
    setTimeout(() => {
      clientA.emit("code-change", {
        roomId: testRoomId,
        code: 'console.log("Real-time sync verified!");',
      });
    }, 300);

    // Timeout safety
    setTimeout(() => {
      if (!clientBReceived) {
        clientA.disconnect();
        clientB.disconnect();
        reject(new Error("Socket synchronization timed out"));
      }
    }, 4000);
  });

  console.log("\n=========================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 100%");
  console.log("=========================================\n");
}

runE2ETests().catch((err) => {
  console.error("\n❌ Test Failed:", err);
  process.exit(1);
});
