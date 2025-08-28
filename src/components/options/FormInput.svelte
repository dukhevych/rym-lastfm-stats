<svelte:options runes={true} />

<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  value: string;
  label?: string;
  description?: string | Snippet;
  class?: string;
  clearable?: boolean;
  [key: string]: any;
}

let {
  value = $bindable(),
  label,
  description,
  class: inputClasses = '',
  clearable = false,
  ...restProps
}: Props = $props();

let inputEl: HTMLInputElement;

function handleClear() {
  value = '';
}

export function focus(): void {
  inputEl.focus();
}
</script>

<div class="rounded-xl flex flex-col block w-full px-4 py-3 bg-zinc-800 gap-2">
  <div class="flex flex-col gap-1">
    <label for={restProps.name} class="text-sm text-white">
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

  <div class="flex items-center gap-2">
    <input
      type="text"
      class="
        outline-none
        grow
        border-b-2
        h-10
        leading-none
        border-teal-700
        text-sm p-2
        bg-zinc-700 placeholder-zinc-400 text-white
        focus:ring-zinc-500
        {inputClasses}
      "
      name={restProps.name}
      bind:value
      bind:this={inputEl}
      {...restProps}
    />

    {#if clearable}
      <button
        type="button"
        class="text-zinc-400 hover:text-zinc-500 shrink-0"
        onclick={handleClear}
        disabled={value.length === 0}
      >
        <span class="sr-only">Clear</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>
</div>
