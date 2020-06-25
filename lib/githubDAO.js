export default class GithubDAO {
  async listRepos() {
    const res = await fetch("https://api.github.com/repositories");
    const data = await res.json();
    return data.map((repo) => ({
      id: repo.id,
      name: repo.full_name,
      link: repo.html_url,
    }));
  }
}
