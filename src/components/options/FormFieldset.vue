<template>
  <fieldset
    class="
      form-group h-full w-full bg-clip-padding
      focus-within:shadow-lg
    "
    :class="{
      'pointer-events-none select-none opacity-30 grayscale filter': disabled,
    }"
  >
    <div
      v-if="props.title || $slots.helper"
      class="
        form-group-header bg-rym-gradient flex min-h-[52px] items-center justify-between p-3 text-xl
        font-bold text-white
        [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]
      "
    >
      <template v-if="props.title">
        {{ props.title }}
      </template>
      <div
        v-if="$slots.helper"
        class="group relative ml-auto"
      >
        <div
          class="h-5 w-5 cursor-pointer rounded-full bg-white text-center text-sm text-blue-500"
        >
          ?
        </div>
        <div
          class="
            absolute right-0 mt-2 hidden w-max max-w-[250px] transform flex-col gap-2 bg-gray-700
            p-3 text-sm text-white
            group-hover:flex
          "
        >
          <slot name="helper" />
        </div>
      </div>
    </div>

    <div
      class="
        form-group-body border-white-300 flex flex-col gap-3 border-2 bg-gray-600 bg-opacity-40 p-3
        shadow-[inset_0_15px_30px_-15px_rgba(255,255,255,0.2)]
        dark:border-white-700
      "
    >
      <!-- backdrop-blur-sm backdrop-filter -->
      <component
        :is="child"
        v-for="(child, i) in $slots.default()"
        :key="i"
        :disabled="(child?.props?.disabled ?? false) || (props.inheritDisabled && props.disabled)"
      />
    </div>
  </fieldset>
</template>
<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  inheritDisabled: {
    type: Boolean,
    default: true,
  },
});
</script>
