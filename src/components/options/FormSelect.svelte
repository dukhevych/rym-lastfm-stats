<script lang="ts">
interface Props {
  value: string | number;
  options: { value: string | number; label: string }[];
  label?: string;
  description?: string;
  [key: string]: any;
}

let {
  value = $bindable(),
  options,
  label,
  description,
  ...restProps
}: Props = $props();
</script>

<div class="rounded-xl flex flex-col block w-full px-4 py-3 bg-zinc-800 gap-2">
  <div class="flex flex-col gap-1">
    <label
      for={restProps.name}
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
      h-10
      leading-none
      outline-none
      focus:ring-zinc-400/50
      focus:ring-1
      placeholder-zinc-400
      text-white
      bg-zinc-700
      border-b-2
      border-teal-700
      p-2
    "
    bind:value={value}
    id={restProps.name}
    {...restProps}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
