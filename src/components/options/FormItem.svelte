<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  label?: string;
  description?: string | Snippet;
  name?: string;
  children: Snippet;
}

let {
  label,
  description,
  name,
  children,
}: Props = $props();

</script>

<div class="rounded-xl flex flex-col block w-full px-4 py-3 bg-zinc-800 gap-2">
  <div class="flex flex-col gap-1">
    {#if label}
      <label for={name} class="text-sm text-white">
        <strong>{label}</strong>
      </label>
    {/if}
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

  <div class="flex items-center gap-2">
    {@render children()}
  </div>
</div>