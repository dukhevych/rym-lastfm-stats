<svelte:options runes={true} />

<script lang="ts">
import iconErrorSvg from '@/assets/icons/iconError.svg';
import iconSuccessSvg from '@/assets/icons/iconSuccess.svg';
import iconWarningSvg from '@/assets/icons/iconWarning.svg';
import { withSvgClass } from '@/helpers/svg';
interface AppStatusCardProps {
  status: 'valid' | 'invalid' | 'warning';
  loading?: boolean;
  title: string;
  note?: string | string[];
  validStatus: string;
  invalidStatus: string;
  warningStatus?: string;
  action?: () => void;
}

const {
  status,
  loading = false,
  title,
  note,
  validStatus,
  invalidStatus,
  warningStatus,
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
  this={status === 'invalid' && action ? 'button' : 'div'}
  data-slot="card"
  class={[
    'flex flex-col gap-6 rounded-2xl border-2 text-left',
    loading && 'pointer-events-none opacity-50',
    status === 'valid' && 'shadow-sm border-teal-800 bg-teal-900/50',
    status === 'invalid' && 'bg-zinc-900 border-zinc-700',
    status === 'warning' && 'bg-orange-900/50 border-orange-700/50',
    ['invalid', 'warning'].includes(status) && action && 'cursor-pointer',
    ['invalid'].includes(status) && action && 'hover-fine:hover:bg-zinc-800',
    ['warning'].includes(status) && action && 'hover-fine:hover:bg-orange-800/50',
  ]
    .filter(Boolean)
    .join(' ')}
  onclick={['invalid', 'warning'].includes(status) && action ? action : undefined}
  role={['invalid', 'warning'].includes(status) && action ? 'button' : undefined}
>
  <div data-slot="card-content" class="p-2 md:p-3 lg:p-4">
    <div class="flex items-center gap-2">
      {#if status === 'warning'}
        {@render iconWarning()}
      {:else if status === 'valid'}
        {@render iconSuccess()}
      {:else if status === 'invalid'}
        {@render iconError()}
      {/if}

      <div class="flex grow items-center gap-1">
        <div>
          <h3 class="font-bold">{title}</h3>
          <div class="text-sm text-zinc-400">
            {#if status === 'valid'}
              {validStatus}
            {:else if status === 'invalid'}
              {invalidStatus}
            {:else if status === 'warning' && warningStatus}
              {warningStatus}
            {/if}
          </div>
        </div>
        {#if note && note.length > 0}
          <div
            class="text-xs text-zinc-300 text-right grow flex flex-col gap-1"
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
