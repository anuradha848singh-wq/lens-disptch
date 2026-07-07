async function run() {
  const testId = "c6d6dcd655bb3fdb0298fffba1a465b3";
  const url = `http://127.0.0.1:5000/api/articles/${testId}/full`;
  console.log("Fetching url:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const json = await res.json() as any;
    console.log("Body error or title:", json.error || (json.article ? json.article.title : "No article key"));
  } catch (e: any) {
    console.error("HTTP Fetch failed:", e.message);
  }
  process.exit(0);
}

run();
