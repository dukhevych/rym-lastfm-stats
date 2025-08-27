<svelte:options runes={true} />

<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  value: string;
  label?: string;
  description?: string | Snippet;
  newOption?: boolean;
  [key: string]: any;
}

let {
  value = $bindable(),
  label,
  description,
  newOption = false,
  ...restProps
}: Props = $props();
</script>

<div class="rounded-xl flex flex-col block w-full px-4 py-3 bg-zinc-800 gap-2">
  <div class="flex flex-col gap-1">
    <label
      for={restProps.name}
      class="text-sm text-white"
    >
      <strong>{label}</strong>
    </label>
    {#if description}
      {#if typeof description === 'string'}
        <p class="text-xs text-zinc-400">{description}</p>
      {:else}
        <p class="text-xs text-zinc-400">
          {@render description()}
        </p>
      {/if}
    {/if}
  </div>

  <input
    type="text"
    class="
      outline-none
      border-b-2
      border-orange-700
      text-sm p-2
      bg-zinc-700 placeholder-zinc-400 text-white
      focus:ring-zinc-500
    "
    name={restProps.name}
    bind:value
    {...restProps}
  />
</div>
