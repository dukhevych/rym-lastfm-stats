<svelte:options runes={true} />

<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  note?: Snippet;
  warning?: Snippet;
  children: Snippet;
  order?: number;
}

const {
  title,
  note,
  warning,
  children,
  order,
}: Props = $props();
</script>

<div class="flex flex-col gap-2" style:order={order}>
  <header class="flex flex-col px-4 gap-2">
    <h4 class="flex items-baseline justify-between -mr-4">
      <strong>{title}</strong>
      {#if note}
        <span class="text-xs italic dark:text-zinc-200 text-zinc-600">
          {@render note()}
        </span>
      {/if}
    </h4>

    {#if warning}
      {@render warning()}
    {/if}
  </header>

  <div class="flex flex-col gap-3">
    {@render children()}
  </div>
</div>