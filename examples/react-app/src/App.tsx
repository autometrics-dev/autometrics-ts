import { useState } from "react";
import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-otlp-http";
import "./App.css";

// In order for Prometheus to succesfully get your client-side app metrics, you
// will need to push them to either a Prometheus-compatible aggregating push
// gateway, or an OpenTelemetry Collector. Here, we choose to push to an Otel
// Collector using OTLP over HTTP. (The `faas-experiment/` example uses a
// Prometheus push gateway instead.)
init({
  url: "http://0.0.0.0:8080/metrics",
  buildInfo: {
    version: import.meta.env.VITE_AUTOMETRICS_VERSION,
    commit: import.meta.env.VITE_AUTOMETRICS_COMMIT,
    branch: import.meta.env.VITE_AUTOMETRICS_BRANCH,
  },
});

type Post = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

async function fetchRandomPost() {
  const randomPostId = Math.floor(Math.random() * 100 + 1);

  try {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${randomPostId}`,
    );

    if (!response.ok) {
      throw new Error(`API call error: ${response.statusText}`);
    }

    const post: Post = await response.json();
    return post;
  } catch (error) {
    throw new Error(`API call error: ${error}`);
  }
}

const getRandomPost = autometrics(
  {
    functionName: "getRandomPost",
    moduleName: "App",
  },
  fetchRandomPost,
);

function App() {
  const [post, setPost] = useState<Post>();

  const handleClick = async () => {
    const post = await getRandomPost();

    if (post) {
      setPost(post);
    }
  };

  return (
    <div className="App">
      <h1>Post getter</h1>

      <div className="card">
        <button onClick={handleClick}>
          Get {post ? "new " : ""}random post
        </button>

        {post && (
          <div>
            <h2>{post.title}</h2>
            <p>{post.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
