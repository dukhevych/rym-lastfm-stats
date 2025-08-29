<svelte:options runes={true} />

<script lang="ts">
interface Props {
  checked: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
  name: string;
  newOption?: boolean;
}

let {
  checked = $bindable(),
  label,
  description,
  disabled = false,
  newOption = false,
  name,
}: Props = $props();
</script>

<label class="block select-none relative">
  {#if newOption}
    <span
      class="
        text-xs
        text-red-400
        absolute
        top-0
        left-0
        translate-x-[-25%]
        translate-y-[-25%]
        -rotate-45
        origin-center
      "
    >
      New
    </span>
  {/if}

  <input type="checkbox" class="sr-only peer" {name} bind:checked {disabled} />

  <span
    class="
      flex items-center justify-between gap-2
      cursor-pointer
      bg-zinc-800
      hover-fine:not-peer-disabled:hover:bg-zinc-700
      py-3 px-4 rounded-xl
      peer-focus-visible:ring-1 peer-focus-visible:ring-zinc-400/50
      peer-disabled:opacity-50 peer-disabled:pointer-events-none
      peer-checked:[&_.toggle]:bg-teal-700
      peer-checked:[&_.toggle::after]:translate-x-5
      peer-checked:[&_.text]:text-white
    "
  >
    <span
      class="
        toggle
        order-2
        relative
        w-11
        h-6
        rounded-full
        bg-zinc-700
        border
        border-zinc-600
        after:content-['']
        after:absolute
        after:top-[50%]
        after:left-[2px]
        after:h-5
        after:w-5
        after:bg-white
        after:translate-y-[-50%]
        after:border
        after:border-zinc-300
        after:rounded-full
        after:transition-transform
      "
    ></span>

    <span class="text flex flex-col gap-1 order-1 text-zinc-400">
      <strong class="text-sm">{label}</strong>
      {#if description}
        <p class="text-xs text-zinc-400">
          {description}
        </p>
      {/if}
    </span>
  </span>
</label>
