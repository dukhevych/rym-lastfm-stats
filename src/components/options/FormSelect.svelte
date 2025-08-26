<script lang="ts">
interface Props {
  label?: string;
  name: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  description?: string;
  disabled?: boolean;
}

let {
  label = '',
  name,
  value = $bindable(),
  options,
  description = '',
  disabled = false,
}: Props = $props();
</script>

<div class="rounded-xl flex flex-col block w-full px-4 py-3 bg-zinc-800 gap-2">
  <div class="flex flex-col gap-1">
    <label
      for={name}
      class="text-sm text-white"
    >
      <strong>{label}</strong>
    </label>
    {#if description}
      <p class="text-xs text-zinc-400">{description}</p>
    {/if}
  </div>

  <select
    class="
      text-sm
      font-bold
      outline-none
      focus:ring-zinc-400/50
      focus:ring-1
      placeholder-zinc-400
      text-white
      bg-zinc-700
      p-2
    "
    disabled={disabled}
    bind:value={value}
    id={name}
    name={name}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
