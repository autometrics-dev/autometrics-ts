<script lang="ts">
  import Wow from "./lib/Wow.svelte";
  import { init } from "autometrics";
  init({ pushGateway: "http://0.0.0.0:8080/metrics" });
</script>

<main>
  <div class="card">
    <Wow />
  </div>
</main>
