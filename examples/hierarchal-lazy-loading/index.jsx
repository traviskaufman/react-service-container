import "regenerator-runtime/runtime";

import React, { useState } from "react";
import ReactDOM from "react-dom";
import { ServiceContainer, useService } from "./lib";
import GithubDAO from "./lib/githubDAO";

ReactDOM.render(<App />, document.getElementById("root"));

function App() {
  return (
    <ServiceContainer providers={[GithubDAO]}>
      <Repos />
    </ServiceContainer>
  );
}

function Repos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repos, setRepos] = useState(null);
  const githubDAO = useService(GithubDAO);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const loadedRepos = await githubDAO.listRepos();
      setRepos(loadedRepos);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <button onClick={loadRepos}>Load Repos</button>
      {(() => {
        if (loading) {
          return <p>Loading...</p>;
        }

        if (error) {
          return <p>Error: {error}</p>;
        }

        return (
          <ul>
            {repos
              ? repos.map((r) => (
                  <li key={r.id}>
                    <a href={r.link}>{r.name}</a>
                  </li>
                ))
              : null}
          </ul>
        );
      })()}
    </main>
  );
}
