import { useState } from "react";
import { autometrics, init } from "autometrics";
import "./App.css";

init({ pushGateway: "http://0.0.0.0:8080/metrics" });

type Artwork = {
  id: number;
  thumbnail: {
    lqip: string;
    alt_text: string;
    width: number;
    height: number;
  };
  image_id: string;
};

let artworks: Array<Artwork>;

async function allArtworks() {
  if (!artworks) {
    const data = await fetch("https://api.artic.edu/api/v1/artworks?limit=100")
      .then(async (res) => {
        return await res.json();
      })
      .catch((err) => {
        throw new Error(`API call error: ${err}`);
      });

    artworks = data.data;
  }

  return artworks;
}

const getRandomArtwork = autometrics(
  {
    functionName: "getRandomArtwork",
    moduleName: "App",
  },
  async () => {
    const rand = Math.floor(Math.random() * 100 + 1) - 1;
    const artworks = await allArtworks();
    console.log(artworks[rand]);
    return artworks[rand];
  },
);

function App() {
  const [art, setArt] = useState<Artwork>();

  const handleClick = async () => {
    try {
      const data = await getRandomArtwork();
      setArt(data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="App">
      <h1>Artwork getter</h1>
      <div className="card">
        <button onClick={handleClick}>Get art</button>
        <div>
          {art ? (
            <img
              src={`https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg`}
              alt={art.thumbnail.alt_text ?? "no alt text from source"}
              width="50%"
              //height="400"
            />
          ) : (
            <p />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
