<svelte:options runes={true} />

<div class="block select-none relative">
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
</div>

<script lang="ts">
  interface Props {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
    name: string;
    newOption?: boolean;
  }

  let {
    value = $bindable(),
    label,
    description,
    disabled = false,
    newOption = false,
    name,
  }: Props = $props();
</script>
