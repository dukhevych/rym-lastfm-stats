<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    title: string;
    items: string[];
    selected: string;
    handleVariantClick: (artistName: string) => void;
    visible: boolean;
  }

  let {
    title,
    items,
    selected,
    handleVariantClick,
    visible = $bindable(),
  }: Props = $props();

  let dialog = $state<HTMLDialogElement>();

  onMount(() => {
    if (!dialog) return;

    dialog.addEventListener('close', () => {
      visible = false;
    });

    if (visible) dialog.showModal();
  });

  $effect(() => {
    if (!dialog) return;

    if (visible && !dialog.open) {
      dialog.showModal();
    } else if (!visible && dialog.open) {
      dialog.close();
    }
  });
</script>

<dialog class="dialog-base" bind:this={dialog}>
  <h2 class="dialog-title">
    {title}
    <button
      type="button"
      class="dialog-close-btn"
      aria-label="Close"
      onclick={() => (visible = false)}
    >
      <svg viewBox="0 0 24 24"><use xlink:href="#svg-close-symbol"></use></svg>
    </button>
  </h2>
  <ul class="list-dialog">
    {#each items as item}
      <li class:is-selected={item === selected} class="list-dialog-item">
        <button
          type="button"
          onclick={() => {
            handleVariantClick(item);
            visible = false;
          }}
          class="link-alike list-dialog-item-link"
        >
          <span class="list-dialog-item-title">{item}</span>
        </button>
      </li>
    {/each}
  </ul>
</dialog>

<style>
dialog.dialog-base {
  top: 50%;
  left: 50%;
  width: 90%;
  max-width: 500px;
  font-size: 14px;
  line-height: 20px;
  background: var(--mono-f);
  color: var(--text-primary);
  box-shadow: 0 0 2rem rgba(0, 0, 0, 0.4);
  z-index: 1000;
  opacity: 0;
  border: 5px solid rgba(255, 255, 255, 0.1);
  background-clip: padding-box;
  border-radius: 5px;
  transform: translate(-50%, -50%);
  transition-property: display opacity;
  transition-duration: 0.3s;
  transition-behavior: allow-discrete;

  --vertical-shift: 5vh;
  translate: 0 var(--vertical-shift);

  &[open] {
    opacity: 1;
    translate: 0 0;

    @starting-style {
      opacity: 0;
      translate: 0 calc(var(--vertical-shift) * -1);
    }
  }
}

dialog.dialog-base::backdrop {
  opacity: 0;
  transition-property: opacity, display, overlay;
  transition-duration: 2s;
  transition-behavior: allow-discrete;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}

dialog.dialog-base[open]::backdrop {
  opacity: 1;
}

@starting-style {
  dialog.dialog-base[open]::backdrop {
    opacity: 0;
  }
}

.dialog-close-btn {
  position: absolute;
  aspect-ratio: 1 / 1;
  height: 100%;
  top: 50%;
  right: 0;
  line-height: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  outline: none;

  svg {
    width: 80%;
    height: 80%;
    fill: currentColor;
  }

  &:hover {
    color: #f0f0f0;
  }
}

.dialog-title {
  font-size: 1.5rem;
  text-align: center;
  font-weight: bold;
  background-color: color-mix(in srgb, var(--text-primary), transparent 75%);
  padding-block: 1.25rem;
  margin: 0;
  position: relative;
}

.list-dialog {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 16px;
}

.list-dialog-item {
  .list-dialog-item-link {
    display: flex;
    align-items: center;
    padding: 1rem;
    color: currentColor;
    gap: 1rem;
    text-decoration: none;
    transition: background-color 0.2s ease;
    appearance: none;
    border: none;
    background: none;
    margin: 0;
    cursor: pointer;
    width: 100%;

    &:hover {
      background-color: color-mix(in srgb, var(--text-primary), transparent 90%);
    }
  }

  &.is-selected .list-dialog-item-link {
    background-color: color-mix(in srgb, var(--text-primary), transparent 95%);
    cursor: default;
    pointer-events: none;
  }

  .list-dialog-item-title {
    text-wrap: balance;
  }

  /* .list-dialog-item-image {
    width: 30px;
    height: 30px;
    background-color: var(--mono-3);
  } */
}

:global(html) {
  scrollbar-gutter: stable;
}

:global(body:has(dialog[open])) {
  overflow: hidden;
}
</style>
