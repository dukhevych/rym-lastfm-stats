<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';

  let {
    text = $bindable('Hello World'),
    animationType = 'fade' // 'fade' or 'rotate'
  } = $props();

  interface Letter {
    char: string;
    visible: boolean;
    rotation: number;
  }

  let containerEl = $state<HTMLSpanElement>();
  let isAnimating = $state(false);
  let displayLetters = $state<Letter[]>([]);
  let previousText = $state('');

  // Watch for text changes
  $effect(() => {
    if (text !== previousText && previousText !== '') {
      animateTextChange();
    }
    previousText = text;
  });

  // Initialize display letters on mount
  onMount(() => {
    displayLetters = text.split('').map(letter => ({
      char: letter,
      visible: true,
      rotation: 0
    }));
  });

  async function animateTextChange() {
    if (isAnimating) return;
    isAnimating = true;

    if (animationType === 'fade') {
      await fadeAnimation();
    } else if (animationType === 'rotate') {
      await rotateAnimation();
    }

    isAnimating = false;
  }

  async function fadeAnimation() {
    const newText = text;

    // First, fade out existing letters
    for (let i = 0; i < displayLetters.length; i++) {
      displayLetters[i].visible = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Prepare new letters array
    displayLetters = newText.split('').map(char => ({
      char,
      visible: false,
      rotation: 0
    }));

    // Small delay before fading in
    await new Promise(resolve => setTimeout(resolve, 200));

    // Fade in new letters one by one
    for (let i = 0; i < displayLetters.length; i++) {
      displayLetters[i].visible = true;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }

  async function rotateAnimation() {
    const newText = text;
    const oldLength = displayLetters.length;
    const newLength = newText.length;
    const maxLength = Math.max(oldLength, newLength);

    // Step 1: Rotate existing letters randomly
    for (let i = 0; i < oldLength; i++) {
      displayLetters[i].rotation = (Math.random() - 0.5) * 60; // -30 to 30 degrees
    }

    // Wait for rotation animation
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 2: Replace letters with new text
    const newLetters = [];

    for (let i = 0; i < maxLength; i++) {
      if (i < newLength) {
        newLetters.push({
          char: newText[i],
          visible: true,
          rotation: 0
        });
      }
    }

    displayLetters = newLetters;
  }

  function getLetterStyle(letter: Letter): string {
    let style = `
      display: inline-block;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      transform: rotate(${letter.rotation}deg);
    `;

    if (animationType === 'fade') {
      style += `opacity: ${letter.visible ? 1 : 0};`;
    }

    // Preserve spaces
    if (letter.char === ' ') {
      style += 'width: 0.25em;';
    }

    return style;
  }
</script>

<span bind:this={containerEl} class="animated-text-container">
  {#each displayLetters as letter, i (i)}
    <span
      style={getLetterStyle(letter)}
      class="letter"
    >
      {letter.char === ' ' ? '\u00A0' : letter.char}
    </span>
  {/each}
</span>

<style>
  .letter {
    transform-origin: center;
  }
</style>