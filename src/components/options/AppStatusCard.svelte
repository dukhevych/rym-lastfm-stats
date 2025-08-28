<svelte:options runes={true} />

<script lang="ts">
import iconErrorSvg from '@/assets/icons/iconError.svg';
import iconSuccessSvg from '@/assets/icons/iconSuccess.svg';
import iconWarningSvg from '@/assets/icons/iconWarning.svg';
import { withSvgClass } from '@/helpers/svg';
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

{#snippet iconWarning(size = 5)}
  {@html withSvgClass(iconWarningSvg, `h-${size} w-${size} text-yellow-600`)}
{/snippet}

{#snippet iconSuccess(size = 5)}
  {@html withSvgClass(iconSuccessSvg, `h-${size} w-${size} text-green-600`)}
{/snippet}

{#snippet iconError(size = 5)}
  {@html withSvgClass(iconErrorSvg, `h-${size} w-${size} text-red-600`)}
{/snippet}

<svelte:element
  this={!valid && action ? 'button' : 'div'}
  data-slot="card"
  class={[
    'flex flex-col gap-6 rounded-2xl border-2 text-left',
    (!valid || warning) && 'bg-zinc-900 border-zinc-700',
    valid && !warning && 'shadow-sm border-teal-800 bg-teal-900/50',
    loading && 'pointer-events-none opacity-50',
    (!valid || warning) && action && 'cursor-pointer',
    !valid && action && 'hover:bg-zinc-800',
    warning && action && 'hover:bg-zinc-800',
  ]
    .filter(Boolean)
    .join(' ')}
  onclick={(!valid || warning) && action ? action : undefined}
  role={(!valid || warning) && action ? 'button' : undefined}
>
  <div data-slot="card-content" class="p-2 md:p-3 lg:p-4">
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
          <div
            class="text-xs text-zinc-600 dark:text-zinc-300 text-right grow flex flex-col gap-1"
          >
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
