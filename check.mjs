(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/articles/trending');
    const articles = await res.json();
    const groups = {};
    articles.forEach(a => {
      if (!groups[a.groupId]) groups[a.groupId] = [];
      groups[a.groupId].push({ title: a.title, pub: a.publisher ? a.publisher.name : 'Unknown' });
    });
    let clustered = 0;
    Object.keys(groups).forEach(g => {
      if (groups[g].length > 1) {
        console.log(`\nCluster ${g}:`);
        groups[g].forEach(item => console.log(`  - [${item.pub}] ${item.title}`));
        clustered++;
      }
    });
    console.log(`\nTotal clusters with >1 article: ${clustered}`);
    console.log(`Total articles fetched: ${articles.length}`);
  } catch (err) {
    console.error(err);
  }
})();
