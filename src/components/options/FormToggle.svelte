<svelte:options runes={true} />

<label class="block select-none">
  <input
    type="checkbox"
    class="sr-only peer"
    name={name}
    bind:checked={checked}
    disabled={disabled}
  />

  <span
    class="flex items-center justify-between cursor-pointer bg-zinc-800 rounded-xl hover:bg-zinc-700 py-2 px-4 gap-2
           peer-focus-visible:ring-1 peer-focus-visible:ring-zinc-400/50 peer-disabled:opacity-50
           peer-checked:[&_.toggle]:bg-teal-600 peer-checked:[&_.toggle::after]:translate-x-5
           peer-checked:[&_.text]:text-teal-400"
  >
    <span
      class="toggle order-2 relative w-11 h-6 rounded-full bg-gray-700 border border-gray-600
             after:content-[''] after:absolute after:top-[50%] after:left-[2px] after:h-5 after:w-5 after:bg-white after:translate-y-[-50%]
             after:border after:border-gray-300 after:rounded-full
             after:transition-transform"
    ></span>

    <span class="text flex flex-col gap-0.5 order-1 text-zinc-400">
      <strong class="text-sm">{label}</strong>
      {#if description}
        <p class="text-xs text-zinc-400">
          {description}
        </p>
      {/if}
    </span>
  </span>
</label>

<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    description?: string;
    disabled?: boolean;
    name: string;
  }

  let {
    checked = $bindable(),
    label,
    description,
    disabled = false,
    name,
  }: Props = $props();
</script>