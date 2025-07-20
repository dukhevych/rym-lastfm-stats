<svelte:options runes={true} />

<script lang="ts">
  import { shortenNumber } from '@/helpers/string';

  interface Item {
    value: number;
    title?: string;
    prefix?: string;
    suffix?: string;
    bold?: boolean;
    prefixBold?: boolean;
    suffixBold?: boolean;
  }

  interface Props {
    items: Item[];
    timestamp: number;
  }

  const { items, timestamp }: Props = $props();

  const timestampFormatted = $derived(
    () => `(as of ${new Date(timestamp).toLocaleDateString()})`,
  );

  function getTitle(item: Item) {
    return [
      item.prefix ?? '',
      item.value,
      item.suffix ?? '',
      timestampFormatted(),
    ].filter(Boolean).join(' ');
  }

  function getFormattedValue(value: number) {
    return shortenNumber(Math.trunc(value));
  }
</script>

{#snippet separator(tag: 'li' | 'span' = 'li')}
  <svelte:element this={tag} class="separator" aria-hidden="true">|</svelte:element>
{/snippet}

<ul class="list-stats">
  {#each items as item, index}
    <li title={item.title ?? getTitle(item)}>
      <!-- PREFIX -->
      {#if item.prefix}
        {#if item.prefixBold}
          <strong>{item.prefix}</strong>
        {:else}
          {item.prefix}
        {/if}
      {/if}

      <!-- VALUE -->
      {#if item.bold}
        <strong>{getFormattedValue(item.value)}</strong>
      {:else}
        {getFormattedValue(item.value)}
      {/if}

      <!-- SUFFIX -->
      {#if item.suffix}
        {#if item.suffixBold}
          <strong>{item.suffix}</strong>
        {:else}
          {item.suffix}
        {/if}
      {/if}
    </li>

    <!-- SEPARATOR -->
    {#if index < items.length - 1}
      <li class="separator" aria-hidden="true">|</li>
    {/if}
  {/each}
</ul>

<style>
.list-stats {
  list-style: none;
  display: flex;
  align-items: center;
}
</style>