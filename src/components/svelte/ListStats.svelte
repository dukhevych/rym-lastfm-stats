<svelte:options runes={true} />

<script lang="ts">
  import { shortenNumber } from '@/helpers/string';

  interface Props {
    listeners: number;
    playcount: number;
    scrobbles: number | null;
    timestamp: number;
  }

  const { listeners, playcount, scrobbles, timestamp }: Props = $props();

  const timestampFormatted = $derived(() => `${new Date(timestamp).toLocaleDateString()}`);

  function getFormattedValue(value: number) {
    return shortenNumber(Math.trunc(value));
  }
</script>

<ul class="list-stats">
  <li title={`${listeners} listeners (${timestampFormatted()})`}>
    <svg class="icon" aria-hidden="true">
      <use href="#svg-people-symbol" />
    </svg>
    <strong>{getFormattedValue(listeners)}</strong>
  </li>

  <li aria-hidden="true" class="separator">|</li>

  <li title={`${playcount} plays (${timestampFormatted()})`}>
    <svg class="icon" aria-hidden="true">
      <use href="#svg-play-symbol" />
    </svg>
    <strong>{getFormattedValue(playcount)}</strong>
  </li>

  {#if scrobbles !== null}
    <li aria-hidden="true" class="separator">|</li>

    <li title={`${scrobbles} scrobbles (${timestampFormatted()})`}>
      <strong>My scrobbles:</strong>
      <strong class="text-rym-user">{getFormattedValue(scrobbles)}</strong>
    </li>
  {/if}
</ul>

<style>
.list-stats {
  list-style: none;
  display: flex;
  align-items: center;
  line-height: 23px;

  & > li {
    display: inline-flex;
    gap: 0.4em;
    align-items: center;
  }
}

.icon {
  width: 1em;
  height: 1em;
}
</style>
