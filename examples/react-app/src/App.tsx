import { useState } from "react";
import { autometrics, init } from "autometrics";
import "./App.css";

// https://github.com/autometrics-dev/autometrics-ts#using-wrappers-in-the-browser
init({ pushGateway: "http://0.0.0.0:8080/metrics" });

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

const getRandomPost = autometrics(fetchRandomPost);

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
