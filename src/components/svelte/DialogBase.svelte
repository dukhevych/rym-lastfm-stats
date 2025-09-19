<svelte:options runes={true} />

<script lang="ts">
import { onMount } from 'svelte';
import type { Snippet } from 'svelte';

interface Props {
  title?: string;
  visible: boolean;
  size?: 'small' | 'medium' | 'large';
  children: Snippet;
  square?: boolean;
}

let {
  title,
  visible = $bindable(),
  children,
  size = 'medium',
  square = false,
}: Props = $props();

let dialog = $state<HTMLDialogElement>();

function onBackdropPointerDown(e: PointerEvent) {
  if (!dialog) return;
  const r = dialog.getBoundingClientRect();
  const outside =
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom;

  if (outside) {
    // prevent text selection flicker on quick clicks
    e.preventDefault();
    visible = false; // triggers .close() via the effect below
  }
}

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

{#snippet closeButton()}
  <button
    type="button"
    class="dialog-close-btn"
    aria-label="Close"
    onclick={() => (visible = false)}
  >
    <svg viewBox="0 0 24 24"><use xlink:href="#svg-close-symbol"></use></svg>
  </button>
{/snippet}

<dialog
  class={`dialog-base ${square ? 'is-square' : ''} size-${size}`}
  bind:this={dialog}
  onpointerdown={onBackdropPointerDown}
>
  {#if title}
    <h2 class="dialog-title">
      {title}
      {@render closeButton()}
    </h2>
  {/if}

  {#if !title}
    {@render closeButton()}
  {/if}

  <div class="dialog-content h-full w-full">
    {@render children()}
  </div>
</dialog>

<style>
dialog.dialog-base {
  top: 50%;
  left: 50%;
  max-height: 90dvh;
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

  &:not(.is-square) {
    width: 90%;
  }

  &.size-medium {
    max-width: 500px;
  }

  &.size-large {
    max-width: 800px;
  }

  &.size-small {
    max-width: 300px;
  }

  &.is-square {
    aspect-ratio: 1 / 1;
  }

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
  width: 40px;
  height: 40px;
  aspect-ratio: 1 / 1;
  top: 0;
  right: 0;
  line-height: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255 255 255 / 0.1);
  border: none;
  color: #666;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease-in-out;
  transition-property: color, background;

  svg {
    width: 80%;
    height: 80%;
    fill: currentColor;
  }

  &:hover {
    background: rgba(255 255 255 / 0.3);
  }
}

.dialog-title .dialog-close-btn {
  top: 50%;
  transform: translateY(-50%);
  height: 100%;
  width: auto;
}

.dialog-title {
  font-size: 1.5rem;
  text-align: center;
  font-weight: bold;
  background-color: color-mix(in srgb, var(--text-primary), transparent 75%);
  padding-block: 1.2rem;
  margin: 0;
  position: relative;
}

:global(html) {
  scrollbar-gutter: stable;
}

:global(body:has(dialog[open])) {
  overflow: hidden;
}
</style>
