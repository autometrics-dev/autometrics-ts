<script lang="ts">
	import { autometrics } from "@autometrics/autometrics";

	let promise: Promise<any>;

	const getWow = autometrics({
		functionName: "getWow",
		moduleName: "MODULE",
		fn: async () => {
			const res = await fetch(
				"https://owen-wilson-wow-api.onrender.com/wows/random"
			);
			return await res.json();
		},
	});

	async function handleClick() {
		promise = getWow();
	}
</script>

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
