<svelte:options runes={true} />

<div class="relative">
  <label for="labels-range-input">{label}: {value}</label>
  <input id="labels-range-input" type="range" {min} {max} {step} class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" bind:value {name} {disabled}>
  <span class="text-sm text-zinc-400 absolute start-0 -bottom-6">{min}</span>
  <!-- <span class="text-sm text-zinc-400 absolute start-1/3 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6">{Math.round((max - min) / 3)}</span> -->
  <!-- <span class="text-sm text-zinc-400 absolute start-2/3 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6">{Math.round((max - min) * 2 / 3)}</span> -->
  <span class="text-sm text-zinc-400 absolute start-3/3 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6">{max}</span>
</div>


<!-- <div class="block select-none relative">
  {#if label}
    <span class="text flex flex-col gap-0.5 order-1 text-zinc-400">
      <strong class="text-sm">{label}</strong>
    </span>
  {/if}
  {#if newOption}
    <span class="text-xs text-red-400 absolute top-0 left-0 translate-x-[-25%] translate-y-[-25%] -rotate-45 origin-center">
      New
    </span>
  {/if}

  <input
    type="text"
    class="
      w-full block min-w-0 font-mono rounded-xl outline-none
      border text-sm p-2.5
      bg-zinc-700 border-zinc-600 placeholder-zinc-400 text-white
      focus:border-zinc-500 focus:ring-zinc-500 focus:border-zinc-500 focus:placeholder-transparent
    "
    name={name}
    bind:value
    disabled={disabled}
  />

  <div
    class="flex items-center justify-between cursor-pointer bg-zinc-800 rounded-xl hover:bg-zinc-700 py-2 px-4 gap-2
           peer-focus-visible:ring-1 peer-focus-visible:ring-zinc-400/50 peer-disabled:opacity-50
           peer-checked:[&_.toggle]:bg-orange-700 peer-checked:[&_.toggle::after]:translate-x-5
           peer-checked:[&_.text]:text-white"
  >

    <span class="text flex flex-col gap-0.5 order-1 text-zinc-400">
      <strong class="text-sm">{label}</strong>
      {#if description}
        <p class="text-xs text-zinc-400">
          {description}
        </p>
      {/if}
    </span>
  </div>
</div> -->

<script lang="ts">
  interface Props {
    value: number;
    label: string;
    description?: string;
    disabled?: boolean;
    name: string;
    // newOption?: boolean;
    min?: number;
    max?: number;
    step?: number;
  }

  let {
    value = $bindable(),
    label,
    description,
    disabled = false,
    // newOption = false,
    name,
    min = 1,
    step = 1,
    max = 100,
  }: Props = $props();
</script>
