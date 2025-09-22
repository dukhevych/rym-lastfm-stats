<svelte:options runes={true} />

<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  title?: string | Snippet;
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

<div class="flex flex-col gap-3" style:order={order}>
  {#if title}
    <header class="flex flex-col px-4 gap-2">
      <h4 class="flex items-baseline justify-between -mr-4">
        <strong>
          {#if typeof title === 'string'}
            {title}
          {:else}
            {@render title()}
          {/if}
        </strong>
        {#if note}
          <span class="text-xs italic text-zinc-200">
            {@render note()}
          </span>
        {/if}
      </h4>

      {#if warning}
        {@render warning()}
      {/if}
    </header>
  {/if}

  <div class="flex flex-col gap-3">
    {@render children()}
  </div>
</div>
