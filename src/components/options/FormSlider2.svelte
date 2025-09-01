<script lang="ts">
interface Props {
  label?: string;
  name: string;
  value: string | number;
  min?: string | number;
  max?: string | number;
  description?: string;
  disabled?: boolean;
  [key: string]: any;
}

let {
  label = '',
  name,
  value = $bindable(),
  min = 0,
  max = 100,
  description = '',
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
    flex flex-col gap-2
    bg-zinc-800 rounded-xl py-3 px-4
  "
>
  <div class="flex flex-col gap-1">
    <label for={name} class="text-sm font-bold">{label}</label>
  </div>
  <div class="flex items-center gap-4">
    <div class="relative">
      <div class="flex">
        {#each legendRange() as n}
          <button
            class="
              border-2 cursor-pointer
              not-first:-ml-[2px]
              aspect-square w-6 h-6
              text-center
              {+n > +value ?
                'bg-zinc-800 border-zinc-600' :
                ''}
              {+n <= +value ?
                'z-10'
                : ''
              }
              {+n === +value ?
                'bg-teal-600 border-teal-400' :
                ''}
              {+n < +value ?
                'bg-teal-800 border-teal-600' :
                ''}
            "
            type="button"
            onclick={() => handleLegendClick(n)}
          >
            <span class="sr-only">{n}</span>
          </button>
        {/each}
      </div>
      <input
        id={name}
        type="range"
        {name}
        class="absolute inset-0 {disabled ? '' : 'cursor-pointer'} opacity-0"
        {value}
        {min}
        {max}
        {disabled}
        {...restProps}
        oninput={handleInput}
      />
    </div>
    <div class="text-sm min-w-10">{value} items</div>
  </div>
  {#if description}
    <p class="text-xs text-zinc-400">{description}</p>
  {/if}
</div>
