<svelte:options runes={true} />

<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  active: boolean;
  icon: Snippet;
  title: string;
  description?: string;
  children: Snippet;
}

const { active, icon, title, description, children }: Props = $props();
</script>

<div class="flex flex-col gap-4 rounded-xl" class:hidden={!active}>
  <header class="flex flex-col gap-2 py-2">
    <div class="flex items-center justify-center gap-2">
      <span class="*:w-6 *:h-6 *:text-orange-700">
        {@render icon()}
      </span>
      <h3 class="text-lg font-semibold">{title}</h3>
    </div>
    {#if description}
      <div class="text-zinc-600 dark:text-zinc-400 text-center">
        {description}
      </div>
    {/if}
  </header>
  <div class="flex flex-col">
    {@render children()}
  </div>
</div>
