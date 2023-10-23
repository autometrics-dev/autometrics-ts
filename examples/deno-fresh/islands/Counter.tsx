// FIXME: Client-side NPM bundling seems blocked by this issue:
//        https://github.com/lucacasonato/esbuild_deno_loader/issues/76
//import { autometrics } from "$autometrics/mod.ts";
import type { Signal } from "@preact/signals";

import { Button } from "../components/Button.tsx";

interface CounterProps {
  count: Signal<number>;
}

export default function Counter(props: CounterProps) {
  // FIXME: See comment at top:
  /*const increase = autometrics(function increase() {
    props.count.value += 1;
  });

  const decrease = autometrics(function decrease() {
    props.count.value -= 1;
  });*/
  const increase = () => props.count.value += 1;
  const decrease = () => props.count.value -= 1;

  return (
    <div class="flex gap-8 py-6">
      <Button onClick={decrease}>-1</Button>
      <p class="text-3xl">{props.count}</p>
      <Button onClick={increase}>+1</Button>
    </div>
  );
}
