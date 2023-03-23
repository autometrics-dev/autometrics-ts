<script lang="ts">
  import { init } from "autometrics";
  import { autometrics } from "autometrics";
  init({ pushGateway: "http://0.0.0.0:8080/metrics" });

  let promise: Promise<any>;

  const getWow = autometrics(
    {
      functionName: "getWow",
      moduleName: "MODULE",
    },
    async () => {
      const res = await fetch(
        "https://owen-wilson-wow-api.onrender.com/wows/random"
      );
      return await res.json();
    }
  );

  async function handleClick() {
    promise = getWow();
  }
</script>

<main>
  <div class="card">
    <div>
      <button on:click={handleClick}>GET WOW</button>

      <div>
        {#await promise then data}
          <pre>
				{JSON.stringify(data)}
			</pre>
        {/await}
      </div>
    </div>
  </div>
</main>
