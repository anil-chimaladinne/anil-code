async function test() {
  console.log("Testing Python execution...");
  const pyRes = await fetch("http://localhost:3000/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "python",
      code: "print('Python is working live!')\nnums = [x * 2 for x in range(5)]\nprint('Computed:', nums)",
    }),
  });
  console.log("Python Result:", await pyRes.json());

  console.log("\nTesting JavaScript execution...");
  const jsRes = await fetch("http://localhost:3000/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "javascript",
      code: "console.log('JS test running'); const sum = 10 + 20; console.log('Sum:', sum);",
    }),
  });
  console.log("JS Result:", await jsRes.json());
}

test();
