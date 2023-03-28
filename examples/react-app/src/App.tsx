import { useState } from "react";
import { autometrics, init } from "autometrics";
import "./App.css";

init({ pushGateway: "http://0.0.0.0:8080/metrics" });

type Post = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

let posts: Array<Post>;

async function allPosts() {
  if (!posts) {
    const data = await fetch("https://jsonplaceholder.typicode.com/posts")
      .then(async (res) => {
        return await res.json();
      })
      .catch((err) => {
        throw new Error(`API call error: ${err}`);
      });

    posts = data;
  }

  return posts;
}

const getRandomPost = autometrics(
  {
    functionName: "getRandomPost",
    moduleName: "App",
  },
  async () => {
    const rand = Math.floor(Math.random() * 100 + 1);
    const posts = await allPosts();
    console.log(posts[rand]);
    return posts[rand];
  },
);

function App() {
  const [post, setPost] = useState<Post>();

  const handleClick = async () => {
    try {
      const data = await getRandomPost();
      setPost(data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="App">
      <h1>Post getter</h1>
      <div className="card">
        <button onClick={handleClick}>Get post</button>
        <div>
          {post ? (
            <div>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
            </div>
          ) : (
            <p />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
