<script lang="ts">
  import Wow from './lib/Wow.svelte'
	import { initAutometrics } from "@autometrics/autometrics";
	initAutometrics({
		gateway: "0.0.0.0:8080",
		interval: 1
	})
</script>

<main>
  <div class="card">
    <Wow />
  </div>

</main>

