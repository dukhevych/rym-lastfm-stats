<svelte:options runes={true} />

<script lang="ts">
  const { ...props } = $props();

  let isLoading = $state(true);
  let hasError = $state(false);

  $effect(() => {
    props.src;
    isLoading = true;
    hasError = false;
  });

  function handleLoad() {
    isLoading = false;
    hasError = false;
  }

  function handleError() {
    isLoading = false;
    hasError = true;
  }
</script>

<img
  alt=""
  loading="lazy"
  src={props.src}
  onload={handleLoad}
  onerror={handleError}
  hidden={isLoading || hasError}
  {...props}
/>

{#if isLoading || hasError}
  <svg viewBox="0 0 300 150">
    <use xlink:href="#svg-loader-symbol"></use>
  </svg>
{/if}
