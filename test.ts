async function test() {
  const res = await fetch('http://localhost:5000/api/articles');
  if (!res.ok) {
    console.error("articles error");
    return;
  }
  const data = await res.json();
  const id = data.articles[0]?.id;
  if (!id) {
    console.log("No articles found");
    return;
  }
  console.log("Article:", data.articles[0].title);
  
  const sourcesRes = await fetch('http://localhost:5000/api/sources?articleId=' + id);
  if (!sourcesRes.ok) {
    console.error("sources error", sourcesRes.status);
    return;
  }
  const sourcesData = await sourcesRes.json();
  console.log("TOTAL SOURCES:", sourcesData.total_sources);
  console.log("BIAS DISTRIBUTION:", sourcesData.bias_distribution);
}
test();
