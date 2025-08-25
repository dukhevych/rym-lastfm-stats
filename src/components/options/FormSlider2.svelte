<!-- FormRange.svelte -->
<script lang="ts">
interface Props {
  label?: string;
  name: string;
  value: string | number;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  [key: string]: any;
}

let {
  label = '',
  name,
  value = $bindable(),
  min = 0,
  max = 100,
  disabled = false,
  ...restProps
}: Props = $props();

let legendRange = $derived(() => {
  const minVal = Number(min);
  const maxVal = Number(max);
  return Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);
});

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  value = Number(target.value);
}

function handleLegendClick(_value: number): void {
  if (!disabled) value = _value;
}
</script>

<div
  class="
    flex flex-col gap-1
    bg-zinc-800 rounded-xl py-3 px-4
    [--range-track:theme(colors.zinc.600)]
    [--range-fill:theme(colors.orange.700)]
    [--range-thumb:theme(colors.orange.600)]
  "
>
  <div class="font-bold">
    <label for={name}>{label}: {value}</label>
  </div>
  <div>
    <div class="flex items-center gap-2">
      <div class="w-full">
        <input
          id={name}
          type="range"
          {name}
          class="block w-full {disabled ? '' : 'cursor-pointer'}"
          {value}
          {min}
          {max}
          {disabled}
          {...restProps}
          oninput={handleInput}
        />
        <div class="relative mt-2">
          <div
            class="
              flex justify-between text-sm text-gray-500 relative h-5
            "
            style="margin-inline: calc(var(--range-thumb-width, 16px) / 2)"
          >
            {#each legendRange() as n, i}
              <span
                class="
                  absolute top-0 text-center
                  translate-x-[-50%]
                  {+n === +value ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-500'}
                "
                style="left: {i * 100 / (+max - +min)}%;"
              >
                <button
                  type="button"
                  class="inline-flex cursor-pointer px-1 {disabled
                    ? 'pointer-events-none'
                    : ''}"
                  onclick={() => handleLegendClick(n)}
                >
                  {n}
                </button>
              </span>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
input[type="range"] {
  width: 100%;
  accent-color: var(--range-fill); /* fallback */
}

/* --- WebKit (Chrome, Safari, Edge) --- */
input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  background: var(--range-track);
  border-radius: 3px;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -6px;
  width: var(--range-thumb-width, 16px);
  height: var(--range-thumb-height, 16px);
  background: var(--range-thumb);
  border-radius: 50%;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    var(--range-fill) 0%,
    var(--range-fill) calc(var(--value, 0) * 1%),
    var(--range-track) calc(var(--value, 0) * 1%),
    var(--range-track) 100%
  );
}

/* --- Firefox --- */
input[type="range"]::-moz-range-track {
  height: 6px;
  background: var(--range-track);
  border-radius: 3px;
}
input[type="range"]::-moz-range-progress {
  background: var(--range-fill);
  height: 6px;
  border-radius: 3px;
}
input[type="range"]::-moz-range-thumb {
  width: var(--range-thumb-width, 16px);
  height: var(--range-thumb-height, 16px);
  background: var(--range-thumb);
  border-radius: 50%;
  border-color: white;
  cursor: pointer;
}

/* --- IE/old Edge --- */
input[type="range"]::-ms-track {
  height: 6px;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input[type="range"]::-ms-fill-lower {
  background: var(--range-fill);
}
input[type="range"]::-ms-fill-upper {
  background: var(--range-track);
}
input[type="range"]::-ms-thumb {
  background: var(--range-thumb);
  border-radius: 50%;
}

</style>
