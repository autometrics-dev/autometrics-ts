export function shouldError() {
  if (Math.random() > 0.5) {
    throw new Error("Error occurred");
  }
}

export async function delayRandomDuration() {
  const sleepDuration = Math.floor(Math.random() * 400 + 100);
  await delay(sleepDuration);
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateRandomTraffic() {
  console.log("Generating random traffic");

  while (true) {
    const type = Math.floor(Math.random() * 2);

    switch (type) {
      case 0:
        await fetch("http://localhost:8080/users");
        break;
      case 1: {
        // create a random user id and name and send it in the body
        const id = Math.floor(Math.random() * 1000);
        const name = Math.random().toString(36).substring(7);
        await fetch("http://localhost:8080/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, name }),
        });
        break;
      }
      case 2: {
        // delete a random user
        const id = Math.floor(Math.random() * 1000);
        await fetch(`http://localhost:8080/users/${id}`, {
          method: "DELETE",
        });
        break;
      }
    }
  }
}
