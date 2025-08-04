<template>
  <dialog
    ref="dialog"
    class="
      fixed left-1/2 top-1/2 z-[1000] w-[90%] max-w-[500px] -translate-x-1/2 -translate-y-1/2
      translate-y-[5vh] rounded-md border-4 border-white/10 bg-white bg-clip-padding text-sm
      leading-5 text-gray-900 opacity-0 shadow-2xl transition-[opacity,transform] duration-300
      backdrop:bg-black/50 backdrop:opacity-0 backdrop:backdrop-blur-sm
      backdrop:transition-[opacity] backdrop:duration-500
      open:translate-y-0 open:opacity-100 open:backdrop:opacity-100
    "
  >
    <h2 class="relative m-0 bg-black/25 py-5 text-center text-2xl font-bold">
      {{ title }}
      <button
        type="button"
        class="
          leading-inherit absolute right-0 top-1/2 flex aspect-square h-full -translate-y-1/2
          cursor-pointer items-center justify-center border-none bg-transparent text-gray-500
          outline-none
          hover:text-gray-200
        "
        aria-label="Close"
        @click="$emit('update:visible', false)"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4/5 w-4/5 fill-current"
        >
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </h2>
    <div class="p-4">
      <slot />
    </div>
  </dialog>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible'])

const dialog = ref(null)

onMounted(async () => {
  await nextTick()
  if (!dialog.value) return

  dialog.value.addEventListener('close', () => {
    emit('update:visible', false)
  })

  if (props.visible) {
    dialog.value.showModal()
  }
})

watch(() => props.visible, (newVisible) => {
  if (!dialog.value) return

  if (newVisible && !dialog.value.open) {
    dialog.value.showModal()
    document.body.style.overflow = 'hidden'
  } else if (!newVisible && dialog.value.open) {
    dialog.value.close()
    document.body.style.overflow = ''
  }
}, { immediate: true })
</script>

<style>
html {
  scrollbar-gutter: stable;
}
</style>