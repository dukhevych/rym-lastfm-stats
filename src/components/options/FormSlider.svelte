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

let isDraggingEnabled = $state(false);
let isDragging = $state(false);

function handleLegendMouseDown(_value: number): void {
  if (disabled) return;
  isDraggingEnabled = true;
  value = _value;
}

function handleLegendMouseUp(_value: number): void {
  if (disabled) return;
  isDragging = false;
  isDraggingEnabled = false;
  value = _value;
}

function handleLegendMouseMove(_value: number): void {
  if (disabled) return;
  if (isDraggingEnabled) {
    isDragging = true;
    value = _value;
  }
}

function isSelected(n: number): boolean {
  return +n === +value;
}
function isInRange(n: number): boolean {
  return +n < +value;
}
function isOutOfRange(n: number): boolean {
  return +n > +value;
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
    <div
      class="
        relative
        [&:has(input:focus-visible)]:outline
        [&:has(input:focus-visible)]:outline-2
        [&:has(input:focus-visible)]:outline-zinc-400/50
        [&:has(input:focus-visible)]:outline-offset-2
      "
    >
      <input
        id={name}
        type="range"
        {name}
        class="absolute h-full inset-0 {disabled ? '' : 'cursor-pointer'} -z-1 outline-none"
        {value}
        {min}
        {max}
        {disabled}
        {...restProps}
        oninput={handleInput}
      />
      <div class="flex">
        {#each legendRange() as n}
          <button
            tabindex="-1"
            class="
              border-2 cursor-pointer relative text-center aspect-square w-8 h-8 not-first:-ml-[2px]
              hoverable:hover:z-15
              {!disabled && isInRange(n) && 'hoverable:hover:bg-teal-600 hoverable:hover:border-teal-400'}
              {!disabled && isOutOfRange(n) && 'hoverable:hover:bg-zinc-600 hoverable:hover:border-zinc-400'}
              {isOutOfRange(n) && 'bg-zinc-800 border-zinc-600 *:opacity-50'}
              {isSelected(n) && 'z-20 bg-teal-600 border-teal-400 font-bold rounded-sm scale-110 border-3 shadow-inner shadow-black/25 text-shadow-sm'}
              {isInRange(n) && 'z-10 bg-teal-800 border-teal-600'}
            "
            type="button"
            onmousedown={() => handleLegendMouseDown(n)}
            onmouseup={() => handleLegendMouseUp(n)}
            onmousemove={() => handleLegendMouseMove(n)}
          >
            <span class="font-mono absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{n}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
  {#if description}
    <p class="text-xs text-zinc-400">{description}</p>
  {/if}
</div>
