<svelte:options runes={true} />

{#snippet iconWarning(size = 5)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size} text-yellow-600"
  >
    <path d="M12 2L2 22h20L12 2z"></path>
    <circle cx="12" cy="12" r="1"></circle>
  </svg>
{/snippet}

{#snippet iconSuccess(size = 5)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size} text-green-600"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <path d="m9 11 3 3L22 4"></path>
  </svg>
{/snippet}

{#snippet iconError(size = 5)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size} text-red-600"
  >
    <path d="M18 6L6 18"></path>
    <path d="M6 6l12 12"></path>
  </svg>
{/snippet}

<script lang="ts">
interface AppStatusCardProps {
  valid: boolean;
  warning?: boolean;
  loading?: boolean;
  title: string;
  note?: string | string[];
  validStatus: string;
  invalidStatus: string;
  action?: () => void;
}

const {
  valid,
  warning = false,
  loading = false,
  title,
  note,
  validStatus,
  invalidStatus,
  action,
}: AppStatusCardProps = $props();
</script>

<svelte:element
  this={!valid && action ? 'button' : 'div'}
  data-slot="card"
  class={[
    'flex flex-col gap-6 rounded-2xl border-2 text-left',
    !valid && 'bg-zinc-900 border-zinc-700',
    valid && 'shadow-sm border-teal-800 bg-teal-900/50',
    warning && 'bg-yellow-900/50 border-yellow-800',
    loading && 'pointer-events-none opacity-50',
    ((!valid || warning) && action) && 'cursor-pointer',
    (!valid && action) && 'hover:bg-zinc-800',
    (warning && action) && 'hover:bg-yellow-800/50',
  ].filter(Boolean).join(' ')}
  onclick={(!valid || warning) && action ? action : undefined}
  role={(!valid || warning) && action ? 'button' : undefined}
>
  <div data-slot="card-content" class="p-4">
    <div class="flex items-center gap-2">
      {#if valid}
        {#if warning}
          {@render iconWarning()}
        {:else}
          {@render iconSuccess()}
        {/if}
      {:else}
        {@render iconError()}
      {/if}

      <div class="flex grow items-center gap-1">
        <div>
          <h3 class="font-bold">{title}</h3>
          <div class="text-sm text-zinc-600 dark:text-zinc-400">
            {valid ? validStatus : invalidStatus}
          </div>
        </div>
        {#if note && note.length > 0}
          <div class="text-xs text-zinc-600 dark:text-zinc-300 text-right grow flex flex-col gap-1">
            {#if typeof note === 'string'}
              {note}
            {/if}
            {#if Array.isArray(note)}
              {#each note as n}
                <p>{n}</p>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</svelte:element>
