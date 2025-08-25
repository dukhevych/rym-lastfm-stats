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
</div>

<script lang="ts">
  interface Props {
    value: string;
    label: string;
    disabled?: boolean;
    name: string;
    newOption?: boolean;
  }

  let {
    value = $bindable(),
    label,
    disabled = false,
    newOption = false,
    name,
  }: Props = $props();
</script>
